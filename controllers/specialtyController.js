// // server/controllers/specialtyController.js
const { default: slugify } = require("slugify");
const Specialty = require("../models/specialtyModel");
const Hospital = require("../models/hospitalModel");
const HospitalSpecialty = require("../models/hospitalSpecialtyModel");

const { Op } = require("sequelize");
const path = require("path");
const { Doctor, DoctorSpecialty, Rating } = require("../models");
const User = require("../models/userModel");
const { OpenAI } = require("openai");
const fs = require("fs");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Đường dẫn đến file lưu trữ từ khóa
const keywordsFilePath = path.join(__dirname, "../data/specialtyKeywords.json");

// Hàm tải từ khóa từ file
const loadKeywords = () => {
  try {
    if (fs.existsSync(keywordsFilePath)) {
      const data = fs.readFileSync(keywordsFilePath, "utf8");
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error("Lỗi khi đọc file từ khóa:", error);
    return {};
  }
};

// Hàm lưu từ khóa vào file
const saveKeywords = (keywords) => {
  try {
    // Đảm bảo thư mục tồn tại
    const dir = path.dirname(keywordsFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(
      keywordsFilePath,
      JSON.stringify(keywords, null, 2),
      "utf8"
    );
  } catch (error) {
    console.error("Lỗi khi lưu file từ khóa:", error);
  }
};

// Hàm tạo từ khóa cho chuyên khoa
const generateKeywordsForAI = async (specialty) => {
  try {
    const prompt = `Hãy liệt kê 10 triệu chứng hoặc từ khóa phổ biến liên quan đến chuyên khoa y tế "${
      specialty.name
    }". 
    Mô tả chuyên khoa: "${specialty.description || ""}".
    Chỉ trả về danh sách các từ khóa, mỗi từ khóa trên một dòng, không đánh số.`;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "user", content: prompt },
        {
          role: "system",
          content:
            "Bạn là một trợ lý y tế chuyên nghiệp. Hãy liệt kê các triệu chứng và từ khóa y tế chính xác.",
        },
      ],
      model: "gpt-4o-mini",
    });

    // Xử lý kết quả từ OpenAI
    const response = completion.choices[0].message.content;
    const keywords = response
      .split("\n")
      .map((keyword) => keyword.trim())
      .filter((keyword) => keyword && !keyword.match(/^\d+\./)); // Loại bỏ dòng trống và số thứ tự

    return keywords;
  } catch (error) {
    console.error(
      `Lỗi khi tạo từ khóa cho chuyên khoa ${specialty.name}:`,
      error
    );
    return [];
  }
};

// Thêm vào cuối file, trước module.exports
const generateKeywordsForSpecialty = async (req, res) => {
  try {
    const { id } = req.params;

    // Tìm chuyên khoa theo ID
    const specialty = await Specialty.findByPk(id);
    if (!specialty) {
      return res.status(404).json({ message: "Chuyên khoa không tồn tại" });
    }

    // Tạo từ khóa cho chuyên khoa
    const keywords = await generateKeywordsForAI(specialty);

    if (keywords.length === 0) {
      return res.status(400).json({ message: "Không thể tạo từ khóa" });
    }

    // Lưu từ khóa vào file
    const currentKeywords = loadKeywords();
    currentKeywords[specialty.name] = keywords;
    saveKeywords(currentKeywords);

    return res.status(200).json({
      message: "Đã tạo từ khóa thành công",
      keywords,
    });
  } catch (error) {
    console.error("Lỗi khi tạo từ khóa:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi tạo từ khóa" });
  }
};

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

    // Tự động tạo từ khóa cho chuyên khoa mới
    try {
      const keywords = await generateKeywordsForAI(newSpecialty);
      if (keywords.length > 0) {
        const currentKeywords = loadKeywords();
        currentKeywords[newSpecialty.name] = keywords;
        saveKeywords(currentKeywords);
        console.log(
          `Đã tạo ${keywords.length} từ khóa cho chuyên khoa ${newSpecialty.name}`
        );
      }
    } catch (keywordError) {
      console.error("Lỗi khi tạo từ khóa tự động:", keywordError);
      // Không trả về lỗi, vẫn tiếp tục lưu chuyên khoa
    }

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

    // Lưu tên cũ để kiểm tra thay đổi
    const oldName = specialty.name;

    // Kiểm tra tên chuyên khoa đã tồn tại (trừ chính nó)
    if (name && name !== specialty.name) {
      const existingSpecialty = await Specialty.findOne({ where: { name } });
      if (existingSpecialty) {
        return res.status(400).json({ message: "Tên chuyên khoa đã tồn tại" });
      }
    }

    // Cập nhật dữ liệu
    let photoUrl = specialty.photo;
    if (file) {
      photoUrl = `/uploads/${file.filename}`;
    }

    const slug = name
      ? slugify(name, { lower: true, strict: true })
      : specialty.slug;

    const updatedSpecialty = await specialty.update({
      name: name || specialty.name,
      photo: photoUrl,
      description: description || specialty.description,
      slug,
    });

    // Nếu tên thay đổi, cập nhật từ khóa
    if (name && name !== oldName) {
      try {
        const currentKeywords = loadKeywords();

        // Nếu có từ khóa cho tên cũ, lưu lại
        const oldKeywords = currentKeywords[oldName];

        // Xóa từ khóa của tên cũ
        if (oldKeywords) {
          delete currentKeywords[oldName];
        }

        // Tạo từ khóa mới cho tên mới
        const keywords = await generateKeywordsForAI(updatedSpecialty);
        if (keywords.length > 0) {
          currentKeywords[updatedSpecialty.name] = keywords;
          saveKeywords(currentKeywords);
          console.log(
            `Đã cập nhật từ khóa cho chuyên khoa ${updatedSpecialty.name}`
          );
        }
      } catch (keywordError) {
        console.error("Lỗi khi cập nhật từ khóa:", keywordError);
        // Không trả về lỗi, vẫn tiếp tục cập nhật chuyên khoa
      }
    }

    res.json({ updatedSpecialty });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update specialty" });
  }
};

// Delete chuyên khoa của hệ thống
const deleteSpecialty = async (req, res) => {
  try {
    const { id } = req.params;
    const specialty = await Specialty.findByPk(id);

    if (!specialty) {
      return res.status(404).json({ message: "Chuyên khoa không tồn tại" });
    }

    // Lưu tên để xóa từ khóa
    const specialtyName = specialty.name;

    await specialty.destroy();

    // Xóa từ khóa của chuyên khoa
    try {
      const currentKeywords = loadKeywords();
      if (currentKeywords[specialtyName]) {
        delete currentKeywords[specialtyName];
        saveKeywords(currentKeywords);
        console.log(`Đã xóa từ khóa của chuyên khoa ${specialtyName}`);
      }
    } catch (keywordError) {
      console.error("Lỗi khi xóa từ khóa:", keywordError);
      // Không trả về lỗi, vẫn tiếp tục xóa chuyên khoa
    }

    res.json({ message: "Xóa chuyên khoa thành công" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to delete specialty" });
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
  generateKeywordsForSpecialty,
};
