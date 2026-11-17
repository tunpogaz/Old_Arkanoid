# Hướng Dẫn Kiểm Thử Nhanh

Thư mục này chứa toàn bộ tài nguyên QA của dự án Arkanoid Online.

## 1. Chạy kiểm thử tự động (không cần server)

```bash
cd client
npm test
```

Kỳ vọng: `TOTAL TESTS: 94`, `PASSED: 94`, `FAILED: 0`.

Hoặc từ thư mục gốc:

```bash
node tests/automated/run-client-tests.js
```

## 2. Kiểm thử backend

```bash
cd server
mvn test
```

Kỳ vọng: 11 test JUnit PASS, `BUILD SUCCESS`.

## 3. Smoke test REST API thật

Khởi động backend:

```bash
cd server
mvn spring-boot:run
```

Cửa sổ khác, từ thư mục gốc:

```bash
bash tests/automated/run-api-smoke.sh http://localhost:8080
```

Kỳ vọng: `FAILED: 0`.

## 4. Kiểm thử tay trong trình duyệt

```bash
cd client
npm install
npm run dev
```

Mở http://localhost:5173, sau đó:
- Làm theo `TEST_PLAN.md` (27 ca TC01–TC27).
- Dùng `manual/QA_PANEL_CHECKLIST.md` để kiểm tra bảng QA bằng phím T.

## 5. Cấu trúc

| Đường dẫn | Mục đích |
| :--- | :--- |
| `TEST_PLAN.md` | Kế hoạch 27 ca kiểm thử và tiêu chí nghiệm thu |
| `automated/run-client-tests.js` | 94 kiểm tra logic game + entity |
| `automated/run-api-smoke.sh` | 24 kiểm tra REST API trên server thật |
| `manual/QA_PANEL_CHECKLIST.md` | Checklist phím tắt QA panel |
| `evidence/` | Ảnh chụp màn hình |
| `reports/` | Báo cáo kết quả |
| `archive/` | Bộ test cũ, chỉ lưu tham khảo |

## 6. Yêu cầu môi trường

- Node.js 18+ (đã kiểm thử với Node 26).
- Java 17+ và Maven 3.9+.
- `curl`, `jq` cho smoke test API.
