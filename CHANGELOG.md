# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-06-26

### Added
- Hỗ trợ nhập và lưu trữ mã tài sản tùy chỉnh bất kỳ ở Việt Nam thông qua select box "Khác" trong biểu mẫu ghi nhận giao dịch.
- Tích hợp động cơ tối ưu hóa phân bổ tỷ trọng Clarabel QP Solver backend Rust, tự động dựng ma trận ràng buộc và vector tối ưu hóa theo danh mục thực tế của người dùng.
- Bổ sinh tính năng điền giá gần nhất (Forward-Fill) khi dựng ma trận covariance để giải quyết sự lệch pha về ngày giao dịch giữa các sàn chứng khoán.
- Hỗ trợ bóc tách ảnh chụp màn hình sàn giao dịch (như TCBS) bằng Gemini Vision và tích hợp bảng duyệt nháp kiểm duyệt trước khi lưu vào SQLite.
- Thêm cài đặt lưu trữ Gemini API Key cá nhân và Custom Proxy/Endpoint cục bộ để tránh bị chặn kết nối tại Việt Nam.
- Tự động băm tên tài sản tùy chỉnh sang dải màu sắc HSL hài hòa hiển thị trên biểu đồ phân bổ hình tròn.

### Changed
- Cải thiện thuộc tính `id` và `htmlFor` trong toàn bộ form ghi nhận giao dịch để tăng mức độ truy cập (Accessibility).
- Nâng cấp di trú cơ sở dữ liệu SQLite an toàn trên startup để thêm các trường phí, thuế, giá vốn trung bình di động và lãi/lỗ thực tế.

### Fixed
- Bảo vệ an toàn trường hiển thị giá gợi ý (placeholder) khi chọn tài sản "Khác" để tránh crash React màn hình trắng khi giá trị là chuỗi rỗng hoặc chưa tải kịp.
