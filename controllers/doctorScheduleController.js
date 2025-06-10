const sequelize = require("../config/database");
const {
  Doctor,
  Hospital,
  DoctorHospital,
  HospitalSpecialty,
  DoctorSpecialty,
} = require("../models");
const DoctorSchedule = require("../models/doctorScheduleModel");
const AppointmentSlot = require("../models/appointmentSlotModel");
const moment = require("moment");
const { Op } = require("sequelize");
const Sequelize = require("sequelize");

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

    const schedulePromises = [];

    for (const date in schedules) {
      const { date_of_week, time_slots } = schedules[date];
      const formattedDate = moment(date, "YYYY-MM-DD").format("YYYY-MM-DD");

      for (const slot of time_slots) {
        const { shift_type, start, end } = slot;

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
              date: formattedDate,
              start_time: startTime.format("HH:mm:ss"),
              end_time: slotEnd.format("HH:mm:ss"),
              patient_id: null,
            });

            startTime.add(slotDuration, "minutes");
          }

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

const getDoctorScheduleDays = async (req, res) => {
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

const getAppointmentSlotsByDoctorInDay = async (req, res) => {
  const { doctorId } = req.params;
  const { hospitalId, date } = req.query;

  try {
    const formattedDate = moment(date).format("YYYY-MM-DD");

    const doctorSchedule = await DoctorSchedule.findAll({
      where: {
        doctor_id: doctorId,
        hospital_id: hospitalId,
        [Op.and]: [
          sequelize.where(
            sequelize.fn("DATE", sequelize.col("date")),
            formattedDate
          ),
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

    doctorSchedule.forEach((schedule) => {
      schedule.appointmentSlots.sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );
    });

    const shiftPriority = {
      morning: 1,
      afternoon: 2,
      evening: 3,
      night: 4,
    };

    const grouped = doctorSchedule.reduce((acc, curr) => {
      const date = curr.date;
      if (!acc[date]) {
        acc[date] = { date, shifts: [] };
      }
      acc[date].shifts.push(curr);
      return acc;
    }, {});

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

// const getDoctorScheduleAfterCurrentDate = async (req, res) => {
//   const { hospitalId } = req.query;
//   try {
//     const currentDoctor = await Doctor.findOne({
//       where: {
//         user_id: req.user.id,
//       },
//     });

//     const currentDate = moment();
//     const nextDaySameTime = currentDate
//       .add(1, "days")
//       .format("YYYY-MM-DD HH:mm");

//     const doctorSchedule = await DoctorSchedule.findAll({
//       where: {
//         doctor_id: currentDoctor.id,

//         date: {
//           [Op.gte]: nextDaySameTime,
//         },
//       },
//     });
//     res.status(200).json(doctorSchedule);
//   } catch (error) {
//     console.log("Error getting doctor schedule after current date:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

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

const getDoctorScheduleBySpecialtyInHospital = async (req, res) => {
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

const getDoctorAllSchedule = async (req, res) => {
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

const getDoctorScheduleOfManager = async (req, res) => {
  const { doctorId } = req.params;

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

    // Lấy tất cả lịch làm việc của bác sĩ tại bệnh viện này
    const schedules = await DoctorSchedule.findAll({
      where: {
        doctor_id: doctorId,
        hospital_id: hospital.id,
        isDeleted: false,
      },
      include: [
        {
          model: AppointmentSlot,
          as: "appointmentSlots",
          attributes: ["id", "start_time", "end_time", "isBooked"],
        },
      ],
      order: [
        ["date", "ASC"],
        ["start_time", "ASC"],
      ],
    });

    res.status(200).json({ schedules });
  } catch (error) {
    console.error("Error getting doctor schedules:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createDoctorSchedule,
  getAppointmentSlotsByDoctorInDay,
  getDoctorScheduleDays,
  getDoctorWorkplace,
  getDoctorScheduleBySpecialtyInHospital,
  getDoctorAllSchedule,
  check,
  getDoctorScheduleOfManager,
};
