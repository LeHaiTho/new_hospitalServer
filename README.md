### Yêu cầu hệ thống

- Node.js (phiên bản 14 trở lên)
- npm

### Cài đặt

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

## ⚙️ Scripts

- `npm start` - Chạy server trong môi trường production
- `npm run dev` - Chạy server với nodemon (auto-reload)

## 📝 Lưu ý

- Đảm bảo cấu hình database PostgreSQL trước khi chạy
- File `.env` cần được cấu hình với các biến môi trường cần thiết
- Server sẽ tự động tạo tables nếu chưa tồn tại
- Thay thế tất cả các giá trị placeholder (`your_*`) trong file `.env` bằng thông tin thực tế