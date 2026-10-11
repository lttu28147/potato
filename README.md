# POTATO V5 — Nói trước, nghĩ sâu, cùng tranh luận

POTATO là website Node.js có frontend + backend, thiết kế với Raleway (chính), Playfair Display (chữ nhấn) và logo củ khoai tây. Bản V5 sửa lỗi bốc chủ đề, thêm Skip suy nghĩ, bot test room, micro ở ô nội dung và góp ý sau các hoạt động.

## Chạy trên Windows 10/11

1. Giải nén, mở thư mục **POTATO_Web** có `server.js`.
2. Trong File Explorer, nhấn `Ctrl + L`, nhập `cmd` rồi Enter.
3. Nhập `node server.js`, để nguyên cửa sổ CMD.
4. Mở **http://localhost:3000** bằng Chrome/Edge và cấp quyền micro nếu được hỏi.

Yêu cầu Node.js >=18.17. **Không chạy file .bat** và không cần `npm install` vì project không có dependency ngoài. Nếu báo `EADDRINUSE` thì tắt server cũ (`Ctrl + C`) hoặc dùng:

```cmd
set PORT=3001
node server.js
```

Mở http://localhost:3001.

## Tính năng V5 và cách thử

| Tính năng | Cách kiểm tra |
|---|---|
| Bốc chủ đề ngẫu nhiên | **Nói & suy nghĩ → Bốc chủ đề**: câu hỏi vừa bốc được hiển thị ngay trong ô "Chủ đề của bạn", không lặp lại đề ngay trước |
| Bỏ qua thời gian suy nghĩ | Chọn chủ đề → Bắt đầu (cho phép mic) → **Bỏ qua suy nghĩ** → **3–2–1** → đồng hồ nói và mic tự thử khởi chạy |
| Debate 3v3 bằng bot | **Phòng tranh luận → Debate 3v3 → Tạo phòng → Đủ đội 3v3**: 1 người thật + 5 bot, tự chia phe 3–3 |
| Vòng tròn có bot | Tạo phòng Vòng tròn, thêm 1–2 bot để thử lượt nói và câu hỏi |
| Bot phát biểu/phản hồi | Chủ phòng bấm **Bắt đầu**; bot nộp quan điểm riêng, trả lời/đặt câu hỏi bằng **văn bản**, nói theo lượt. Có nút **Nghe bot** cho trình duyệt đọc văn bản (giọng tùy máy) |
| Mic trong ô nội dung | Ở **Đổi góc nhìn**, ô ghi chú, tổng kết thử thách, Active Recall, trò chơi và các biểu mẫu nội dung, chọn **Nói bằng mic** để chép lời thành chữ |
| AI nhận xét sau hoạt động | **Nói & suy nghĩ**, **Đổi góc nhìn**, **Luyện thuyết trình**, **Debate/Vòng tròn** (phòng kết thúc), **Ôn lại**, **Thử thách thực tế**, và **trang tổng kết trò chơi** |

Các trò chơi **Truth or Dare, Gián điệp, Tam sao thất bản, Ma sói** có ô kể lại bài học ở trang kết quả (Truth or Dare có nút **Tổng kết**). Người dùng có thể kể qua mic trước khi nhận AI góp ý. AI **không thể tự biết nội dung trò chuyện ngoài đời** nếu người dùng không chủ động chép hoặc ghi lại.

**Điều kiện để phản hồi AI thực:** cấu hình Gemini (xem dưới). Khi chưa có API hoặc API bị lỗi, hệ thống sẽ hiển thị **"Góp ý theo quy tắc · không phải AI"**. Góp ý dựa vào **bản chép lời/văn bản**, chưa phân tích âm lượng, ngữ điệu hoặc phát âm của giọng nói thật. Bot trong phòng là **mô phỏng kịch bản**, không phải người thật hay Gemini tự giao tiếp.

## Bật Gemini

Copy `.env.example` thành `.env`, chỉnh:

```env
PORT=3000
HOST=127.0.0.1
GEMINI_API_KEY=YOUR_REAL_GEMINI_KEY
GEMINI_MODEL=gemini-2.5-flash
```

Thay key thật, lưu và **khởi động lại** server. **Không đưa `.env` lên GitHub**, không dán key vào frontend/HTML/JavaScript. Nếu API không dùng được, xem giới hạn/quota trên tài khoản Gemini và log CMD.

## Cập nhật lên Render (website công khai)

1. GitHub repo phải có toàn bộ project (`server.js`, `lib/`, `public/`, `package.json`, `tests/`...), **không chỉ `public/`**.
2. Tạo Render **Web Service**, Runtime Node, Build `npm install`, Start `node server.js`, root ở thư mục có `server.js`.
3. Trên Render → Environment: `HOST=0.0.0.0`, `GEMINI_API_KEY=<your key>`, `GEMINI_MODEL=gemini-2.5-flash`. Để Render tự cấp `PORT`.
4. Commit V5 lên repo; Render tự redeploy nếu bật Auto Deploy.
5. Dùng link HTTPS để cấp quyền micro. Thử trên **hai thiết bị** nếu cần kiểm tra WebRTC room.

**Chưa phù hợp triển khai đông người:** bản demo lưu JSON trong `data/store.json` (Render Free có thể mất dữ liệu khi restart/redeploy); hiện chưa có account production, chống spam, giám sát/kiểm duyệt nội dung; WebRTC STUN-only có thể không nối âm thanh trên một số mạng nếu thiếu TURN. Không dùng để lưu dữ liệu nhạy cảm hoặc bài nói của học sinh chưa được đồng ý.

## Chuyển dữ liệu từ V4

Tắt server V4 (`Ctrl + C`); giải nén V5 sang **thư mục riêng**; chỉ sao chép file `.env` và (nếu đã sao lưu, muốn giữ lịch sử) `data/store.json` từ V4 sang V5. **Không upload hai file này lên GitHub**. Khởi động V5 bằng `node server.js`.

## Kiểm thử

```bash
npm run check
npm test
npm run test:ai
npm run test:ui
npm run test:timer
npm run test:debate
npm run test:voice
npm run test:v5
```

Các test tự động gồm API, phân quyền phòng, Debate 3v3 (1 người + 5 bot), lượt bot, recap & AI mock, UI text templates, chuyển thời gian sang lượt nói và WebRTC signaling. **Không thay thế được kiểm tra micro/WebRTC trên thiết bị thật**.

## Cấu trúc

- `server.js`: HTTP server + phòng tranh luận + REST, bot.
- `lib/ai.js`: Gemini/OpenAI adapter và phản hồi theo quy tắc minh bạch.
- `lib/store.js`: lưu dữ liệu và quyền của guest.
- `public/js/app.js`: các luồng UX và mic nhận dạng tiếng Việt.
- `public/js/room-voice.js`: WebRTC giữa **người dùng thật** trong phòng.
- `public/js/catalog.js`: chủ đề, thử thách, trò chơi và câu hỏi.
- `public/styles.css`: thiết kế responsive.
- `tests`: mã kiểm thử.

## POTATO V6 — Luyện thuyết trình nhiều lượt và tải tài liệu

Ở mục **Luyện thuyết trình**:

1. Tải tài liệu **PDF, DOCX, PPTX, TXT, MD, CSV** (tối đa 10 MB) hoặc nhập dàn ý thủ công. File được trích văn bản ngay trong trình duyệt; bản thân file gốc **không tải lên máy chủ**. Khi lấy góp ý, nội dung trích xuất là tài liệu tham chiếu cho AI. Với PDF scan không có lớp chữ, hãy xuất bản TXT/Word có văn bản.
2. Nhấn **Bắt đầu thuyết trình** để bật nhận dạng giọng nói (trình duyệt và quyền micro cho phép). Nhấn **Kết thúc thuyết trình** để xem nhận xét. Người không có nhận dạng giọng nói vẫn có thể nhập bản chép thủ công.
3. Nhận **AI góp ý từng lượt**, với điểm mạnh, lỗi cần sửa, câu hỏi gợi mở. Bấm **Luyện lại lần 2**, **Luyện lại lần 3** ... để bắt đầu lượt mới. Các lượt trước được giữ trong *Lịch sử lượt luyện* của buổi hiện tại, có thể mở xem lại.
4. Từ lượt hai, AI được cung cấp thêm bản chép lượt trước để có cơ sở đối chiếu (không tự suy đoán tiến bộ về phát âm). Dữ liệu từng lượt chỉ được ghi vào Nhật ký khi bấm lưu nếu quyền lưu lịch sử được bật.

**Giới hạn:** PDF/DOCX/PPTX trích xuất bằng PDF.js hoặc JSZip tải theo nhu cầu từ CDN; cần Internet lúc tải tài liệu. Lấy tối đa 6.500 ký tự để tránh gửi tài liệu quá dài đến AI, có thể chỉnh trong ô dàn ý. AI không phân tích trực tiếp âm thanh, nhịp điệu hay cảm xúc. Lịch sử chưa lưu biến mất khi tải lại trang.

Xem `HUONG_DAN_CAP_NHAT_V6.txt` và `SCRIPT_NOI_VA_SUY_NGHI_2_PHUT.txt` để cập nhật web và trình bày cuộc thi.
