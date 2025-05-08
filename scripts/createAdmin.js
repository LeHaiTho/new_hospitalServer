require("dotenv").config({ path: "../.env" });
const bcrypt = require("bcrypt");
const sequelize = require("../config/database");

const User = require("../models/userModel");
const Role = require("../models/roleModel");

const email = process.env.EMAIL_USER;

const createAdmin = async (req, res) => {
  try {
    await sequelize.sync({ alerts: true });

    const hashedPassword = await bcrypt.hash(email, 10);

    let adminRole = await Role.findOne({ where: { name: "admin" } });
    if (!adminRole) {
      adminRole = await Role.create({ name: "admin" });
      // create role manager
      const managerRole = await Role.create({ name: "manager" });
      const doctorRole = await Role.create({ name: "doctor" });
      const customerRole = await Role.create({ name: "customer" });
    }

    let admin = await User.findOne({
      where: { email },
    });
    if (!admin) {
      admin = await User.create({
        username: "admin",
        password: hashedPassword,
        email,
        role_id: adminRole.id,
        isActivated: true,
        isFirstLogin: false,
        status: true,
      });
      console.log("Admin created successfully");
    }
  } catch (err) {
    console.error("Error syncing database:", err);
  }
};
createAdmin();
