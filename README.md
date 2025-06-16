# Hospital Management System - Server

## 📋 Mô tả

Backend server cho hệ thống quản lý bệnh viện, được xây dựng với Node.js, Express và PostgreSQL.

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js (phiên bản 14 trở lên)
- npm

### Cài đặt

1. **Di chuyển vào thư mục server:**

````bash
   git clone https://github.com/LeHaiTho/new_hospitalServer
   cd server

2. **Cài đặt dependencies:**
  ```bash
  npm install
````

### Chạy ứng dụng

#### Chạy môi trường development (với nodemon):

```bash
npm run dev
```

## 📁 Cấu trúc thư mục

```
server/
├── config/         # Cấu hình database và các service
├── controllers/    # Xử lý logic của các route
├── middlewares/    # Middleware cho authentication, validation
├── models/         # Sequelize models
├── routes/         # API routes
├── services/       # Business logic và external services
├── utils/          # Utility functions
├── uploads/        # File uploads
├── socket/         # Socket.io handlers
└── index.js        # Entry point
```

## ⚙️ Scripts

- `npm start` - Chạy server trong môi trường production
- `npm run dev` - Chạy server với nodemon (auto-reload)

## 📝 Lưu ý

- Đảm bảo cấu hình database PostgreSQL trước khi chạy
- File `.env` cần được cấu hình với các biến môi trường cần thiết
- Server sẽ tự động tạo tables nếu chưa tồn tại

---

**Happy Coding! 🎉**
