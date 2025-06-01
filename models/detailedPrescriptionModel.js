const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const DetailedExamResult = require("./detailedExamResultModel");

const DetailedPrescription = sequelize.define(
  "DetailedPrescription",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    detailed_exam_result_id: {
      type: DataTypes.INTEGER,
      references: {
        model: DetailedExamResult,
        key: "id",
      },
      allowNull: false,
    },
    medication: {
      type: DataTypes.STRING, // Tên thuốc
      allowNull: false,
    },
    quantity: {
      type: DataTypes.STRING, // Số lượng
      allowNull: false,
    },
    instructions: {
      type: DataTypes.TEXT, // Hướng dẫn sử dụng
      allowNull: false,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "DetailedPrescriptions",
    indexes: [
      {
        fields: ["detailed_exam_result_id"],
      },
    ],
  }
);

module.exports = DetailedPrescription;
