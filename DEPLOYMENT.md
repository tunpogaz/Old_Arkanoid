# 🌐 Hướng dẫn Triển khai Arkanoid Online lên Internet (Miễn phí 100%)

Tài liệu này hướng dẫn bạn cách đưa game Arkanoid lên mạng Internet để bất kỳ ai có link web đều có thể truy cập chơi và lưu điểm trực tuyến.

---

## Cách 1: Chạy toàn bộ hệ thống bằng Docker (Khuyên dùng khi chạy local / VPS)

Chỉ với 1 câu lệnh duy nhất tại thư mục gốc của dự án:

```bash
docker compose up --build
```

* **Web Game Client**: Chạy tại [http://localhost:3000](http://localhost:3000)
* **Spring Boot Backend & DB**: Chạy tại [http://localhost:8080](http://localhost:8080)

Để dừng container:
```bash
docker compose down
```

---

## Cách 2: Triển khai lên Cloud Miễn phí (Vercel + Render)

### Bước 1: Deploy Backend lên Render (Miễn phí)
1. Đăng ký tài khoản miễn phí tại [render.com](https://render.com).
2. Chọn **New +** -> **Web Service**.
3. Kết nối với repository GitHub của bạn: `tunpogaz/Old_Arkanoid`.
4. Điền các thông tin:
   * **Root Directory**: `server`
   * **Environment**: `Java` (hoặc `Docker`)
   * **Build Command**: `mvn clean package -DskipTests`
   * **Start Command**: `java -jar target/arkanoid-server-1.0.0.jar`
5. Bấm **Create Web Service**. 
6. Sau khi Render deploy xong, bạn sẽ nhận được một địa chỉ URL công khai, ví dụ:
   `https://arkanoid-backend.onrender.com`

---

### Bước 2: Deploy Frontend lên Vercel (Miễn phí)
1. Đăng ký tài khoản tại [vercel.com](https://vercel.com) (đăng nhập nhanh bằng GitHub).
2. Chọn **Add New...** -> **Project**.
3. Import repository `tunpogaz/Old_Arkanoid`.
4. Cấu hình cài đặt:
   * **Root Directory**: Bấm Edit và chọn thư mục `client`.
   * **Framework Preset**: `Vite` (tự động nhận diện).
   * **Environment Variables**: Thêm 1 biến môi trường:
     * Tên biến: `VITE_API_URL`
     * Giá trị: `<URL_Backend_Render_ở_bước_1>/api` (ví dụ: `https://arkanoid-backend.onrender.com/api`)
5. Bấm **Deploy**.
6. Chỉ sau 30 giây, Vercel sẽ cấp cho bạn một domain trực tuyến (ví dụ: `https://arkanoid-web.vercel.app`). Bạn có thể gửi link này cho bạn bè chơi ngay lập tức!
