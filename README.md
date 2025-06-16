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
   ```

3. **Cấu hình môi trường:**

   Tạo file `.env` trong thư mục root của server:
   ```bash
   touch .env
   ```

   Sau đó sao chép nội dung từ phần cấu hình môi trường bên dưới vào file `.env` và điền thông tin thực tế.

## ⚙️ Cấu hình môi trường

File `.env` cần chứa các biến môi trường sau:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=hospital_management
DB_USER=your_db_username
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# External API Keys
OPENAI_API_KEY=your_openai_api_key
```

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
- Thay thế tất cả các giá trị placeholder (`your_*`) trong file `.env` bằng thông tin thực tế

---

**Happy Coding! 🎉**
````
