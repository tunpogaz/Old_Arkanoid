# QA PANEL - CHECKLIST KIỂM THỬ TAY

Tiền điều kiện: game đang chạy tại http://localhost:5173.

Mở game → bấm **CAMPAIGN MODE** → bấm **T** để bật QA TESTER PANEL.

| # | Thao tác | Kỳ vọng | Kết quả |
| :--- | :--- | :--- | :--- |
| 1 | Bấm T | Panel hiện/ẩn; trạng thái, chế độ, số bóng, mạng, lượt, màn hiển thị đúng | ☐ |
| 2 | Bấm 1 | Paddle rộng 224px; hiện chữ WIDE PADDLE | ☐ |
| 3 | Bấm 2 | Paddle hẹp 91px; hiện chữ SHORT PADDLE | ☐ |
| 4 | Bấm 3 (1 bóng) | Số bóng 1 → 3, hai bóng mới tỏa hai bên | ☐ |
| 5 | Bấm 3 lần nữa | 3 → 9 → 18; bấm tiếp vẫn 18 | ☐ |
| 6 | Bấm 4 | Bán kính bóng 11 → 19, bóng vàng | ☐ |
| 7 | Bấm 5 | Số mạng +1 | ☐ |
| 8 | Bấm 6 | Hai nòng đỏ; đạn tự bắn; Space bắn thêm | ☐ |
| 9 | Bấm 7 | Đúng 8 gạch thường bị phá ngẫu nhiên, điểm tăng | ☐ |
| 10 | Bấm 8 | Điểm +500 | ☐ |
| 11 | Bấm L | Sang màn kế tiếp, gạch mới tải đúng | ☐ |
| 12 | Bấm K | Toàn bộ gạch thường biến mất, qua màn; gạch bất tử còn lại | ☐ |
| 13 | Bấm G | Mất 1 mạng; khi hết mạng hiện ATTEMPT FAILED, còn 2/3 lượt, điểm giữ nguyên | ☐ |
| 14 | Bấm P hoặc ESC | Overlay PAUSED hiện với CONTINUE / REPLAY / MAIN MENU; bấm P/ESC lần nữa tiếp tục | ☐ |
| 15 | Bấm M khi đang chơi | Về Menu chính ngay | ☐ |
| 16 | Bấm nút tạm dừng trên header (chỉ biểu tượng) | Overlay PAUSED hiện; nút đổi từ ⏸ sang ▶, không có chữ | ☐ |
| 17 | Mở modal Login, gõ chữ A/D/M/P/T/1-8 | Không di chuyển paddle, không đổi trạng thái game | ☐ |
| 18 | Bắn trúng 1 bom giữa màn 1 | Chuỗi Domino lan khắp cụm, điểm tăng, không lặp gạch | ☐ |
| 19 | Survival Mode → chờ 1 wave | Gạch tụt 42px, hàng mới xuất hiện, HUD báo wave | ☐ |
| 20 | Survival: đẩy gạch sát vạch | Vạch nhấp nháy + HAZARD ALERT | ☐ |
| 21 | Survival: để gạch chạm vạch | GAME OVER ngay | ☐ |
| 22 | Pause → CONTINUE | Tiếp tục đúng vị trí, overlay ẩn, nút về ⏸ | ☐ |
| 23 | Pause → REPLAY | Màn hiện tại tải lại đủ gạch, bóng gắn paddle, điểm giữ nguyên | ☐ |
| 24 | Pause → MAIN MENU | Về menu chính, overlay ẩn, nhạc nền dừng | ☐ |
| 25 | Kéo thanh Sound 0% → 100% | Nhạc nền/âm thanh nhỏ dần rồi im lặng, to dần trở lại; 0% không phát tiếng | ☐ |
| 26 | Đặt âm lượng 37% rồi tải lại trang | Thanh trượt và nhãn vẫn 37%, nhạc nền đúng mức | ☐ |
| 27 | Bấm 4 (MEGA) rồi bắn xuyên hàng gạch | Bóng vàng phá liên tiếp nhiều gạch, không đổi hướng; gạch bất tử vẫn nảy bóng | ☐ |
| 28 | Ở màn hình chính, bấm nút loa 🔊 trên header | Nút đổi thành 🔇, mọi âm thanh tắt; bấm lại thành 🔊 và âm lượng trước đó được khôi phục | ☐ |
| 29 | Đang tắt tiếng từ header, mở menu tạm dừng và kéo thanh Sound | Vẫn điều chỉnh được bình thường; nút header tự chuyển về 🔊 khi mức > 0% | ☐ |

## Ghi chú

- Nếu panel không hiện, kiểm tra focus đang ở ô nhập liệu (phím tắt bị chủ động bỏ qua khi gõ).
- Ghi lại ảnh chụp màn hình vào `tests/evidence/` nếu phát hiện lỗi.
