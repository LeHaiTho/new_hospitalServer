const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Doctor = require("./doctorModel");
const Hospital = require("./hospitalModel");

const DoctorUnavailableTime = sequelize.define(
  "DoctorUnavailableTime",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    doctor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Doctors",
        key: "id",
      },
    },
    hospital_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "Hospitals",
        key: "id",
      },
    },
    title: {
      type: DataTypes.STRING,
    },
    unavailable_start_date: {
      type: DataTypes.DATE,
    },
    unavailable_end_date: {
      type: DataTypes.DATE,
    },

    reason: {
      type: DataTypes.STRING,
    },
    reason_reject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
    },
  },
  {
    tableName: "DoctorUnavailableTimes",
    timestamps: true,
  }
);

module.exports = DoctorUnavailableTime;
