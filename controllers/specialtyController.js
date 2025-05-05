// // server/controllers/specialtyController.js
const { default: slugify } = require("slugify");
const Specialty = require("../models/specialtyModel");
const Hospital = require("../models/hospitalModel");
const HospitalSpecialty = require("../models/hospitalSpecialtyModel");

const { Op } = require("sequelize");
const path = require("path");
const { Doctor, DoctorSpecialty, Rating } = require("../models");
const User = require("../models/userModel");

// Thêm chuyên khoa của hệ thống

const addSpecialty = async (req, res) => {
  try {
    const { name, description } = req.body;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    const specialty = await Specialty.findOne({ where: { name } });
    if (specialty) {
      return res.status(400).json({ message: "Specialty already exists" });
    }

    if (!file) {
      return res.status(400).json({ message: "File is required" });
    }

    const photoUrl = `/uploads/${file.filename}`;
    const slug = slugify(name, { lower: true, strict: true });

    const newSpecialty = await Specialty.create({
      name,
      photo: photoUrl,
      description,
      slug,
    });
    res.json({ newSpecialty });
    console.log(req.body);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to add specialty" });
  }
};

const updateSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const file = req.file;

    // Tìm chuyên khoa theo ID
    const specialty = await Specialty.findByPk(id);
    if (!specialty) {
      return res.status(404).json({ message: "Chuyên khoa không tồn tại" });
    }

    // Kiểm tra tên chuyên khoa đã tồn tại (trừ chính nó)
    if (name && name !== specialty.name) {
      const existingSpecialty = await Specialty.findOne({ where: { name } });
      if (existingSpecialty) {
        return res.status(400).json({ message: "Tên chuyên khoa đã tồn tại" });
      }
    }

    // Cập nhật dữ liệu
    const updateData = {};
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (name) updateData.slug = slugify(name, { lower: true, strict: true });
    if (file) updateData.photo = `/uploads/${file.filename}`;

    await specialty.update(updateData);

    res.json({ updatedSpecialty: specialty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi cập nhật chuyên khoa" });
  }
};
// Delete chuyên khoa của hệ thống
const deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm chuyên khoa
    const specialty = await Specialty.findByPk(id);
    if (!specialty) {
      return res.status(404).json({ message: "Chuyên khoa không tồn tại" });
    }

    // Kiểm tra liên kết với HospitalSpecialty
    const hospitalSpecialty = await HospitalSpecialty.findOne({
      where: { specialtyId: id },
    });
    if (hospitalSpecialty) {
      return res.status(400).json({
        message: "Không thể xóa chuyên khoa vì đã có liên kết với cơ sở y tế",
      });
    }

    // Xóa chuyên khoa
    await specialty.destroy();

    res.json({ message: "Xóa chuyên khoa thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Lỗi khi xóa chuyên khoa" });
  }
};

const getListSpecialty = async (req, res) => {
  try {
    const { name } = req.query;
    let whereCondition = {};
    if (name) {
      whereCondition = {
        name: {
          [Op.iLike]: `%${name}%`,
        },
      };
    }
    const specialties = await Specialty.findAll({ where: whereCondition });
    res.status(200).json({ specialties });
  } catch (error) {
    console.log(error.error);
    res.status(500).json({ message: "Failed to get specialty" });
  }
};

// GET LIST SPECIALTY ONLY NAME AND ID
const getListSpecialtyOnlyIdAndName = async (req, res) => {
  try {
    const specialties = await Specialty.findAll({
      attributes: ["id", "name", "photo"], // vừa thêm 16/10/2024: lấy thêm photo
    });
    res.status(200).json({ specialties });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Failed to get specialty" });
  }
};
const getSpecialtyIdFilterList = async (req, res) => {
  const { specialtyId } = req.params;
  const { type } = req.query;

  try {
    let doctors = [];
    let hospitals = [];

    // Lấy danh sách bác sĩ theo
    if (type === "doctor" || type === "all") {
      // lấy danh sách hospitalSpecial theo specialtyId
      const hospitalSpecialties = await HospitalSpecialty.findAll({
        where: { specialty_id: specialtyId },
      });
      // lấy danh sách doctor theo hospitalSpecialtyId
      const doctorSpecialties = await DoctorSpecialty.findAll({
        where: {
          hospital_specialty_id: hospitalSpecialties.map((item) => item.id),
        },
      });
      // danh sách specialty theo doctorSpecialtyId

      // lấy danh sách doctor theo doctorSpecialtyId
      const rawDoctors = await Doctor.findAll({
        where: { id: doctorSpecialties.map((item) => item.doctor_id) },
        include: [
          {
            model: User,
            as: "user",
          },
          {
            model: Rating,
            as: "ratings",
          },
          {
            model: DoctorSpecialty,
            as: "doctorSpecialty",
            // where: {
            //   hospital_specialty_id: hospitalSpecialties.map((item) => item.id),
            // },
            include: [
              {
                model: HospitalSpecialty,
                as: "hospitalSpecialty",
                include: [
                  {
                    model: Specialty,
                    as: "specialty",
                  },
                ],
              },
            ],
          },
        ],
      });
      // lấy danh sách doctor theo doctorSpecialtyId nhưng trùng thì chỉ lấy 1
      doctors = rawDoctors.map((doctor) => {
        const uniqueSpecialties = [];
        const specialtyIds = new Set();

        doctor.doctorSpecialty.forEach((specialty) => {
          if (!specialtyIds.has(specialty.hospitalSpecialty.specialty_id)) {
            uniqueSpecialties.push(specialty);
            specialtyIds.add(specialty.hospitalSpecialty.specialty_id);
          }
        });
        const ratings = doctor.ratings;
        const totalComments = ratings.length;
        const averageRating =
          totalComments > 0
            ? ratings.reduce((acc, rating) => acc + rating.rating, 0) /
              totalComments
            : 0;

        return {
          ...doctor.toJSON(),
          doctorSpecialty: uniqueSpecialties,
          averageRating: averageRating.toFixed(1),
          totalComments: totalComments,
        };
      });
    }

    // Lấy danh sách bệnh viện
    if (type === "hospital" || type === "all") {
      hospitals = await Hospital.findAll({
        include: [
          {
            model: HospitalSpecialty,
            as: "hospitalSpecialty",
            where: {
              specialty_id: specialtyId,
              consultation_fee: { [Op.gt]: 0 },
            },
            include: [
              {
                model: Specialty,
                as: "specialty",
              },
            ],
          },
        ],
      });
    }

    return res.json({ doctors, hospitals });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
// lấy dịch vụ chuyên khoa theo hospitalId
const getSpecialtyByHospitalId = async (req, res) => {
  const { hospitalId } = req.query;
  try {
    const specialties = await HospitalSpecialty.findAll({
      where: {
        hospital_id: hospitalId,
        name: { [Op.not]: null },
        description: { [Op.not]: null },
        consultation_fee: { [Op.not]: null },
      },
      include: [
        {
          model: Specialty,
          as: "specialty",
        },
      ],
    });
    return res.json({ specialties });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
// lấy chi tiết chuyên khoa theo hospitalId và specialtyId
const getSpecialtyDetailOfHospital = async (req, res) => {
  const { hospitalId, specialtyId } = req.query;
  try {
    const specialty = await HospitalSpecialty.findOne({
      where: { hospital_id: hospitalId, specialty_id: specialtyId },
      include: [
        {
          model: Specialty,
          as: "specialty",
        },
      ],
    });
    return res.json({ specialty });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = {
  addSpecialty,
  getListSpecialty,
  updateSpecialty,
  deleteSpecialty,
  getListSpecialtyOnlyIdAndName,
  getSpecialtyIdFilterList,
  getSpecialtyByHospitalId,
  getSpecialtyDetailOfHospital,
};
