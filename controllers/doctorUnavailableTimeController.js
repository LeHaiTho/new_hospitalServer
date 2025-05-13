const sequelize = require("../config/database");
const DoctorUnavailableTime = require("../models/doctorUnavailableTimeModel");
const Appointment = require("../models/appointmentModel");
const { Op } = require("sequelize");
const moment = require("moment");
const {
  Doctor,
  Hospital,
  AppointmentSlot,
  HospitalSpecialty,
} = require("../models");
const User = require("../models/userModel");
const DoctorSchedule = require("../models/doctorScheduleModel");
const DoctorSpecialty = require("../models/doctorSpecialtyModel");
const Specialty = require("../models/specialtyModel");
const DoctorHospital = require("../models/doctorHospitalModel");
const {
  createCancelAppointmentNotification,
} = require("./notificationController");

const createDoctorUnavailableTime = async (req, res) => {
  const { workplace, fromDate, fromTime, toDate, toTime, reason, title } =
    req.body;
  try {
    const unavailable_start_date = moment(
      `${fromDate} ${fromTime}`,
      "DD/MM/YYYY HH:mm"
    ).toDate();
    const unavailable_end_date = moment(
      `${toDate} ${toTime}`,
      "DD/MM/YYYY HH:mm"
    ).toDate();

    const currentDoctor = await Doctor.findOne({
      where: {
        user_id: req.user.id,
      },
    });
    const doctorUnavailableTime = await DoctorUnavailableTime.create({
      doctor_id: currentDoctor.id,
      hospital_id: workplace,
      unavailable_start_date,
      unavailable_end_date,
      reason,
      title,
      status: "pending",
    });
    res.status(200).json({
      message: "Doctor unavailable time created",
      doctorUnavailableTime,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
};

// lấy danh sách lịch hẹn nằm trong khoảng thời gian bác sĩ không khả dụng
const appointmentByDoctorUnavailableTime = async (req, res) => {
  const {
    doctor_id,
    hospital_id,
    unavailable_start_date,
    unavailable_end_date,
  } = req.body;
  try {
    const start = moment(unavailable_start_date)
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    const end = moment(unavailable_end_date)
      .utc()
      .format("YYYY-MM-DD HH:mm:ss");
    console.log("start", start);
    console.log("end", end);
    const appointment = await Appointment.findAll({
      where: {
        doctor_id,
        hospital_id,
        appointment_date: {
          [Op.between]: [start, end],
        },
      },
    });
    res.status(200).json({ message: "Appointment found", appointment });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
};
const getDoctorUnavailableTimeList = async (req, res) => {
  try {
    const currentDoctor = await Doctor.findOne({
      where: {
        user_id: req.user.id,
      },
    });
    const doctorUnavailableTime = await DoctorUnavailableTime.findAll({
      where: {
        doctor_id: currentDoctor.id,
      },

      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ doctorUnavailableTime });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
};
const getDoctorUnavailableTimeListByHospital = async (req, res) => {
  try {
    const currentHospital = await Hospital.findOne({
      where: {
        manager_id: req.user.id,
      },
    });
    const doctorUnavailableTime = await DoctorUnavailableTime.findAll({
      where: {
        hospital_id: currentHospital.id,
      },
      include: [
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullname", "avatar"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({ doctorUnavailableTime });
  } catch (error) {
    res.status(500).json({ message: error.message });
    console.log(error);
  }
};

const updateDoctorUnavailableTimeStatus = async (req, res) => {
  const { id } = req.params;
  const { status, reason_reject } = req.body;

  try {
    // Tìm bệnh viện của người quản lý hiện tại
    const currentHospital = await Hospital.findOne({
      where: {
        manager_id: req.user.id,
      },
    });

    if (!currentHospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    // Kiểm tra lý do từ chối khi từ chối đơn
    if (
      status === "rejected" &&
      (!reason_reject || reason_reject.trim() === "")
    ) {
      return res
        .status(400)
        .json({ message: "Lý do từ chối là bắt buộc khi hủy đơn" });
    }

    // Cập nhật trạng thái đơn nghỉ phép
    const updated = await DoctorUnavailableTime.update(
      {
        status,
        reason_reject: status === "rejected" ? reason_reject : null,
        updatedAt: new Date(),
      },
      {
        where: { id, hospital_id: currentHospital.id },
      }
    );

    if (updated[0] === 0) {
      return res.status(404).json({
        message: "Doctor unavailable time not found or not authorized",
      });
    }

    // Nếu đơn được duyệt, xử lý các lịch hẹn bị ảnh hưởng
    if (status === "approved") {
      // Lấy thông tin chi tiết về đơn nghỉ phép
      const doctorUnavailableTime = await DoctorUnavailableTime.findOne({
        where: { id },
        include: [
          {
            model: Doctor,
            as: "doctor",
            include: [
              {
                model: User,
                as: "user",
                attributes: ["fullname"],
              },
            ],
          },
          {
            model: Hospital,
            as: "hospital",
          },
        ],
      });

      if (!doctorUnavailableTime) {
        return res
          .status(404)
          .json({ message: "Doctor unavailable time not found" });
      }

      const { doctor_id, unavailable_start_date, unavailable_end_date } =
        doctorUnavailableTime;
      const doctorName = doctorUnavailableTime.doctor.user.fullname;

      console.log("Xử lý lịch hẹn cho bác sĩ ID:", doctor_id);

      // Tìm tất cả lịch hẹn của bác sĩ trong khoảng thời gian nghỉ
      const appointments = await Appointment.findAll({
        where: {
          doctor_id: doctor_id,
          appointment_date: {
            [Op.between]: [unavailable_start_date, unavailable_end_date],
          },
          status: "confirmed",
        },
        include: [
          {
            model: AppointmentSlot,
            as: "appointmentSlot",
          },
          {
            model: Hospital,
            as: "hospital",
          },
          {
            model: Specialty,
            as: "specialty",
          },
          {
            model: User,
            as: "user",
          },
        ],
      });

      console.log(`Tìm thấy ${appointments.length} lịch hẹn bị ảnh hưởng`);

      // Mảng lưu kết quả xử lý các lịch hẹn
      let processedAppointments = [];

      // Xử lý từng lịch hẹn
      for (const appointment of appointments) {
        const appointmentResult = {
          id: appointment.id,
          originalDoctor: doctorName,
          appointmentDate: moment(appointment.appointment_date).format(
            "DD/MM/YYYY"
          ),
          startTime: appointment.appointmentSlot?.start_time,
          endTime: appointment.appointmentSlot?.end_time,
          patientName: appointment.user?.fullname,
          isDoctorSpecial: appointment.isDoctorSpecial,
          action: "",
          newDoctor: null,
        };

        if (appointment.isDoctorSpecial) {
          // Lịch hẹn khám cá nhân - chuyển sang trạng thái waiting
          console.log(
            `Lịch hẹn ID ${appointment.id} là lịch hẹn cá nhân, chuyển sang trạng thái waiting`
          );

          await appointment.update({
            status: "waiting",
            updated_reason: `Bác sĩ ${doctorName} không thể khám trong thời gian này`,
          });

          // // Thông báo cho người dùng
          // await createCancelAppointmentNotification(
          //   appointment.user_id,
          //   appointment.id,
          //   appointment.hospital.name,
          //   moment(appointment.appointment_date).format("DD/MM/YYYY"),
          //   doctorName
          // );

          appointmentResult.action = "waiting";
          processedAppointments.push(appointmentResult);
        } else {
          // Lịch hẹn khám dịch vụ - tìm bác sĩ thay thế
          console.log(
            `Lịch hẹn ID ${appointment.id} là lịch hẹn dịch vụ, tìm bác sĩ thay thế`
          );

          const replacementDoctor = await findReplacementDoctor(
            appointment.hospital_id,
            appointment.specialty_id,
            appointment.appointment_date,
            appointment.appointmentSlot.start_time,
            appointment.appointmentSlot.end_time,
            doctor_id
          );

          if (replacementDoctor) {
            // Cập nhật lịch hẹn với bác sĩ mới
            console.log(
              `Tìm thấy bác sĩ thay thế: ${replacementDoctor.fullname}`
            );

            await appointment.update({
              doctor_id: replacementDoctor.id,
              updated_reason: `Bác sĩ ${doctorName} không thể khám trong thời gian này, đã được thay thế bởi bác sĩ ${replacementDoctor.fullname}`,
            });

            appointmentResult.action = "replaced";
            appointmentResult.newDoctor = replacementDoctor.fullname;
            processedAppointments.push(appointmentResult);
          } else {
            // Không tìm thấy bác sĩ thay thế, chuyển sang trạng thái waiting
            console.log(
              `Không tìm thấy bác sĩ thay thế cho lịch hẹn ID ${appointment.id}, chuyển sang trạng thái waiting`
            );

            await appointment.update({
              status: "waiting",
              updated_reason: `Bác sĩ ${doctorName} không thể khám trong thời gian này và không tìm thấy bác sĩ thay thế`,
            });

            // Thông báo cho người dùng
            // await createCancelAppointmentNotification(
            //   appointment.user_id,
            //   appointment.id,
            //   appointment.hospital.name,
            //   moment(appointment.appointment_date).format("DD/MM/YYYY"),
            //   doctorName
            // );

            appointmentResult.action = "waiting_no_replacement";
            processedAppointments.push(appointmentResult);
          }
        }
      }

      // Tìm lịch làm việc của bác sĩ trong khoảng thời gian nghỉ
      const doctorSchedules = await DoctorSchedule.findAll({
        where: {
          doctor_id: doctor_id,
          hospital_id: currentHospital.id,
          date: {
            [Op.between]: [
              moment(unavailable_start_date).format("YYYY-MM-DD"),
              moment(unavailable_end_date).format("YYYY-MM-DD"),
            ],
          },
        },
        include: [
          {
            model: AppointmentSlot,
            as: "appointmentSlots",
            where: {
              isBooked: false, // Chỉ lấy các slot chưa được đặt
            },
            required: false,
          },
        ],
      });

      console.log(
        `Tìm thấy ${doctorSchedules.length} lịch làm việc bị ảnh hưởng`
      );

      // Đánh dấu các slot chưa được đặt là đã xóa
      for (const schedule of doctorSchedules) {
        if (schedule.appointmentSlots && schedule.appointmentSlots.length > 0) {
          console.log(
            `Đánh dấu ${schedule.appointmentSlots.length} slot là đã xóa cho lịch làm việc ID ${schedule.id}`
          );

          await AppointmentSlot.update(
            { isDeleted: true },
            {
              where: {
                id: {
                  [Op.in]: schedule.appointmentSlots.map((slot) => slot.id),
                },
              },
            }
          );
        }
      }

      return res.status(200).json({
        message: "Đã duyệt đơn nghỉ phép và xử lý lịch hẹn",
        processedAppointments,
        doctorUnavailableTime,
      });
    } else {
      return res.status(200).json({
        message: `Đơn nghỉ phép đã được ${
          status === "rejected" ? "từ chối" : "cập nhật"
        }`,
      });
    }
  } catch (error) {
    console.error("Error updating doctor unavailable time:", error);
    return res
      .status(500)
      .json({ message: "Lỗi server", error: error.message });
  }
};

// Hàm tìm bác sĩ thay thế
const findReplacementDoctor = async (
  hospitalId,
  specialtyId,
  appointmentDate,
  startTime,
  endTime,
  excludeDoctorId
) => {
  try {
    // Tìm HospitalSpecialty để lấy ID
    const hospitalSpecialty = await HospitalSpecialty.findOne({
      where: {
        hospital_id: hospitalId,
        specialty_id: specialtyId,
      },
    });

    if (!hospitalSpecialty) {
      return null;
    }

    // Tìm tất cả bác sĩ cùng chuyên khoa và bệnh viện
    const doctors = await Doctor.findAll({
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullname"],
        },
        {
          model: DoctorSpecialty,
          as: "doctorSpecialties",
          where: {
            hospital_specialty_id: hospitalSpecialty.id,
          },
          required: true,
        },
        {
          model: DoctorHospital,
          as: "doctorHospital",
          where: {
            hospital_id: hospitalId,
            is_active: true,
          },
          required: true,
        },
      ],
      where: {
        id: {
          [Op.ne]: excludeDoctorId, // Loại trừ bác sĩ hiện tại
        },
      },
    });

    if (doctors.length === 0) {
      return null;
    }

    // Kiểm tra từng bác sĩ xem có lịch trống không
    for (const doctor of doctors) {
      // Kiểm tra xem bác sĩ có đơn nghỉ phép trong ngày này không
      const hasUnavailableTime = await DoctorUnavailableTime.findOne({
        where: {
          doctor_id: doctor.id,
          status: "approved",
          [Op.and]: [
            {
              unavailable_start_date: {
                [Op.lte]: appointmentDate,
              },
            },
            {
              unavailable_end_date: {
                [Op.gte]: appointmentDate,
              },
            },
          ],
        },
      });

      if (hasUnavailableTime) {
        continue;
      }

      // Kiểm tra xem bác sĩ có lịch làm việc trong ngày và giờ này không
      const doctorSchedule = await DoctorSchedule.findOne({
        where: {
          doctor_id: doctor.id,
          hospital_id: hospitalId,
          date: appointmentDate,
        },
        include: [
          {
            model: AppointmentSlot,
            as: "appointmentSlots",
            where: {
              start_time: startTime,
              end_time: endTime,
              isBooked: false, // Slot phải còn trống
              isDeleted: false, // Slot không bị xóa
            },
            required: true,
          },
        ],
      });

      if (doctorSchedule) {
        return {
          id: doctor?.id,
          fullname: doctor?.user,
          scheduleId: doctorSchedule?.id,
          slotId: doctorSchedule?.appointmentSlots[0]?.id,
        };
      } else {
        console.log(
          `Bác sĩ ${doctor.user.fullname} không có lịch trống phù hợp`
        );
      }
    }

    // Không tìm thấy bác sĩ thay thế phù hợp
    console.log("Không tìm thấy bác sĩ thay thế phù hợp");
    return null;
  } catch (error) {
    console.error("Error finding replacement doctor:", error);
    return null;
  }
};

module.exports = {
  createDoctorUnavailableTime,
  appointmentByDoctorUnavailableTime,
  getDoctorUnavailableTimeList,
  getDoctorUnavailableTimeListByHospital,
  updateDoctorUnavailableTimeStatus,
};
