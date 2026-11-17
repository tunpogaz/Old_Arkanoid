# ARKANOID ONLINE - MODERN WEB & CLOUD EDITION

Dự án trò chơi Arkanoid phiên bản trực tuyến hiện đại, kết hợp giữa đồ họa HTML5 Canvas mượt mà và hệ thống máy chủ Spring Boot lưu trữ đám mây.

<p align="center">
  <img width="1375" height="812" alt="Arkanoid Architecture Diagram" src="https://github.com/user-attachments/assets/cd37f0e3-b044-4e9d-9cee-9f5dc32d5fac" />
</p>

---

## 🌟 Tính Năng Nổi Bật

### 1. Chế Độ Chơi Đa Dạng
- **Campaign Mode:** Chuỗi 20 màn chơi thiết kế thủ công với độ khó tăng dần. Màn 1 kích hoạt hiệu ứng nổ dây chuyền Domino hoành tráng khi đánh trúng bom trung tâm. Các màn tiếp theo xuất hiện gạch di chuyển, hàng rào kim cương và phòng trùm cuối.
- **Survival Mode:** Chế độ sinh tồn vô tận. Các hàng gạch liên tục tiến xuống theo từng đợt sóng. Người chơi phải bảo vệ vạch laser đỏ Danger Line, nếu gạch chạm vạch sẽ thất bại ngay lập tức.
- **Cơ Chế 3 Lượt Chơi:** Mỗi lượt chiến dịch có 3 mạng. Khi hết mạng, điểm số được bảo lưu và người chơi có 2 lượt hồi sinh (tổng cộng 3 lần thử màn hiện tại).

### 2. Vật Phẩm Neon Dạng Viên Nhộng
Các vật phẩm rơi được tạo hình viên nhộng phát sáng nằm ngang với kích thước 72x24 pixel, gắn nhãn rõ ràng và hoàn toàn khác biệt với quả bóng:
- `↔ WIDE`: Mở rộng thanh paddle
- `>< MINI`: Thu hẹp thanh paddle
- `x3 MULTI`: Nhân ba bóng trên màn hình
- `● MEGA`: Biến bóng thành kích thước khổng lồ phá hủy mọi chướng ngại
- `❤️ +1 LIFE`: Tăng thêm một mạng dự phòng
- `⚡ LASER`: Trang bị súng đôi bắn đạn phá hủy gạch và kích nổ bom từ xa
- `💣 NUKE`: Bom hạt nhân phá hủy hàng loạt gạch
- `⭐ +500`: Cộng ngay 500 điểm thưởng

### 3. Điều Khiển & Vật Lý Chuẩn Xác
- **Phát bóng có laser định hướng:** Quả bóng trên paddle chiếu tia laser dạng chấm sáng neon hiển thị hướng bay trước khi bắn. Người chơi làm chủ 100% góc phát bóng bằng phím di chuyển, không có yếu tố ngẫu nhiên.
- **Điều khiển thanh paddle:** Hỗ trợ phím A, D hoặc các phím mũi tên trái phải với gia tốc mượt mà, không bị xung đột chuột.
- **Âm thanh tổng hợp Web Audio API:** Mô phỏng âm thanh nảy bóng, tiếng súng laser, tiếng bom nổ và nhạc nền retro đa dạng.

### 4. Hệ Thống Tài Khoản Đám Mây & Bảng Xếp Hạng
- Đăng ký và đăng nhập bảo mật bằng JSON Web Token.
- Lưu tiến độ mở khóa màn chơi và điểm số kỷ lục cá nhân lên cơ sở dữ liệu.
- Bảng xếp hạng toàn cầu tôn vinh các cao thủ điểm số cao nhất.

---

## 🏗 Kiến Trúc Hệ Thống

| Thành Phần | Công Nghệ Sử Dụng | Vai Trò |
| :--- | :--- | :--- |
| **Frontend Web** | HTML5 Canvas, JavaScript ES6, Vite 5, Web Audio API | Giao diện đồ họa, xử lý va chạm, hạt hiệu ứng |
| **Backend API** | Java 17, Spring Boot 3, Spring Security, JWT, JPA | Máy chủ REST API, bảo mật, xác thực người dùng |
| **Cơ Sở Dữ Liệu** | H2 In-Memory Database, hỗ trợ chuyển đổi MySQL | Lưu trữ người dùng, điểm số, lịch sử trận đấu |
| **Container & Cloud** | Docker, Docker Compose, Nginx, Render Blueprint | Đóng gói môi trường và triển khai tự động lên web |
| **Desktop Version** | JavaFX, Maven | Phiên bản ứng dụng chạy trực tiếp trên máy tính |

---

## 📁 Cấu Trúc Thư Mục Dự Án

```text
arkanoid/
├── client/                     # Mã nguồn giao diện Web Client
│   ├── src/
│   │   ├── api/                # Kết nối REST API đám mây
│   │   ├── entities/           # Đối tượng Paddle, Ball, Brick, Bullet, PowerUp
│   │   ├── systems/            # Bản đồ 20 màn chơi, âm thanh, hiệu ứng hạt
│   │   ├── main.js             # Vòng lặp game và bộ quản lý trạng thái
│   │   └── style.css           # Giao diện hiện đại Cyberpunk
│   ├── index.html              # Trang chủ và các bảng thông báo
│   ├── Dockerfile              # Đóng gói frontend bằng Nginx
│   └── package.json            # Cấu hình Vite và gói phụ thuộc
├── server/                     # Mã nguồn máy chủ Spring Boot
│   ├── src/main/java/          # Bộ điều khiển, dịch vụ, kho dữ liệu, bảo mật
│   ├── src/main/resources/     # Cấu hình cổng mạng và cơ sở dữ liệu
│   ├── pom.xml                 # Cấu hình thư viện Maven backend
│   └── Dockerfile              # Đóng gói backend nhiều tầng bằng OpenJDK 17
├── tests/                      # Toàn bộ tài nguyên kiểm thử QA
│   ├── TEST_PLAN.md            # 25 ca kiểm thử và tiêu chí nghiệm thu
│   ├── automated/              # Test client (79 kiểm tra) và smoke test REST API
│   ├── manual/                 # Checklist QA panel trong game
│   ├── evidence/               # Ảnh bằng chứng
│   └── reports/                # Báo cáo kết quả kiểm thử
├── src/main/java/              # Mã nguồn phiên bản JavaFX trên máy tính
├── docker-compose.yml          # Triển khai trọn bộ backend và frontend cùng lúc
├── render.yaml                 # Bản thiết kế tự động đưa lên đám mây Render
├── pom.xml                     # Cấu hình Maven cho ứng dụng máy tính
└── README.md                   # Tài liệu hướng dẫn dự án
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### Lựa Chọn 1: Chạy Cả Hệ Thống Bằng Docker Compose
Yêu cầu máy tính đã cài đặt Docker và Docker Desktop.

1. Mở cửa sổ dòng lệnh tại thư mục gốc của dự án:
```bash
docker compose up --build
```
2. Mở trình duyệt web để trải nghiệm:
- Giao diện game: http://localhost:3000
- Máy chủ backend: http://localhost:8080

Để dừng hệ thống:
```bash
docker compose down
```

---

### Lựa Chọn 2: Chạy Thủ Công Môi Trường Phát Triển Web

#### Bước 1: Khởi động máy chủ backend Spring Boot
Yêu cầu máy tính đã cài đặt Java 17 và Maven.

```bash
cd server
mvn spring-boot:run
```
Máy chủ backend sẽ hoạt động tại http://localhost:8080/api.

#### Bước 2: Khởi động giao diện web client
Yêu cầu máy tính đã cài đặt NodeJS phiên bản 18 trở lên.

```bash
cd client
npm install
npm run dev
```
Trình duyệt sẽ hiển thị địa chỉ chạy thử nghiệm tại http://localhost:5173.

---

### Lựa Chọn 3: Chạy Phiên Bản Máy Tính JavaFX
Yêu cầu máy tính đã cài đặt Java và Maven.

Tại thư mục gốc của dự án, chạy lệnh:
```bash
mvn clean javafx:run
```

---

## 🌐 Hướng Dẫn Đưa Lên Mạng Internet Bằng Render

Hệ thống đã tích hợp sẵn tệp cấu hình `render.yaml`. Quá trình triển khai hoàn toàn tự động và miễn phí theo các bước:

1. Đăng nhập vào trang quản lý https://render.com bằng tài khoản GitHub.
2. Bấm nút **New** ở góc trên bên phải, chọn mục **Blueprint**.
3. Chọn kho lưu trữ `Old_Arkanoid`.
4. Bấm nút **Apply**.
5. Render sẽ tự động dựng máy chủ backend và trang web frontend. Sau khi hoàn tất, bạn sẽ nhận được đường dẫn công khai để gửi cho bạn bè cùng chơi.

---

## 🎮 Hướng Dẫn Thao Tác Trong Trò Chơi

| Thao Tác | Phím Bấm | Chức Năng |
| :--- | :--- | :--- |
| **Di chuyển trái** | Phím A hoặc Mũi tên trái | Di chuyển thanh paddle sang trái, tia ngắm bóng nghiêng trái |
| **Di chuyển phải** | Phím D hoặc Mũi tên phải | Di chuyển thanh paddle sang phải, tia ngắm bóng nghiêng phải |
| **Phát bóng** | Phím Space hoặc Chuột trái | Bắn bóng theo hướng laser đang ngắm |
| **Bắn đạn laser** | Phím Space hoặc Chuột trái | Bắn loạt đạn đôi khi nhặt được vật phẩm súng laser |
| **Tạm dừng** | Phím P | Tạm dừng hoặc tiếp tục màn chơi |
| **Quay về menu** | Phím M hoặc Phím ESC | Quay trở lại màn hình chính |

---

## 🧪 Kiểm Thử

Toàn bộ tài nguyên kiểm thử nằm trong thư mục [`tests/`](tests/).

```bash
# 79 kiểm tra logic game (client + shared rules)
cd client && npm test

# 11 test backend Spring Boot
cd server && mvn test

# Smoke test REST API thật (backend đang chạy)
bash tests/automated/run-api-smoke.sh http://localhost:8080
```

Kịch bản 25 ca kiểm thử tay: [`tests/TEST_PLAN.md`](tests/TEST_PLAN.md). Checklist QA panel: [`tests/manual/QA_PANEL_CHECKLIST.md`](tests/manual/QA_PANEL_CHECKLIST.md).

---

## 📡 Danh Sách Các Cổng Giao Tiếp REST API

| Phương Thức | Đường Dẫn | Chức Năng | Yêu Cầu Xác Thực |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Kiểm tra trạng thái máy chủ | Không |
| `POST` | `/api/auth/register` | Đăng ký tài khoản người chơi mới | Không |
| `POST` | `/api/auth/login` | Đăng nhập và nhận chuỗi mã JWT | Không |
| `GET` | `/api/auth/me` | Lấy người dùng hiện tại từ JWT | Có mã JWT |
| `GET` | `/api/leaderboard` | Top 10 người chơi, mỗi người chỉ lấy điểm cao nhất | Không |
| `POST` | `/api/scores` | Ghi nhận điểm số, màn chơi và chuỗi combo | Có mã JWT |
| `GET` | `/api/scores/my-best` | Điểm cao nhất cá nhân | Có mã JWT |
| `GET` | `/api/user/profile` | Xem thông tin thứ hạng và điểm kỷ lục cá nhân | Có mã JWT |
| `POST` | `/api/user/progress` | Cập nhật số màn chơi cao nhất đã mở khóa | Có mã JWT |

---

## 📜 Bản Quyền
Dự án được xây dựng phục vụ mục đích học tập, nghiên cứu công nghệ phát triển web và lập trình trò chơi trực tuyến.
