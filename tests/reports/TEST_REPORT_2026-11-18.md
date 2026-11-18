# Báo Cáo Kiểm Thử — Arkanoid Online Edition

- **Ngày:** 2026-11-18
- **Phạm vi:** toàn bộ client (game + QA panel), backend Spring Boot, tài liệu kiểm thử và hạ tầng test
- **Kết luận nhanh:** tất cả tầng kiểm thử đều đạt (173 client + 11 backend + 24 API). Đã phát hiện và sửa **9 lỗi sản phẩm** trong game/backend cùng **1 vấn đề nghiêm trọng của bộ test cũ** (test "xanh giả"). Các đợt sau bổ sung Mega Ball xuyên gạch, menu tạm dừng, âm lượng 0–100%, sửa lỗi PUSH ở Survival, animation wave mượt, bộ đếm power-up và bỏ cơ chế +500 vàng.

---

## 1. Môi Trường

| Thành phần | Phiên bản / ghi chú |
| :--- | :--- |
| Hệ điều hành | macOS (arm64) |
| Node.js / npm | Node 26, npm 11 |
| Client | Vite 5, ES modules thuần, Canvas 2D, chạy tại `http://localhost:5173` |
| Backend | Spring Boot 3.2.5, Java target 17 (chạy trên JDK 25), H2 in-memory, JWT + Spring Security |
| Trình duyệt kiểm thử | Browser tích hợp (CDP), viewport ~825×997 |
| Công cụ phụ | `curl`, `jq`, Maven |

---

## 2. Kết Quả Tổng Hợp

| Tầng | Lệnh | Kết quả |
| :--- | :--- | :--- |
| Client automated | `cd client && npm test` | **173/173 PASS, 0 FAIL** |
| Backend JUnit | `cd server && mvn test` | **11/11 PASS** (10 integration + 1 context load), BUILD SUCCESS |
| REST API smoke (server thật) | `bash tests/automated/run-api-smoke.sh http://localhost:8080` | **24/24 PASS, FAILED: 0** |
| Leaderboard nhiều người chơi | kiểm tra trực tiếp sau khi restart backend | **1 dòng/người chơi, đúng điểm cao nhất** |
| Production build | `cd client && npm run build` | 14 modules, JS 56.79 kB (gzip 16.65 kB) |
| Trình duyệt (E2E thủ công có đo đạc) | QA panel + gameplay + survival | Tất cả kịch bản đạt sau khi sửa lỗi |

---

## 3. Chi Tiết Theo Tầng

### 3.1. Client — 173 kiểm tra tự động

Bộ test import **module thật** của game (không dùng mock cho logic), gồm 12 nhóm:

1. **20 màn chơi & cụm domino** — đủ 20 level, dữ liệu gạch hợp lệ, cụm domino có gạch nổ.
2. **GameRules dùng chung & chuẩn hóa URL API** — hằng số, `normalizeApiUrl`, biên màn chơi, clamp âm lượng.
3. **x3 Multi-Ball** — dùng đúng helper `computeMultiBallSpawns` mà `main.js` gọi; kiểm tra góc quạt, giới hạn 18 bóng, bóng không trùng.
4. **Power-up & tỷ lệ rơi 6%** — stub `Math.random` để kiểm tra xác định; đúng 7 loại sau khi bỏ vàng, nhãn không còn +500, gạch vàng 300 điểm nhưng không rơi vật phẩm, TODO tương lai còn đúng một dòng.
5. **Hệ 3 lượt / 2 lần tiếp tục** — `resolveAttemptFailure` trả `RETRY` rồi `GAMEOVER` đúng thứ tự.
6. **Đường nguy hiểm survival** — biên cảnh báo và biên thua chính xác đến từng pixel.
7. **Lan truyền domino thật** — `collectBlastTargets` đệ quy qua gạch nổ, chặn gạch bất tử/đã phá, không trùng mục tiêu.
8. **Paddle & phóng bóng xác định** — kích thước 140/224/91px, di chuyển 12px/frame, ngắm trái/phải, tốc độ phóng 7.5px/frame.
9. **Mega Ball xuyên gạch** — giữ nguyên vector khi chạm gạch thường, vẫn nảy khỏi gạch bất tử.
10. **PUSH & animation Survival** — đẩy lên đúng 42px và kẹp trần, easeInOutQuad, va chạm/vạch đỏ dùng Y hiển thị, chồng sóng giữa animation, hàng mới fade-in.
11. **Bộ đếm power-up** — thời lượng 10s/10s/9s/7.5s, làm mới không cộng dồn, đếm lùi theo frame, đóng băng khi pause, nhấp nháy 60 frame cuối, WIDE/MINI loại trừ nhau.
12. **Hết hạn hiệu ứng** — paddle về 140px, bóng về bán kính 11, laser tắt và không tự bắn nữa.

### 3.2. Backend — 11 test JUnit

`ApiIntegrationTests` (MockMvc + JWT thật + H2):

- Health công khai trả 200/UP.
- Đăng ký trả JWT; đăng nhập đúng/sai.
- Payload sai (thiếu trường, JSON hỏng, level 0, điểm âm) trả **400**, không còn 403.
- Endpoint bảo vệ không có JWT trả **401**.
- Leaderboard chỉ giữ **một dòng/người chơi**, đúng điểm cao nhất.
- Profile và tiến độ: cập nhật tăng được, giảm bị bỏ qua, level 0 trả 400.

### 3.3. REST API smoke — 24 kiểm tra trên server thật

Chạy với tài khoản ngẫu nhiên mỗi lần, xác nhận: health, register/JWT, trùng username 400, validation 400, sai mật khẩu 400, login 200, thiếu JWT 401, nộp điểm 200, payload xấu 400, leaderboard 200 + một dòng/người + giữ điểm cao nhất (1234), profile (best 1234, level 5, 2 ván, rank 1), progress tăng/giảm/level 0.

Kiểm tra bổ sung ngoài script: tạo **Alice** (500, 900, 300) và **Bob** (700, 1100) → leaderboard trả đúng **2 dòng**, Alice = 900, Bob = 1100, xếp hạng 3 và 2 sau tài khoản smoke 1234.

### 3.4. Trình duyệt — kết quả đo được

| Kịch bản | Kết quả |
| :--- | :--- |
| Di chuyển paddle, chặn biên, không điều khiển bằng chuột | Đạt |
| Ngắm trái/phải, phóng bóng, tốc độ 7.5 | Đạt |
| x3 Multi-Ball, giới hạn 18 bóng | Đạt |
| Toàn bộ power-up 1–7 qua QA panel (không còn phím 8) | Đạt |
| Phím K (phá gạch), L (qua màn), G (mất mạng), P (pause) | Đạt |
| `M` / `ESC` khi đang chơi | Về **MENU** (trước đây không phản hồi) |
| Gõ phím trong ô input | Không làm paddle di chuyển (`moved: 0`, state giữ `PLAYING`) |
| Domino chain sau khi sửa | 81 gạch → **phá 75**, còn 6, `stable: true`, điểm 9100 |
| Nuke (phím QA) | Phá đúng **8 gạch ngẫu nhiên** (trước đây là 8 gạch đầu tiên) |
| Survival: wave tăng tốc, cảnh báo, vượt đường nguy hiểm | Đạt |
| 20 màn chơi, retry giữ điểm, tiếp tục đúng số lần | Đạt |

---

## 4. Lỗi Phát Hiện Và Đã Sửa

| # | Mức độ | Lỗi | Nguyên nhân | Cách sửa / xác minh |
| :--- | :--- | :--- | :--- | :--- |
| D1 | Cao | Bom domino chỉ phá vùng đầu tiên, không lan sang gạch nổ khác | Hàm nổ không đệ quy, không xếp lại gạch nổ vào hàng đợi | Viết `collectBlastTargets` BFS đệ quy trong `GameRules.js`; trình duyệt: phá 75/81 gạch, chuỗi ổn định |
| D2 | Cao | Leaderboard hiển thị một người nhiều lần | JPQL lấy mỗi người một dòng nhưng dùng subquery scalar toàn cục (`MIN(s2.id)`) | Correlated subquery theo `s.user` + `MIN(s3.id)`; JUnit 10/10 và kiểm tra live 2 người/2 dòng |
| D3 | Cao | Bộ test cũ "xanh giả": retry dùng mock, tỷ lệ rơi lấy mẫu ngẫu nhiên, logic multi-ball/domino/URL bị copy | Test không chạy code thật | Tách `GameRules.js` làm nguồn sự thật duy nhất; test import module thật, stub `Math.random`; 94 check có ý nghĩa |
| D4 | Trung bình | `M`/`ESC` không có tác dụng khi đang chơi | Handler chỉ xử lý ở một số state | Cho phép về MENU từ mọi state khác MENU; xác minh trình duyệt |
| D5 | Trung bình | Nuke phá 8 gạch **đầu tiên** thay vì ngẫu nhiên như tài liệu | Duyệt mảng theo thứ tự | Fisher–Yates rồi lấy tối đa 8 gạch còn sống; trình duyệt xác nhận 8 |
| D6 | Trung bình | Payload không hợp lệ trả **403** thay vì 400 | `/error` bị Spring Security chặn | `permitAll` cho `/error` + `AuthenticationEntryPoint` trả 401; JUnit + smoke xác nhận |
| D7 | Trung bình | Multi-ball có thể vượt giới hạn 18 hoặc lệch góc do logic nằm rải rác | Code nhân bản trong `main.js` | Gom vào `computeMultiBallSpawns(balls, maxBalls)`; test nhóm 3 |
| D8 | Thấp | URL API có thể thành `//api` khi biến môi trường có dấu `/` cuối | Chuẩn hóa rải rác | `normalizeApiUrl` dùng chung; test nhóm 2 |
| D9 | Thấp | Dòng "CONTINUE #" hiển thị sai số lần còn lại | Công thức lệch | `CONTINUE #${maxRetries - retriesLeft}` |
| D10 | Thấp | Hướng dẫn trong game ghi sai số lượt | Tài liệu chưa cập nhật theo cơ chế 3 lượt | Sửa thành 3 lượt, 2 lần tiếp tục sau lần thua đầu |

Ngoài ra đã gia cố: keydown bỏ qua `INPUT/TEXTAREA/SELECT/contentEditable`; hai test tự viết ban đầu có biên sai (đường nguy hiểm 586 thay vì 585, khoảng cách bom vượt bán kính) đã được chỉnh cho khớp thiết kế.

---

## 5. Hạn Chế Đã Biết

- **Mega Ball** (phím QA `4`) đã được nâng cấp ở đợt 2: bóng xuyên qua và phá liên tiếp gạch thường mà không đổi hướng; gạch bất tử vẫn làm bóng nảy lại. Hành vi mới được ghi ở TC12 và kiểm tra tự động ở Group 9.
- Backend chạy JDK 25 trong khi target là Java 17: có cảnh báo `restricted method` của Tomcat, không ảnh hưởng kết quả test.
- Screenshot trong `tests/evidence/` được chụp trước lượt sửa cuối; các kết quả sau sửa được xác minh bằng số liệu đo trong trình duyệt và output test.
- Đợt 3 xác minh bằng trạng thái runtime/canvas đo trực tiếp trong trình duyệt (vị trí gạch, bộ đếm, va chạm); cửa sổ in-app browser không cung cấp surface hiển thị nên không chụp được screenshot mới.

---

## 6. Bằng Chứng

- Ảnh menu: [`tests/evidence/01-menu.jpg`](../evidence/01-menu.jpg)
- Ảnh QA TESTER PANEL: [`tests/evidence/02-qa-panel.jpg`](../evidence/02-qa-panel.jpg)
- Kế hoạch 27 ca: [`tests/TEST_PLAN.md`](../TEST_PLAN.md)
- Checklist QA panel: [`tests/manual/QA_PANEL_CHECKLIST.md`](../manual/QA_PANEL_CHECKLIST.md)
- Hướng dẫn chạy: [`tests/README.md`](../README.md)

---

## 7. Cách Tái Lập

```bash
# 1. Client tests (không cần server)
cd client && npm test

# 2. Backend tests
cd server && mvn test

# 3. API smoke (cần backend đang chạy)
cd server && mvn spring-boot:run      # terminal 1
bash tests/automated/run-api-smoke.sh http://localhost:8080   # terminal 2

# 4. Build production
cd client && npm run build

# 5. Kiểm thử tay
#    Mở http://localhost:5173, nhấn T để mở QA panel,
#    làm theo tests/manual/QA_PANEL_CHECKLIST.md và TC01–TC27.
```

---

## 8. Kết Luận

Ba tầng kiểm thử hiện đều **xanh và có ý nghĩa**: client chạy logic thật, backend kiểm tra cả hành vi bảo mật/validation, API smoke chạy trên server thật với tài khoản mới mỗi lần. Các lỗi nghiêm trọng nhất (domino, leaderboard, bộ test giả, thoát game, Mega Ball) đã được sửa và xác minh lại. Có thể chuyển sang bước phát triển tiếp theo.

---

## 9. Bổ Sung Đợt 2 — Menu Tạm Dừng & Âm Lượng

- Thêm nút tạm dừng trên header chỉ gồm biểu tượng (⏸ khi chơi, ▶ khi dừng — không kèm chữ) và overlay tạm dừng với **CONTINUE / REPLAY / MAIN MENU**.
- Thêm nút loa 🔊/🔇 trên header ở mọi màn hình để bật/tắt tiếng nhanh; khi đã tắt tiếng vẫn mở lại và chỉnh mức bình thường trong pause menu (nút header tự đồng bộ lại theo mức âm lượng).
- Bỏ nhãn "Guest" ở header: khi chưa đăng nhập chỉ còn nút Login / Register, sau khi đăng nhập mới hiện tên người chơi.
- Thay cơ chế bật/tắt tiếng bằng thanh **âm lượng 0–100%**, áp dụng cho cả nhạc nền và hiệu ứng; giá trị lưu trong `localStorage`.
- P/ESC mở menu tạm dừng; M về menu chính ngay. Game hoàn toàn đứng yên khi pause.
- Mega Ball xuyên gạch thường nhưng vẫn nảy khỏi gạch bất tử.
- Kiểm tra bổ sung: 15 test tự động mới (tổng **94/94**) và xác minh trên trình duyệt: nút pause, overlay, 3 nút, slider 23% → BGM 0.092, 0% im lặng, 100% = 0.4, lưu/khôi phục 37% sau reload, REPLAY giữ điểm 1234 và nạp lại 81 gạch. Đợt chỉnh UI cuối: nút pause chỉ còn biểu tượng; không còn "Guest"; nút loa header tắt/mở đúng và thanh âm lượng trong pause menu vẫn hoạt động khi đang tắt tiếng.

---

## 10. Bổ Sung Đợt 3 — PUSH Survival, Animation, Bộ Đếm Power-Up, Bỏ Vàng

### 10.1. Nguyên nhân gốc lỗi PUSH không đẩy hàng trên

Tái hiện bằng QA panel + đo trực tiếp trong trình duyệt:

```text
mode: SURVIVAL, state: PLAYING, pushDestroyed: true,
beforeTopY: [100 x13], afterTopY: [100 x13], changed: false, bricksAlive: 51
```

Gạch PUSH bị phá nhưng **không có handler đẩy hàng** trong client Canvas. `hitBrick()` chỉ gọi `takeHit()` rồi biến mất; hiệu ứng `doPushBrick` của bản Java tham chiếu (`PlayingProcess.java` + `SpecialBrickEffect.java`) chưa từng được port sang. Đây là thiếu logic, không phải lỗi animation.

Cách sửa tại gốc: thêm `computeSurvivalPushUpShift()` vào `GameRules.js` (dùng `targetY` logic, kẹp trần `bounds.y = 60`, bỏ qua gạch đã phá) và gọi `pushSurvivalBricksUp()` ngay sau khi PUSH vỡ bởi bóng/đạn trong Survival. Mọi gạch còn sống dùng `animateBy(-shift)` nên trượt lên mượt đúng 42px, không nhảy.

### 10.2. Animation wave

- Hằng số mới: `SURVIVAL_ANIM_DURATION = 45` frame (~0,75 giây), `SURVIVAL_PUSHUP_STEP = 42`.
- `Brick` có `targetY` logic + `y` hiển thị; `animateTo`/`animateBy` bắt đầu từ `y` thực và chạy `easeInOutQuad`; hàng mới spawn ở `finalY - 42`, `alpha = 0` rồi fade-in.
- Va chạm bóng/đạn, `isDangerBreach`, `isDangerAlert` đọc `brick.y` hiện tại mỗi frame, không dùng đích đến.
- Sóng mới giữa animation cộng dồn trên `targetY` và khởi động lại từ vị trí hiển thị; Pause chỉ đơn giản không gọi `update()` nên animation và bộ đếm đứng yên.

Số liệu trình duyệt: `y 100 → 109.33 (sau 16 frame) → 142 (sau 51 frame)`; 13 gạch hàng mới đạt `y=100`, `alpha=1`; va chạm tại ô cũ `false`, tại vị trí đang vẽ `true`; Pause giữ `y=104.15` suốt 30 frame rồi chạy tiếp; chồng 2 sóng đạt đúng `target=184, y=184`.

### 10.3. Bộ đếm power-up

- Thời lượng: WIDE 600 frame (10s), MINI 600, MEGA 550 (~9s), LASER 450 (7.5s); x3/+1 LIFE/NUKE không có bộ đếm.
- HUD góc trên phải vẽ viên thuốc + đồng hồ tròn (vòng tiến trình + kim), số giây còn lại, nhấp nháy 60 frame cuối.
- Nhấn lại làm mới về đầy; WIDE/MINI loại trừ nhau; hết giờ tự trả paddle 140px/bóng bán kính 11/tắt laser.
- Reset khi mất mạng, REPLAY, đổi màn, về menu; đóng băng khi Pause; phím QA 1–6 đi qua đúng `applyPowerUp` thật.
- Đo trình duyệt: pause 60 frame giữ nguyên `450`; chạy 120 frame còn `330`; chạy tiếp 600 frame xóa sạch 3 bộ đếm, paddle `140`, bóng `11`, `canShoot=false`.

### 10.4. Bỏ cơ chế +500 vàng

- Xóa `GOLD` khỏi `POWERUP_TYPES`/`POWERUP_META`/ảnh, xóa case +500 và phím QA 8; debug panel còn "Phím 1 đến 7".
- Gạch vàng vẫn 300 điểm nhưng `spawnPowerUp()` trả `null`; tỷ lệ 6% của gạch thường chia đều cho 7 loại.
- Chỉ giữ đúng một TODO: `Tương lai: thêm lại nhặt vàng để mua skin paddle`. Không thêm hệ tiền tệ.
- Đo trình duyệt: 300 lần rơi ngẫu nhiên chỉ ra 7 loại, không có `GOLD`; phím 8 không đổi điểm; không có lỗi/warning console.

### 10.5. Kết quả kiểm thử đợt 3

- `cd client && npm test`: **173/173 PASS, FAILED: 0**, exit code 0 (tăng 79 kiểm tra so với 94).
- `npm run build`: thành công, 14 modules, JS 56.79 kB (gzip 16.65 kB).
- Trình duyệt: wave mượt, PUSH lên đúng (kẹp trần 40px ở lần đầu do hàng trên ở y=100 rồi 0px khi sát trần), bộ đếm hiển thị/đếm lùi/đóng băng/hết hạn đúng, không còn vàng/phím 8, không có lỗi console.
