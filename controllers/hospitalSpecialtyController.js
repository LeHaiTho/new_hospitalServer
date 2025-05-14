const { where } = require("sequelize");
const {
  Hospital,
  DoctorSpecialty,
  DoctorHospital,
  Doctor,
} = require("../models");
const HospitalSpecialty = require("../models/hospitalSpecialtyModel");
const Specialty = require("../models/specialtyModel");
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

const addHospitalSpecialty = async (req, res) => {
  const { hospital_id, specialty, name, description, consultation_fee } =
    req.body;
  const file = req.file;
  const imageUrl = file ? `/uploads/${file.filename}` : null;

  try {
    const { id } = req.user;
    if (req.user) {
      const hospital = await Hospital.findOne({
        where: {
          manager_id: id,
        },
      });

      let existingSpecialty = await HospitalSpecialty.findOne({
        where: {
          hospital_id: hospital.id,
          specialty_id: specialty,
        },
      });

      if (existingSpecialty) {
        // Nếu đã tồn tại, cập nhật thông tin mới
        await existingSpecialty.update({
          name,
          description,
          consultation_fee,
          image: imageUrl || existingSpecialty.image, // Giữ ảnh cũ nếu không tải ảnh mới
        });
        res.status(200).json({ message: "Cập nhật dịch vụ thành công!" });
      } else {
        // Nếu chưa tồn tại, tạo mới
        await HospitalSpecialty.create({
          hospital_id: hospital.id,
          specialty_id: specialty,
          name,
          description,
          consultation_fee,
          image: imageUrl,
        });
        res.status(201).json({ message: "Thêm dịch vụ thành công!" });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to add hospital specialty" });
  }
};

// Cập nhật chuyên khoa của bệnh viện
const updateHospitalSpecialty = async (req, res) => {
  const { id } = req.params;
  const { name, description, consultation_fee, specialty } = req.body;
  const file = req.file;

  try {
    const hospitalSpecialty = await HospitalSpecialty.findByPk(id);

    if (!hospitalSpecialty) {
      return res.status(404).json({ message: "Không tìm thấy chuyên khoa" });
    }

    // Kiểm tra quyền - chỉ manager của bệnh viện mới được cập nhật
    const hospital = await Hospital.findByPk(hospitalSpecialty.hospital_id);
    if (hospital.manager_id !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền cập nhật" });
    }

    // Cập nhật thông tin
    const updateData = {
      name,
      description,
      consultation_fee,
    };

    // Cập nhật specialty_id nếu có
    if (specialty) {
      updateData.specialty_id = specialty;
    }

    // Cập nhật ảnh nếu có
    if (file) {
      // Xóa ảnh cũ nếu có
      if (hospitalSpecialty.image) {
        const oldImagePath = path.join(
          __dirname,
          "..",
          "public",
          hospitalSpecialty.image
        );
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      updateData.image = `/uploads/${file.filename}`;
    }

    await hospitalSpecialty.update(updateData);

    res.status(200).json({
      message: "Cập nhật chuyên khoa thành công",
      specialty: hospitalSpecialty,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi cập nhật chuyên khoa" });
  }
};

// Thêm hàm softDeleteHospitalSpecialty
const softDeleteHospitalSpecialty = async (req, res) => {
  const { id } = req.params;

  try {
    const hospitalSpecialty = await HospitalSpecialty.findByPk(id);

    if (!hospitalSpecialty) {
      return res.status(404).json({ message: "Không tìm thấy chuyên khoa" });
    }

    // Kiểm tra quyền - chỉ manager của bệnh viện mới được xóa
    const hospital = await Hospital.findByPk(hospitalSpecialty.hospital_id);
    if (hospital.manager_id !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền xóa" });
    }

    // Xóa ảnh nếu có
    if (hospitalSpecialty.image) {
      const imagePath = path.join(
        __dirname,
        "..",
        "public",
        hospitalSpecialty.image
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Thay vì xóa bản ghi, chỉ đặt các trường thành null
    await hospitalSpecialty.update({
      name: null,
      description: null,
      consultation_fee: 0,
      image: null,
    });

    res.status(200).json({ message: "Xóa chuyên khoa thành công" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi xóa chuyên khoa" });
  }
};

// thêm chuyên khoa vào bệnh viện
const addSpecialtyToHospital = async (req, res) => {
  const { specialtyIds } = req.body;
  const managerId = req.user.id;
  try {
    const hospital = await Hospital.findOne({
      where: {
        manager_id: managerId,
      },
    });
    for (const specialtyId of specialtyIds) {
      const specialty = await Specialty.findByPk(specialtyId);
      if (specialty) {
        await HospitalSpecialty.findOrCreate({
          where: {
            hospital_id: hospital.id,
            specialty_id: specialty.id,
          },
        });
      }
    }
    res.status(200).json({ message: "Thêm chuyên khoa thành công!" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to add specialty to hospital" });
  }
};

// Cập nhật hàm getListHospitalSpecialties để lọc ra các chuyên khoa chưa bị xóa mềm
const getListHospitalSpecialties = async (req, res) => {
  try {
    if (req.user) {
      const hospital = await Hospital.findOne({
        where: {
          manager_id: req.user.id,
        },
      });
      const specialties = await HospitalSpecialty.findAll({
        where: {
          hospital_id: hospital.id,
          name: { [Op.not]: null }, // Điều kiện name khác null
          description: { [Op.not]: null }, // Điều kiện description khác null
        },
      });
      res.status(200).json({ specialties });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Lỗi khi lấy danh sách chuyên khoa" });
  }
};

// danh sách chuyên khoa của bệnh viện với tên chuyên khoa của hệ thống
const getListSpecialtyOfHospital = async (req, res) => {
  try {
    const managerId = req.user.id;
    const hospital = await Hospital.findOne({
      where: {
        manager_id: managerId,
      },
    });
    // lấy các id chuyên khoa của bệnh viện
    const specialtiesOfHospital = await HospitalSpecialty.findAll({
      where: {
        hospital_id: hospital.id,
      },
      attributes: ["specialty_id"],
    });
    // gọp thành 1 mảng
    const arraySpecialtyId = specialtiesOfHospital.map(
      (item) => item.specialty_id
    );
    // lấy tên chuyên khoa của hệ thống
    const specialtiesOfSystem = await Specialty.findAll({
      where: {
        id: arraySpecialtyId,
      },
      attributes: ["id", "name", "photo"],
    });
    res.status(200).json({ specialtiesOfSystem });
  } catch (error) {
    console.log(error);
  }
};

const getHospitalBySpecialtyAndDoctorId = async (req, res) => {
  const { specialtyId, doctorId } = req.params;

  try {
    // Tìm các bệnh viện thỏa mãn điều kiện
    const hospitals = await HospitalSpecialty.findAll({
      where: {
        specialty_id: specialtyId,
      },
    });
    // lấy bệnh viện từ doctorHospital tại specialtyId=specialtyId
    const hospitalSpecialties = await HospitalSpecialty.findAll({
      where: {
        hospital_id: hospitals.map((item) => item.hospital_id),
        specialty_id: specialtyId,
      },
      include: [
        {
          model: Hospital,
          as: "hospital",
        },
      ],
    });
    const doctorSpecialties = await DoctorSpecialty.findAll({
      where: {
        doctor_id: doctorId,
        hospital_specialty_id: hospitalSpecialties.map((item) => item.id),
      },
      include: [
        {
          model: HospitalSpecialty,
          as: "hospitalSpecialty",
          include: [
            {
              model: Hospital,
              as: "hospital",
            },
          ],
        },
      ],
    });

    res.status(200).json(doctorSpecialties);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "An error occurred while retrieving hospitals" });
  }
};

module.exports = {
  addHospitalSpecialty,
  getListHospitalSpecialties,
  getListSpecialtyOfHospital,
  addSpecialtyToHospital,
  getHospitalBySpecialtyAndDoctorId,
  updateHospitalSpecialty,
  softDeleteHospitalSpecialty,
};
