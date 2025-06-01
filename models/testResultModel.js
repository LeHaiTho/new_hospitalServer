const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const DetailedExamResult = require("./detailedExamResultModel");

const TestResult = sequelize.define(
  "TestResult",
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
    file_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    file_type: {
      type: DataTypes.STRING, // image, pdf, doc, etc.
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT, // Mô tả kết quả xét nghiệm
      allowNull: true,
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    timestamps: true,
    tableName: "TestResults",
    indexes: [
      {
        fields: ["detailed_exam_result_id"],
      },
    ],
  }
);

module.exports = TestResult;
