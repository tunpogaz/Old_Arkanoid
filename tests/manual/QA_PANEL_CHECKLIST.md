# QA PANEL - CHECKLIST KIỂM THỬ TAY

Tiền điều kiện: game đang chạy tại http://localhost:5173.

Mở game → bấm **CAMPAIGN MODE** → bấm **T** để bật QA TESTER PANEL. Checklist gồm đúng **27 bước**, bao phủ TC01–TC27 trong `TEST_PLAN.md`.

| # | Thao tác | Kỳ vọng | Kết quả |
| :--- | :--- | :--- | :--- |
| 1 | Bấm T | Panel hiện/ẩn; trạng thái, chế độ, số bóng, mạng, lượt, màn và danh sách power-up đang chạy hiển thị đúng | ☐ |
| 2 | Bấm 1 | Paddle rộng 224px; hiện WIDE PADDLE; HUD góc trên phải có đồng hồ tròn **WIDE** đếm lùi từ 10 giây | ☐ |
| 3 | Bấm 2 khi WIDE còn hiệu lực | Paddle hẹp 91px; hiện SHORT PADDLE; đồng hồ WIDE biến mất, chỉ còn **MINI** (hai hiệu ứng loại trừ nhau) | ☐ |
| 4 | Bấm 3 liên tiếp | 1 → 3 → 9 → 18 bóng; hai bóng mới tỏa hai bên; bấm tiếp vẫn 18; không có đồng hồ đếm | ☐ |
| 5 | Bấm 4 rồi bắn xuyên hàng gạch | Bán kính 11 → 19, bóng vàng phá liên tiếp nhiều gạch mà không đổi hướng; gạch bất tử vẫn nảy bóng; HUD có đồng hồ **MEGA** ~9 giây | ☐ |
| 6 | Bấm 5 | Số mạng +1, hiện +1 LIFE; không có đồng hồ đếm | ☐ |
| 7 | Bấm 6 | Hai nòng đỏ; đạn tự bắn mỗi 22 frame; Space bắn thêm; HUD có đồng hồ **LASER** ~7.5 giây | ☐ |
| 8 | Bấm 7 | Đúng 8 gạch thường bị phá ngẫu nhiên, điểm tăng; không có đồng hồ đếm | ☐ |
| 9 | Bấm 1 rồi chờ hết 10 giây | Giây cuối đồng hồ nhấp nháy; về 0 thì paddle tự trở lại 140px và đồng hồ biến mất | ☐ |
| 10 | Bấm 1, chờ ~4 giây, bấm 1 lần nữa | Bộ đếm trở về đầy 10 giây, chỉ có một đồng hồ WIDE (làm mới, không cộng dồn) | ☐ |
| 11 | Bấm L | Sang màn kế tiếp, gạch mới tải đúng, mọi bộ đếm/hiệu ứng bị xóa | ☐ |
| 12 | Bấm K | Toàn bộ gạch thường biến mất, qua màn; gạch bất tử còn lại | ☐ |
| 13 | Bấm G | Mất 1 mạng; khi hết mạng hiện ATTEMPT FAILED, còn 2/3 lượt, điểm giữ nguyên, hiệu ứng power-up bị xóa | ☐ |
| 14 | Bấm P hoặc ESC | Overlay PAUSED hiện với CONTINUE / REPLAY / MAIN MENU; bấm P/ESC lần nữa tiếp tục đúng vị trí | ☐ |
| 15 | Đang có đồng hồ power-up, bấm P rồi chờ 3 giây | Đồng hồ đứng yên; nếu wave đang trượt thì gạch cũng dừng giữa animation; CONTINUE chạy tiếp mượt | ☐ |
| 16 | Pause → REPLAY | Màn hiện tại tải lại đủ gạch, bóng gắn paddle, điểm giữ nguyên; mọi bộ đếm/xóa hiệu ứng, paddle 140px | ☐ |
| 17 | Pause → MAIN MENU | Về menu chính, overlay ẩn, nhạc nền dừng, hiệu ứng power-up được xóa | ☐ |
| 18 | Bấm M khi đang chơi | Về Menu chính ngay | ☐ |
| 19 | Bấm nút tạm dừng trên header (chỉ biểu tượng) | Overlay PAUSED hiện; nút đổi từ ⏸ sang ▶, không có chữ | ☐ |
| 20 | Mở modal Login, gõ chữ A/D/M/P/T/1-8 | Không di chuyển paddle, không đổi trạng thái game, không kích hoạt power-up | ☐ |
| 21 | Bắn trúng 1 bom giữa màn 1 | Chuỗi Domino lan khắp cụm, điểm tăng, không lặp gạch | ☐ |
| 22 | Survival Mode → chờ 1 wave | Gạch trượt xuống 42px trong ~0,75 giây (mượt, không giật); hàng mới trượt vào từ đỉnh và mờ dần hiện rõ; HUD báo wave | ☐ |
| 23 | Survival: phá một gạch PUSH ở hàng trên | Cả khối gạch trượt lên đúng 42px, dừng ở trần sân, hiện PUSH UP! ⬆; nếu sát trần thì không di chuyển và không lỗi | ☐ |
| 24 | Survival: đẩy gạch sát vạch | Vạch nhấp nháy + HAZARD ALERT | ☐ |
| 25 | Survival: để gạch chạm vạch | GAME OVER ngay, kể cả khi gạch đang trượt giữa animation (dùng đúng vị trí hiển thị) | ☐ |
| 26 | Kéo thanh Sound 0% → 100%, đặt 37% rồi tải lại trang | Nhạc nền/âm thanh nhỏ dần rồi im lặng, to dần trở lại; 0% không phát tiếng; sau reload thanh trượt và nhãn vẫn 37% | ☐ |
| 27 | Ở màn hình chính, bấm nút loa 🔊 để tắt tiếng, rồi mở Pause kéo thanh Sound | Nút đổi thành 🔇 và mọi âm thanh tắt; kéo thanh trong pause menu vẫn chỉnh được và nút header tự về 🔊 khi mức > 0% | ☐ |

## Ghi chú

- Nếu panel không hiện, kiểm tra focus đang ở ô nhập liệu (phím tắt bị chủ động bỏ qua khi gõ).
- Phím **8** đã bị bỏ cùng cơ chế +500 vàng; gạch vàng vẫn đáng 300 điểm nhưng không rơi vật phẩm.
- Ghi lại ảnh chụp màn hình vào `tests/evidence/` nếu phát hiện lỗi.
