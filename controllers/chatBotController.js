const sequelize = require("../config/database");
const { OpenAI } = require("openai");
const { Doctor, HospitalSpecialty, Hospital, Specialty } = require("../models");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const natural = require("natural");
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmerVi;
const { Op } = require("sequelize");
const fs = require("fs");
const path = require("path");

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

// Hàm tạo từ khóa cho chuyên khoa mới sử dụng OpenAI
const generateKeywordsForSpecialty = async (specialty) => {
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

// Hàm cập nhật từ khóa cho tất cả chuyên khoa
const updateAllSpecialtyKeywords = async () => {
  try {
    // Lấy tất cả chuyên khoa từ database
    const specialties = await Specialty.findAll();

    // Tải từ khóa hiện có
    const currentKeywords = loadKeywords();
    let hasChanges = false;

    // Kiểm tra và cập nhật từ khóa cho từng chuyên khoa
    for (const specialty of specialties) {
      // Nếu chuyên khoa chưa có từ khóa, tạo mới
      if (!currentKeywords[specialty.name]) {
        console.log(`Tạo từ khóa mới cho chuyên khoa: ${specialty.name}`);
        const newKeywords = await generateKeywordsForSpecialty(specialty);
        if (newKeywords.length > 0) {
          currentKeywords[specialty.name] = newKeywords;
          hasChanges = true;
        }
      }
    }

    // Lưu lại nếu có thay đổi
    if (hasChanges) {
      saveKeywords(currentKeywords);
      console.log("Đã cập nhật từ khóa chuyên khoa");
    }

    return currentKeywords;
  } catch (error) {
    console.error("Lỗi khi cập nhật từ khóa chuyên khoa:", error);
    return loadKeywords(); // Trả về từ khóa hiện có nếu có lỗi
  }
};

// Fake data từ khóa chuyên khoa - sẽ được thay thế bằng dữ liệu từ file
const defaultSpecialtyKeywords = {
  "Tim mạch": [
    "đau ngực",
    "khó thở",
    "huyết áp cao",
    "nhịp tim nhanh",
    "đánh trống ngực",
    "mệt mỏi",
    "chóng mặt",
    "đau vai trái",
    "suy tim",
    "nhồi máu cơ tim",
  ],
  "Thần kinh": [
    "đau đầu",
    "chóng mặt",
    "co giật",
    "tê bì",
    "run tay",
    "mất ngủ",
    "đau nửa đầu",
    "mất thăng bằng",
    "suy giảm trí nhớ",
    "đau cổ",
  ],
  "Tiêu hóa": [
    "đau bụng",
    "buồn nôn",
    "nôn",
    "tiêu chảy",
    "táo bón",
    "đầy hơi",
    "khó tiêu",
    "ợ chua",
    "đau dạ dày",
    "xuất huyết tiêu hóa",
  ],
  "Da liễu": [
    "nổi mẩn",
    "ngứa",
    "phát ban",
    "mụn",
    "nám",
    "tàn nhang",
    "vảy nến",
    "chàm",
    "viêm da",
    "rụng tóc",
  ],
  "Cơ xương khớp": [
    "đau khớp",
    "sưng khớp",
    "cứng khớp",
    "đau lưng",
    "đau cổ",
    "thoái hóa khớp",
    "viêm khớp",
    "gout",
    "đau vai",
    "đau gối",
  ],
  "Tai mũi họng": [
    "đau họng",
    "khàn tiếng",
    "ho",
    "chảy mũi",
    "nghẹt mũi",
    "ù tai",
    "đau tai",
    "viêm xoang",
    "viêm amidan",
    "viêm họng",
  ],
  Mắt: [
    "mờ mắt",
    "đau mắt",
    "khô mắt",
    "đỏ mắt",
    "ngứa mắt",
    "cườm mắt",
    "đục thủy tinh thể",
    "cận thị",
    "viễn thị",
    "loạn thị",
  ],
  "Nội tiết": [
    "tiểu đường",
    "tiểu nhiều",
    "khát nước",
    "sụt cân",
    "béo phì",
    "rối loạn tuyến giáp",
    "mệt mỏi",
    "đổ mồ hôi",
    "rối loạn kinh nguyệt",
  ],
  "Sản phụ khoa": [
    "kinh nguyệt",
    "đau bụng kinh",
    "khí hư",
    "ngứa vùng kín",
    "thai kỳ",
    "tiền mãn kinh",
    "vô sinh",
    "u xơ tử cung",
    "viêm âm đạo",
  ],
  "Nhi khoa": [
    "sốt",
    "ho",
    "sổ mũi",
    "tiêu chảy",
    "phát ban",
    "biếng ăn",
    "quấy khóc",
    "chậm tăng cân",
    "chậm phát triển",
    "viêm phổi trẻ em",
  ],
};

// Biến lưu trữ từ khóa, sẽ được cập nhật khi khởi động server
let specialtyKeywords = { ...defaultSpecialtyKeywords };

// Cập nhật từ khóa khi khởi động
(async () => {
  try {
    const updatedKeywords = await updateAllSpecialtyKeywords();
    specialtyKeywords = { ...defaultSpecialtyKeywords, ...updatedKeywords };
    console.log("Đã tải từ khóa chuyên khoa");
  } catch (error) {
    console.error("Lỗi khi tải từ khóa chuyên khoa:", error);
  }
})();

const chat = async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ message: "Vui lòng nhập câu hỏi" });
    }

    // Chuẩn hóa câu hỏi: chuyển thành chữ thường
    const normalizedQuestion = question.toLowerCase();

    // Tìm tất cả chuyên khoa trong hệ thống
    const specialties = await Specialty.findAll({
      attributes: ["id", "name", "description"],
    });

    // Kiểm tra xem câu hỏi có chứa từ khóa của chuyên khoa nào không
    let matchedSpecialty = null;
    let matchedKeywords = [];

    // Kiểm tra từ khóa trong danh sách
    for (const [specialtyName, keywords] of Object.entries(specialtyKeywords)) {
      const foundKeywords = keywords.filter((keyword) =>
        normalizedQuestion.includes(keyword.toLowerCase())
      );

      if (foundKeywords.length > 0) {
        // Tìm chuyên khoa tương ứng trong database
        const specialty = specialties.find(
          (s) =>
            s.name.toLowerCase().includes(specialtyName.toLowerCase()) ||
            specialtyName.toLowerCase().includes(s.name.toLowerCase())
        );

        if (specialty) {
          matchedSpecialty = specialty;
          matchedKeywords = foundKeywords;
          break;
        }
      }
    }

    // Nếu không tìm thấy từ danh sách từ khóa, thử tìm từ tên chuyên khoa
    if (!matchedSpecialty) {
      for (const specialty of specialties) {
        if (normalizedQuestion.includes(specialty.name.toLowerCase())) {
          matchedSpecialty = specialty;
          matchedKeywords = [specialty.name];
          break;
        }
      }
    }

    // Gọi OpenAI API để lấy câu trả lời tự nhiên
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "user", content: question },
        {
          role: "system",
          content:
            "Bạn là một trợ lý chuyên tư vấn y tế, hãy trả lời ngắn gọn và hữu ích.",
        },
      ],
      model: "gpt-4o-mini",
    });

    const aiResponse = completion.choices[0].message.content;

    // Nếu có chuyên khoa phù hợp, tìm bệnh viện liên quan
    if (matchedSpecialty) {
      // Tìm bệnh viện có chuyên khoa phù hợp
      const hospitalWithSpecialty = await Hospital.findOne({
        include: [
          {
            model: HospitalSpecialty,
            as: "hospitalSpecialty",
            where: {
              specialty_id: matchedSpecialty.id,
              consultation_fee: { [Op.gt]: 0 }, // Đảm bảo có phí khám
            },
          },
        ],
        order: [["createdAt", "DESC"]], // Lấy bệnh viện mới nhất
      });

      if (hospitalWithSpecialty) {
        // Tạo phản hồi với gợi ý bệnh viện và câu trả lời từ AI
        const response = {
          ai_response: `${aiResponse}\n\nDựa trên các triệu chứng như ${matchedKeywords.join(
            ", "
          )}, tôi nghĩ bạn nên tham khảo ý kiến bác sĩ chuyên khoa ${
            matchedSpecialty.name
          }. Tôi đã tìm được một cơ sở y tế phù hợp có thể giúp bạn.`,
          hospitals: hospitalWithSpecialty,
        };

        return res.status(200).json(response);
      }
    }

    // Nếu không tìm thấy chuyên khoa phù hợp hoặc không có bệnh viện, chỉ trả về câu trả lời AI
    return res.status(200).json({ ai_response: aiResponse });
  } catch (error) {
    console.error("ChatBot error:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xử lý yêu cầu" });
  }
};

// Thêm API endpoint để cập nhật từ khóa theo yêu cầu
const refreshKeywords = async (req, res) => {
  try {
    const updatedKeywords = await updateAllSpecialtyKeywords();
    specialtyKeywords = { ...defaultSpecialtyKeywords, ...updatedKeywords };

    return res.status(200).json({
      message: "Đã cập nhật từ khóa chuyên khoa thành công",
      count: Object.keys(specialtyKeywords).length,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật từ khóa:", error);
    return res
      .status(500)
      .json({ message: "Đã xảy ra lỗi khi cập nhật từ khóa" });
  }
};

module.exports = {
  chat,
  refreshKeywords,
};
