# Hệ Thống Quản Lý Đào Tạo Blockchain (LMS)

Phiên bản nâng cấp toàn diện với kiến trúc **Đa Khóa Học (Multi-Course)** và tính năng **Quản lý Nâng cao (Full CRUD)**.

## 🌟 Tính Năng Mới
1.  **Quản lý Khóa Học (Full CRUD)**:
    *   Tạo mới, Sửa tên/mã, Xóa (Soft Delete) khóa học.
    *   Xem danh sách các khóa học đang mở.
2.  **Quản lý Buổi Học**:
    *   Tạo, Sửa, Xóa buổi học trong từng khóa.
3.  **Quản lý Sinh Viên (Master List)**:
    *   Thêm mới, Sửa tên, Xóa sinh viên khỏi hệ thống.
4.  **Điểm Danh Thông Minh**:
    *   **Lọc tự động**: Dropdown chỉ hiện những sinh viên *chưa* điểm danh.
    *   **Hủy điểm danh**: Cho phép hủy (Revoke) nếu điểm danh nhầm.
    *   Giao diện SPA mượt mà.

## 🛠 Cài Đặt & Chạy Demo

### Bước 1: Khởi động Blockchain Local
Mở terminal 1:
```bash
npx hardhat node
```

### Bước 2: Deploy Contract (Bắt buộc deploy lại)
Mở terminal 2:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Script sẽ tự động tạo dữ liệu mẫu gồm: 3 Khóa học, các buổi học và danh sách sinh viên.*

### Bước 3: Chạy Frontend
Mở file `client/index.html` bằng **Live Server**.

## 📖 Hướng Dẫn Sử Dụng

1.  **Kết nối Ví**: Dùng Account #0 (Admin) để có full quyền.
2.  **Quản lý Khóa học**:
    *   Bấm icon <i class="fas fa-edit"></i> để sửa, <i class="fas fa-trash"></i> để xóa khóa học.
    *   Bấm vào thẻ khóa học để xem chi tiết.
3.  **Điểm danh**:
    *   Vào chi tiết khóa học -> Chọn buổi học.
    *   Chọn sinh viên từ dropdown (chỉ hiện người chưa có mặt).
    *   Nếu sai, bấm nút <i class="fas fa-times"></i> màu đỏ trong danh sách để Hủy điểm danh.
4.  **Quản lý Sinh viên**:
    *   Vào menu "Quản Lý Sinh Viên".
    *   Thêm/Sửa/Xóa sinh viên trong danh sách gốc.

## ⚠️ Lưu ý quan trọng
*   Do thay đổi cấu trúc dữ liệu, contract cũ sẽ không hoạt động. **BẮT BUỘC** phải chạy lại lệnh deploy.
*   Nếu gặp lỗi "Nonce too high" trên MetaMask -> Hãy Reset Account trong cài đặt nâng cao của ví.
