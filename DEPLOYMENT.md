# Hướng dẫn Triển khai Arkanoid Online lên Render

Tài liệu này hướng dẫn cách đưa game Arkanoid lên dịch vụ đám mây Render hoàn toàn miễn phí.

Dự án gồm 2 phần độc lập:
1. Backend Spring Boot: Chạy dưới dạng Web Service.
2. Frontend Web Game: Chạy dưới dạng Static Site.

---

## Bước 1: Triển khai Backend Web Service lên Render

1. Truy cập trang render.com và đăng nhập bằng tài khoản GitHub.
2. Bấm nút New ở góc trên bên phải, chọn Web Service.
3. Chọn kho mã nguồn tunpogaz/Old_Arkanoid từ danh sách kho của bạn.
4. Thiết lập các thông số như sau:
   - Name: arkanoid-backend
   - Root Directory: server
   - Environment: Docker
   - Region: Singapore hoặc bất kỳ khu vực nào gần bạn
   - Instance Type: Free
5. Bấm nút Create Web Service ở cuối trang.
6. Chờ Render tiến hành build và khởi chạy ứng dụng. Khi hoàn tất, Render sẽ cấp cho bạn một đường dẫn URL công khai có dạng:
   https://arkanoid-backend.onrender.com

---

## Bước 2: Triển khai Frontend Static Site lên Render

1. Vẫn tại trang quản lý Render, bấm nút New ở góc trên bên phải, chọn Static Site.
2. Chọn tiếp kho mã nguồn tunpogaz/Old_Arkanoid.
3. Thiết lập các thông số như sau:
   - Name: arkanoid-web
   - Root Directory: client
   - Build Command: npm install && npm run build
   - Publish Directory: dist
4. Thêm biến môi trường kết nối Backend:
   - Cuộn xuống mục Environment Variables.
   - Bấm Add Environment Variable.
   - Key: VITE_API_URL
   - Value: https://arkanoid-backend.onrender.com/api
   Lưu ý: Thay thế arkanoid-backend bằng đúng tên miền backend mà bạn vừa nhận được ở Bước 1, nhớ thêm đuôi /api ở cuối.
5. Bấm nút Create Static Site.
6. Chờ khoảng 1 phút để Render đóng gói mã nguồn. Khi hoàn tất, Render sẽ cấp cho bạn đường dẫn chơi game trực tuyến có dạng:
   https://arkanoid-web.onrender.com

Bây giờ bạn có thể gửi liên kết này cho bất kỳ ai để cùng chơi game và lưu bảng xếp hạng trực tuyến.
