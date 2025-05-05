require("dotenv").config({ path: "../.env" });
const byscript = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Role = require("../models/roleModel");
const validator = require("validator");
const bcrypt = require("bcrypt");
const Hospital = require("../models/hospitalModel");
const StaffHospital = require("../models/staffHospitalModel");

const login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      where: { username },
      include: { model: Role, as: "role", attributes: ["name"] },
    });
    if (!user) {
      return res.status(404).json({ message: "Tên đăng nhập không tồn tại" });
    }
    if (user.isActivated === false && user.isFirstLogin === false) {
      return res.status(401).json({
        message: "Tài khoản đã bị khóa",
      });
    }

    const isPasswordValid = await byscript.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(404).json({ message: "Mật khẩu không đúng" });
    }

    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      fullname: user.fullname,
      phone: user.phone,
      address: user.address,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      avatar: user.avatar,
    };

    if (user.isFirstLogin) {
      return res.status(200).json({
        message: "Vui lòng đổi mật khẩu đầu tiên",
        temporaryToken: jwt.sign(
          { ...tokenPayload, isFirstLogin: true },
          process.env.JWT_SECRET,
          {
            expiresIn: "4m",
          }
        ),
      });
    }

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: tokenPayload,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ message: "Lỗi server" });
  }
};

const changePasswordFirstLogin = async (req, res) => {
  const { username, newPassword } = req.body;

  try {
    const user = await User.findOne({
      where: { username },
      include: { model: Role, as: "role", attributes: ["name"] },
    });
    if (!user) {
      return res.status(404).json({ message: "Tên đăng nhập không tồn tại" });
    }

    if (!user.isFirstLogin) {
      return res
        .status(404)
        .json({ message: "Mật khẩu đã được thay đổi lần đầu tiên trước đó" });
    }

    // new password is not same old password
    if (await byscript.compare(newPassword, user.password)) {
      return res
        .status(404)
        .json({ message: "Mật khẩu mới không được giống mật khẩu cũ" });
    }

    // validate new password
    if (
      !validator.isStrongPassword(newPassword, {
        minLength: 8,
      })
    ) {
      return res.status(404).json({ message: "Mật khẩu mới không đủ mạnh" });
    }

    // hash new password and update
    const hashedPassword = await byscript.hash(newPassword, 10);
    user.password = hashedPassword;
    user.isFirstLogin = false;
    user.isActivated = true;
    await user.save();

    // token after change password first login
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role.name,
      fullname: user.fullname,
      phone: user.phone,
      address: user.address,
      dateOfBirth: user.date_of_birth,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.status(200).json({
      message: "Tài khoản kích hoạt thành công",
      token,
      user: tokenPayload,
    });
  } catch (error) {
    console.error("Lỗi đổi mật khẩu:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};
const getUserInfoWithToken = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: [
        "id",
        "username",
        "email",
        "fullname",
        "phone",
        "address",
        "date_of_birth",
        "gender",
        "avatar",
      ],
      include: { model: Role, as: "role", attributes: ["name"] },
    });
    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin người dùng:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// create account patient
const registerPatient = async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role_id: 6,
      isFirstLogin: false,
      isActivated: true,
    });

    return res.status(200).json({
      message: "Tạo tài khoản thành công",
    });
  } catch (error) {
    console.error("Lỗi tạo tài khoản:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

const registerNewPatient = async (req, res) => {
  const { username, password, fullname } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = await Role.findOne({
      where: { name: "customer" },
    });
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role_id: role.id,
      isFirstLogin: false,
      isActivated: true,
      fullname,
    });

    const roleName = await Role.findByPk(newUser.role_id);
    const tokenPayload = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: roleName.name,
      fullname: newUser.fullname,
      phone: newUser.phone,
      address: newUser.address,
      date_of_birth: newUser.date_of_birth,
      gender: newUser.gender,
      avatar: newUser.avatar,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7days",
    });
    return res.status(200).json({
      message: "Tạo tài khoản thành công",
      token,
      user: tokenPayload,
    });
  } catch (error) {
    console.error("Lỗi tạo tài khoản:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// create account staff
const registerStaff = async (req, res) => {
  const { username, password } = req.body;

  try {
    const hospital = await Hospital.findOne({
      where: { manager_id: req.user.id },
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role_id: 4,
      isFirstLogin: false,
      isActivated: true,
    });

    const staffHospital = await StaffHospital.create({
      user_id: newUser.id,
      hospital_id: hospital.id,
    });

    return res.status(200).json({
      message: "Tạo tài khoản thành công",
    });
  } catch (error) {
    console.error("Lỗi tạo tài khoản:", error);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// google sign in
const googleSignIn = async (req, res) => {
  const { name, email, photo, familyName, givenName } = req.body;
  try {
    let user = await User.findOne({
      where: { email },
      include: { model: Role, as: "role", attributes: ["name"] },
    });
    const role = await Role.findOne({
      where: { name: "customer" },
    });
    if (user?.isActivated === false) {
      return res.status(404).json({ message: "Tài khoản đã bị khóa" });
    }
    if (!user) {
      user = await User.create({
        role_id: role.id,
        isFirstLogin: false,
        isActivated: true,
        email,
        avatar: photo,
        fullname: familyName + " " + givenName,
      });
    }
    const tokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role?.name,
      fullname: user.fullname,
      phone: user.phone,
      address: user.address,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      avatar: user.avatar,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    return res.status(200).json({
      message: "Đăng nhập thành công",
      token,
      user: tokenPayload,
    });
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  login,
  changePasswordFirstLogin,
  getUserInfoWithToken,
  registerPatient,
  registerStaff,
  googleSignIn,
  registerNewPatient,
};
