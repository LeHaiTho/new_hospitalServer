const sequelize = require("../config/database");
const { Role, FamilyMember, Doctor } = require("../models");
const Hospital = require("../models/hospitalModel");
const User = require("../models/userModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendEmail } = require("../services/emailService");
const { BOOLEAN } = require("sequelize");
const { Op } = require("sequelize");
const Appointment = require("../models/appointmentModel");

const createManagerAccount = async (req, res) => {
  const { username, roleName } = req.body;
  try {
    const role = await Role.findOne({ where: { name: roleName } });
    if (!role) {
      return res.status(400).json({ message: "Role not found" });
    }

    const generatedPassword = crypto.randomBytes(8).toString("hex");
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const newAccount = await User.create({
      username,
      password: hashedPassword,
      role_id: role.id,
      isActived: false,
    });

    // send email to new user account
    const htmlContentForDoctorAndStaff = `
  <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; color: #333;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
      <h2 style="text-align: center; color: #007bff;">Chào mừng đến với hệ thống quản lý đặt lịch khám online</h2>
      <p style="color: #000000;">Xin chào,</p>
      <p style="color: #000000;">Chúng tôi rất vui khi bạn trở thành một phần của hệ thống đặt lịch khám bệnh trực tuyến.</p>
      <p style="color: #000000;">Tài khoản của bạn đã được tạo và dưới đây là thông tin đăng nhập:</p>
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0; color: #333;">
        <p style="color: #000000;"><strong>Tài khoản:</strong> ${username}</p>
        <p style="color: #000000;"><strong>Mật khẩu:</strong> ${generatedPassword}</p>
      </div>
      <p style="color: #000000;">Vui lòng đăng nhập vào hệ thống và thay đổi mật khẩu của bạn ngay sau lần đăng nhập đầu tiên để kích hoạt tài khoản và đảm bảo tính bảo mật.</p>
      <p style="color: #000000;">Sau khi kích hoạt, bạn có thể xem và quản lý lịch hẹn, cũng như thực hiện các thao tác theo vai trò của mình.</p>
      <p style="color: #000000;">Nếu bạn có bất kỳ thắc mắc nào, vui lòng liên hệ với bộ phận hỗ trợ của chúng tôi.</p>
      <p style="color: #000000;">Trân trọng,</p>
      <p style="font-weight: bold; color: #000000;">Hệ thống quản lý đặt lịch khám online</p>
      <div style="text-align: center; margin-top: 20px;">
        <a href="https://yourwebsite.com" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px;">Đăng nhập hệ thống</a>
      </div>
    </div>
  </div>`;

    await sendEmail({
      to: username,
      subject: "Cấp tài khoản quản lý",
      html: htmlContentForDoctorAndStaff,
    });

    res.status(200).json({
      message: `Tài khoản ${roleName} đã được tạo thành công, vui lòng kiểm tra email để kích hoạt tài khoản`,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Có lỗi khi tạo tài khoản" });
  }
};
// create profile for patient
const createProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      dateOfBirth,
      gender,
      province,
      district,
      ward,
      address,
      identificationCard,
      relationship,
    } = req.body;
    console.log(req.body);

    if (relationship === "myself") {
      const updatedProfile = await User.update(
        {
          fullname: name,
          phone,
          email,
          date_of_birth: dateOfBirth,
          gender,
          province,
          district,
          ward,
          address,
          identity_card: identificationCard,
        },
        { where: { id: req.params.id } }
      );
    } else {
      const newFamilyMember = await FamilyMember.create(
        {
          user_id: req.params.id,
          fullname: name,
          phone,
          email,
          date_of_birth: dateOfBirth,
          gender,
          province,
          district,
          ward,
          address,
          identity_card: identificationCard,
          relationship,
        },
        { where: { user_id: req.params.id } }
      );
    }
    res.status(200).json({
      message: "Tạo hồ sơ bệnh nhân thành công",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Có lỗi khi tạo hồ sơ bệnh nhân" });
  }
};

const getAllProfileOfUser = async (req, res) => {
  try {
    const profile = await User.findByPk(req.user.id, {
      attributes: {
        exclude: [
          "password",
          "role_id",
          "isActivated",
          "isFirstLogin",
          "username",
          "user_id",
          "activationToken",
        ],
      },
    });
    const getMembersOfUser = await FamilyMember.findAll({
      where: { user_id: req.user.id, isDeleted: false },
    });
    res.status(200).json({ profile, getMembersOfUser });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Có lỗi khi lấy hồ sơ bệnh nhân" });
  }
};
// lấy user của bác sĩ
const getInfoDoctor = async (req, res) => {
  try {
    const user = await Doctor.findOne({
      where: { user_id: req.params.id },
      attributes: ["id"],
    });
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Có lỗi khi lấy bác sĩ" });
  }
};
// lấy thông tin của bảng user
const getInfoUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    res.status(200).json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Có lỗi khi lấy thông tin người dùng" });
  }
};

// tạo tài khoản user
const createUserAccount = async (req, res) => {
  const { fullname, username, password } = req.body;
  try {
    // generate password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullname,
      username,
      password: hashedPassword,
      role_id: 6,
      isActived: true,
      isFirstLogin: false,
    });
    res.status(200).json({ message: "Tạo tài khoản bệnh nhân thành công" });
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Có lỗi khi tạo tài khoản bệnh nhân" });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const {
      fullname,
      date_of_birth,
      gender,
      identity_card,
      phone,
      email,
      address,
    } = req.body;
    console.log("req.body", req.body);

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Cập nhật dữ liệu
    await user.update({
      fullname,
      date_of_birth,
      gender,
      identity_card,
      phone,
      email,
      address,
    });

    res.status(200).json({ message: "Cập nhật thành công", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const updateFamilyProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      fullname,
      date_of_birth,
      gender,
      identity_card,
      phone,
      email,
      address,
    } = req.body;

    // // Kiểm tra FamilyMember tồn tại và thuộc user
    const familyMember = await FamilyMember.findOne({
      where: { id, user_id: req.user.id, isDeleted: false },
    });
    console.log("familyMember", familyMember);
    if (!familyMember) {
      return res
        .status(404)
        .json({ message: "Không tìm thấy thành viên gia đình" });
    }

    // Cập nhật dữ liệu
    await familyMember.update({
      fullname,
      date_of_birth,
      gender,
      identity_card,
      phone,
      email,
      address,
    });

    res.status(200).json({ message: "Cập nhật thành công", familyMember });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// ADMIN
const getListUserOfAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;

    const where = {
      ...(search && {
        [Op.or]: [
          { fullname: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ],
      }),
    };

    const role = await Role.findOne({
      where: { name: "customer" },
    });

    const users = await User.findAndCountAll({
      where: { ...where, role_id: role.id },
      attributes: [
        "id",
        "fullname",
        "username",
        "email",
        "phone",
        "role_id",
        "isActivated",
        "createdAt",
        "isDeleted",
      ],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      message: "Get users successfully",
      data: users.rows,
      total: users.count,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res
      .status(500)
      .json({ message: "Failed to get users", error: error.message });
  }
};

const getUserById = async (req, res) => {
  try {
    const userInstance = await User.findOne({
      where: { id: req.params.id },
      attributes: [
        "id",
        "fullname",
        "username",
        "email",
        "phone",
        "role_id",
        "address",
        "gender",
        "date_of_birth",
        "province",
        "district",
        "ward",
        "isActivated",
      ],
    });
    if (!userInstance) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = userInstance.get({ plain: true });

    const role = await Role.findOne({
      where: { id: user.role_id },
      attributes: ["name"],
    });

    delete user.role_id;

    const userData = {
      ...user,
      role: role.name,
    };
    res.status(200).json({ message: "Get user successfully", data: userData });
  } catch (error) {
    console.error("Error fetching user:", error);
    res
      .status(500)
      .json({ message: "Failed to get user", error: error.message });
  }
};

const createUserOfAdmin = async (req, res) => {
  const { ...userData } = req.body;

  try {
    const existingUser = await User.findOne({
      where: { email: userData.email },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const role = await Role.findOne({
      where: { name: "customer" },
    });

    const hashedPassword = await bcrypt.hash(userData.email, 10);
    const user = await User.create({
      ...userData,
      password: hashedPassword,
      username: userData.email,
      role_id: role.id,
      isDeleted: false,
      isActivated: userData.isActivated,
      isFirstLogin: false,
    });
    res.status(201).json({ message: "User created successfully", data: user });
  } catch (error) {
    console.error("Error creating user:", error);
    res
      .status(500)
      .json({ message: "Failed to create user", error: error.message });
  }
};

const lockUserOfAdmin = async (req, res) => {
  try {
    const { isActivated, isDeleted } = req.body;
    const user = await User.findOne({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    await user.update({ isActivated, isDeleted });

    res.status(200).json({
      message: "User lock status updated successfully",
      // data: userResponse,
    });
    console.log(req.params.id);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Failed to update user lock status",
      error: error.message,
    });
  }
};

// const updateUserOfAdmin = async (req, res) => {
//   const { ...userData } = req.body;
//   try {
//     const user = await User.findOne({
//       where: { id: req.params.id },
//     });
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }
//     await user.update({
//       fullname: userData.fullname,
//       email: userData.email,
//       phone: userData.phone,
//       address: userData.address,
//     });
//     res.status(200).json({ message: "User updated successfully", data: user });
//   } catch (error) {
//     console.error("Error updating user:", error);
//     res
//       .status(500)
//       .json({ message: "Failed to update user", error: error.message });
//   }
// };

// xóa hồ sơ người nhà bệnh nhân
const deleteFamilyMember = async (req, res) => {
  const { id } = req.params;

  try {
    // Bước 1: Kiểm tra xem FamilyMember có tồn tại và thuộc về người dùng không
    const familyMember = await FamilyMember.findOne({
      where: {
        id,
        user_id: req.user.id,
        isDeleted: false,
      },
    });

    // Bước 2: Kiểm tra xem FamilyMember có lịch hẹn nào không
    const hasAppointments = await Appointment.findOne({
      where: {
        familyMember_id: id,
      },
    });

    if (hasAppointments) {
      return res.status(409).json({
        message: "Hồ sơ có lịch hẹn, không thể xóa",
      });
    }

    // Bước 3: Thực hiện xóa mềm FamilyMember
    await FamilyMember.update(
      { isDeleted: true, updatedAt: new Date() },
      { where: { id } }
    );

    res.status(200).json({
      message: "Xóa hồ sơ thành công",
    });
  } catch (error) {
    console.error("Error deleting FamilyMember:", error);
    res.status(500).json({
      message: "Lỗi khi xóa hồ sơ",
      error: error.message,
    });
  }
};

module.exports = {
  createManagerAccount,
  createProfile,
  getAllProfileOfUser,
  getInfoDoctor,
  getInfoUser,
  createUserAccount,
  updateUserProfile,
  updateFamilyProfile,
  getListUserOfAdmin,
  getUserById,
  createUserOfAdmin,
  lockUserOfAdmin,
  deleteFamilyMember,
};
