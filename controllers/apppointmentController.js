const sequelize = require("../config/database");
const moment = require("moment");
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const AppointmentSlot = require("../models/appointmentSlotModel");
const DoctorSchedule = require("../models/doctorScheduleModel");
const Doctor = require("../models/doctorModel");
const Hospital = require("../models/hospitalModel");
const Specialty = require("../models/specialtyModel");
const StaffHospital = require("../models/staffHospitalModel");
const HospitalSpecialty = require("../models/hospitalSpecialtyModel");
const { v4: uuidv4 } = require("uuid");
const {
  createNewAppointmentNotification,
} = require("./notificationController");
const { Op } = require("sequelize");
const {
  PushToken,
  ReminderAppointment,
  FamilyMember,
  DoctorHospital,
  DoctorSpecialty,
} = require("../models");
const createAppointment = async (req, res) => {
  const {
    profile,
    reasonForVisit,
    doctor,
    selectedDate,
    slot,
    selectedHospital,
    selectedSpecialty,
    paymentMethod,
    isDoctorSpecial,
    isZaloPay,
    consultationFee,
  } = req.body;
  try {
    const generateAppointmentCode = async () => {
      const dateStr = new Date().getFullYear().toString();
      const uniqueId = uuidv4().split("-")[0].toUpperCase(); // Lấy phần đầu của UUID
      return `PK${dateStr}${uniqueId}`;
    };
    const appointmentCode = await generateAppointmentCode();
    const doctorScheduleId = await AppointmentSlot.findOne({
      where: {
        id: slot.id,
      },
    });
    let newAppointment;

    let appointmentStatus = "confirmed";

    if (paymentMethod === "e-wallet" && isZaloPay) {
      appointmentStatus = "pending";
    }

    if (paymentMethod === "e-wallet") {
      newAppointment = await Appointment.create({
        appointment_code: appointmentCode,
        user_id: req.user.id,
        hospital_id: selectedHospital?.id || selectedHospital,
        doctor_id: doctor.id,
        specialty_id: selectedSpecialty,
        reason_for_visit: reasonForVisit,
        doctorSchedule_id: doctorScheduleId.doctorSchedule_id,
        appointmentSlot_id: slot.id,
        appointment_date: selectedDate,
        payment_method: paymentMethod,
        status: appointmentStatus,
        price: consultationFee,
        // selectedHospital?.hospitalSpecialty?.[0]?.consultation_fee ||
        // doctor.consultation_fee[0],
        payment_status: "pending",
        isDoctorSpecial: isDoctorSpecial,
      });
    }
    if (paymentMethod === "cash") {
      newAppointment = await Appointment.create({
        appointment_code: appointmentCode,
        user_id: req.user.id,
        hospital_id: selectedHospital?.id || selectedHospital,
        doctor_id: doctor.id,
        specialty_id: selectedSpecialty,
        reason_for_visit: reasonForVisit,
        doctorSchedule_id: doctorScheduleId.doctorSchedule_id,
        appointmentSlot_id: slot.id,
        appointment_date: selectedDate,
        payment_method: paymentMethod,
        status: appointmentStatus,
        price: consultationFee,
        // selectedHospital?.hospitalSpecialty?.[0]?.consultation_fee ||
        // doctor.consultation_fee[0],
        payment_status: "pending",
        isDoctorSpecial: isDoctorSpecial,
      });
    }

    if (profile.relationship) {
      await Appointment.update(
        {
          familyMember_id: profile.id,
        },
        {
          where: {
            id: newAppointment.id,
          },
        }
      );
    }

    let reminderTime;

    if (slot.id) {
      await AppointmentSlot.update(
        {
          isBooked: true,
        },
        {
          where: {
            id: slot.id,
          },
        }
      );
      const slotTime = await AppointmentSlot.findOne({
        where: {
          id: slot.id,
        },
      });

      // Tính thời gian nhắc nhở
      const now = moment().tz("Asia/Bangkok").toDate();
      reminderTime = [
        moment(now).add(1, "minutes").toDate(),
        moment(now).add(3, "minutes").toDate(),
      ];
      // reminderTime = calculateReminderTimes(selectedDate, slotTime.start_time);
    }

    const hospitalName = await Hospital.findOne({
      where: {
        id: selectedHospital?.id || selectedHospital,
      },
    });

    if (paymentMethod === "cash" && reminderTime) {
      await createNewAppointmentNotification(
        req.user.id,
        newAppointment.id,
        hospitalName.name,
        moment(selectedDate).format("DD/MM/YYYY")
      );
      reminderTime.forEach(async (time) => {
        await ReminderAppointment.create({
          appointment_id: newAppointment.id,
          reminder_time: time,
        });
      });
    }

    res.status(200).json({
      message: "Appointment created successfully",
      newAppointment,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to create appointment",
      error: error.message,
    });
  }
};

// lấy lịch hẹn của người dùng
const getAppointmentsByUserId = async (req, res) => {
  try {
    // điều kiện lọc
    const { status, payment_status, payment_method, appointment_date } =
      req.query;

    let filterCondition = {
      user_id: req.user.id,
    };
    if (status) {
      filterCondition.status = status;
    }
    const appointments = await Appointment.findAll({
      where: filterCondition,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "avatar",
            "gender",
            "date_of_birth",
          ],
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address"],
        },
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name"],
        },
      ],
      order: [
        ["status", "ASC"],
        ["doctorSchedule", "date", "DESC"],
        [
          { model: AppointmentSlot, as: "appointmentSlot" },
          "start_time",
          "ASC",
        ],
      ],
    });

    const appointmentList = appointments?.map((appointment) => {
      return {
        id: appointment.id,
        status: appointment.status,
        payment_status: appointment.payment_status,
        payment_method: appointment.payment_method,
        reason: appointment.reason_for_visit,
        appointmentSlot: appointment.appointmentSlot,
        doctorSchedule: appointment.doctorSchedule,
        appointment_code: appointment.appointment_code,
        doctor: {
          id: appointment.doctor.id,
          fullname: appointment.doctor.user.fullname,
          avatar: appointment.doctor.user.avatar,
        },
        hospital: appointment.hospital,
        specialty: appointment.specialty,
        patient: appointment.user,
      };
    });
    res.status(200).json({
      message: "Get appointment successfully",
      appointmentList,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to get appointment",
    });
  }
};

// lấy lịch hẹn của bác sĩ
const getAppointmentsByDoctorId = async (req, res) => {
  try {
    const {
      status,
      payment_status,
      date_from,
      date_to,
      page = 1,
      limit = 10,
    } = req.query;
    let doctorId = req.params.doctorId;

    // If no doctorId in params, get it from the current user (assuming user is a doctor)
    if (!doctorId) {
      const doctor = await Doctor.findOne({
        where: { user_id: req.user.id },
      });

      if (!doctor) {
        return res.status(400).json({
          message: "User is not a doctor or doctor not found",
        });
      }

      doctorId = doctor.id;
    }

    // điều kiện lọc
    let filterCondition = {
      doctor_id: doctorId,
    };

    // Handle multiple statuses separated by comma
    if (status) {
      const statusArray = status.split(",").map((s) => s.trim());
      if (statusArray.length > 1) {
        filterCondition.status = {
          [Op.in]: statusArray,
        };
      } else {
        filterCondition.status = status;
      }
    }

    if (payment_status) {
      filterCondition.payment_status = payment_status;
    }

    if (date_from || date_to) {
      filterCondition.appointment_date = {};
      if (date_from) {
        filterCondition.appointment_date[Op.gte] = date_from;
      }
      if (date_to) {
        filterCondition.appointment_date[Op.lte] = date_to;
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: appointments } = await Appointment.findAndCountAll({
      where: filterCondition,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "avatar",
            "gender",
            "date_of_birth",
          ],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address"],
        },
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullname", "avatar"],
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name"],
        },
      ],
      order: [
        ["status", "ASC"],
        ["doctorSchedule", "date", "DESC"],
        [
          { model: AppointmentSlot, as: "appointmentSlot" },
          "start_time",
          "ASC",
        ],
      ],
      limit: parseInt(limit),
      offset: offset,
    });

    const appointmentList = appointments?.map((appointment) => {
      return {
        id: appointment.id,
        status: appointment.status,
        payment_status: appointment.payment_status,
        payment_method: appointment.payment_method,
        reason: appointment.reason_for_visit,
        appointmentSlot: appointment.appointmentSlot,
        doctorSchedule: appointment.doctorSchedule,
        appointment_code: appointment.appointment_code,
        doctor: {
          id: appointment.doctor.id,
          fullname: appointment.doctor.user.fullname,
          avatar: appointment.doctor.user.avatar,
        },
        hospital: appointment.hospital,
        specialty: appointment.specialty,
        patient: appointment.familyMembers?.fullname
          ? {
              id: appointment.familyMembers.id,
              fullname: appointment.familyMembers.fullname,
              phone: appointment.familyMembers.phone,
              address: appointment.familyMembers.address,
              gender: appointment.familyMembers.gender,
              date_of_birth: appointment.familyMembers.date_of_birth,
            }
          : appointment.user,
        patientType: appointment.familyMembers ? "family_member" : "user",
      };
    });

    res.status(200).json({
      success: true,
      data: appointmentList,
      message: "Get doctor appointments successfully",
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to get doctor appointments",
      error: error.message,
    });
  }
};

// lấy lịch sử khám của bệnh viện
const getHistoryBookingOfHospital = async (req, res) => {
  const user = req.user;
  const {
    page = 1,
    limit = 10,
    search,
    doctorId,
    startDate,
    endDate,
    status,
  } = req.query;

  try {
    const hospital = await Hospital.findOne({
      where: {
        manager_id: user.id,
      },
    });

    if (!hospital) {
      return res.status(404).json({
        message: "Hospital not found for this manager",
        data: [],
        total: 0,
        page: parseInt(page),
        limit: parseInt(limit),
      });
    }

    const where = {
      hospital_id: hospital.id,
      [Op.and]: [
        doctorId ? { doctor_id: doctorId } : {},
        // Lọc theo doctorSchedule.date thay vì appointment_date
        startDate ? { "$doctorSchedule.date$": { [Op.gte]: startDate } } : {},
        endDate ? { "$doctorSchedule.date$": { [Op.lte]: endDate } } : {},
        status
          ? status === "pending"
            ? { status: { [Op.in]: ["pending", "confirmed"] } }
            : { status }
          : {},
      ],
    };

    const searchCondition = search
      ? {
          [Op.or]: [
            { "$user.fullname$": { [Op.iLike]: `%${search}%` } },
            { "$familyMembers.fullname$": { [Op.iLike]: `%${search}%` } },
            { "$doctor.user.fullname$": { [Op.iLike]: `%${search}%` } },
            { appointment_code: { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // Get total count for pagination
    const totalCount = await Appointment.count({
      where: {
        ...where,
        ...searchCondition,
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullname"],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
          attributes: ["id", "fullname"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date"],
          required: true, // INNER JOIN để đảm bảo có doctorSchedule
        },
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullname"],
            },
          ],
        },
      ],
    });

    const appointments = await Appointment.findAll({
      where: {
        ...where,
        ...searchCondition,
      },
      attributes: [
        "id",
        "appointment_code",
        "status",
        "appointment_date",
        "payment_method",
        "reason_for_visit",
        "price",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "fullname"],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
          attributes: ["id", "fullname"],
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date"],
          required: true, // INNER JOIN để đảm bảo có doctorSchedule
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address"],
        },
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullname"],
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name"],
        },
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [
        [{ model: DoctorSchedule, as: "doctorSchedule" }, "date", "DESC"], // Sắp xếp theo doctorSchedule.date
        [
          { model: AppointmentSlot, as: "appointmentSlot" },
          "start_time",
          "ASC",
        ],
      ],
    });

    // Helper function to map status
    const getStatusDisplay = (status) => {
      switch (status) {
        case "pending":
        case "confirmed":
          return "Lịch sắp tới";
        case "cancelled":
          return "Đã hủy";
        case "completed":
          return "Đã hoàn thành";
        default:
          return status;
      }
    };

    const data = appointments?.map((appt) => {
      return {
        id: appt.id,
        appointmentCode: appt.appointment_code, // Use appointment_code instead of id
        patientName: appt.familyMembers?.fullname || appt.user?.fullname,
        doctorName: appt.doctor?.user?.fullname,
        specialty: appt.specialty?.name,
        appointmentDate: appt.doctorSchedule?.date // Sử dụng doctorSchedule.date
          ? moment(appt.doctorSchedule.date).format("DD/MM/YYYY")
          : "N/A",
        appointmentTime: appt.appointmentSlot
          ? `${appt.appointmentSlot.start_time} - ${appt.appointmentSlot.end_time}`
          : "N/A",
        status: getStatusDisplay(appt.status), // Map status according to requirements
        originalStatus: appt.status, // Keep original status for filtering
        reasonForVisit: appt.reason_for_visit,
        price: appt.price,
      };
    });

    console.log(
      `Total appointments: ${totalCount}, Page: ${page}, Limit: ${limit}`
    );

    res.status(200).json({
      message: "Get history booking of hospital successfully",
      data,
      total: totalCount,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(totalCount / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error in getHistoryBookingOfHospital:", error);
    res.status(500).json({
      message: "Failed to get history booking",
      error: error.message,
      data: [],
      total: 0,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  }
};

// lấy chi tiết lịch hẹn theo id
const getAppointmentById = async (req, res) => {
  const { id } = req.params;
  const { role, id: userId } = req.user;

  // nếu khác role customer
  const condition =
    role && role === "customer" ? { id, user_id: userId } : { id };
  try {
    const appointment = await Appointment.findOne({
      where: condition,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "avatar",
            "gender",
            "date_of_birth",
          ],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date", "slot_duration"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address"],
        },
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name"],
        },
      ],
    });
    if (!appointment) {
      return res.status(404).json({
        message:
          role === "customer"
            ? "Không tìm thấy lịch hẹn của bạn với ID được cung cấp."
            : "Không tìm thấy lịch hẹn với ID được cung cấp.",
      });
    }
    const appointmentDetail = {
      id: appointment.id,
      status: appointment.status,
      payment_status: appointment.payment_status,
      payment_method: appointment.payment_method,
      reason: appointment.reason_for_visit,
      appointmentSlot: appointment.appointmentSlot,
      appointmentFee: appointment.price,

      doctorSchedule: appointment.doctorSchedule,
      appointment_code: appointment.appointment_code,

      doctor: {
        id: appointment.doctor.id,
        fullname: appointment.doctor.user.fullname,
        avatar: appointment.doctor.user.avatar,
      },
      hospital: appointment.hospital,
      specialty: appointment.specialty,
      patient: appointment.user,
      member: appointment.familyMembers,
    };
    res.status(200).json({
      message: "Get appointment successfully",
      appointmentDetail,
    });
  } catch (error) {
    console.log(error);
  }
};

// lấy chi tiết lịch hẹn theo mã
const getAppointmentByCode = async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findOne({
      where: { appointment_code: id },
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "avatar",
            "gender",
            "date_of_birth",
            "email",
          ],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "gender",
            "date_of_birth",
            "relationship",
          ],
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date", "slot_duration"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address", "email"],
        },
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id", "certificate_id", "summary", "description"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "fullname", "avatar", "phone", "email"],
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name", "description"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        status: 404,
        message:
          "Không tìm thấy lịch hẹn với mã được cung cấp. Vui lòng kiểm tra lại.",
        data: null,
      });
    }

    // Format patient info - prioritize family member over user
    const patient = appointment.familyMembers || appointment.user;
    const patientType = appointment.familyMembers ? "family_member" : "user";

    const appointmentDetail = {
      id: appointment.id,
      appointment_code: appointment.appointment_code,
      status: appointment.status,
      payment_status: appointment.payment_status,
      payment_method: appointment.payment_method,
      reason_for_visit: appointment.reason_for_visit,
      appointment_date: appointment.appointment_date,
      price: appointment.price,

      // Patient information
      patient: {
        id: patient.id,
        fullname: patient.fullname,
        phone: patient.phone,
        address: patient.address,
        gender: patient.gender,
        date_of_birth: patient.date_of_birth,
        email: patient.email || null,
        type: patientType,
        relationship: appointment.familyMembers?.relationship || null,
      },

      // Appointment slot information
      appointmentSlot: {
        id: appointment.appointmentSlot.id,
        start_time: appointment.appointmentSlot.start_time,
        end_time: appointment.appointmentSlot.end_time,
      },

      // Doctor schedule information
      doctorSchedule: {
        id: appointment.doctorSchedule.id,
        date: appointment.doctorSchedule.date,
        slot_duration: appointment.doctorSchedule.slot_duration,
      },

      // Hospital information
      hospital: {
        id: appointment.hospital.id,
        name: appointment.hospital.name,
        address: appointment.hospital.address,

        email: appointment.hospital.email,
      },

      // Doctor information
      doctor: {
        id: appointment.doctor.id,
        certificate_id: appointment.doctor.certificate_id,
        summary: appointment.doctor.summary,
        description: appointment.doctor.description,
        user: {
          id: appointment.doctor.user.id,
          fullname: appointment.doctor.user.fullname,
          avatar: appointment.doctor.user.avatar,
          phone: appointment.doctor.user.phone,
          email: appointment.doctor.user.email,
        },
      },

      // Specialty information
      specialty: {
        id: appointment.specialty.id,
        name: appointment.specialty.name,
        description: appointment.specialty.description,
      },

      // Additional formatted fields for UI
      formatted: {
        appointment_date: appointment.appointment_date,
        appointment_time_range: `${appointment.appointmentSlot.start_time} - ${appointment.appointmentSlot.end_time}`,
        patient_display_name: patient.fullname,
        doctor_display_name: appointment.doctor.user.fullname,
        hospital_display_name: appointment.hospital.name,
        specialty_display_name: appointment.specialty.name,
      },
    };

    res.status(200).json({
      success: true,
      status: 200,
      message: "Lấy thông tin lịch hẹn thành công",
      data: appointmentDetail,
      // Keep old format for backward compatibility
      appointmentDetail: appointmentDetail,
    });
  } catch (error) {
    console.error("Error in getAppointmentByCode:", error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Lỗi server khi lấy thông tin lịch hẹn",
      error: error.message,
      data: null,
    });
  }
};

const getAppointmentCompletedByUserId = async (req, res) => {
  try {
    const { id } = req.params;

    // Điều kiện lấy dữ liệu
    const whereCondition = {
      status: "completed",
    };

    if (id === String(req.user.id)) {
      // Lấy tất cả lịch hẹn đã hoàn thành của user chính
      whereCondition.user_id = req.user.id;
      whereCondition.familyMember_id = null;
    } else {
      // Lấy lịch hẹn đã hoàn thành theo memberID
      whereCondition.familyMember_id = id;
    }

    const appointment = await Appointment.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "avatar",
            "gender",
            "date_of_birth",
          ],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date", "slot_duration"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address"],
        },
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name"],
        },
      ],
      order: [["doctorSchedule", "date", "DESC"]], // Sắp xếp giảm dần theo ngày trong DoctorSchedule
    });

    res.status(200).json({
      message: "Get appointment completed successfully",
      appointment,
    });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({
      message: "Error fetching appointments",
      error: error.message,
    });
  }
};

// danh sách lịch hẹn của bệnh viện (dựa vào id của staff và bệnh viện)
// const getAllAppointmentsByHospitalId = async (req, res) => {
//   try {
//     const staffOfHospital = await StaffHospital.findOne({
//       where: {
//         user_id: req.user.id,
//       },
//     });
//     console.log(staffOfHospital);
//     const appointments = await Appointment.findAll({
//       where: {
//         hospital_id: staffOfHospital.hospital_id,
//       },
//       include: [
//         {
//           model: User,
//           as: "user",
//           attributes: [
//             "id",
//             "fullname",
//             "phone",
//             "address",
//             "avatar",
//             "gender",
//             "date_of_birth",
//           ],
//         },
//         {
//           model: AppointmentSlot,
//           as: "appointmentSlot",
//           attributes: ["id", "start_time", "end_time"],
//         },
//         {
//           model: DoctorSchedule,
//           as: "doctorSchedule",
//           attributes: ["id", "date"],
//         },
//         {
//           model: Doctor,
//           as: "doctor",
//           include: [
//             {
//               model: User,
//               as: "user",
//             },
//           ],
//         },
//         {
//           model: Specialty,
//           as: "specialty",
//           attributes: ["id", "name"],
//         },
//       ],
//       order: [
//         ["status", "ASC"],
//         ["doctorSchedule", "date", "ASC"],
//         [
//           { model: AppointmentSlot, as: "appointmentSlot" },
//           "start_time",
//           "ASC",
//         ],
//       ],
//     });

//     const appointmentList = appointments?.map((appointment) => {
//       return {
//         id: appointment.id,
//         status: appointment.status,
//         payment_status: appointment.payment_status,
//         payment_method: appointment.payment_method,
//         reason: appointment.reason_for_visit,
//         appointmentSlot: appointment.appointmentSlot,
//         doctorSchedule: appointment.doctorSchedule,
//         appointment_code: appointment.appointment_code,
//         doctor: {
//           id: appointment.doctor.id,
//           fullname: appointment.doctor.user.fullname,
//         },
//         hospital: appointment.hospital,
//         specialty: appointment.specialty,
//         patient: appointment.user,
//         members: appointment.user.familyMembers,
//         // appointment_date: appointment.appointment_date,
//       };
//     });
//     res.status(200).json({
//       message: "Get appointment successfully",
//       appointmentList,
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       message: "Failed to get appointment",
//     });
//   }
// };

// Cập nhật trạng thái lịch hẹn sau khi thanh toán
const updateAppointmentStatusAfterPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status, status = "confirmed" } = req.body;

    // Cập nhật trạng thái thanh toán và lịch hẹn
    await Appointment.update({ payment_status, status }, { where: { id } });

    // Lấy thông tin lịch hẹn
    const appointment = await Appointment.findOne({
      where: { id },
      include: [
        {
          model: Hospital,
          as: "hospital",
        },
      ],
    });

    if (appointment) {
      // Tạo thông báo
      await createNewAppointmentNotification(
        appointment.user_id,
        appointment.id,
        appointment.hospital.name,
        moment(appointment.appointment_date).format("DD/MM/YYYY")
      );

      // Lấy thông tin về thời gian của lịch hẹn
      const appointmentSlotInfo = await AppointmentSlot.findOne({
        where: { id: appointment.appointmentSlot_id },
      });

      const doctorScheduleInfo = await DoctorSchedule.findOne({
        where: { id: appointment.doctorSchedule_id },
      });

      // Tính thời gian nhắc nhở
      const now = moment().tz("Asia/Bangkok").toDate();
      const reminderTime = [
        moment(now).add(1, "minutes").toDate(),
        moment(now).add(3, "minutes").toDate(),
      ];

      // Tạo lịch nhắc nhở
      reminderTime.forEach(async (time) => {
        await ReminderAppointment.create({
          appointment_id: appointment.id,
          reminder_time: time,
        });
      });
    }

    res.status(200).json({
      message: "Update appointment status successfully",
    });
  } catch (error) {
    console.error("Error updating appointment status:", error);
    res.status(500).json({
      message: "Failed to update appointment status",
      error: error.message,
    });
  }
};
// cập nhật trạng thái lịch hẹn
// const updateAppointmentStatusById = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   try {
//     const updatedAppointment = await Appointment.update(
//       { status, staff_id: req.user.id, updatedAt: new Date() },
//       { where: { id } }
//     );
//     const appointmentSlotId = await Appointment.findOne({
//       where: { id },
//       attributes: ["appointmentSlot_id"],
//     });
//     const changeSlotStatus = await AppointmentSlot.update(
//       { isBooked: false },
//       { where: { id: appointmentSlotId.appointmentSlot_id } }
//     );
//     const appointment = await Appointment.findOne({
//       where: { id },
//     });
//     const user = await User.findOne({
//       where: {
//         id: appointment.user_id,
//       },
//     });
//     const hospitalName = await Hospital.findOne({
//       where: {
//         id: appointment.hospital_id,
//       },
//     });
//     const appointmentDate = moment(appointment.appointment_date).format(
//       "DD/MM/YYYY"
//     );

//     if (updatedAppointment) {
//       await createAppointmentNotification(
//         user.id,
//         id,
//         hospitalName.name,
//         appointmentDate,
//         status
//       );
//     }
//     res.status(200).json({
//       message: "Update appointment status successfully",
//     });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({
//       message: "Failed to update appointment status",
//     });
//   }
// };

// lấy lịch hẹn gần tới
const getAppointmentSoon = async (req, res) => {
  try {
    const appointmentList = await Appointment.findAll({
      where: {
        user_id: req.user.id,
        appointment_date: {
          [Op.gte]: new Date(),
        },
        status: "confirmed",
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "phone",
            "address",
            "avatar",
            "gender",
            "date_of_birth",
          ],
        },
        {
          model: FamilyMember,
          as: "familyMembers",
        },
        {
          model: AppointmentSlot,
          as: "appointmentSlot",
          attributes: ["id", "start_time", "end_time"],
        },
        {
          model: DoctorSchedule,
          as: "doctorSchedule",
          attributes: ["id", "date", "slot_duration"],
        },
        {
          model: Hospital,
          as: "hospital",
          attributes: ["id", "name", "address"],
        },
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
            },
          ],
        },
        {
          model: Specialty,
          as: "specialty",
          attributes: ["id", "name"],
        },
      ],
    });
    const appointmentSoon = appointmentList?.map((appointment) => {
      return {
        id: appointment.id,
        status: appointment.status,
        payment_status: appointment.payment_status,
        payment_method: appointment.payment_method,
        reason: appointment.reason_for_visit,
        appointmentSlot: appointment.appointmentSlot,

        doctorSchedule: appointment.doctorSchedule,
        appointment_code: appointment.appointment_code,
        doctor: {
          id: appointment.doctor.id,
          fullname: appointment.doctor.user.fullname,
          avatar: appointment.doctor.user.avatar,
        },
        hospital: appointment.hospital,
        specialty: appointment.specialty,
        patient: appointment.user,
        member: appointment.familyMembers,
      };
    });
    res.status(200).json({
      appointmentSoon,
    });
  } catch (error) {
    console.log(error);
  }
};

// lấy ra những cuộc hẹn đang cần cảnh báo dời lịch
const getAppointmentNeedChange = async (req, res) => {
  try {
    const appointmentNeedChange = await Appointment.findAll({
      where: {
        status: "waiting",
        user_id: req.user.id,
        isDoctorSpecial: true,
      },
      include: [
        {
          model: Hospital,
          as: "hospital",
        },
        {
          model: Doctor,
          as: "doctor",
          include: [
            {
              model: User,
              as: "user",
            },
          ],
        },
      ],
    });
    res.status(200).json({
      appointmentNeedChange,
    });
  } catch (error) {
    console.log(error);
  }
};

const suggestAppointment = async (req, res) => {
  const { appointmentNeedChange } = req.body;

  try {
    const originalAppointment = await Appointment.findOne({
      where: {
        id: appointmentNeedChange,
        status: "waiting",
      },
      include: [
        { model: Hospital, as: "hospital" },
        { model: Specialty, as: "specialty" },
        { model: Doctor, as: "doctor" },
        { model: DoctorSchedule, as: "doctorSchedule" },
        { model: AppointmentSlot, as: "appointmentSlot" },
      ],
    });

    if (!originalAppointment) {
      return res
        .status(404)
        .json({ message: "Appointment not found or not in waiting status." });
    }

    const hospitalAndSpecial = await HospitalSpecialty.findOne({
      where: {
        hospital_id: originalAppointment.hospital_id,
        specialty_id: originalAppointment.specialty_id,
      },
    });

    if (!hospitalAndSpecial) {
      return res
        .status(404)
        .json({ message: "No matching hospital-specialty found." });
    }

    const doctorFee = await DoctorSpecialty.findOne({
      where: {
        hospital_specialty_id: hospitalAndSpecial.id,
        doctor_id: originalAppointment.doctor_id,
      },
    });

    const doctorsWithMatchingFee = await DoctorSpecialty.findAll({
      where: {
        hospital_specialty_id: hospitalAndSpecial.id,
        consultation_fee: doctorFee.consultation_fee,
        doctor_id: {
          [Op.ne]: originalAppointment.doctor_id,
        },
      },
      include: [
        {
          model: Doctor,
          as: "doctor",
          include: [{ model: User, as: "user" }],
        },
      ],
    });

    const doctorIds = doctorsWithMatchingFee.map((doc) => doc.doctor_id);

    const availableSchedules = await DoctorSchedule.findAll({
      where: {
        date: originalAppointment.doctorSchedule.date,
        doctor_id: doctorIds,
      },
    });

    const scheduleIds = availableSchedules.map((schedule) => schedule.id);

    const availableSlots = await AppointmentSlot.findAll({
      where: {
        doctorSchedule_id: scheduleIds,
        isBooked: false,
        isDeleted: false,
        start_time: {
          [Op.gte]: originalAppointment.appointmentSlot.start_time,
        },
        end_time: {
          [Op.lte]: originalAppointment.appointmentSlot.end_time,
        },
      },
      include: [{ model: DoctorSchedule, as: "doctorSchedule" }], // Include thông tin DoctorSchedule
    });

    res.status(200).json({
      suggestedAppointments: availableSlots.map((slot) => ({
        slot,
        doctor: doctorsWithMatchingFee.find(
          (doc) => doc.doctor_id === slot.doctorSchedule.doctor_id
        ),
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while fetching suggestions.",
      error,
    });
  }
};
// khách hàng thay đổi lịch hẹn sang lịch hẹn mới
const changeAppointment = async (req, res) => {
  const {
    original_appointment_id,
    doctor_id,
    user_id,
    familyMember_id,
    hospital_id,
    doctorSchedule_id,
    appointmentSlot_id,
    specialty_id,
    reason_for_visit,
    appointment_date,
    payment_status,
    payment_method,
  } = req.body;
  try {
    const generateAppointmentCode = async () => {
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const count = (await Appointment.count()) || 0; // Đảm bảo count không null
      return `PK${dateStr}${(count + 1).toString().padStart(4, "0")}`;
    };
    const appointmentCode = await generateAppointmentCode();
    const newChangeAppointment = await Appointment.create({
      appointment_code: appointmentCode,
      original_appointment_id,
      doctor_id,
      user_id,
      hospital_id,
      doctorSchedule_id,
      appointmentSlot_id,
      specialty_id,
      reason_for_visit,
      appointment_date,
      payment_status,
      payment_method,
      status: "confirmed",
    });
    if (familyMember_id) {
      await Appointment.update(
        { familyMember_id },
        { where: { id: newChangeAppointment.id } }
      );
    }
    // cập nhật lịch hẹn của bác sĩ
    await AppointmentSlot.update(
      { isBooked: true },
      { where: { id: appointmentSlot_id } }
    );
    // cập nhật trạng thái lịch hẹn của lịch hẹn cũ
    await Appointment.update(
      { status: "updated" },
      { where: { id: original_appointment_id } }
    );

    // Lấy thông tin về thời gian của lịch hẹn
    const appointmentSlotInfo = await AppointmentSlot.findOne({
      where: { id: appointmentSlot_id },
    });

    // Tính thời gian nhắc nhở dựa trên ngày và giờ hẹn
    // Tạo lịch nhắc nhở
    const now = moment().tz("Asia/Bangkok").toDate();
    const reminderTime = [
      moment(now).add(1, "minutes").toDate(),
      moment(now).add(3, "minutes").toDate(),
    ];

    // const reminderTime = calculateReminderTimes(
    //   appointment_date,
    //   appointmentSlotInfo.start_time
    // );

    const hospitalName = await Hospital.findOne({
      where: {
        id: hospital_id,
      },
    });

    await createNewAppointmentNotification(
      req.user.id,
      newChangeAppointment.id,
      hospitalName.name,
      moment(appointment_date).format("DD/MM/YYYY")
    );

    reminderTime.forEach(async (time) => {
      await ReminderAppointment.create({
        appointment_id: newChangeAppointment.id,
        reminder_time: time,
      });
    });

    res.status(200).json({
      message: "Change appointment successfully",
      newChangeAppointment,
    });
  } catch (error) {
    console.log(error);
  }
};

// hủy lịch hẹn
const cancelAppointment = async (req, res) => {
  const { id } = req.params;
  console.log(id);
  try {
    const cancelAppointment = await Appointment.update(
      { status: "cancelled", isDeleted: true },
      { where: { id: id } }
    );
    const appointment = await Appointment.findOne({
      where: { id },
      attributes: ["appointmentSlot_id"],
    });
    // cập nhật lại lịch hẹn của bác sĩ
    await AppointmentSlot.update(
      { isBooked: false },
      { where: { id: appointment.appointmentSlot_id } }
    );

    if (cancelAppointment) {
      res.status(200).json({ message: "Cancel appointment successfully" });
    } else {
      res.status(404).json({ message: "Appointment not found" });
    }
  } catch (error) {
    console.log(error);
  }
};

// Thêm API mới để cập nhật trạng thái thanh toán
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_status } = req.body;

    // Cập nhật trạng thái thanh toán
    await Appointment.update(
      {
        payment_status,
        status: "confirmed", // Cập nhật trạng thái lịch hẹn thành confirmed
      },
      { where: { id } }
    );

    // Lấy thông tin lịch hẹn
    const appointment = await Appointment.findByPk(id, {
      include: [
        {
          model: Hospital,
          as: "hospital",
        },
      ],
    });

    // Tạo thông báo
    if (appointment) {
      await createNewAppointmentNotification(
        appointment.user_id,
        appointment.id,
        appointment.hospital.name,
        moment(appointment.appointment_date).format("DD/MM/YYYY")
      );

      // Lấy thông tin về thời gian của lịch hẹn
      const appointmentSlotInfo = await AppointmentSlot.findOne({
        where: { id: appointment.appointmentSlot_id },
      });

      const doctorScheduleInfo = await DoctorSchedule.findOne({
        where: { id: appointment.doctorSchedule_id },
      });

      // Tính thời gian nhắc nhở dựa trên ngày và giờ hẹn
      const reminderTime = calculateReminderTimes(
        doctorScheduleInfo.date,
        appointmentSlotInfo.start_time
      );

      reminderTime.forEach(async (time) => {
        await ReminderAppointment.create({
          appointment_id: appointment.id,
          reminder_time: time,
        });
      });
    }

    res.status(200).json({
      message: "Payment status updated successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};

// Tạo hàm trợ giúp để tính thời gian nhắc nhở
const calculateReminderTimes = (appointmentDate, appointmentTime) => {
  try {
    // Đảm bảo appointmentDate là đối tượng Date
    let dateObj;
    if (appointmentDate instanceof Date) {
      dateObj = appointmentDate;
    } else if (typeof appointmentDate === "string") {
      dateObj = new Date(appointmentDate);
    } else {
      // Trường hợp khác, ví dụ: moment object
      dateObj = moment(appointmentDate).toDate();
    }

    // Format ngày tháng thành chuỗi YYYY-MM-DD
    const dateStr = moment(dateObj).format("YYYY-MM-DD");

    // Kết hợp ngày và giờ hẹn
    const appointmentDateTime = moment(
      `${dateStr} ${appointmentTime}`,
      "YYYY-MM-DD HH:mm:ss"
    );

    // Nhắc trước 1 ngày
    const oneDayBefore = moment(appointmentDateTime).subtract(1, "days");

    // Nhắc trước 1 giờ
    const oneHourBefore = moment(appointmentDateTime).subtract(1, "hour");

    return [oneDayBefore.toDate(), oneHourBefore.toDate()];
  } catch (error) {
    console.error("Error calculating reminder times:", error);
  }
};

module.exports = {
  createAppointment,
  getAppointmentsByUserId,
  getAppointmentById,
  getAppointmentSoon,
  getAppointmentNeedChange,
  suggestAppointment,
  changeAppointment,
  getAppointmentCompletedByUserId,
  cancelAppointment,
  getAppointmentByCode,
  updateAppointmentStatusAfterPayment,
  getHistoryBookingOfHospital,
  getAppointmentsByDoctorId,
};
