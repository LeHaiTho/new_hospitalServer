const sequelize = require("../config/database");
const { OpenAI } = require("openai");
const { Doctor, HospitalSpecialty, Hospital } = require("../models");
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const medicalKeywords = {
  "Thần kinh": [
    "đau đầu",
    "chóng mặt",
    "mệt mỏi",
    "tê bì",
    "liệt",
    "đau cổ",
    "đau lưng",
  ],
  "Nha khoa": [
    "răng miệng",
    "sâu răng",
    "đau răng",
    "viêm lợi",
    "chảy máu răng",
    "hôi miệng",
    "niềng răng",
  ],
  "Tim mạch": [
    "tim",
    "huyết áp",
    "nhồi máu cơ tim",
    "suy tim",
    "đau ngực",
    "khó thở",
    "nhịp tim",
  ],
  "Cơ Xương Khớp": [
    "đau khớp",
    "viêm khớp",
    "gai cột sống",
    "thoái hóa khớp",
    "chấn thương xương",
    "gãy xương",
    "đau cơ",
  ],
  "Tiêu hoá": [
    "đau bụng",
    "sốt",
    "tiêu chảy",
    "buồn nôn",
    "đầy bụng",
    "nôn",
    "dạ dày",
    "đường ruột",
    "tiêu hoá",
  ],
  "Tai mũi họng": [
    "ho",
    "viêm họng",
    "ngạt mũi",
    "chảy mũi",
    "đau tai",
    "tai",
    "mũi",
    "họng",
  ],
};

const chat = async (req, res) => {
  const { question } = req.body;

  let specialtyId = null;
  let matchedSpecialty = "";

  // Chuyển câu hỏi thành chữ thường để việc so sánh dễ dàng hơn
  const lowerCaseQuestion = question.toLowerCase();

  // Kiểm tra và gán chuyên khoa dựa trên từ khóa
  for (const [specialty, keywords] of Object.entries(medicalKeywords)) {
    if (keywords.some((keyword) => lowerCaseQuestion.includes(keyword))) {
      specialtyId = {
        "Thần kinh": 58,
        "Nha khoa": 60,
        "Tim mạch": 55,
        "Cơ Xương Khớp": 50,
        "Tiêu hoá": 52,
        "Tai mũi họng": 59,
      }[specialty];
      matchedSpecialty = specialty;
      break;
    }
  }

  // Kiểm tra xem có chuyên khoa phù hợp hay không

  // Gọi OpenAI nếu không tìm thấy chuyên khoa
  if (!specialtyId) {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: "user", content: question },
        {
          role: "system",
          content: "Bạn là một trợ lý chuyên tư vấn y tế.",
        },
      ],
      model: "gpt-4o-mini",
    });

    return res.status(200).json({
      ai_response: completion.choices[0].message.content,
    });
  }

  // Lấy danh sách bệnh viện theo chuyên khoa
  const hospitals = await Hospital.findOne({
    include: {
      model: HospitalSpecialty,
      as: "hospitalSpecialty",
      where: { specialty_id: specialtyId },
    },
  });
  const completion = await openai.chat.completions.create({
    messages: [
      { role: "user", content: question },
      {
        role: "system",
        content:
          "Bạn là một trợ lý chuyên tư vấn y tế, Hãy đưa ra lời khuyên cho khách hàng",
      },
    ],
    model: "gpt-4o-mini",
  });

  return res.status(200).json({
    specialty: matchedSpecialty,
    hospitals,
    ai_response: completion.choices[0].message.content,
  });
};

module.exports = { chat };
