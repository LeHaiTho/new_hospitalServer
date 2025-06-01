const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Appointment = require("./appointmentModel");
const Doctor = require("./doctorModel");
const Hospital = require("./hospitalModel");

const DetailedExamResult = sequelize.define(
  "DetailedExamResult",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    appointment_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Appointment,
        key: "id",
      },
      allowNull: false,
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Doctor,
        key: "id",
      },
      allowNull: false,
    },
    hospital_id: {
      type: DataTypes.INTEGER,
      references: {
        model: Hospital,
        key: "id",
      },
      allowNull: false,
    },

    // III. Tiểu sử bệnh
    medical_history: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // IV. Quá trình bệnh lý
    disease_progression: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // V. Khám lâm sàng - Toàn thân
    pulse: {
      type: DataTypes.STRING, // VD: "72 lần/phút"
      allowNull: false,
    },
    temperature: {
      type: DataTypes.STRING, // VD: "36.5°C"
      allowNull: false,
    },
    blood_pressure: {
      type: DataTypes.STRING, // VD: "120/80 mmHg"
      allowNull: false,
    },
    skin_condition: {
      type: DataTypes.STRING, // Tình trạng da
      allowNull: false,
    },
    mucous_membrane: {
      type: DataTypes.STRING, // Tình trạng niêm mạc
      allowNull: false,
    },

    // V. Khám lâm sàng - Cơ quan
    organ_examination: {
      type: DataTypes.TEXT, // Kết quả khám các cơ quan
      allowNull: false,
    },

    // VII. Chuẩn đoán
    diagnosis: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // VIII. Hướng điều trị
    treatment_direction: {
      type: DataTypes.TEXT,
      allowNull: false,
    },

    // Metadata
    exam_date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "DetailedExamResults",
    indexes: [
      {
        fields: ["appointment_id"],
      },
      {
        fields: ["doctor_id"],
      },
      {
        fields: ["hospital_id"],
      },
    ],
  }
);

module.exports = DetailedExamResult;
