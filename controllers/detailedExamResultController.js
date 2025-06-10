const {
  DetailedExamResult,
  TestResult,
  DetailedPrescription,
  Appointment,
  Doctor,
  Hospital,
  User,
  FamilyMember,
  DoctorSchedule,
  Specialty,
  AppointmentSlot,
} = require("../models/index");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const { Op } = require("sequelize");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/test-results/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Updated to only accept image files
    const allowedTypes = /jpeg|jpg|png|gif|bmp|webp/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype =
      allowedTypes.test(file.mimetype) || file.mimetype.startsWith("image/");

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Chỉ cho phép upload file ảnh (JPG, PNG, GIF, BMP, WEBP)"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Create detailed exam result
const createDetailedExamResult = async (req, res) => {
  const transaction = await DetailedExamResult.sequelize.transaction();

  try {
    console.log("=== DEBUG: Request Data ===");
    console.log("req.body:", req.body);
    console.log("req.files:", req.files);
    console.log("==========================");

    const {
      appointmentCode,
      medicalHistory,
      diseaseProgression,
      pulse,
      temperature,
      bloodPressure,
      skin,
      mucousMembrane,
      organExamination,
      diagnosis,
      treatmentDirection,
    } = req.body;

    // Parse JSON strings back to arrays
    let prescriptions = [];
    let testResults = [];

    try {
      prescriptions = req.body.prescriptions
        ? JSON.parse(req.body.prescriptions)
        : [];
    } catch (e) {
      console.warn("Error parsing prescriptions:", e);
      prescriptions = [];
    }

    try {
      testResults = req.body.testResults
        ? JSON.parse(req.body.testResults)
        : [];
    } catch (e) {
      console.warn("Error parsing testResults:", e);
      testResults = [];
    }

    console.log("Parsed prescriptions:", prescriptions);
    console.log("Parsed testResults:", testResults);

    // Find appointment by code
    const appointment = await Appointment.findOne({
      where: { appointment_code: appointmentCode },
      include: [
        { model: Doctor, as: "doctor" },
        { model: Hospital, as: "hospital" },
      ],
    });

    if (!appointment) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    // Check if detailed exam result already exists
    const existingResult = await DetailedExamResult.findOne({
      where: { appointment_id: appointment.id },
    });

    if (existingResult) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Kết quả khám chi tiết đã tồn tại cho lịch hẹn này",
      });
    }

    // Create detailed exam result
    const detailedExamResult = await DetailedExamResult.create(
      {
        appointment_id: appointment.id,
        doctor_id: appointment.doctor_id,
        hospital_id: appointment.hospital_id,
        medical_history: medicalHistory,
        disease_progression: diseaseProgression,
        pulse,
        temperature,
        blood_pressure: bloodPressure,
        skin_condition: skin,
        mucous_membrane: mucousMembrane,
        organ_examination: organExamination,
        diagnosis,
        treatment_direction: treatmentDirection,
        is_completed: true,
      },
      { transaction }
    );

    // Handle test result files
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Find matching test result data by fileName
        const testResultData = Array.isArray(testResults)
          ? testResults.find((tr) => tr.fileName === file.originalname)
          : null;

        await TestResult.create(
          {
            detailed_exam_result_id: detailedExamResult.id,
            file_name: file.originalname,
            file_url: `/uploads/test-results/${file.filename}`,
            file_type: file.mimetype.includes("image") ? "image" : "document",
            description: testResultData?.description || "",
          },
          { transaction }
        );
      }
    }

    // Create prescriptions
    if (Array.isArray(prescriptions) && prescriptions.length > 0) {
      for (const prescription of prescriptions) {
        if (
          prescription.medication &&
          prescription.quantity &&
          prescription.instructions
        ) {
          await DetailedPrescription.create(
            {
              detailed_exam_result_id: detailedExamResult.id,
              medication: prescription.medication,
              quantity: prescription.quantity,
              instructions: prescription.instructions,
            },
            { transaction }
          );
        }
      }
    }

    // Update appointment status to completed
    await appointment.update({ status: "completed" }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Lưu kết quả khám bệnh thành công",
      data: {
        id: detailedExamResult.id,
        appointmentCode: appointment.appointment_code,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating detailed exam result:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lưu kết quả khám bệnh",
      error: error.message,
    });
  }
};

// Get detailed exam result by appointment code
const getDetailedExamResultByAppointmentCode = async (req, res) => {
  try {
    const { appointmentCode } = req.params;

    const appointment = await Appointment.findOne({
      where: { appointment_code: appointmentCode },
      include: [
        {
          model: DetailedExamResult,
          as: "detailedExamResult",
          include: [
            {
              model: TestResult,
              as: "testResults",
              where: { is_deleted: false },
              required: false,
            },
            {
              model: DetailedPrescription,
              as: "detailedPrescriptions",
              where: { is_deleted: false },
              required: false,
            },
          ],
        },
        { model: Doctor, as: "doctor", include: [{ model: User, as: "user" }] },
        { model: Hospital, as: "hospital" },
        { model: User, as: "user" },
        { model: FamilyMember, as: "familyMembers" },
        { model: DoctorSchedule, as: "doctorSchedule", required: false },
        { model: Specialty, as: "specialty", required: false },
        { model: AppointmentSlot, as: "appointmentSlot", required: false },
      ],
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy lịch hẹn",
      });
    }

    if (!appointment.detailedExamResult) {
      return res.status(404).json({
        success: false,
        message: "Chưa có kết quả khám chi tiết cho lịch hẹn này",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        appointment,
        detailedExamResult: appointment.detailedExamResult,
      },
    });
  } catch (error) {
    console.error("Error getting detailed exam result:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy kết quả khám bệnh",
      error: error.message,
    });
  }
};

// Get all detailed exam results for a doctor
// const getExamResultHistoryOfDoctor = async (req, res) => {
//   try {
//     const { doctorId } = req.params;
//     const { page = 1, limit = 10, status } = req.query;

//     const whereCondition = {
//       doctor_id: doctorId,
//       is_deleted: false,
//     };

//     if (status) {
//       whereCondition.is_completed = status === "completed";
//     }

//     const offset = (page - 1) * limit;

//     const { count, rows } = await DetailedExamResult.findAndCountAll({
//       where: whereCondition,
//       include: [
//         {
//           model: Appointment,
//           as: "appointment",
//           include: [
//             { model: User, as: "user" },
//             { model: FamilyMember, as: "familyMembers" },
//           ],
//         },
//         { model: Doctor, as: "doctor", include: [{ model: User, as: "user" }] },
//         { model: Hospital, as: "hospital" },
//       ],
//       order: [["createdAt", "DESC"]],
//       limit: parseInt(limit),
//       offset: parseInt(offset),
//     });

//     res.status(200).json({
//       success: true,
//       data: {
//         examResults: rows,
//         pagination: {
//           currentPage: parseInt(page),
//           totalPages: Math.ceil(count / limit),
//           totalItems: count,
//           itemsPerPage: parseInt(limit),
//         },
//       },
//     });
//   } catch (error) {
//     console.error("Error getting doctor exam results:", error);
//     res.status(500).json({
//       success: false,
//       message: "Lỗi server khi lấy danh sách kết quả khám bệnh",
//       error: error.message,
//     });
//   }
// };

// Get patient exam history (optimized with ID-based search)
const getPatientExamHistory = async (req, res) => {
  try {
    const { patientInfo, patientId, patientType } = req.body;
    // patientId: actual user/familyMember ID
    // patientType: "user" or "familyMember"
    // patientInfo: fallback { fullname, phone } for backward compatibility

    console.log("=== Patient History Search ===");
    console.log("Request body:", req.body);
    console.log("patientId:", patientId);
    console.log("patientType:", patientType);
    console.log("patientInfo:", patientInfo);

    // Validate input
    if (!patientId && !patientInfo) {
      return res.status(400).json({
        success: false,
        message: "Cần cung cấp patientId hoặc patientInfo",
      });
    }

    let appointments = [];

    // OPTIMIZED APPROACH: Use ID-based search when available
    if (patientId && patientType) {
      console.log(`\n=== PATIENT HISTORY SEARCH ===`);
      console.log(
        `Using optimized ID-based search: ${patientType} ID ${patientId}`
      );

      const whereCondition = {
        status: "completed",
      };

      // Set specific patient condition based on type
      if (patientType === "user") {
        whereCondition.user_id = patientId;
        whereCondition.familyMember_id = null; // Ensure it's a User appointment, not family member
        console.log(
          `Searching for User appointments where user_id = ${patientId} AND familyMember_id IS NULL`
        );
      } else if (patientType === "family_member") {
        whereCondition.familyMember_id = patientId;
        whereCondition.user_id = { [Op.not]: null }; // FamilyMember appointments still have user_id (the owner)
        console.log(
          `Searching for FamilyMember appointments where familyMember_id = ${patientId} AND user_id IS NOT NULL`
        );
      }

      console.log("Final WHERE condition:", whereCondition);

      appointments = await Appointment.findAll({
        where: whereCondition,
        include: [
          {
            model: DetailedExamResult,
            as: "detailedExamResult",
            where: { is_deleted: false },
            required: true,
            include: [
              {
                model: TestResult,
                as: "testResults",
                where: { is_deleted: false },
                required: false,
              },
              {
                model: DetailedPrescription,
                as: "detailedPrescriptions",
                where: { is_deleted: false },
                required: false,
              },
            ],
          },
          {
            model: Doctor,
            as: "doctor",
            include: [{ model: User, as: "user" }],
          },
          { model: Hospital, as: "hospital" },
          { model: User, as: "user", required: false },
          { model: FamilyMember, as: "familyMembers", required: false },
          { model: DoctorSchedule, as: "doctorSchedule", required: false },
          { model: Specialty, as: "specialty", required: false },
        ],
        order: [["createdAt", "DESC"]],
      });

      console.log(
        `\nID-based search found ${appointments.length} appointments for ${patientType} ID ${patientId}`
      );

      // Log detailed appointment data for debugging
      appointments.forEach((appointment, index) => {
        console.log(`\nAppointment ${index + 1}:`);
        console.log(`- Code: ${appointment.appointment_code}`);
        console.log(`- user_id: ${appointment.user_id}`);
        console.log(`- familyMember_id: ${appointment.familyMember_id}`);
        console.log(
          `- User: ${appointment.user?.fullname || "N/A"} (ID: ${
            appointment.user?.id || "N/A"
          })`
        );
        console.log(
          `- FamilyMember: ${
            appointment.familyMembers?.fullname || "N/A"
          } (ID: ${appointment.familyMembers?.id || "N/A"})`
        );
        console.log(
          `- Patient for this appointment: ${
            appointment.familyMembers
              ? `${appointment.familyMembers.fullname} (FamilyMember)`
              : `${appointment.user?.fullname || "N/A"} (User)`
          }`
        );
      });
      console.log(`=== END PATIENT HISTORY SEARCH ===\n`);
    } else {
      // FALLBACK APPROACH: Use name/phone search for backward compatibility
      console.log("Using fallback name/phone search");

      if (!patientInfo || (!patientInfo.phone && !patientInfo.fullname)) {
        return res.status(400).json({
          success: false,
          message: "Cần cung cấp thông tin bệnh nhân (ID hoặc tên/SĐT)",
        });
      }

      // Get all completed appointments with exam results
      const allAppointments = await Appointment.findAll({
        where: {
          status: "completed",
        },
        include: [
          {
            model: DetailedExamResult,
            as: "detailedExamResult",
            where: { is_deleted: false },
            required: true,
            include: [
              {
                model: TestResult,
                as: "testResults",
                where: { is_deleted: false },
                required: false,
              },
              {
                model: DetailedPrescription,
                as: "detailedPrescriptions",
                where: { is_deleted: false },
                required: false,
              },
            ],
          },
          {
            model: Doctor,
            as: "doctor",
            include: [{ model: User, as: "user" }],
          },
          { model: Hospital, as: "hospital" },
          { model: User, as: "user", required: false },
          { model: FamilyMember, as: "familyMembers", required: false },
          { model: DoctorSchedule, as: "doctorSchedule", required: false },
          { model: Specialty, as: "specialty", required: false },
        ],
        order: [["createdAt", "DESC"]],
      });

      console.log(
        `Found ${allAppointments.length} total completed appointments with exam results`
      );

      // Filter appointments based on patient information
      appointments = allAppointments.filter((appointment) => {
        const user = appointment.user;
        const familyMember = appointment.familyMembers;

        console.log(`\nChecking appointment ${appointment.appointment_code}:`);
        console.log(
          "User:",
          user
            ? { id: user.id, fullname: user.fullname, phone: user.phone }
            : null
        );
        console.log(
          "FamilyMember:",
          familyMember
            ? {
                id: familyMember.id,
                fullname: familyMember.fullname,
                phone: familyMember.phone,
              }
            : null
        );

        // Check if patient info matches
        let matches = false;

        // Check User patient
        if (user) {
          const nameMatch =
            !patientInfo.fullname || user.fullname === patientInfo.fullname;
          const phoneMatch =
            !patientInfo.phone || user.phone === patientInfo.phone;

          if (patientInfo.fullname && patientInfo.phone) {
            matches = nameMatch && phoneMatch;
          } else {
            matches = nameMatch || phoneMatch;
          }

          console.log(
            `  User match: name=${nameMatch}, phone=${phoneMatch}, final=${matches}`
          );
        }

        // Check FamilyMember patient if User doesn't match
        if (!matches && familyMember) {
          const nameMatch =
            !patientInfo.fullname ||
            familyMember.fullname === patientInfo.fullname;
          const phoneMatch =
            !patientInfo.phone || familyMember.phone === patientInfo.phone;

          if (patientInfo.fullname && patientInfo.phone) {
            matches = nameMatch && phoneMatch;
          } else {
            matches = nameMatch || phoneMatch;
          }

          console.log(
            `  FamilyMember match: name=${nameMatch}, phone=${phoneMatch}, final=${matches}`
          );
        }

        console.log(`  Final result: ${matches}`);
        return matches;
      });

      console.log(
        `After filtering: ${appointments.length} appointments match the patient`
      );
    }

    // Format exam history data (same for both approaches)
    const examHistory = appointments.map((appointment) => ({
      id: appointment.detailedExamResult.id,
      appointmentCode: appointment.appointment_code,
      date: appointment.doctorSchedule?.date
        ? new Date(appointment.doctorSchedule.date).toLocaleDateString("vi-VN")
        : new Date(appointment.createdAt).toLocaleDateString("vi-VN"),
      hospital: appointment.hospital?.name,
      hospitalAddress: appointment.hospital?.address,
      doctor: appointment.doctor?.user?.fullname,
      specialty: appointment.specialty?.name,
      diagnosis: appointment.detailedExamResult?.diagnosis,
      treatmentDirection: appointment.detailedExamResult?.treatment_direction,
      prescriptions:
        appointment.detailedExamResult?.detailedPrescriptions || [],
      testResults: appointment.detailedExamResult?.testResults || [],
      // Full detailed exam result for modal display
      detailedExamResult: appointment.detailedExamResult,
      appointment: appointment,
    }));

    console.log(`Returning ${examHistory.length} exam history records`);
    console.log("=== End Patient History Search ===");

    res.status(200).json({
      success: true,
      data: {
        examHistory,
        totalRecords: examHistory.length,
        // searchMethod: patientId
        //   ? "ID-based (optimized)"
        //   : "name/phone-based (fallback)",
        patientInfo: patientInfo || {
          id: patientId,
          type: patientType,
        },
      },
    });
  } catch (error) {
    console.error("Error getting patient exam history:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy lịch sử khám bệnh",
      error: error.message,
    });
  }
};

module.exports = {
  upload,
  createDetailedExamResult,
  getDetailedExamResultByAppointmentCode,
  getPatientExamHistory,
};
