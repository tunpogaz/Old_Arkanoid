# KẾ HOẠCH & BỘ TIÊU CHÍ KIỂM THỬ TRÒ CHƠI ARKANOID ONLINE

Tài liệu dành cho đội QA độc lập. Toàn bộ tài nguyên kiểm thử (kịch bản, script tự động, ảnh bằng chứng, báo cáo) nằm trong thư mục `tests/`.

---

## 0. Cấu Trúc Thư Mục Kiểm Thử

```text
tests/
├── TEST_PLAN.md                     # Tài liệu này (27 ca kiểm thử + tiêu chí nghiệm thu)
├── README.md                        # Hướng dẫn chạy nhanh cho QA
├── automated/
│   ├── run-client-tests.js          # 173 kiểm tra tự động (game rules + entities)
│   └── run-api-smoke.sh             # Smoke test REST API thật (curl + jq)
├── manual/
│   └── QA_PANEL_CHECKLIST.md        # Checklist thao tác QA panel trong game
├── evidence/                        # Ảnh chụp màn hình bằng chứng
├── reports/
│   └── TEST_REPORT_2026-11-18.md    # Báo cáo kết quả kiểm thử thực tế
└── archive/
    └── runAllTests.legacy.js        # Bộ test cũ (đã ngưng dùng, chỉ lưu tham khảo)
```

---

## 1. Phương Thức Kiểm Thử Tự Động

### 1.1. Client + luật chơi dùng chung (173 kiểm tra)

```bash
cd client
npm test
```

Hoặc chạy trực tiếp từ thư mục gốc:

```bash
node tests/automated/run-client-tests.js
```

Bộ test import **module sản phẩm thật** (`GameRules.js`, `MapData.js`, `Ball.js`, `Paddle.js`, `Brick.js`, `PowerUp.js`), không sao chép logic vào test. Các nhóm kiểm tra:

| Nhóm | Nội dung | Số kiểm tra |
| :--- | :--- | :--- |
| 1 | 20 màn chơi: kích thước 8x13, ID gạch hợp lệ, cụm Domino màn 1, boss màn 20 | 6 |
| 2 | Hằng số luật chơi + chuẩn hóa URL REST API (kể cả `/api/`) + âm lượng | 18 |
| 3 | Nhân 3 bóng: 1→3, 2→6, 9→18, chặn ở 18, bảo toàn tốc độ/hướng | 9 |
| 4 | 7 PowerUp (đã bỏ vàng), nhãn, kích thước viên nhộng 72x24, tỷ lệ rơi 6%, gạch vàng không rơi vật phẩm | 25 |
| 5 | Chu trình 3 lượt: 3→2 RETRY→1 RETRY→0 GAME OVER | 7 |
| 6 | Danger Line: chạm/vượt vạch, ngưỡng cảnh báo 55px, bỏ qua gạch đã phá | 8 |
| 7 | Domino chain lan truyền qua bom, không phá gạch bất tử, không lặp | 8 |
| 8 | Kích thước paddle WIDE/MINI, ngắm bóng trái/phải, tốc độ phóng 7.5 | 12 |
| 9 | Mega Ball xuyên gạch thường, vẫn nảy gạch bất tử | 8 |
| 10 | Survival PUSH đẩy gạch lên, kẹp trần, animation easeInOutQuad, va chạm/vạch đỏ theo vị trí hiển thị, chồng sóng | 35 |
| 11 | Bộ đếm power-up: thời lượng, làm mới, đếm lùi, đóng băng, nhấp nháy giây cuối, WIDE/MINI loại trừ nhau | 28 |
| 12 | Hết hạn trả paddle 140px/bóng 11px/tắt laser; súng tự bắn theo timer | 9 |

Kỳ vọng: `TOTAL TESTS: 173`, `PASSED: 173`, `FAILED: 0`, exit code 0.

### 1.2. Backend Spring Boot

```bash
cd server
mvn test
```

Gồm 11 test JUnit:
- `contextLoads` (khởi động Spring Boot + H2).
- 10 test tích hợp MockMvc: health công khai, đăng ký/đăng nhập, JWT, lỗi validation trả 400, chặn payload xấu, bảng xếp hạng chỉ giữ điểm cao nhất của mỗi người chơi, hồ sơ và tiến độ.

### 1.3. Smoke test REST API trên server đang chạy

```bash
cd server
mvn spring-boot:run
# cửa sổ khác, tại thư mục gốc:
bash tests/automated/run-api-smoke.sh http://localhost:8080
```

Script dùng tài khoản ngẫu nhiên, kiểm tra 24 điểm: health, register, login, JWT, 400/401, submit score, leaderboard, profile, progress. Kỳ vọng `FAILED: 0`.

---

## 2. Công Cụ Hỗ Trợ Kiểm Thử Nhanh Trong Trò Chơi

Mở game trên trình duyệt, bấm **T** để bật/tắt bảng **QA TESTER PANEL**.

| Phím Tắt | Chức Năng Kiểm Thử |
| :--- | :--- |
| **T** | Bật/tắt bảng QA TESTER PANEL |
| **1** | Nhận PowerUp mở rộng paddle (WIDE, 224px, bộ đếm 10 giây) |
| **2** | Nhận PowerUp thu hẹp paddle (MINI, 91px, bộ đếm 10 giây; thay thế WIDE) |
| **3** | Nhận PowerUp nhân 3 bóng (x3 MULTI, không có bộ đếm) |
| **4** | Nhận PowerUp bóng khổng lồ (MEGA, bán kính 19, bộ đếm ~9 giây) |
| **5** | Nhận PowerUp +1 mạng (không có bộ đếm) |
| **6** | Nhận PowerUp súng laser đôi (tự bắn mỗi 22 frame, bộ đếm ~7.5 giây; Space bắn thêm) |
| **7** | Kích hoạt NUKE: phá ngẫu nhiên 8 viên gạch thường, cộng điểm |
| **L** | Campaign: sang màn kế tiếp; Survival: tăng số đợt sóng |
| **K** | Phá toàn bộ gạch thường (giữ gạch bất tử) để kiểm tra qua màn |
| **G** | Trừ 1 mạng (gọi đúng luồng mất bóng) để kiểm tra Retry |
| **P** hoặc **ESC** | Mở menu tạm dừng (CONTINUE / REPLAY / MAIN MENU / âm lượng); nhấn lần nữa để tiếp tục |
| **M** | Về Menu chính ngay từ bất kỳ trạng thái nào (trừ khi đang gõ trong ô đăng nhập) |
| **A / D / ← / →** | Di chuyển paddle |
| **Space / Click trái** | Phóng bóng hoặc bắn laser |

Phím **1–6** kích hoạt bộ đếm giống hệt nhặt vật phẩm thật: HUD hiện đồng hồ tròn + số giây ở góc trên phải, nhấp nháy giây cuối và tự gỡ hiệu ứng khi về 0. Nhấn lại cùng loại chỉ làm mới thời gian, không cộng dồn. Phím **8** đã bị bỏ cùng cơ chế +500 vàng.

Lưu ý: phím tắt không hoạt động khi con trỏ đang ở trong ô nhập liệu của modal đăng nhập.

---

## 3. Danh Mục 27 Ca Kiểm Thử Chức Năng

### Nhóm 1: Điều Khiển & Cơ Chế Phát Bóng

- **TC01: Di chuyển paddle bằng bàn phím**
  - Thao tác: Giữ A/D hoặc phím mũi tên trái/phải.
  - Kết quả mong muốn: Paddle di chuyển mượt, dừng đúng mép trong (x=30 và x=1030 với paddle 140px).

- **TC02: Không bị điều khiển bởi chuột**
  - Thao tác: Rê chuột khắp canvas.
  - Kết quả mong muốn: Paddle không bám theo con trỏ.

- **TC03: Tia laser ngắm hướng phát bóng**
  - Thao tác: Khi bóng còn gắn trên paddle, giữ trái hoặc phải.
  - Kết quả mong muốn: Hàng chấm neon nghiêng theo hướng đang giữ (khoảng ±39.6°).

- **TC04: Phát bóng theo hướng ngắm**
  - Thao tác: Nhấn Space hoặc click trái.
  - Kết quả mong muốn: Bóng rời paddle theo đúng hướng tia ngắm, tốc độ 7.5 px/frame, không đổi góc ngẫu nhiên.

### Nhóm 2: Màn Chơi & Hiệu Ứng Domino

- **TC05: Domino nổ liên hoàn màn 1**
  - Thao tác: Bắn bóng/đạn vào một viên bom đỏ trong cụm trung tâm màn 1.
  - Kết quả mong muốn: Vụ nổ lan truyền qua toàn bộ cụm bom liên thông (chain đệ quy, mỗi gạch chỉ bị phá một lần), rung màn hình, cộng điểm và dọn sạch vùng trung tâm.

- **TC06: Cấu trúc 20 màn chơi**
  - Thao tác: Dùng L duyệt lần lượt màn 1 → 20, hoặc mở SELECT LEVEL.
  - Kết quả mong muốn: Cả 20 màn tải hợp lệ, lưới 8x13, không đứng hình.

- **TC07: Gạch Push (Campaign & Survival)**
  - Thao tác Campaign: Chơi từ màn 4 trở đi (màn 7, 10, 13, 18 có nhiều Push).
  - Kết quả mong muốn Campaign: Gạch Push dao động ngang nhịp nhàng.
  - Thao tác Survival: Chờ 1–2 đợt sóng để hàng mới sinh ra gạch PUSH, rồi bắn bóng/đạn phá viên PUSH.
  - Kết quả mong muốn Survival: Toàn bộ gạch còn sống trượt lên đúng **42 px** (một hàng), dừng ở trần sân (không vượt y=60); nếu sát trần thì đứng yên. Hiện chữ `PUSH UP! ⬆`, không sinh lỗi, va chạm và vạch Danger Line dùng đúng vị trí đang hiển thị.

- **TC08: Gạch bất tử Immortal Brick**
  - Thao tác: Cho bóng đập vào gạch xám bất tử.
  - Kết quả mong muốn: Bóng nảy lại, phát âm thanh kim loại, gạch không vỡ và không bị tính điểm.

### Nhóm 3: Vật Phẩm & Logic Nhân 3 Bóng

- **TC09: Thu thập vật phẩm nhân 3 bóng**
  - Thao tác: Khi có 1 bóng, nhấn 3 hoặc nhặt x3 MULTI.
  - Kết quả mong muốn: 1 bóng tách thành 3, hai bóng mới tỏa đều hai bên, giữ tốc độ.

- **TC10: Nhân tiếp khi đang có nhiều bóng**
  - Thao tác: Nhấn 3 liên tiếp khi đang có 2, 3 hoặc 9 bóng.
  - Kết quả mong muốn: 2→6, 3→9, 9→18; không bao giờ vượt 18 bóng.

- **TC11: Nhặt vật phẩm súng laser**
  - Thao tác: Nhấn 6 hoặc nhặt LASER.
  - Kết quả mong muốn: Paddle hiện hai nòng đỏ; tự động bắn đạn mỗi 22 frame trong ~7.5 giây; Space bắn thêm một loạt. HUD hiện đồng hồ **LASER** đếm lùi từ 8 giây, nhấp nháy ở giây cuối; hết giờ súng tắt, nòng đỏ biến mất. Nhặt lại làm mới bộ đếm, không cộng dồn.

- **TC12: Nhặt vật phẩm Mega Ball**
  - Thao tác: Nhấn 4 hoặc nhặt MEGA.
  - Kết quả mong muốn: Bóng tăng bán kính 11→19, phát sáng vàng trong ~9 giây; **xuyên qua và phá gạch thường mà không đổi hướng**, có thể phá nhiều gạch trong cùng một frame. HUD hiện đồng hồ **MEGA** đếm lùi và nhấp nháy giây cuối.
  - Ghi chú: Gạch bất tử vẫn làm bóng nảy lại; hết thời gian thì mọi bóng trở về bán kính 11 và đồng hồ biến mất.

- **TC13: Vật phẩm mở rộng / thu hẹp**
  - Thao tác: Nhấn 1 (WIDE), sau đó 2 (MINI).
  - Kết quả mong muốn: Paddle đổi 140 → 224 → 91 px đúng nhãn. Mỗi hiệu ứng có bộ đếm 10 giây trên HUD; WIDE và MINI loại trừ nhau (cái sau thay cái trước, chỉ còn một đồng hồ). Hết giờ paddle tự về 140 px. Nhấn lại cùng loại làm mới thời gian.

- **TC14: Bom hạt nhân NUKE**
  - Thao tác: Nhấn 7 hoặc nhặt NUKE.
  - Kết quả mong muốn: Phá ngẫu nhiên tối đa 8 gạch thường còn sống, cộng điểm ngay, không phá gạch bất tử. NUKE là hiệu ứng tức thời, không có bộ đếm.

- **TC15: Hình dạng và danh sách vật phẩm**
  - Thao tác: Quan sát vật phẩm rơi; kiểm tra bảng PowerUp.
  - Kết quả mong muốn: Viên nhộng nằm ngang 72x24 px, phát sáng neon, nhãn chữ rõ ràng. Có đúng **7 loại** (WIDE, MINI, x3 MULTI, MEGA, +1 LIFE, LASER, NUKE); không còn vật phẩm vàng **+500**, gạch vàng vẫn đáng 300 điểm nhưng không rơi vật phẩm. Tỷ lệ rơi của gạch thường vẫn 6% và chia đều cho 7 loại.

### Nhóm 4: Cơ Chế 3 Lượt Chơi Bảo Lưu Điểm Số

- **TC16: Trừ mạng khi rơi bóng**
  - Thao tác: Để bóng rơi qua đáy.
  - Kết quả mong muốn: Số tim giảm 1, bóng mới gắn lại trên paddle để phóng tiếp.

- **TC17: Màn hình thử lại**
  - Thao tác: Mất hết 3 mạng ở màn bất kỳ.
  - Kết quả mong muốn: Hiện `ATTEMPT FAILED`, còn `2 of 3` lượt, điểm số giữ nguyên.

- **TC18: Tiếp tục màn chơi**
  - Thao tác: Nhấn Space hoặc nút CONTINUE LEVEL.
  - Kết quả mong muốn: Màn hiện tại khởi động lại với 3 mạng, điểm cũ được giữ.

- **TC19: Thất bại toàn bộ 3 lượt**
  - Thao tác: Mất hết lượt thứ 2 và thứ 3.
  - Kết quả mong muốn: Hiện GAME OVER; nếu đã đăng nhập, điểm được gửi lên máy chủ.

### Nhóm 5: Chế Độ Sinh Tồn

- **TC20: Khởi động Survival Mode**
  - Thao tác: Bấm SURVIVAL MODE ở menu.
  - Kết quả mong muốn: 52 gạch (4 hàng), vạch đỏ nét đứt ở y=620, HUD hiện WAVE và thời gian.

- **TC21: Đợt sóng gạch dồn xuống (có animation)**
  - Thao tác: Quan sát sau ~9 giây (540 frame), sau đó nhanh dần.
  - Kết quả mong muốn: Toàn bộ gạch trượt xuống 42 px trong **45 frame (~0.75 giây)** theo đường easeInOutQuad, không giật; 13 gạch mới trượt vào từ đỉnh và mờ dần hiện rõ; wave tăng; chu kỳ giảm dần đến tối thiểu 5 giây (300 frame). Trong lúc trượt, bóng/đạn va chạm và vạch Danger Line dùng **vị trí thực đang hiển thị**, không dùng đích đến. Nếu đợt sóng mới đến khi animation cũ chưa xong, các bước 42 px vẫn cộng dồn đúng và animation khởi động lại mượt. Tạm dừng (P/ESC) đóng băng cả animation lẫn bộ đếm power-up.

- **TC22: Báo động vạch đỏ**
  - Thao tác: Để gạch tiến vào vùng 55 px phía trên vạch.
  - Kết quả mong muốn: Vạch nhấp nháy đỏ, HUD hiện `HAZARD ALERT!`.

- **TC23: Chạm vạch Danger Line**
  - Thao tác: Để bất kỳ viên gạch nào có đáy ≥ 620 px.
  - Kết quả mong muốn: Nổ tung, GAME OVER ngay; nếu đăng nhập, điểm sinh tồn được gửi lên.

### Nhóm 6: Tài Khoản & Bảng Xếp Hạng

- **TC24: Đăng ký & Đăng nhập**
  - Thao tác: Bấm Login / Register, tạo tài khoản rồi đăng nhập.
  - Kết quả mong muốn: Header hiện tên người chơi sau khi đăng nhập; khi chưa đăng nhập không có nhãn "Guest" (chỉ còn nút Login / Register); JWT được lưu vào localStorage; dữ liệu xấu trả lỗi 400 rõ ràng.

- **TC25: Ghi nhận điểm & Bảng xếp hạng**
  - Thao tác: Kết thúc game khi đã đăng nhập, hoặc mở LEADERBOARD.
  - Kết quả mong muốn: Điểm cao nhất của mỗi người chơi xuất hiện đúng một lần trong top 10; thứ hạng toàn cầu tính theo người chơi, không theo số lần nộp điểm.

### Nhóm 7: Menu Tạm Dừng & Âm Lượng

- **TC26: Nút dừng và menu tạm dừng**
  - Thao tác: Đang chơi, bấm nút tạm dừng trên header (chỉ có biểu tượng ⏸, hoặc P/ESC).
  - Kết quả mong muốn: Game đứng yên, overlay hiện `PAUSED` với 3 nút **CONTINUE**, **REPLAY**, **MAIN MENU**; nút header đổi thành biểu tượng ▶, không kèm chữ. Bộ đếm power-up và animation gạch đóng băng nguyên trạng. CONTINUE tiếp tục đúng vị trí/nhịp đếm; REPLAY tải lại màn hiện tại, giữ điểm nhưng **xóa mọi bộ đếm và trả paddle/bóng/laser về mặc định**; MAIN MENU về màn hình chính, tắt nhạc nền và cũng xóa hiệu ứng.

- **TC27: Âm lượng và bật/tắt tiếng**
  - Thao tác: Bấm nút loa 🔊 trên header để tắt tiếng, sau đó mở menu tạm dừng và kéo thanh **Sound** từ 0% đến 100%; tải lại trang.
  - Kết quả mong muốn: Nút loa chuyển thành 🔇 và mọi âm thanh im lặng; tắt tiếng từ header không khóa menu — vẫn bật lại được bằng cách kéo thanh âm lượng trong pause menu. Nhạc nền và hiệu ứng to/nhỏ tương ứng; 0% im lặng hoàn toàn; giá trị được lưu vào `localStorage` và khôi phục sau khi tải lại.

---

## 4. Tiêu Chí Nghiệm Thu

1. `npm test` (client): 173/173 PASS, exit code 0.
2. `mvn test` (server): 11/11 PASS, BUILD SUCCESS.
3. `run-api-smoke.sh`: FAILED = 0.
4. Kiểm thử tay TC01–TC27: 27/27 PASS theo checklist (27 dòng trong `QA_PANEL_CHECKLIST.md`).
5. Không có lỗi console nghiêm trọng khi mở game và chơi 20 màn.
6. Báo cáo kết quả được ghi tại `tests/reports/TEST_REPORT_2026-11-18.md`.

---

## 5. Bằng Chứng

Ảnh chụp màn hình được lưu tại `tests/evidence/`. Báo cáo chi tiết, các lỗi đã phát hiện và trạng thái khắc phục nằm trong `tests/reports/`.
