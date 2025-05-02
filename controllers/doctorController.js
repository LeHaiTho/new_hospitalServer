const sequelize = require("../config/database");
const { DoctorSpecialty, DoctorHospital } = require("../models");
const Doctor = require("../models/doctorModel");
const User = require("../models/userModel");
const Role = require("../models/roleModel");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { HospitalSpecialty, Hospital, Specialty, Rating } = require("../models");
const Sequelize = require("sequelize");

const createDoctor = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      licenseCode,
      fullname,
      email,
      phone,
      description,
      specialty,
      gender,
      birthday,
      consultation_fee,
    } = req.body;
    const file = req.file || null;
    const imageUrl = file ? `/uploads/${file.filename}` : null;

    // Kiểm tra xem bác sĩ đã tồn tại chưa
    let doctor = await Doctor.findOne({
      // where: { certificate_id: licenseCode },
      where: { certificate_id: null },
    });

    // Bệnh viện hiện tại
    const hospital = await Hospital.findOne({
      where: {
        manager_id: req.user.id,
      },
    });

    // Nếu bác sĩ chưa tồn tại, tạo tài khoản và thông tin bác sĩ mới
    if (!doctor) {
      const hashedPassword = await bcrypt.hash(email, 10);
      const role = await Role.findOne({
        where: {
          name: "doctor",
        },
      });
      const newAccount = await User.create(
        {
          username: email,
          fullname,
          email,
          phone,
          password: hashedPassword,
          role_id: role.id,
          avatar: imageUrl,
          gender,
          date_of_birth: birthday,
          isFirstLogin: false,
          isActivated: true,
        },
        { transaction: t }
      );

      doctor = await Doctor.create(
        {
          description,
          user_id: newAccount.id,
          // certificate_id: licenseCode,
          certificate_id: null,
        },
        { transaction: t }
      );
    }

    // Kiểm tra và thêm quan hệ bác sĩ - bệnh viện
    const existingDoctorHospital = await DoctorHospital.findOne({
      where: { doctor_id: doctor.id, hospital_id: hospital.id },
      transaction: t,
    });

    if (!existingDoctorHospital) {
      await DoctorHospital.create(
        {
          doctor_id: doctor.id,
          hospital_id: hospital.id,
        },
        { transaction: t }
      );
    }

    // Thêm các chuyên khoa cho bác sĩ
    const specialtyIds = specialty.split(",").map((id) => parseInt(id));
    const hospitalSpecialties = await HospitalSpecialty.findAll({
      where: { specialty_id: specialtyIds, hospital_id: hospital.id },

      transaction: t,
    });

    for (const hospitalSpecialty of hospitalSpecialties) {
      const existingDoctorSpecialty = await DoctorSpecialty.findOne({
        where: {
          doctor_id: doctor.id,
          hospital_specialty_id: hospitalSpecialty.id,
        },

        transaction: t,
      });

      if (!existingDoctorSpecialty) {
        await DoctorSpecialty.create(
          {
            doctor_id: doctor.id,
            hospital_specialty_id: hospitalSpecialty.id,
            consultation_fee,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return res.status(200).json({ doctor });
  } catch (error) {
    await t.rollback();
    console.log(error);
    return res.status(500).json({ message: error.message });
  }
};

// server/controllers/doctorController.js
const updateDoctor1 = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const {
      licenseCode,
      fullname,
      email,
      phone,
      description,
      specialty,
      gender,
      birthday,
      consultation_fee,
    } = req.body;
    const file = req.file || null;
    const imageUrl = file ? `/Uploads/${file.filename}` : undefined;

    // Tìm bác sĩ
    const doctor = await Doctor.findOne({
      where: { id },
      include: [{ model: User, as: "user" }],
      transaction: t,
    });

    if (!doctor) {
      await t.rollback();
      return res.status(404).json({ message: "Bác sĩ không tồn tại" });
    }

    // Cập nhật thông tin User
    await User.update(
      {
        fullname,
        email,
        phone,
        gender,
        date_of_birth: birthday,
        avatar: imageUrl !== undefined ? imageUrl : doctor.user.avatar,
      },
      { where: { id: doctor.user_id }, transaction: t }
    );

    // Cập nhật thông tin Doctor
    await Doctor.update(
      {
        description,
        // certificate_id: licenseCode,
        certificate_id: null,
      },
      { where: { id }, transaction: t }
    );

    // Bệnh viện hiện tại
    const hospital = await Hospital.findOne({
      where: { manager_id: req.user.id },
      transaction: t,
    });

    // Kiểm tra quan hệ DoctorHospital
    const existingDoctorHospital = await DoctorHospital.findOne({
      where: { doctor_id: doctor.id, hospital_id: hospital.id },
      transaction: t,
    });

    if (!existingDoctorHospital) {
      await DoctorHospital.create(
        {
          doctor_id: doctor.id,
          hospital_id: hospital.id,
        },
        { transaction: t }
      );
    }

    // Cập nhật chuyên khoa
    const specialtyIds = specialty.split(",").map((id) => parseInt(id));
    // Xóa các chuyên khoa cũ của bác sĩ tại bệnh viện này
    await DoctorSpecialty.destroy({
      where: {
        doctor_id: doctor.id,
        hospital_specialty_id: {
          [Op.in]: (
            await HospitalSpecialty.findAll({
              where: { hospital_id: hospital.id },
              attributes: ["id"],
              transaction: t,
            })
          ).map((hs) => hs.id),
        },
      },
      transaction: t,
    });

    // Thêm chuyên khoa mới
    const hospitalSpecialties = await HospitalSpecialty.findAll({
      where: { specialty_id: specialtyIds, hospital_id: hospital.id },
      transaction: t,
    });

    for (const hospitalSpecialty of hospitalSpecialties) {
      await DoctorSpecialty.create(
        {
          doctor_id: doctor.id,
          hospital_specialty_id: hospitalSpecialty.id,
          consultation_fee,
        },
        { transaction: t }
      );
    }

    await t.commit();
    return res.status(200).json({ message: "Cập nhật bác sĩ thành công" });
  } catch (error) {
    await t.rollback();
    console.error("Error updating doctor:", error);
    return res.status(500).json({ message: error.message });
  }
};

// danh sách tất cả bác sĩ
// const getAllDoctor = async (req, res) => {
//   const doctors = await Doctor.findAll({
//     include: [
//       {
//         model: User,
//         as: "user",
//       },
//       {
//         model: DoctorSpecialty,
//         as: "doctorSpecialty",
//         include: [
//           {
//             model: HospitalSpecialty,
//             as: "hospitalSpecialty",
//             include: [
//               {
//                 model: Specialty,
//                 as: "specialty",
//               },
//             ],
//           },
//         ],
//       },
//       {
//         model: Rating,
//         as: "ratings",
//         attributes: ["id", "rating", "comment", "createdAt"],
//         order: [["createdAt", "DESC"]],
//       },
//     ],
//   });

//   // lấy danh bác sĩ và các chuyên khoa của họ
//   const doctorList = doctors.map((doctor) => {
//     const ratings = doctor.ratings;
//     const totalComments = ratings.length;
//     const averageRating =
//       totalComments > 0
//         ? ratings.reduce((acc, rating) => acc + rating.rating, 0) /
//           totalComments
//         : 0;
//     return {
//       id: doctor.id,
//       fullname: doctor.user.fullname,
//       email: doctor.user.email,
//       avatar: doctor.user.avatar,
//       description: doctor.description,
//       consultation_fee: doctor.doctorSpecialty.map(
//         (specialty) => specialty.consultation_fee
//       ),
//       specialties: Array.from(
//         new Map(
//           doctor.doctorSpecialty.map((specialty) => [
//             specialty.hospitalSpecialty.specialty_id,
//             {
//               id: specialty.hospitalSpecialty.specialty_id,
//               name: specialty.hospitalSpecialty.specialty.name,
//             },
//           ])
//         ).values()
//       ),
//       averageRating: averageRating.toFixed(1),
//       totalComments,
//     };
//   });
//   res.status(200).json({ doctorList });
// };

// test
// const getAllDoctor = async (req, res) => {
//   const { hospital_id, limit } = req.query; // Lấy query param `hospital_id`

//   try {
//     // Điều kiện lọc dựa trên `hospital_id`
//     const whereCondition = hospital_id
//       ? { "$doctorSpecialty.hospitalSpecialty.hospital_id$": hospital_id }
//       : {};
//     // cho thêm limit để Homescreen có thể giới hạn kết quả lấy bác sĩ nổi bật
//     const queryLimit = limit ? parseInt(limit) : undefined;
//     const doctors = await Doctor.findAll({
//       where: whereCondition,
//       limit: queryLimit || undefined,
//       order: [[{ model: Rating, as: "ratings" }, "rating", "DESC"]],
//       include: [
//         {
//           model: User,
//           as: "user",
//         },
//         {
//           model: DoctorSpecialty,
//           as: "doctorSpecialty",
//           include: [
//             {
//               model: HospitalSpecialty,
//               as: "hospitalSpecialty",
//               include: [
//                 {
//                   model: Specialty,
//                   as: "specialty",
//                 },
//               ],
//             },
//           ],
//         },
//         {
//           model: Rating,
//           as: "ratings",
//           attributes: ["id", "rating", "comment", "createdAt"],
//           // order: [["createdAt", "DESC"]],
//         },
//       ],
//     });

//     // Xử lý danh sách bác sĩ và các thông tin liên quan
//     const doctorList = doctors.map((doctor) => {
//       const ratings = doctor.ratings;
//       const totalComments = ratings.length;
//       const averageRating =
//         totalComments > 0
//           ? ratings.reduce((acc, rating) => acc + rating.rating, 0) /
//             totalComments
//           : 0;
//       return {
//         id: doctor.id,
//         fullname: doctor.user.fullname,
//         email: doctor.user.email,
//         avatar: doctor.user.avatar,
//         description: doctor.description,
//         consultation_fee: doctor.doctorSpecialty.map(
//           (specialty) => specialty.consultation_fee
//         ),
//         specialties: Array.from(
//           new Map(
//             doctor.doctorSpecialty.map((specialty) => [
//               specialty.hospitalSpecialty.specialty_id,
//               {
//                 id: specialty.hospitalSpecialty.specialty_id,
//                 name: specialty.hospitalSpecialty.specialty.name,
//               },
//             ])
//           ).values()
//         ),
//         averageRating: averageRating.toFixed(1),
//         totalComments,
//       };
//     });

//     // Trả về kết quả
//     res.status(200).json({ doctorList });
//   } catch (error) {
//     console.error("Error fetching doctors:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

const getAllDoctor = async (req, res) => {
  const { hospital_id, limit } = req.query; // Lấy query param `hospital_id` và `limit`

  try {
    // Điều kiện lọc dựa trên `hospital_id`
    const whereCondition = hospital_id
      ? { "$doctorSpecialty.hospitalSpecialty.hospital_id$": hospital_id }
      : {};

    // Giới hạn số lượng bác sĩ (mặc định không giới hạn nếu không truyền limit)
    const queryLimit = limit ? parseInt(limit) : undefined;

    // Truy vấn danh sách bác sĩ
    const doctors = await Doctor.findAll({
      where: { ...whereCondition },
      attributes: {
        include: [
          [
            Sequelize.literal(
              `(SELECT COALESCE(AVG("rating"), 0) FROM "Ratings" WHERE "Ratings"."doctor_id" = "Doctor"."id")`
            ),
            "averageRating",
          ],
        ],
      },

      include: [
        {
          model: User,
          where: { isActivated: true },
          as: "user",
          attributes: ["fullname", "email", "avatar"], // Chỉ lấy các trường cần thiết
        },
        {
          model: DoctorSpecialty,
          as: "doctorSpecialty",
          include: [
            {
              model: HospitalSpecialty,
              as: "hospitalSpecialty",
              include: [
                {
                  model: Specialty,
                  as: "specialty",
                  attributes: ["id", "name"], // Chỉ lấy id và name
                },
              ],
            },
          ],
        },
        {
          model: Rating,
          as: "ratings",
          attributes: ["id", "rating", "comment", "createdAt"],
        },
      ],
      order: [[Sequelize.literal('"averageRating"'), "DESC"]],
      limit: queryLimit,
    });

    // Xử lý danh sách bác sĩ và định dạng kết quả
    const doctorList = doctors.map((doctor) => {
      const ratings = doctor.ratings || []; // Đảm bảo ratings không undefined
      const totalComments = ratings.length;
      const averageRating =
        parseFloat(doctor.getDataValue("averageRating")) || 0;

      return {
        id: doctor.id,
        fullname: doctor.user.fullname,
        email: doctor.user.email,
        avatar: doctor.user.avatar,
        consultation_fee: doctor.doctorSpecialty.map(
          (specialty) => specialty.consultation_fee || 0 // Giá trị mặc định
        ),
        specialties: Array.from(
          new Map(
            doctor.doctorSpecialty.map((specialty) => [
              specialty.hospitalSpecialty.specialty_id,
              {
                id: specialty.hospitalSpecialty.specialty_id,
                name: specialty.hospitalSpecialty.specialty.name,
              },
            ])
          ).values()
        ),
        averageRating: averageRating.toFixed(1), // Làm tròn 1 chữ số thập phân
        totalComments,
      };
    });

    // Trả về kết quả
    res.status(200).json({ doctorList });
  } catch (error) {
    console.error("Error fetching doctors:", error.message);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

// lọc bác sĩ
const filterDoctor = async (req, res) => {
  const { hospital_id } = req.query; // Lấy query param `hospital_id`

  try {
    // Điều kiện lọc dựa trên `hospital_id`
    const whereCondition = hospital_id
      ? { "$doctorSpecialty.hospitalSpecialty.hospital_id$": hospital_id }
      : {};

    const doctors = await Doctor.findAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: DoctorSpecialty,
          as: "doctorSpecialty",
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
        {
          model: Rating,
          as: "ratings",
          attributes: ["id", "rating", "comment", "createdAt"],
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    // Xử lý danh sách bác sĩ và các thông tin liên quan
    const doctorList = doctors.map((doctor) => {
      const ratings = doctor.ratings;
      const totalComments = ratings.length;
      const averageRating =
        totalComments > 0
          ? ratings.reduce((acc, rating) => acc + rating.rating, 0) /
            totalComments
          : 0;
      return {
        id: doctor.id,
        fullname: doctor.user.fullname,
        email: doctor.user.email,
        avatar: doctor.user.avatar,
        // description: doctor.description,
        consultation_fee: doctor.doctorSpecialty.map(
          (specialty) => specialty.consultation_fee
        ),
        specialties: Array.from(
          new Map(
            doctor.doctorSpecialty.map((specialty) => [
              specialty.hospitalSpecialty.specialty_id,
              {
                id: specialty.hospitalSpecialty.specialty_id,
                name: specialty.hospitalSpecialty.specialty.name,
              },
            ])
          ).values()
        ),
        averageRating: averageRating.toFixed(1),
        totalComments,
      };
    });

    // Trả về kết quả
    res.status(200).json({ doctorList });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// danh sách bác sĩ thuộc bệnh viện
const getDoctorOfHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({
      where: {
        manager_id: req.user.id,
      },
    });
    if (!hospital) {
      return res.status(404).json({ message: "Hospital not found" });
    }

    const doctorHospital = await DoctorHospital.findAll({
      where: {
        hospital_id: hospital?.id,
      },
      include: [
        {
          model: Doctor,
          as: "doctor",
          // attributes: ["id", "description", "user_id", "certificate_id"],
          attributes: ["id", "description", "user_id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: { exclude: ["password"] },
            },
            {
              model: DoctorHospital,
              as: "doctorHospital",
              where: {
                hospital_id: hospital.id,
              },
            },
            {
              model: DoctorSpecialty,
              as: "doctorSpecialty",
              attributes: ["id", "hospital_specialty_id", "consultation_fee"],
              include: [
                {
                  model: HospitalSpecialty,
                  as: "hospitalSpecialty",
                  attributes: ["specialty_id"],
                  where: {
                    hospital_id: hospital.id,
                  },
                  include: [
                    {
                      model: Specialty,
                      as: "specialty",
                      attributes: ["id", "name"],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const doctorList = doctorHospital.map((item) => ({
      id: item.doctor.id,
      avatar: item.doctor.user.avatar,
      fullname: item.doctor.user.fullname,
      email: item.doctor.user.email,
      phone: item.doctor.user.phone,
      description: item.doctor.description,
      gender: item.doctor.user.gender,
      birthday: item.doctor.user.date_of_birth,
      // licenseCode: item.doctor.certificate_id,
      consultation_fee: item.doctor.doctorSpecialty.map(
        (specialty) => specialty.consultation_fee
      ),
      // specialties: item.doctor.doctorSpecialty.map((specialty) => ({
      //   id: specialty.hospitalSpecialty.specialty_id,
      //   name: specialty.hospitalSpecialty.specialty.name,
      // })),
      // lọc chuyên khoa duy nhất
      specialties: Array.from(
        new Map(
          item.doctor.doctorSpecialty.map((specialty) => [
            specialty.hospitalSpecialty.specialty_id,
            {
              id: specialty.hospitalSpecialty.specialty_id,
              name: specialty.hospitalSpecialty.specialty.name,
            },
          ])
        ).values()
      ),
      // isActivated: item.doctor.doctorHospital[0].is_active, // với doctor nhiều bệnh viện
      isDeleted: item.doctor.user.isDeleted,
      isActivated: item.doctor.user.isActivated,
      // với doctor 1 bệnh viện
    }));
    res.status(200).json({ doctorList });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// lấy danh sách bác sĩ từ admin
// const getAllDoctorAdmin = async (req, res) => {
//   try {
//     // Lấy tất cả bác sĩ từ tất cả bệnh viện
//     const doctorHospitals = await DoctorHospital.findAll({
//       include: [
//         {
//           model: Doctor,
//           as: "doctor",
//           attributes: ["id", "description", "user_id", "certificate_id"],
//           include: [
//             {
//               model: User,
//               as: "user",
//               attributes: [
//                 "id",
//                 "fullname",
//                 "email",
//                 "phone",
//                 "avatar",
//                 "gender",
//                 "date_of_birth",
//               ],
//             },
//             {
//               model: DoctorHospital,
//               as: "doctorHospital",
//               attributes: ["is_active", "hospital_id"],
//               include: [
//                 {
//                   model: Hospital,
//                   as: "hospital",
//                   attributes: ["id", "name"], // Lấy thêm thông tin bệnh viện
//                 },
//               ],
//             },
//             {
//               model: DoctorSpecialty,
//               as: "doctorSpecialty",
//               attributes: ["id", "hospital_specialty_id", "consultation_fee"],
//               include: [
//                 {
//                   model: HospitalSpecialty,
//                   as: "hospitalSpecialty",
//                   attributes: ["specialty_id"],
//                   include: [
//                     {
//                       model: Specialty,
//                       as: "specialty",
//                       attributes: ["id", "name"],
//                     },
//                   ],
//                 },
//               ],
//             },
//           ],
//         },
//       ],
//     });

//     // Chuyển đổi dữ liệu thành định dạng mong muốn
//     const doctorList = doctorHospitals.map((item) => ({
//       id: item.doctor.id,
//       avatar: item.doctor.user.avatar,
//       fullname: item.doctor.user.fullname,
//       email: item.doctor.user.email,
//       phone: item.doctor.user.phone,
//       description: item.doctor.description,
//       gender: item.doctor.user.gender,
//       birthday: item.doctor.user.date_of_birth,
//       licenseCode: item.doctor.certificate_id,
//       consultation_fee: item.doctor.doctorSpecialty.map(
//         (specialty) => specialty.consultation_fee
//       ),
//       specialties: Array.from(
//         new Map(
//           item.doctor.doctorSpecialty.map((specialty) => [
//             specialty.hospitalSpecialty.specialty_id,
//             {
//               id: specialty.hospitalSpecialty.specialty_id,
//               name: specialty.hospitalSpecialty.specialty.name,
//             },
//           ])
//         ).values()
//       ),
//       isActive: item.doctor.doctorHospital[0].is_active,
//       hospital: {
//         id: item.doctor.doctorHospital[0].hospital.id,
//         name: item.doctor.doctorHospital[0].hospital.name,
//       }, // Thêm thông tin bệnh viện
//     }));

//     res.status(200).json({ doctorList });
//   } catch (error) {
//     res.status(500).json({ message: error.message });
//   }
// };

const { Op } = require("sequelize");

const getAllDoctorAdmin = async (req, res) => {
  try {
    // Lấy tham số page, limit và search từ query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Điều kiện tìm kiếm
    const where = search
      ? {
          [Op.or]: [
            { "$user.fullname$": { [Op.iLike]: `%${search}%` } },
            { "$user.email$": { [Op.iLike]: `%${search}%` } },
            { "$user.phone$": { [Op.iLike]: `%${search}%` } },
          ],
        }
      : {};

    // Lấy tất cả bác sĩ với phân trang và tìm kiếm
    const { count, rows: doctors } = await Doctor.findAndCountAll({
      where,
      limit,
      offset,
      distinct: true, // Đảm bảo không đếm trùng bác sĩ
      include: [
        {
          model: User,
          as: "user",
          attributes: [
            "id",
            "fullname",
            "email",
            "phone",
            "avatar",
            "gender",
            "date_of_birth",
          ],
          required: true,
        },
        {
          model: DoctorHospital,
          as: "doctorHospital",
          attributes: ["is_active", "hospital_id", "isDeleted"],
          include: [
            {
              model: Hospital,
              as: "hospital",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: DoctorSpecialty,
          as: "doctorSpecialty",
          attributes: ["id", "hospital_specialty_id", "consultation_fee"],
          include: [
            {
              model: HospitalSpecialty,
              as: "hospitalSpecialty",
              attributes: ["specialty_id"],
              include: [
                {
                  model: Specialty,
                  as: "specialty",
                  attributes: ["id", "name"],
                },
              ],
            },
          ],
        },
      ],
    });
    // Chuyển đổi dữ liệu thành định dạng mong muốn
    const doctorList = doctors.map((doctor) => ({
      id: doctor.id,
      avatar: doctor.user.avatar,
      fullname: doctor.user.fullname,
      email: doctor.user.email,
      phone: doctor.user.phone,
      description: doctor.description,
      gender: doctor.user.gender,
      birthday: doctor.user.date_of_birth,
      // licenseCode: doctor.certificate_id,
      consultation_fee: doctor.doctorSpecialty.map(
        (specialty) => specialty.consultation_fee
      ),
      specialties: Array.from(
        new Map(
          doctor.doctorSpecialty.map((specialty) => [
            specialty.hospitalSpecialty.specialty_id,
            {
              id: specialty.hospitalSpecialty.specialty_id,
              name: specialty.hospitalSpecialty.specialty.name,
            },
          ])
        ).values()
      ),

      isDeleted: doctor.doctorHospital[0]?.isDeleted,
      isActive: doctor.doctorHospital[0]?.is_active ?? false,
      hospital: doctor.doctorHospital[0]?.hospital
        ? {
            id: doctor.doctorHospital[0].hospital.id,
            name: doctor.doctorHospital[0].hospital.name,
          }
        : null,
    }));

    // Tính tổng số trang
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      doctorList,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: count,
        limit,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

// lấy danh sách tên bác sĩ
const getDoctorNameList = async (req, res) => {
  const manager_id = req.user.id;
  const hospital = await Hospital.findOne({
    where: {
      manager_id,
    },
  });
  const doctorHospital = await DoctorHospital.findAll({
    where: {
      hospital_id: hospital.id,
    },
    include: [
      {
        model: Doctor,
        as: "doctor",
        attributes: ["id", "user_id"],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "fullname"],
          },
        ],
      },
    ],
  });
  const doctorList = doctorHospital.map((item) => ({
    id: item.doctor.id,
    fullname: item.doctor.user.fullname,
  }));
  res.status(200).json({ doctorList });
};

// lấy thông tin bác sĩ
const getDoctorDetail = async (req, res) => {
  const { id } = req.params;
  const doctor = await Doctor.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "fullname", "avatar", "phone", "email"],
      },
      {
        model: Rating,
        as: "ratings",
        attributes: ["id", "rating", "comment", "createdAt"],
        order: [["createdAt", "DESC"]],
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "fullname", "avatar"],
          },
        ],
      },
      {
        model: DoctorHospital,
        as: "doctorHospital",
        attributes: ["id", "hospital_id"],
        include: [
          {
            model: Hospital,
            as: "hospital",
            attributes: ["id", "name", "address"],
          },
        ],
      },
      {
        model: DoctorSpecialty,
        as: "doctorSpecialty",
        attributes: ["id", "hospital_specialty_id", "consultation_fee"],
        include: [
          {
            model: HospitalSpecialty,
            as: "hospitalSpecialty",
            attributes: ["specialty_id"],
            include: [
              {
                model: Specialty,
                as: "specialty",
                attributes: ["id", "name"],
              },
            ],
          },
        ],
      },
    ],
  });

  const doctorDetail = {
    id: doctor.id,
    fullname: doctor.user?.fullname,
    avatar: doctor.user?.avatar,
    phone: doctor.user?.phone,
    email: doctor.user?.email,
    description: doctor.description,
    ratings: doctor.ratings.map((rating) => ({
      id: rating.id,
      rating: rating.rating,
      comment: rating.comment,
      user: rating.user.fullname,
      avatar: rating.user.avatar,
      createdAt: rating.createdAt,
    })),
    consultation_fee: doctor.doctorSpecialty.map(
      (specialty) => specialty.consultation_fee
    ),
    hospitals: doctor.doctorHospital.map((hospital) => ({
      id: hospital.hospital.id,
      name: hospital.hospital.name,
      address: hospital.hospital.address,
    })),

    specialties: Array.from(
      new Map(
        doctor.doctorSpecialty?.map((specialty) => [
          specialty.hospitalSpecialty.specialty_id,
          {
            id: specialty.hospitalSpecialty.specialty_id,
            name: specialty.hospitalSpecialty.specialty?.name,
          },
        ])
      ).values()
    ),
  };
  res.status(200).json({ doctorDetail });
};

// lấy danh sách slot theo ngày từ bác sĩ

// const getAppointmentSlotsByDoctorAndDate = async (req, res) => {};

// lấy bác sĩ theo ID
const getDoctorById = async (req, res) => {
  const { id } = req.params;
  try {
    const doctor = await Doctor.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });
    res.status(200).json({ doctor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// lấy bác sĩ theo mã chứng chỉ hành nghề
const getDoctorByLicenseCode = async (req, res) => {
  const { licenseCode } = req.query;
  try {
    const doctor = await Doctor.findOne({
      where: { certificate_id: licenseCode },
      include: [
        {
          model: User,
          as: "user",
        },
      ],
    });
    if (doctor) {
      const doctorDetail = {
        id: doctor.id,
        fullname: doctor.user.fullname,
        phone: doctor.user.phone,
        email: doctor.user.email,
        avatar: doctor.user.avatar,
        description: doctor.description,
        // certificate_id: doctor.certificate_id,
        certificate_id: null,
        gender: doctor.user.gender,
        birthday: doctor.user.date_of_birth,
      };
      res.status(200).json({ doctorDetail });
    } else {
      res.status(200).json({ doctor });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// lấy danh sách bác sĩ online
const getAllDoctorOnline = async (req, res) => {
  const { doctorsOnline } = req.body;
  console.log("doctorsOnline", doctorsOnline);
  try {
    // Điều kiện lọc dựa trên `hospital_id`

    const doctors = await Doctor.findAll({
      where: {
        user_id: doctorsOnline,
      },
      include: [
        {
          model: User,
          as: "user",
        },
        {
          model: DoctorHospital,
          as: "doctorHospital",
          attributes: ["id", "hospital_id"],
          include: [
            {
              model: Hospital,
              as: "hospital",
              attributes: ["id", "name"],
            },
          ],
        },
        {
          model: DoctorSpecialty,
          as: "doctorSpecialty",
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
        {
          model: Rating,
          as: "ratings",
          attributes: ["id", "rating", "comment", "createdAt"],
          order: [["createdAt", "DESC"]],
        },
      ],
    });

    // Xử lý danh sách bác sĩ và các thông tin liên quan
    const doctorList = doctors.map((doctor) => {
      const ratings = doctor.ratings;
      const totalComments = ratings.length;
      const averageRating =
        totalComments > 0
          ? ratings.reduce((acc, rating) => acc + rating.rating, 0) /
            totalComments
          : 0;
      return {
        id: doctor.id,
        fullname: doctor.user.fullname,
        email: doctor.user.email,
        avatar: doctor.user.avatar,
        description: doctor.description,
        consultation_fee: doctor.doctorSpecialty.map(
          (specialty) => specialty.consultation_fee
        ),
        specialties: Array.from(
          new Map(
            doctor.doctorSpecialty.map((specialty) => [
              specialty.hospitalSpecialty.specialty_id,
              {
                id: specialty.hospitalSpecialty.specialty_id,
                name: specialty.hospitalSpecialty.specialty.name,
              },
            ])
          ).values()
        ),
        averageRating: averageRating.toFixed(1),
        totalComments,
        hospital: doctor.doctorHospital.map((hospital) => ({
          id: hospital.hospital.id,
          name: hospital.hospital.name,
        })),
      };
    });

    // Trả về kết quả
    res.status(200).json({ doctorList });
  } catch (error) {
    console.error("Error fetching doctors:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  createDoctor,
  getDoctorOfHospital,
  getDoctorNameList,
  getAllDoctor,
  getDoctorDetail,
  filterDoctor,
  getDoctorById,
  getDoctorByLicenseCode,
  getAllDoctorOnline,
  getAllDoctorAdmin,
  updateDoctor1,
  // createDoctor2,
};
