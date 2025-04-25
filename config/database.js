require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize("hospital_test", "postgres", "postgres", {
  host: "localhost",
  dialect: "postgres",
  port: 5432,
  logging: false,
});
module.exports = sequelize;
