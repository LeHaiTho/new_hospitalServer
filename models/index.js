const Doctor = require("./doctorModel");
const DoctorSpecialty = require("./doctorSpecialtyModel");
const Hospital = require("./hospitalModel");
const HospitalSpecialty = require("./hospitalSpecialtyModel");
const Role = require("./roleModel");
const Specialty = require("./specialtyModel");
const User = require("./userModel");
const PushToken = require("./pushTokenModel");
const Notification = require("./notificationModel");
const DoctorHospital = require("./doctorHospitalModel");
const DoctorSchedule = require("./doctorScheduleModel");
const TimeSlot = require("./timeSlotModel");
const Rating = require("./ratingModel");
const WorkingDay = require("./workingDayModel");
const AppointmentSlot = require("./appointmentSlotModel");
const Appointment = require("./appointmentModel");
const Staff = require("./staffHospitalModel");
const FamilyMember = require("./familyMemberModel");
const ReminderAppointment = require("./reminderAppointmentModel");
const DoctorUnavailableTime = require("./doctorUnavailableTimeModel");
const ExamResult = require("./examResultModel");
const HealthCheckInfo = require("./healthCheckInfoModel");
const ImagingDiagnostic = require("./imagingDiagnosticsModel");
const Prescription = require("./prescriptionModel");
const PrescriptionItem = require("./prescriptionItemsModel");
const Question = require("./questionModel");
const Comment = require("./commentModel");
const Like = require("./likeModel");
const Message = require("./messageModel");
const Package = require("./packageModel");
const Subscription = require("./subscriptionModel");
const ChatRoom = require("./chatRoomModel");

// New detailed exam models
const DetailedExamResult = require("./detailedExamResultModel");
const TestResult = require("./testResultModel");
const DetailedPrescription = require("./detailedPrescriptionModel");

User.belongsTo(Role, { foreignKey: "role_id", as: "role" });

Hospital.belongsTo(User, { foreignKey: "manager_id", as: "manager" });

Doctor.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.belongsTo(Doctor, { foreignKey: "user_id", as: "doctor" });

DoctorSpecialty.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });
Doctor.hasMany(DoctorSpecialty, {
  foreignKey: "doctor_id",
  as: "doctorSpecialties",
});

DoctorSpecialty.belongsTo(HospitalSpecialty, {
  foreignKey: "hospital_specialty_id",
  as: "hospitalSpecialty",
});

HospitalSpecialty.belongsTo(DoctorSpecialty, {
  foreignKey: "hospital_specialty_id",
  as: "doctorSpecialty",
});

HospitalSpecialty.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});
Hospital.hasMany(HospitalSpecialty, {
  foreignKey: "hospital_id",
  as: "hospitalSpecialty",
});

Doctor.hasMany(DoctorSpecialty, {
  foreignKey: "doctor_id",
  as: "doctorSpecialty",
});

DoctorSchedule.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});
DoctorSchedule.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });

DoctorHospital.belongsTo(Doctor, {
  foreignKey: "doctor_id",
  as: "doctor",
});
Hospital.hasMany(DoctorHospital, {
  foreignKey: "hospital_id",
  as: "doctorHospital",
});

DoctorHospital.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});
Doctor.hasMany(DoctorHospital, {
  foreignKey: "doctor_id",
  as: "doctorHospital",
});

Specialty.hasMany(HospitalSpecialty, {
  foreignKey: "specialty_id",
  as: "hospitalSpecialty",
});

HospitalSpecialty.belongsTo(Specialty, {
  foreignKey: "specialty_id",
  as: "specialty",
});

WorkingDay.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});

Hospital.hasMany(WorkingDay, {
  foreignKey: "hospital_id",
  as: "workingDays",
});

TimeSlot.belongsTo(WorkingDay, {
  foreignKey: "working_day_id",
  as: "workingDay",
});

WorkingDay.hasMany(TimeSlot, {
  foreignKey: "working_day_id",
  as: "timeSlots",
});

AppointmentSlot.belongsTo(DoctorSchedule, {
  foreignKey: "doctorSchedule_id",
  as: "doctorSchedule",
});

DoctorSchedule.hasMany(AppointmentSlot, {
  foreignKey: "doctorSchedule_id",
  as: "appointmentSlots",
});

Appointment.belongsTo(DoctorSchedule, {
  foreignKey: "doctorSchedule_id",
  as: "doctorSchedule",
});

DoctorSchedule.hasMany(Appointment, {
  foreignKey: "doctorSchedule_id",
  as: "appointments",
});

Doctor.belongsTo(Appointment, {
  foreignKey: "doctor_id",
  as: "doctor",
});

Appointment.belongsTo(Doctor, {
  foreignKey: "doctor_id",
  as: "doctor",
});

Specialty.belongsTo(Appointment, {
  foreignKey: "specialty_id",
  as: "specialty",
});

Appointment.belongsTo(Specialty, {
  foreignKey: "specialty_id",
  as: "specialty",
});

FamilyMember.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(FamilyMember, { foreignKey: "user_id", as: "familyMembers" });

AppointmentSlot.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});

Appointment.belongsTo(AppointmentSlot, {
  foreignKey: "appointmentSlot_id",
  as: "appointmentSlot",
});
Appointment.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});
AppointmentSlot.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});

Staff.belongsTo(User, { foreignKey: "user_id", as: "user" });
Staff.belongsTo(Hospital, { foreignKey: "hospital_id", as: "hospital" });
Staff.hasMany(Appointment, { foreignKey: "staff_id", as: "appointments" });
Appointment.belongsTo(Staff, { foreignKey: "staff_id", as: "staff" });
User.hasMany(Appointment, { foreignKey: "user_id", as: "appointments" });
Appointment.belongsTo(User, { foreignKey: "user_id", as: "user" });

Notification.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Notification, { foreignKey: "user_id", as: "notifications" });

PushToken.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.belongsTo(PushToken, { foreignKey: "user_id", as: "pushToken" });

Rating.belongsTo(User, { foreignKey: "patient_id", as: "user" });
User.hasMany(Rating, { foreignKey: "patient_id", as: "ratings" });

Doctor.hasMany(Rating, { foreignKey: "doctor_id", as: "ratings" });
Rating.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });

ReminderAppointment.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointments",
});
Appointment.hasMany(ReminderAppointment, {
  foreignKey: "appointment_id",
  as: "reminderAppointments",
});

Appointment.belongsTo(FamilyMember, {
  foreignKey: "familyMember_id",
  as: "familyMembers",
});
FamilyMember.hasMany(Appointment, {
  foreignKey: "familyMember_id",
  as: "appointments",
});

DoctorUnavailableTime.belongsTo(Doctor, {
  foreignKey: "doctor_id",
  as: "doctor",
});
DoctorUnavailableTime.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});

ExamResult.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
Appointment.hasMany(ExamResult, {
  foreignKey: "appointment_id",
  as: "examResults",
});

HealthCheckInfo.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
Appointment.hasMany(HealthCheckInfo, {
  foreignKey: "appointment_id",
  as: "healthCheckInfos",
});

ImagingDiagnostic.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
Appointment.hasMany(ImagingDiagnostic, {
  foreignKey: "appointment_id",
  as: "imagingDiagnostics",
});

Prescription.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
Appointment.hasMany(Prescription, {
  foreignKey: "appointment_id",
  as: "prescriptions",
});

PrescriptionItem.belongsTo(Prescription, {
  foreignKey: "prescription_id",
  as: "prescription",
});
Prescription.hasMany(PrescriptionItem, {
  foreignKey: "prescription_id",
  as: "prescriptionItems",
});

Question.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Question, { foreignKey: "user_id", as: "questions" });

Question.hasMany(Comment, { foreignKey: "question_id", as: "comments" });
Comment.belongsTo(Question, { foreignKey: "question_id", as: "question" });

Comment.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Comment, { foreignKey: "user_id", as: "comments" });

Question.hasMany(Like, { foreignKey: "question_id", as: "likes" });
Like.belongsTo(Question, { foreignKey: "question_id", as: "question" });

Specialty.hasMany(Question, { foreignKey: "specialty_id", as: "questions" });
Question.belongsTo(Specialty, { foreignKey: "specialty_id", as: "specialty" });

Message.belongsTo(User, { foreignKey: "sender_id", as: "sender" });
Message.belongsTo(User, { foreignKey: "receiver_id", as: "receiver" });

Package.hasMany(Subscription, {
  foreignKey: "package_id",
  as: "subscriptions",
});

Subscription.belongsTo(Package, { foreignKey: "package_id", as: "packages" });

Subscription.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });
Doctor.hasMany(Subscription, { foreignKey: "doctor_id", as: "subscriptions" });

Subscription.belongsTo(User, { foreignKey: "user_id", as: "user" });
User.hasMany(Subscription, { foreignKey: "user_id", as: "subscriptions" });

ChatRoom.belongsTo(Doctor, { foreignKey: "doctor_id", as: "doctor" });

Message.belongsTo(ChatRoom, { foreignKey: "room_id", as: "chatRoom" });
ChatRoom.hasMany(Message, { foreignKey: "room_id", as: "messages" });

Doctor.hasMany(ChatRoom, { foreignKey: "doctor_id", as: "chatRooms" });

User.hasMany(ChatRoom, { foreignKey: "user_id", as: "chatRooms" });
ChatRoom.belongsTo(User, { foreignKey: "user_id", as: "user" });

// Detailed Exam Result relationships
DetailedExamResult.belongsTo(Appointment, {
  foreignKey: "appointment_id",
  as: "appointment",
});
Appointment.hasOne(DetailedExamResult, {
  foreignKey: "appointment_id",
  as: "detailedExamResult",
});

DetailedExamResult.belongsTo(Doctor, {
  foreignKey: "doctor_id",
  as: "doctor",
});
Doctor.hasMany(DetailedExamResult, {
  foreignKey: "doctor_id",
  as: "detailedExamResults",
});

DetailedExamResult.belongsTo(Hospital, {
  foreignKey: "hospital_id",
  as: "hospital",
});
Hospital.hasMany(DetailedExamResult, {
  foreignKey: "hospital_id",
  as: "detailedExamResults",
});

// Test Results relationships
TestResult.belongsTo(DetailedExamResult, {
  foreignKey: "detailed_exam_result_id",
  as: "detailedExamResult",
});
DetailedExamResult.hasMany(TestResult, {
  foreignKey: "detailed_exam_result_id",
  as: "testResults",
});

// Detailed Prescription relationships
DetailedPrescription.belongsTo(DetailedExamResult, {
  foreignKey: "detailed_exam_result_id",
  as: "detailedExamResult",
});
DetailedExamResult.hasMany(DetailedPrescription, {
  foreignKey: "detailed_exam_result_id",
  as: "detailedPrescriptions",
});

module.exports = {
  Doctor,
  DoctorSpecialty,
  Hospital,
  HospitalSpecialty,
  Role,
  Specialty,
  User,
  DoctorSchedule,
  DoctorHospital,
  WorkingDay,
  TimeSlot,
  AppointmentSlot,
  Appointment,
  FamilyMember,
  Staff,
  PushToken,
  Notification,
  Rating,
  ReminderAppointment,
  DoctorUnavailableTime,
  ExamResult,
  HealthCheckInfo,
  ImagingDiagnostic,
  Prescription,
  PrescriptionItem,
  Question,
  Comment,
  Like,
  Message,
  Package,
  Subscription,
  ChatRoom,
  DetailedExamResult,
  TestResult,
  DetailedPrescription,
};
