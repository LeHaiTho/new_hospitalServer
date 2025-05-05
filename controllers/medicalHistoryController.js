const { Json } = require("sequelize/lib/utils");
const Appointment = require("../models/appointmentModel");
const HealthCheckInfo = require("../models/healthCheckInfoModel");
const ImagingDiagnostic = require("../models/imagingDiagnosticsModel");
const Prescription = require("../models/prescriptionModel");
const ExamResult = require("../models/examResultModel");
const PrescriptionItem = require("../models/prescriptionItemsModel");
// nhận kết quả khám bệnh từ 1 hệ thống khác
// const receiveMedicalHistory = async (req, res) => {
//   const files = req.files;
//   const {
//     appointment,
//     healthCheckInfo,
//     examResults,
//     prescriptions,
//     imagingDiagnostics,
//   } = JSON.parse(req.body.data);
//   console.log(req.body.data);
//   console.log(files);
//   try {
//     // update trạng thái lịch hẹn
//     await Appointment.update(
//       {
//         status: "completed",
//       },
//       { where: { id: appointment.id } }
//     );
//     // tạo kết quả khám bệnh
//     if (healthCheckInfo) {
//       await HealthCheckInfo.create({
//         appointment_id: appointment.id,
//         weight: healthCheckInfo.weight,
//         height: healthCheckInfo.height,
//         blood_pressure: healthCheckInfo.bloodPressure,
//         heart_rate: healthCheckInfo.heartRate,
//       });
//     }
//     // tạo kết kết quả khám
//     if (examResults) {
//       await ExamResult.create({
//         appointment_id: appointment.id,
//         description: examResults?.[0]?.description,
//         findings: examResults?.[0]?.findings,
//         recommendation: examResults?.[0]?.recommendation,
//       });
//     }
//     // đơn thuốc
//     if (prescriptions) {
//       const newPrescription = await Prescription.create({
//         ...prescriptions,
//         appointment_id: appointment.id,
//       });
//       for (const item of prescriptions.items) {
//         await PrescriptionItem.create({
//           prescription_id: newPrescription.id,
//           medicate_name: item.medication,
//           dosage: item.dosage,
//           quantity: item.quantity,
//           instructions: item.instructions,
//         });
//       }
//     }
//     // Viết upload file ở đây ?
//     if (imagingDiagnostics && files && files.length) {
//       for (let i = 0; i < imagingDiagnostics.length; i++) {
//         const diagnostic = imagingDiagnostics[i];
//         const newImagingDiagnostic = await ImagingDiagnostic.create({
//           description: diagnostic.description,
//           file_type: diagnostic.fileType,
//           appointment_id: appointment.id,
//         });

//         // Cập nhật URL từ file đã upload
//         if (files[i]) {
//           const fileUrl = `/uploads/${files[i].filename}`;
//           await newImagingDiagnostic.update({
//             file_url: fileUrl,
//           });
//         }
//       }
//     }

//     return res.status(200).json({
//       status: 200,
//       message: "Receive medical history successfully",
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

const receiveMedicalHistory = async (req, res) => {
  const files = req.files || []; // Đảm bảo files là mảng, tránh lỗi khi không có file
  const {
    appointment,
    healthCheckInfo,
    examResults,
    prescriptions,
    imagingDiagnostics,
  } = JSON.parse(req.body.data);

  console.log("Data received:", req.body.data);
  console.log("Files received:", files);

  try {
    // Cập nhật trạng thái lịch hẹn
    await Appointment.update(
      { status: "completed" },
      { where: { id: appointment.id } }
    );

    // Tạo kết quả khám bệnh
    if (healthCheckInfo) {
      await HealthCheckInfo.create({
        appointment_id: appointment.id,
        weight: healthCheckInfo.weight,
        height: healthCheckInfo.height,
        blood_pressure: healthCheckInfo.bloodPressure,
        heart_rate: healthCheckInfo.heartRate,
      });
    }

    // Tạo kết quả khám
    if (examResults) {
      await ExamResult.create({
        appointment_id: appointment.id,
        description: examResults?.[0]?.description,
        findings: examResults?.[0]?.findings,
        recommendation: examResults?.[0]?.recommendation,
      });
    }

    // Tạo đơn thuốc
    if (prescriptions) {
      const newPrescription = await Prescription.create({
        ...prescriptions,
        appointment_id: appointment.id,
      });
      for (const item of prescriptions.items) {
        await PrescriptionItem.create({
          prescription_id: newPrescription.id,
          medicate_name: item.medication,
          dosage: item.dosage,
          quantity: item.quantity,
          instructions: item.instructions,
        });
      }
    }

    // Xử lý file upload và imaging diagnostics
    if (imagingDiagnostics && imagingDiagnostics.length > 0) {
      for (let i = 0; i < imagingDiagnostics.length; i++) {
        const diagnostic = imagingDiagnostics[i];
        const newImagingDiagnostic = await ImagingDiagnostic.create({
          description: diagnostic.description,
          file_type: diagnostic.fileType,
          appointment_id: appointment.id,
        });

        // Cập nhật URL từ file đã upload
        if (files[i]) {
          const fileUrl = `/Uploads/${files[i].filename}`;
          await newImagingDiagnostic.update({
            file_url: fileUrl,
          });
        } else {
          console.warn(`No file found for imaging diagnostic at index ${i}`);
        }
      }
    }

    return res.status(200).json({
      status: 200,
      message: "Receive medical history successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
// lấy thông tin kết quả khám bệnh
const getMedicalHistoryDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const medicalHistory = await Appointment.findByPk(id, {
      include: [
        {
          model: HealthCheckInfo,
          as: "healthCheckInfos",
        },
        {
          model: ExamResult,
          as: "examResults",
        },
        {
          model: ImagingDiagnostic,
          as: "imagingDiagnostics",
        },
      ],
    });
    return res.status(200).json({
      message: "Get medical history detail successfully",
      medicalHistory,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
const getPrescriptionDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findOne({
      where: { appointment_id: id },
      include: [{ model: PrescriptionItem, as: "prescriptionItems" }],
    });
    return res.status(200).json({
      message: "Get prescription detail successfully",
      prescription,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  receiveMedicalHistory,
  getMedicalHistoryDetail,
  getPrescriptionDetail,
};
