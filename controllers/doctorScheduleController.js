const sequelize = require("../config/database");
const {
  Doctor,
  Hospital,
  DoctorHospital,
  HospitalSpecialty,
  DoctorSpecialty,
  WorkingDay,
  Room,
} = require("../models");
const DoctorSchedule = require("../models/doctorScheduleModel");
const AppointmentSlot = require("../models/appointmentSlotModel");
const { generateDatesBetween, createSlots } = require("../utils/common");
const moment = require("moment");
const { Op } = require("sequelize");
const Sequelize = require("sequelize");
const { schedule } = require("node-cron");

// API tạo lịch làm việc của bác sĩ và chia slot
// working schedule id 23 đã xóa 2 shift morning và evening 7h00 - 11h00 và 13h00 - 17h00
const createDoctorSchedule = async (req, res) => {
  const { schedules, doctorId, slotDuration } = req.body;

  try {
    // Tìm bệnh viện do user quản lý
    const hospital = await Hospital.findOne({
      where: {
        manager_id: req.user.id,
      },
    });

    if (!hospital) {
      return res
        .status(404)
        .json({ message: "Hospital not found for this manager." });
    }

    // Biến lưu trữ các promises để xử lý lịch làm việc và chia slot
    const schedulePromises = [];

    // Duyệt qua từng ngày trong schedules
    for (const date in schedules) {
      const { date_of_week, time_slots } = schedules[date];
      const formattedDate = moment(date, "YYYY-MM-DD").format("YYYY-MM-DD");

      // Duyệt qua từng ca làm việc trong ngày
      for (const slot of time_slots) {
        const { shift_type, start, end } = slot;

        // Tạo lịch làm việc và xử lý đồng thời
        const schedulePromise = DoctorSchedule.create({
          doctor_id: doctorId,
          hospital_id: hospital.id,
          date: formattedDate,
          date_of_week: date_of_week,
          shift_type: shift_type,
          start_time: start,
          end_time: end,
          slot_duration: slotDuration,
        }).then((createdSchedule) => {
          // Sau khi tạo lịch, chia slot cho lịch đó
          const startTime = moment(start, "HH:mm:ss");
          const endTime = moment(end, "HH:mm:ss");
          const slots = [];

          // Tạo các slot thời gian dựa trên slotDuration
          while (startTime.isBefore(endTime)) {
            const slotEnd = startTime.clone().add(slotDuration, "minutes");

            // Nếu slotEnd không vượt quá end_time thì thêm slot
            if (slotEnd.isAfter(endTime)) break;

            slots.push({
              doctor_id: doctorId,
              hospital_id: hospital.id,
              doctorSchedule_id: createdSchedule.id,
              date: formattedDate,
              start_time: startTime.format("HH:mm:ss"),
              end_time: slotEnd.format("HH:mm:ss"),
              patient_id: null, // Lúc đầu slot trống, không có bệnh nhân
            });

            startTime.add(slotDuration, "minutes");
          }

          // Lưu tất cả các slot vào bảng AppointmentSlots
          return AppointmentSlot.bulkCreate(slots);
        });

        schedulePromises.push(schedulePromise);
      }
    }

    // Chờ tất cả các promises hoàn thành
    await Promise.all(schedulePromises);

    res.status(201).json({ message: "Tạo lịch và chia slot thành công!" });
  } catch (error) {
    console.log("Error creating doctor schedule:", error);
    res.status(500).json({ message: error.message });
  }
};

// lấy các ngày có lịch làm việc của bác sĩ (lấy 7 ngày từ ngày hiện tại)
const getDoctorScheduleDates = async (req, res) => {
  const { doctorId } = req.params;
  const { hospitalId } = req.query;

  try {
    const currentDate = moment().startOf("day");

    const doctorSchedule = await DoctorSchedule.findAll({
      where: {
        doctor_id: doctorId,
        hospital_id: hospitalId,
        date: {
          [Op.gte]: currentDate.toDate(), // Từ ngày hiện tại trở đi
        },
        is_active: true,
        isDeleted: false,
      },
      order: [["date", "ASC"]],
    });
    // Lọc ra các ngày duy nhất
    const uniqueDates = [
      ...new Set(
        doctorSchedule.map((schedule) =>
          moment(schedule.date).format("YYYY-MM-DD")
        )
      ),
    ];

    // Chọn 7 ngày gần nhất
    const result = uniqueDates.slice(0, 7).map((date) => {
      return date;
    });

    res.status(200).json(result);
  } catch (error) {
    console.log("Error getting doctor schedule dates:", error);
    res.status(500).json({ message: error.message });
  }
};

// const getAppointmentSlotsByDoctorAndDate = async (req, res) => {
//   const { doctorId } = req.params;
//   const { hospitalId, date } = req.query;

//   try {
//     // Chuyển đổi date từ query thành định dạng "YYYY-MM-DD"
//     const formattedDate = moment(date).format("YYYY-MM-DD");

//     const doctorSchedule = await DoctorSchedule.findAll({
//       where: {
//         doctor_id: doctorId,
//         hospital_id: hospitalId,
//         // So sánh chỉ phần ngày
//         [Op.and]: [
//           sequelize.where(
//             sequelize.fn("DATE", sequelize.col("date")),
//             formattedDate
//           ), // Cắt bỏ phần thời gian
//         ],
//       },
//       include: [
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlots",
//           where: {
//             isBooked: false,
//             isDeleted: false,
//           },
//           attributes: ["id", "start_time", "end_time"],
//         },
//       ],
//     });
//     // Sắp xếp các slot thời gian theo `start_time`
//     doctorSchedule.forEach((schedule) => {
//       schedule.appointmentSlots.sort((a, b) =>
//         a.start_time.localeCompare(b.start_time)
//       );
//     });

//     const grouped = doctorSchedule.reduce((acc, curr) => {
//       const date = curr.date;
//       if (!acc[date]) {
//         acc[date] = { date, shifts: [] };
//       }
//       acc[date].shifts.push(curr);
//       return acc;
//     }, {});
//     res.status(200).json(Object.values(grouped));
//   } catch (error) {
//     console.log("Error getting appointment slots by doctor and date:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

const getAppointmentSlotsByDoctorAndDate = async (req, res) => {
  const { doctorId } = req.params;
  const { hospitalId, date } = req.query;

  try {
    // Chuyển đổi date từ query thành định dạng "YYYY-MM-DD"
    const formattedDate = moment(date).format("YYYY-MM-DD");

    const doctorSchedule = await DoctorSchedule.findAll({
      where: {
        doctor_id: doctorId,
        hospital_id: hospitalId,
        // So sánh chỉ phần ngày
        [Op.and]: [
          sequelize.where(
            sequelize.fn("DATE", sequelize.col("date")),
            formattedDate
          ), // Cắt bỏ phần thời gian
        ],
      },
      include: [
        {
          model: AppointmentSlot,
          as: "appointmentSlots",
          where: {
            isBooked: false,
            isDeleted: false,
          },
          attributes: ["id", "start_time", "end_time"],
        },
      ],
    });

    // Sắp xếp các slot thời gian theo `start_time`
    doctorSchedule.forEach((schedule) => {
      schedule.appointmentSlots.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
    });

    // Sắp xếp các shift theo `shift_type` để buổi sáng trước
    const shiftPriority = {
      morning: 1,
      afternoon: 2,
      evening: 3, // Nếu có
      night: 4, // Nếu có
    };

    const grouped = doctorSchedule.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = { date, shifts: [] };
      }
      acc[date].shifts.push(curr);
      return acc;
    }, {});

    // Sắp xếp các shift cho từng ngày
    Object.values(grouped).forEach((group) => {
      group.shifts.sort(
        (a, b) => shiftPriority[a.shift_type] - shiftPriority[b.shift_type]
      );
    });

    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.log("Error getting appointment slots by doctor and date:", error);
    res.status(500).json({ message: error.message });
  }
};

// const getAppointmentSlotsByDoctorAndDate = async (req, res) => {
//   const { doctorId } = req.params;
//   const { hospitalId, date } = req.query;

//   try {
//     const formattedDate = moment(date).format("YYYY-MM-DD");

//     // Lấy thời gian hiện tại và tính thời gian giới hạn (1 tiếng sau hiện tại)
//     const currentDateTime = new Date();
//     const limitDateTime = new Date(currentDateTime.getTime() + 60 * 60 * 1000); // 1 tiếng sau

//     // Lấy lịch làm việc của bác sĩ cho ngày được chỉ định
//     let doctorSchedule = await DoctorSchedule.findAll({
//       where: {
//         doctor_id: doctorId,
//         hospital_id: hospitalId,
//         [Op.and]: [
//           sequelize.where(
//             sequelize.fn("DATE", sequelize.col("date")),
//             formattedDate
//           ),
//         ],
//       },
//       include: [
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlots",
//           where: {
//             isBooked: false,
//             isDeleted: false,
//             customer_id: null,
//           },
//           attributes: ["id", "start_time", "end_time"],
//         },
//       ],
//     });

//     // Chuyển đổi thời gian hiện tại sang chuỗi giờ để so sánh
//     const currentTimeString = moment(limitDateTime).format("HH:mm");

//     // Lọc các slot thời gian còn hiệu lực (sau 1 tiếng)
//     doctorSchedule.forEach((schedule) => {
//       schedule.appointmentSlots = schedule.appointmentSlots
//         .filter((slot) => slot.start_time > currentTimeString) // Chỉ giữ các slot sau giờ giới hạn
//         .sort((a, b) => a.start_time.localeCompare(b.start_time)); // Sắp xếp theo thời gian
//     });

//     // Kiểm tra xem có slot nào phù hợp trong ngày hiện tại không
//     const availableSlotsToday = doctorSchedule.some(
//       (schedule) => schedule.appointmentSlots.length > 0
//     );

//     // Nếu không có slot nào trong ngày, lấy lịch cho ngày kế tiếp
//     if (!availableSlotsToday) {
//       const nextDay = moment(date).add(1, "days").format("YYYY-MM-DD");
//       doctorSchedule = await DoctorSchedule.findAll({
//         where: {
//           doctor_id: doctorId,
//           hospital_id: hospitalId,
//           [Op.and]: [
//             sequelize.where(
//               sequelize.fn("DATE", sequelize.col("date")),
//               nextDay
//             ),
//           ],
//         },
//         include: [
//           {
//             model: AppointmentSlot,
//             as: "appointmentSlots",
//             where: {
//               isBooked: false,
//               isDeleted: false,
//               customer_id: null,
//             },
//             attributes: ["id", "start_time", "end_time"],
//           },
//         ],
//       });

//       doctorSchedule.forEach((schedule) => {
//         schedule.appointmentSlots.sort((a, b) =>
//           a.start_time.localeCompare(b.start_time)
//         );
//       });
//     }

//     // Nhóm các lịch theo ngày
//     const grouped = doctorSchedule.reduce((acc, curr) => {
//       const date = curr.date;
//       if (!acc[date]) {
//         acc[date] = { date, shifts: [] };
//       }
//       acc[date].shifts.push(curr);
//       return acc;
//     }, {});

//     res.status(200).json(Object.values(grouped));
//   } catch (error) {
//     console.error("Error fetching appointment slots:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// Lấy thời khóa biểu của bác sĩ
const getDoctorSchedule = async (req, res) => {
  try {
    const currentDoctor = await Doctor.findOne({
      where: {
        user_id: req.user.id,
      },
    });
    const doctorSchedule = await DoctorSchedule.findAll({
      where: {
        doctor_id: currentDoctor.id,
      },
      include: [
        {
          model: AppointmentSlot,
          as: "appointmentSlots",
          attributes: ["id", "start_time", "end_time"],
          include: [
            {
              model: Hospital,
              as: "hospital",
              attributes: ["id", "name"],
            },
          ],
        },
      ],
    });
    const grouped = doctorSchedule.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = { date, shifts: [] };
      }
      acc[date].shifts.push(curr);
      return acc;
    }, {});
    res.status(200).json(Object.values(grouped));
  } catch (error) {
    console.log("Error getting doctor schedule:", error);
    res.status(500).json({ message: error.message });
  }
};

// lấy lịch làm việc của bác sĩ sau thời gian hiện tại
const getDoctorScheduleAfterCurrentDate = async (req, res) => {
  const { hospitalId } = req.query;
  try {
    const currentDoctor = await Doctor.findOne({
      where: {
        user_id: req.user.id,
      },
    });

    const currentDate = moment();
    const nextDaySameTime = currentDate
      .add(1, "days")
      .format("YYYY-MM-DD HH:mm");

    const doctorSchedule = await DoctorSchedule.findAll({
      where: {
        doctor_id: currentDoctor.id,
        // hospital_id: hospitalId,

        date: {
          [Op.gte]: nextDaySameTime,
        },
      },
    });
    res.status(200).json(doctorSchedule);
  } catch (error) {
    console.log("Error getting doctor schedule after current date:", error);
    res.status(500).json({ message: error.message });
  }
};

// lấy nơi làm việc của bác sĩ
const getDoctorWorkplace = async (req, res) => {
  try {
    const currentDoctor = await Doctor.findOne({
      where: {
        user_id: req.user.id,
      },
    });
    const doctorHospital = await DoctorHospital.findAll({
      where: {
        doctor_id: currentDoctor.id,
      },
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name"],
        },
      ],
    });
    const hospitalList = doctorHospital.map((item) => item.hospital);
    res.status(200).json(hospitalList);
  } catch (error) {
    console.log("Error getting doctor workplace:", error);
    res.status(500).json({ message: error.message });
  }
};

// lấy lịch làm việc của các bác sĩ trong cùng một chuyên khoa của 1 bệnh viện
// const getDoctorScheduleBySpecialtyAndHospital = async (req, res) => {
//   const { specialtyID, hospitalID } = req.query;
//   try {
//     // Bước 1: Tìm `hospital_specialty_id`
//     const hospitalSpecialty = await HospitalSpecialty.findOne({
//       where: {
//         specialty_id: specialtyID,
//         hospital_id: hospitalID,
//       },
//       attributes: ["id"], // Chỉ lấy ID
//     });

//     if (!hospitalSpecialty) {
//       throw new Error("Không tìm thấy chuyên khoa tại bệnh viện này.");
//     }

//     // Bước 2: Lấy danh sách bác sĩ thuộc chuyên khoa
//     const doctors = await DoctorSpecialty.findAll({
//       where: { hospital_specialty_id: hospitalSpecialty.id },
//       attributes: ["doctor_id"], // Chỉ lấy doctor_id
//     });

//     const doctorIds = doctors.map((d) => d.doctor_id);

//     if (doctorIds.length === 0) {
//       throw new Error("Không có bác sĩ nào thuộc chuyên khoa này.");
//     }

//     // Bước 3: Lấy danh sách ngày có slot khám trống
//     const availableDates = await DoctorSchedule.findAll({
//       where: {
//         doctor_id: doctorIds, // Bác sĩ thuộc chuyên khoa
//         hospital_id: hospitalID, // Bệnh viện cụ thể
//         date: {
//           [Op.gte]: moment().format("YYYY-MM-DD"),
//         },
//       },
//       include: [
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlots",
//           where: {
//             isBooked: false,
//             isDeleted: false,
//           },
//         },
//       ],
//       // attributes: ["date"],
//       // Nhóm theo ngày
//       // order: [["date", "ASC"]], // Sắp xếp theo ngày tăng dần
//     });
//     res.status(200).json(availableDates);
//     // Trả về danh sách ngày
//   } catch (error) {
//     console.error(error);
//     throw new Error("Lỗi khi lấy danh sách ngày có lịch khám.");
//   }
// };
// lấy lịch cúa các bác sĩ theo chuyên khoa và bệnh viện.

// const getDoctorScheduleBySpecialtyAndHospital = async (req, res) => {
//   const { specialtyID, hospitalID } = req.query;
//   try {
//     // Bước 1: Tìm `hospital_specialty_id` theo chuyên khoa và bệnh viện
//     const hospitalSpecialty = await HospitalSpecialty.findOne({
//       where: {
//         specialty_id: specialtyID,
//         hospital_id: hospitalID,
//       },
//       attributes: ["id"], // Chỉ lấy ID của specialty
//     });

//     if (!hospitalSpecialty) {
//       return res
//         .status(404)
//         .json({ message: "Không tìm thấy chuyên khoa tại bệnh viện này." });
//     }

//     // Bước 2: Lấy danh sách bác sĩ thuộc chuyên khoa tại bệnh viện này
//     const doctors = await DoctorSpecialty.findAll({
//       where: { hospital_specialty_id: hospitalSpecialty.id },
//       attributes: ["doctor_id"], // Chỉ lấy doctor_id
//     });

//     const doctorIds = doctors?.map((d) => d.doctor_id);

//     // if (doctorIds.length === 0) {
//     //   return res
//     //     .status(404)
//     //     .json({ message: "Không có bác sĩ nào thuộc chuyên khoa này." });
//     // }

//     // Bước 3: Lấy danh sách ngày làm việc có slot khám trống
//     const availableSchedules = await DoctorSchedule.findAll({
//       where: {
//         doctor_id: doctorIds, // Lọc bác sĩ thuộc chuyên khoa
//         hospital_id: hospitalID, // Lọc theo bệnh viện
//         date: {
//           [Op.gte]: moment().format("YYYY-MM-DD"),
//           // lấy 7 ngày từ ngày hiện tại
//           [Op.lte]: moment().add(7, "days").format("YYYY-MM-DD"),
//         },
//       },
//       attributes: ["date", "shift_type", "start_time", "end_time"],
//       include: [
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlots",
//           where: {
//             isBooked: false, // Chỉ lấy những slot chưa được đặt
//             isDeleted: false,
//           },
//           attributes: ["id", "start_time", "end_time", "doctor_id"], // Thêm thông tin về slot
//         },
//         {
//           model: Doctor,
//           as: "doctor",
//         },
//         {
//           model: Hospital,
//           as: "hospital",
//         },
//       ],
//       order: [
//         ["date", "ASC"],
//         ["shift_type", "DESC"],
//         ["start_time", "ASC"],
//       ],
//     });

//     // // Nếu không có lịch nào
//     // if (availableSchedules.length === 0) {
//     //   return res.status(404).json({
//     //     message:
//     //       "Không có lịch khám trống cho chuyên khoa này tại bệnh viện này.",
//     //   });
//     // }

//     // Bước 4: Cấu trúc lại dữ liệu, gộp các bác sĩ vào từng slot
//     const result = availableSchedules.reduce((acc, schedule) => {
//       const scheduleDate = moment(schedule.date).format("DD/MM/YYYY");

//       if (!acc[scheduleDate]) {
//         acc[scheduleDate] = [];
//       }

//       // Nhóm các slot trùng thời gian
//       schedule.appointmentSlots?.forEach((slot) => {
//         const existingSlot = acc[scheduleDate].find(
//           (item) =>
//             item.start_time === slot.start_time &&
//             item.end_time === slot.end_time
//         );

//         if (existingSlot) {
//           // Nếu slot đã tồn tại, thêm bác sĩ vào mảng doctors
//           existingSlot.doctors.push({ doctor_id: slot.doctor_id });
//         } else {
//           // Nếu slot chưa tồn tại, thêm slot mới
//           acc[scheduleDate].push({
//             slot_id: slot.id,
//             start_time: slot.start_time,
//             end_time: slot.end_time,
//             doctors: [{ doctor_id: slot.doctor_id }],
//           });
//         }
//       });

//       // Sắp xếp slot theo thời gian
//       acc[scheduleDate].sort((a, b) =>
//         a.start_time.localeCompare(b.start_time)
//       );

//       return acc;
//     }, {});

//     // Trả về kết quả
//     return res.status(200).json(result);
//   } catch (error) {
//     console.error(error);
//     return res
//       .status(500)
//       .json({ message: "Lỗi khi lấy danh sách ngày có lịch khám." });
//   }
// };

const getDoctorScheduleBySpecialtyAndHospital = async (req, res) => {
  const { specialtyID, hospitalID } = req.query;
  try {
    // Bước 1: Tìm `hospital_specialty_id` theo chuyên khoa và bệnh viện
    const hospitalSpecialty = await HospitalSpecialty.findOne({
      where: {
        specialty_id: specialtyID,
        hospital_id: hospitalID,
      },
      attributes: ["id"],
    });

    if (!hospitalSpecialty) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy chuyên khoa tại bệnh viện này." });
    }

    // Bước 2: Lấy danh sách bác sĩ thuộc chuyên khoa tại bệnh viện này
    const doctors = await DoctorSpecialty.findAll({
      where: { hospital_specialty_id: hospitalSpecialty.id },
      attributes: ["doctor_id"],
    });

    const doctorIds = doctors?.map((d) => d.doctor_id) || [];

    // Bước 3: Lấy danh sách lịch khám có slot trống trong 30 ngày tới (hoặc hơn)
    const availableSchedules = await DoctorSchedule.findAll({
      where: {
        doctor_id: doctorIds,
        hospital_id: hospitalID,
        date: {
          [Op.gte]: moment().startOf("day").format("YYYY-MM-DD"), // Từ hôm nay
          [Op.lte]: moment().add(30, "days").endOf("day").format("YYYY-MM-DD"), // 30 ngày tới
        },
      },
      attributes: ["date", "shift_type", "start_time", "end_time"],
      include: [
        {
          model: AppointmentSlot,
          as: "appointmentSlots",
          where: {
            isBooked: false,
            isDeleted: false,
          },
          attributes: ["id", "start_time", "end_time", "doctor_id"],
        },
        {
          model: Doctor,
          as: "doctor",
        },
        {
          model: Hospital,
          as: "hospital",
        },
      ],
      order: [
        ["date", "ASC"],
        ["shift_type", "DESC"],
        ["start_time", "ASC"],
      ],
    });

    if (availableSchedules.length === 0) {
      return res.status(404).json({
        message:
          "Không có lịch khám trống cho chuyên khoa này tại bệnh viện này.",
      });
    }

    // Bước 4: Gộp dữ liệu và chỉ lấy 7 ngày có slot trống
    const result = {};
    let dayCount = 0;

    availableSchedules.forEach((schedule) => {
      if (dayCount >= 7) return; // Dừng khi đủ 7 ngày

      const scheduleDate = moment(schedule.date).format("DD/MM/YYYY");

      // Chỉ thêm ngày nếu chưa có trong result
      if (!result[scheduleDate]) {
        result[scheduleDate] = [];
        dayCount++;
      }

      // Gộp các slot vào ngày đó
      schedule.appointmentSlots?.forEach((slot) => {
        const existingSlot = result[scheduleDate].find(
          (item) =>
            item.start_time === slot.start_time &&
            item.end_time === slot.end_time
        );

        if (existingSlot) {
          existingSlot.doctors.push({ doctor_id: slot.doctor_id });
        } else {
          result[scheduleDate].push({
            slot_id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            doctors: [{ doctor_id: slot.doctor_id }],
          });
        }
      });

      // Sắp xếp slot theo thời gian
      result[scheduleDate].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
    });

    // Trả về kết quả
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Lỗi khi lấy danh sách ngày có lịch khám." });
  }
};

// tạo lịch làm việc của bác sĩ
const createDoctorSchedule2 = async (req, res) => {
  const { schedules, doctorId, slotDuration, startDate, endDate } = req.body;
  try {
    const hospital = await Hospital.findOne({
      where: {
        manager_id: req.user.id,
      },
    });

    const schedulePromises = [];
    const selectedSchedules = schedules.filter((s) =>
      moment(s.date).isBetween(startDate, endDate, null, "[]")
    );

    selectedSchedules.forEach((schedule) => {
      const { date_of_week, time_slots, date } = schedule;

      time_slots.forEach((slot) => {
        const { shift_type, start, end, room } = slot;

        const schedulePromise = DoctorSchedule.create({
          doctor_id: doctorId,
          hospital_id: hospital.id,
          date: moment(date, "YYYY-MM-DD").format("YYYY-MM-DD"),
          date_of_week,
          start_time: start,
          end_time: end,
          shift_type,
          slot_duration: slotDuration,
          room_id: room,
        }).then((createdSchedule) => {
          const startTime = moment(start, "HH:mm:ss");
          const endTime = moment(end, "HH:mm:ss");
          const slots = [];

          while (startTime.isBefore(endTime)) {
            const slotEnd = startTime.clone().add(slotDuration, "minutes");

            if (slotEnd.isAfter(endTime)) break;

            slots.push({
              doctor_id: doctorId,
              hospital_id: hospital.id,
              doctorSchedule_id: createdSchedule.id,
              start_time: startTime.format("HH:mm:ss"),
              end_time: slotEnd.format("HH:mm:ss"),
            });

            startTime.add(slotDuration, "minutes");
          }

          return AppointmentSlot.bulkCreate(slots);
        });

        schedulePromises.push(schedulePromise);
      });
    });
    await Promise.all(schedulePromises);

    res.status(200).json({ message: "Tạo lịch thành công" });
  } catch (error) {
    console.log("Error creating doctor schedule:", error);
    res.status(500).json({ message: error.message });
  }
};

// lấy lịch làm việc của bác sĩ theo bệnh viện
// const getAllDoctorSchedule = async (req, res) => {
//   try {
//     const currentDoctor = await Doctor.findOne({
//       where: {
//         user_id: req.user.id,
//       },
//     });
//     const doctorSchedule = await DoctorSchedule.findAll({
//       where: {
//         doctor_id: currentDoctor.id,
//       },
//       include: [
//         {
//           model: Hospital,
//           as: "hospital",
//           attributes: ["id", "name"],
//         },
//         {
//           model: Room,
//           as: "room",
//           attributes: ["id", "name"],
//         },
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlots",
//           attributes: [
//             "id",
//             "start_time",
//             "end_time",
//             "isBooked",
//             "appointment_id",
//           ],
//           where: { isBooked: true }, // Chỉ lấy các slot đã được đặt
//           required: false, // Nếu không có lịch hẹn nào, vẫn trả về lịch làm việc
//         },
//       ],
//     });

//     res.status(200).json(Object.values(doctorSchedule));
//   } catch (error) {
//     console.log("Error getting doctor schedule:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

// Tối ưu API phía backend
const getAllDoctorSchedule = async (req, res) => {
  try {
    // Thêm caching cho các truy vấn tìm kiếm doctor
    const currentDoctor = await Doctor.findOne({
      where: {
        user_id: req.user.id,
      },
      attributes: ["id"], // Chỉ lấy ID để giảm dữ liệu
    });

    if (!currentDoctor) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thông tin bác sĩ" });
    }

    // Thêm query parameters để hỗ trợ phân trang và lọc theo ngày
    const { startDate, endDate, page = 1, limit = 100 } = req.query;
    const offset = (page - 1) * limit;

    // Xây dựng where clause dựa trên startDate và endDate nếu có
    const whereClause = { doctor_id: currentDoctor.id };

    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate],
      };
    } else if (startDate) {
      whereClause.date = {
        [Op.gte]: startDate,
      };
    } else if (endDate) {
      whereClause.date = {
        [Op.lte]: endDate,
      };
    }

    // Thêm limit và offset để phân trang
    const doctorSchedule = await DoctorSchedule.findAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      order: [
        ["date", "ASC"],
        ["start_time", "ASC"],
      ], // Sắp xếp theo ngày và giờ
      include: [
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name"],
        },
        {
          model: Room,
          as: "room",
          attributes: ["id", "name"],
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlots",
          attributes: ["id", "start_time", "end_time", "isBooked"],
          where: { isBooked: true }, // Chỉ lấy các slot đã được đặt
          required: false, // Nếu không có lịch hẹn nào, vẫn trả về lịch làm việc
        },
      ],
      // Eager loading - tối ưu truy vấn
      distinct: true,
    });

    // Đếm tổng số bản ghi để phân trang
    const totalCount = await DoctorSchedule.count({
      where: whereClause,
      distinct: true,
    });

    res.status(200).json({
      schedules: doctorSchedule,
      pagination: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: parseInt(page, 10),
      },
    });
  } catch (error) {
    console.error("Error getting doctor schedule:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// const getAllDoctorSchedule = async (req, res) => {
//   const { startDate, endDate, page = 1, limit = 50 } = req.query;

//   try {
//     const currentDoctor = await Doctor.findOne({
//       where: {
//         user_id: req.user.id,
//       },
//     });

//     if (!currentDoctor) {
//       return res.status(404).json({ message: "Doctor not found" });
//     }

//     const offset = (page - 1) * limit;
//     const whereClause = {
//       doctor_id: currentDoctor.id,
//     };

//     // Thêm điều kiện lọc theo ngày nếu có
//     if (startDate && endDate) {
//       whereClause.date = {
//         [Op.between]: [
//           moment(startDate).startOf("day").toDate(),
//           moment(endDate).endOf("day").toDate(),
//         ],
//       };
//     }

//     const { count, rows } = await DoctorSchedule.findAndCountAll({
//       where: whereClause,
//       include: [
//         {
//           model: Hospital,
//           as: "hospital",
//           attributes: ["id", "name"],
//         },
//         {
//           model: Room,
//           as: "room",
//           attributes: ["id", "name"],
//         },
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlots",
//           attributes: [
//             "id",
//             "start_time",
//             "end_time",
//             "isBooked",
//             "appointment_id",
//           ],
//           where: { isBooked: true },
//           required: false,
//         },
//       ],
//       order: [["date", "ASC"]],
//       limit: parseInt(limit),
//       offset,
//     });

//     res.status(200).json({
//       total: count,
//       page: parseInt(page),
//       limit: parseInt(limit),
//       data: rows,
//     });
//   } catch (error) {
//     console.log("Error getting doctor schedule:", error);
//     res.status(500).json({ message: error.message });
//   }
// };
const check = async (req, res) => {
  const { doctorId, shift, numberDate, dayOfDate } = req.body;
  const dayOfWeekMapping = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const date = dayOfWeekMapping[numberDate];

  try {
    // Kiểm tra các ngày trong mảng dayOfDate có lịch chưa
    const existingSchedules = await DoctorSchedule.findAll({
      where: {
        doctor_id: doctorId,
        date: {
          [Op.and]: [
            Sequelize.where(
              Sequelize.fn("DATE", Sequelize.col("date")), // Chỉ lấy phần ngày
              {
                [Op.in]: dayOfDate, // So sánh chính xác với danh sách ngày
              }
            ),
          ],
        },
        shift_type: shift, // Lọc theo ca làm việc
      },
    });

    // Nếu có lịch làm việc tồn tại
    if (existingSchedules.length > 0) {
      return res.status(200).json({
        message: "Lịch làm việc đã tồn tại.",
        schedule: existingSchedules,
      });
    } else if (existingSchedules.length === 0) {
      return res.status(200).json({
        message: "Không có lịch làm việc cho ngày này.",
        schedule: existingSchedules,
      });
    }
  } catch (error) {
    console.log(error);
  }
};
module.exports = {
  createDoctorSchedule,
  getAppointmentSlotsByDoctorAndDate,
  getDoctorScheduleDates,
  getDoctorSchedule,
  getDoctorScheduleAfterCurrentDate,
  getDoctorWorkplace,
  getDoctorScheduleBySpecialtyAndHospital,
  createDoctorSchedule2,
  getAllDoctorSchedule,
  check,
};
