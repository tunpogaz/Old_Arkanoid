# Báo Cáo Kiểm Thử — Arkanoid Online Edition

- **Ngày:** 2026-11-18
- **Phạm vi:** toàn bộ client (game + QA panel), backend Spring Boot, tài liệu kiểm thử và hạ tầng test
- **Kết luận nhanh:** tất cả tầng kiểm thử đều đạt (79 client + 11 backend + 24 API). Đã phát hiện và sửa **9 lỗi sản phẩm** trong game/backend cùng **1 vấn đề nghiêm trọng của bộ test cũ** (test "xanh giả"). Còn **1 hạn chế sản phẩm đã biết** (Mega Ball không xuyên gạch) — đã ghi rõ trong TEST_PLAN, không chặn bước phát triển tiếp theo.

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
| Client automated | `cd client && npm test` | **79/79 PASS, 0 FAIL** |
| Backend JUnit | `cd server && mvn test` | **11/11 PASS** (10 integration + 1 context load), BUILD SUCCESS |
| REST API smoke (server thật) | `bash tests/automated/run-api-smoke.sh http://localhost:8080` | **24/24 PASS, FAILED: 0** |
| Leaderboard nhiều người chơi | kiểm tra trực tiếp sau khi restart backend | **1 dòng/người chơi, đúng điểm cao nhất** |
| Production build | `cd client && npm run build` | 14 modules, JS 49.47 kB (gzip 14.46 kB) |
| Trình duyệt (E2E thủ công có đo đạc) | QA panel + gameplay + survival | Tất cả kịch bản đạt sau khi sửa lỗi |

---

## 3. Chi Tiết Theo Tầng

### 3.1. Client — 79 kiểm tra tự động

Bộ test import **module thật** của game (không dùng mock cho logic), gồm 8 nhóm:

1. **20 màn chơi & cụm domino** — đủ 20 level, dữ liệu gạch hợp lệ, cụm domino có gạch nổ.
2. **GameRules dùng chung & chuẩn hóa URL API** — hằng số, `normalizeApiUrl`, biên màn chơi.
3. **x3 Multi-Ball** — dùng đúng helper `computeMultiBallSpawns` mà `main.js` gọi; kiểm tra góc quạt, giới hạn 18 bóng, bóng không trùng.
4. **Power-up & tỷ lệ rơi 6%** — stub `Math.random` để kiểm tra xác định, không lấy mẫu ngẫu nhiên.
5. **Hệ 3 lượt / 2 lần tiếp tục** — `resolveAttemptFailure` trả `RETRY` rồi `GAMEOVER` đúng thứ tự.
6. **Đường nguy hiểm survival** — biên cảnh báo và biên thua chính xác đến từng pixel.
7. **Lan truyền domino thật** — `collectBlastTargets` đệ quy qua gạch nổ, chặn gạch bất tử/đã phá, không trùng mục tiêu.
8. **Paddle & phóng bóng xác định** — kích thước 140/224/91px, di chuyển 12px/frame, ngắm trái/phải, tốc độ phóng 7.5px/frame, luôn hướng lên.

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
| Toàn bộ power-up 1–8 qua QA panel | Đạt |
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
| D3 | Cao | Bộ test cũ "xanh giả": retry dùng mock, tỷ lệ rơi lấy mẫu ngẫu nhiên, logic multi-ball/domino/URL bị copy | Test không chạy code thật | Tách `GameRules.js` làm nguồn sự thật duy nhất; test import module thật, stub `Math.random`; 79 check có ý nghĩa |
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

- **Mega Ball** (phím QA `4`) chỉ tăng kích thước bóng, **không xuyên gạch** như tên gọi có thể gợi ý. Hành vi hiện tại được xem là thiết kế và đã ghi rõ ở TC12 trong `tests/TEST_PLAN.md`. Nếu muốn xuyên gạch, cần một thay đổi gameplay riêng.
- Backend chạy JDK 25 trong khi target là Java 17: có cảnh báo `restricted method` của Tomcat, không ảnh hưởng kết quả test.
- Screenshot trong `tests/evidence/` được chụp trước lượt sửa cuối; các kết quả sau sửa được xác minh bằng số liệu đo trong trình duyệt và output test.

---

## 6. Bằng Chứng

- Ảnh menu: [`tests/evidence/01-menu.jpg`](../evidence/01-menu.jpg)
- Ảnh QA TESTER PANEL: [`tests/evidence/02-qa-panel.jpg`](../evidence/02-qa-panel.jpg)
- Kế hoạch 25 ca: [`tests/TEST_PLAN.md`](../TEST_PLAN.md)
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
#    làm theo tests/manual/QA_PANEL_CHECKLIST.md và TC01–TC25.
```

---

## 8. Kết Luận

Ba tầng kiểm thử hiện đều **xanh và có ý nghĩa**: client chạy logic thật, backend kiểm tra cả hành vi bảo mật/validation, API smoke chạy trên server thật với tài khoản mới mỗi lần. Các lỗi nghiêm trọng nhất (domino, leaderboard, bộ test giả, thoát game) đã được sửa và xác minh lại. Có thể chuyển sang bước phát triển tiếp theo; việc còn lại chỉ là quyết định sản phẩm về Mega Ball.
