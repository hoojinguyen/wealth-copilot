# Wealth Copilot

Cố vấn phân bổ và tái cơ cấu danh mục tài sản cá nhân thông minh tại Việt Nam. Ứng dụng local-first, bảo mật dữ liệu tuyệt đối của bạn, được xây dựng trên nền tảng **Tauri + React + Rust**.

## 🎨 Tính năng chính

- **Tối ưu hóa danh mục tài sản**: Sử dụng thư viện tối ưu hóa lồi **Clarabel** của Rust để tính toán tỷ trọng danh mục đầu tư tối ưu dựa trên mô hình Markowitz (Risk Aversion $\lambda$).
- **Hỗ trợ các lớp tài sản Việt Nam**:
  - Tiết kiệm ngân hàng
  - Vàng miếng SJC
  - Quỹ chỉ số ETF VN30 (E1VFVN30)
  - Quỹ chỉ số ETF Diamond (FUEVFVND)
- **Đồng bộ giá thị trường tự động**: Đồng bộ hóa giá vàng SJC, ETF và lãi suất tiết kiệm trực tiếp từ GitHub Releases của kho lưu trữ.
- **Bảo mật và Local-First**: Toàn bộ dữ liệu giao dịch và danh mục của bạn được lưu trữ an toàn trong cơ sở dữ liệu SQLite cục bộ trên máy tính.
- **Sao lưu & Phục hồi dữ liệu**: Dễ dàng xuất bản sao lưu dưới dạng chuỗi JSON mã hóa để khôi phục khi cần thiết.

## 🚀 Hướng dẫn phát triển

Xem thêm chi tiết tại [CLAUDE.md](file:///Users/hoojinguyen/Documents/antigravity/eager-bell/CLAUDE.md).

### Yêu cầu hệ thống
- **Node.js** (Phiên bản 20 trở lên)
- **Rust & Cargo** (Để biên dịch backend Tauri)

### Khởi chạy môi trường phát triển
```bash
# Cài đặt các phụ thuộc
npm install

# Chạy bản xem trước trên trình duyệt web
npm run dev

# Chạy ứng dụng Desktop Tauri ở chế độ phát triển
npm run tauri dev
```

### Kiểm thử
```bash
# Chạy các bài kiểm thử tự động
npx vitest run
```
