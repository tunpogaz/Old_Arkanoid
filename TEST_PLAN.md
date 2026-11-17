# KẾ HOẠCH & BỘ TIÊU CHÍ KIỂM THỬ TRÒ CHƠI ARKANOID ONLINE
Tài liệu cung cấp hướng dẫn kiểm thử tự động và danh mục 25 ca kiểm thử thực tế dành cho đội ngũ kiểm thử chất lượng QA độc lập.

---

## 1. Phương Thức Kiểm Thử Tự Động

### Kiểm thử giao diện và logic game Web
Tại thư mục client:
```bash
cd client
npm test
```
Bộ kiểm thử tự động gồm 26 ca kiểm tra:
- Kiểm tra tính toàn vẹn của 20 màn chơi và hiệu ứng nổ Domino màn 1.
- Kiểm tra logic nhân 3 bóng x3 Multi-Ball chính xác từ 1 thành 3 bóng.
- Kiểm tra tỷ lệ rơi vật phẩm từ gạch thường đạt chuẩn 6%.
- Kiểm tra cơ chế 3 lượt chơi và bảo lưu điểm số.
- Kiểm tra cơ chế vạch đỏ Danger Line trong chế độ sinh tồn.
- Kiểm tra định dạng đường dẫn máy chủ REST API.

### Kiểm thử máy chủ Backend Spring Boot
Tại thư mục server:
```bash
cd server
mvn test
```
Kiểm tra khả năng khởi động của Spring Boot, nạp cơ sở dữ liệu H2 và các lớp bảo mật JWT.

---

## 2. Công Cụ Hỗ Trợ Kiểm Thử Nhanh Trong Trò Chơi

Khi đang chơi game trên trình duyệt, đội kiểm thử có thể bấm phím **T** để bật bảng điều khiển QA TESTER PANEL và sử dụng các phím tắt can thiệp trực tiếp:

| Phím Tắt | Chức Năng Kiểm Thử |
| :--- | :--- |
| **Phím T** | Bật hoặc tắt bảng thông tin kiểm thử trên màn hình |
| **Phím 1** | Nhận ngay vật phẩm mở rộng thanh paddle |
| **Phím 2** | Nhận ngay vật phẩm thu hẹp thanh paddle |
| **Phím 3** | Nhận ngay vật phẩm nhân 3 bóng x3 MULTI |
| **Phím 4** | Nhận ngay vật phẩm bóng khổng lồ MEGA BALL |
| **Phím 5** | Nhận ngay vật phẩm cộng thêm một mạng |
| **Phím 6** | Nhận ngay vật phẩm trang bị súng laser đôi |
| **Phím 7** | Kích hoạt bom nổ hạt nhân quét gạch |
| **Phím 8** | Nhận ngay 500 vàng cộng vào điểm số |
| **Phím L** | Chuyển ngay sang màn chơi kế tiếp |
| **Phím K** | Phá hủy toàn bộ gạch thường để kiểm tra chiến thắng màn chơi |
| **Phím G** | Tự hủy 1 mạng bóng để kiểm tra màn hình Retry |
| **Phím P** | Tạm dừng hoặc tiếp tục game |
| **Phím M hoặc ESC** | Quay về màn hình Menu chính |

---

## 3. Danh Mục 25 Ca Kiểm Thử Chức Năng

### Nhóm 1: Điều Khiển & Cơ Chế Phát Bóng
- **TC01: Di chuyển thanh paddle bằng bàn phím**
  - Thao tác: Nhấn giữ phím A, D hoặc các phím mũi tên trái phải.
  - Kết quả mong muốn: Paddle di chuyển mượt mà sang trái phải và dừng lại chuẩn xác tại mép màn hình.
- **TC02: Không bị điều khiển bởi con trỏ chuột**
  - Thao tác: Rê chuột tự do khắp màn hình canvas.
  - Kết quả mong muốn: Paddle giữ nguyên vị trí, không bám theo con trỏ chuột.
- **TC03: Tia laser ngắm hướng phát bóng**
  - Thao tác: Khi bóng dính trên paddle trước khi phát, nhấn phím di chuyển trái hoặc phải.
  - Kết quả mong muốn: Hàng chấm sáng neon đổi góc nghiêng trực tiếp theo hướng di chuyển.
- **TC04: Phát bóng theo hướng ngắm**
  - Thao tác: Nhấn phím Space hoặc click chuột trái.
  - Kết quả mong muốn: Bóng bay chính xác theo hướng tia laser đã hiển thị, không bị đổi góc ngẫu nhiên.

### Nhóm 2: Màn Chơi & Hiệu Ứng Domino
- **TC05: Hiệu ứng Domino nổ liên hoàn ở Màn 1**
  - Thao tác: Phát bóng hoặc bắn đạn laser trúng cụm gạch bom màu đỏ ở trung tâm.
  - Kết quả mong muốn: Toàn bộ cụm gạch nổ dây chuyền liên hoàn, rung màn hình và dọn sạch trung tâm.
- **TC06: Cấu trúc 20 màn chơi**
  - Thao tác: Dùng phím L để duyệt qua lần lượt từ màn 1 đến màn 20.
  - Kết quả mong muốn: Tất cả 20 màn đều tải dữ liệu hợp lệ, không có lỗi đứng hình.
- **TC07: Gạch di chuyển Push Brick**
  - Thao tác: Chơi từ màn 7 trở đi hoặc màn 10.
  - Kết quả mong muốn: Các hàng gạch Push dao động nhịp nhàng qua lại.
- **TC08: Gạch bất tử Immortal Brick**
  - Thao tác: Cho bóng đập vào gạch xám bất tử.
  - Kết quả mong muốn: Bóng nảy ngược lại, phát âm thanh kim loại đanh và gạch không vỡ.

### Nhóm 3: Vật Phẩm & Logic Nhân 3 Bóng
- **TC09: Thu thập vật phẩm nhân 3 bóng**
  - Thao tác: Khi có 1 quả bóng trên sân, nhấn phím 3 hoặc nhặt viên nhộng x3 MULTI.
  - Kết quả mong muốn: 1 bóng lập tức tách thành 3 bóng tỏa đều hai bên.
- **TC10: Nhân tiếp khi đang có nhiều bóng**
  - Thao tác: Khi đang có 2 bóng trên sân, nhấn tiếp phím 3.
  - Kết quả mong muốn: 2 bóng nhân thành 6 bóng, tối đa không quá 18 bóng.
- **TC11: Nhặt vật phẩm súng laser**
  - Thao tác: Nhấn phím 6 hoặc nhặt viên nhộng LASER.
  - Kết quả mong muốn: Paddle mọc hai nòng súng đỏ, nhấn Space bắn ra đạn laser phá gạch.
- **TC12: Nhặt vật phẩm Mega Ball**
  - Thao tác: Nhấn phím 4 hoặc nhặt viên nhộng MEGA.
  - Kết quả mong muốn: Bóng tăng kích thước, phát sáng vàng và xuyên thủng mọi khối gạch.
- **TC13: Nhặt vật phẩm mở rộng và thu hẹp**
  - Thao tác: Nhấn phím 1 kiểm tra WIDE, nhấn phím 2 kiểm tra MINI.
  - Kết quả mong muốn: Paddle đổi kích thước đúng theo nhãn.
- **TC14: Nhặt vật phẩm bom hạt nhân**
  - Thao tác: Nhấn phím 7 hoặc nhặt viên nhộng NUKE.
  - Kết quả mong muốn: 8 viên gạch ngẫu nhiên phát nổ và cộng điểm lập tức.
- **TC15: Hình dạng vật phẩm**
  - Thao tác: Quan sát các vật phẩm rơi tự nhiên.
  - Kết quả mong muốn: Toàn bộ là dạng viên nhộng nằm ngang phát sáng neon kèm nhãn chữ to rõ ràng.

### Nhóm 4: Cơ Chế 3 Lượt Chơi Bảo Lưu Điểm Số
- **TC16: Trừ mạng khi rơi bóng**
  - Thao tác: Để bóng rơi qua đáy màn hình.
  - Kết quả mong muốn: Số tim giảm 1 đơn vị, bóng mới gắn lại trên paddle để chuẩn bị bắn tiếp.
- **TC17: Kích hoạt màn hình thử lại lần 2**
  - Thao tác: Mất hết 3 mạng ở màn chơi bất kỳ.
  - Kết quả mong muốn: Màn hình hiển thị ATTEMPT FAILED, số lượt tiếp tục còn 2/3, điểm số được giữ nguyên vẹn.
- **TC18: Tiếp tục màn chơi**
  - Thao tác: Nhấn phím Space hoặc bấm nút CONTINUE LEVEL.
  - Kết quả mong muốn: Khởi động lại chính màn chơi hiện tại với 3 mạng đầy đủ và điểm số cũ.
- **TC19: Thất bại toàn bộ 3 lượt**
  - Thao tác: Làm mất hết cả 3 lượt tiếp tục.
  - Kết quả mong muốn: Xuất hiện màn hình GAME OVER thực sự và gửi điểm số lên máy chủ.

### Nhóm 5: Chế Độ Sinh Tồn Vô Tận
- **TC20: Khởi động Survival Mode**
  - Thao tác: Tại menu chính, bấm nút SURVIVAL MODE màu đỏ.
  - Kết quả mong muốn: Khởi động màn chơi sinh tồn với vạch đỏ nét đứt Danger Line phía trên paddle.
- **TC21: Đợt sóng gạch dồn xuống**
  - Thao tác: Quan sát sau mỗi 8 đến 9 giây.
  - Kết quả mong muốn: Toàn bộ gạch bị đẩy xuống 1 hàng và 1 hàng gạch ngẫu nhiên mới sinh ra ở đỉnh.
- **TC22: Báo động vạch đỏ**
  - Thao tác: Khi gạch tiến sát vạch Danger Line dưới 55 pixel.
  - Kết quả mong muốn: Vạch laser nhấp nháy đỏ rực và thanh HUD hiện cảnh báo HAZARD ALERT.
- **TC23: Chạm vạch Danger Line**
  - Thao tác: Để bất kỳ viên gạch nào chạm hoặc vượt qua vạch Danger Line.
  - Kết quả mong muốn: Nổ tung màn hình và kết thúc game sinh tồn ngay lập tức.

### Nhóm 6: Tài Khoản & Bảng Xếp Hạng Đám Mây
- **TC24: Đăng ký & Đăng nhập**
  - Thao tác: Bấm nút Login / Register trên thanh tiêu đề, tạo tài khoản mới rồi đăng nhập.
  - Kết quả mong muốn: Tên người chơi hiển thị trên thanh header, lưu mã JWT vào phiên làm việc.
- **TC25: Ghi nhận điểm số & Bảng xếp hạng**
  - Thao tác: Kết thúc game hoặc bấm Leaderboard tại menu.
  - Kết quả mong muốn: Điểm số kỷ lục được cập nhật và hiển thị trong danh sách top 10 người chơi cao nhất.
