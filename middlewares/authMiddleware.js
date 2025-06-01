const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const Role = require("../models/roleModel");

const protect = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (token) {
    if (!token) {
      return res
        .status(401)
        .json({ message: "Không có token, truy cập bị từ chối!" });
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      console.log("decoded", decoded);
      next();
    } catch (error) {
      return res.status(401).json({ message: "Token không hợp lệ!" });
    }
  } else {
    next();
  }
};

// Alias for protect
const authenticateToken = protect;

const restrictTo = (role) => {
  return (req, res, next) => {
    if (req.user.role !== role) {
      console.log("req.user.role", req.user.role);
      console.log("role", role);
      return res.status(401).json({ message: "Bạn không có quyền truy cập!" });
    }

    next();
  };
};

// New function to handle multiple roles
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Không có thông tin người dùng, truy cập bị từ chối!",
        });
      }

      // Get user with role information
      const user = await User.findByPk(req.user.id, {
        include: [
          {
            model: Role,
            as: "role",
            attributes: ["name"],
          },
        ],
      });

      if (!user || !user.role) {
        return res.status(401).json({
          success: false,
          message: "Không tìm thấy thông tin role người dùng!",
        });
      }

      const userRole = user.role.name;

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Bạn không có quyền truy cập! Yêu cầu role: ${allowedRoles.join(
            ", "
          )}`,
        });
      }

      // Add role info to request object
      req.userRole = userRole;
      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      return res.status(500).json({
        success: false,
        message: "Lỗi server khi kiểm tra quyền truy cập",
        error: error.message,
      });
    }
  };
};

const isFirstLogin = async (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "Không có token, truy cập bị từ chối!" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded && decoded.isFirstLogin) {
      req.user = decoded;
      next();
    }
  } catch (error) {
    return res.status(401).json({ message: "Phiên đăng nhập đã hết hạn!" });
  }
};

module.exports = {
  protect,
  authenticateToken,
  restrictTo,
  requireRole,
  isFirstLogin,
};
