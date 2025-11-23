# Dự Án Demo Blockchain: Hệ Thống Điểm Danh Sinh Viên (Full Features)

Đây là phiên bản hoàn chỉnh của dự án demo, hỗ trợ **Quản lý Sinh viên (Master List)**, **Quản lý Buổi học (Sửa/Xóa)** và **Giao diện tìm kiếm thông minh**.

## 🎯 Tính Năng Nổi Bật
1. **Quản lý Sinh viên (Master List)**:
   - Giảng viên thêm sinh viên vào danh sách gốc của lớp.
   - Khi điểm danh, chỉ cần chọn từ danh sách này (có tìm kiếm), tránh nhập sai.
2. **Quản lý Buổi học**:
   - Tạo buổi học mới.
   - **Sửa tên** buổi học (nếu nhập sai).
   - **Xóa** buổi học (Soft delete - ẩn khỏi danh sách).
3. **Giao diện Thông minh**:
   - Sử dụng Sidebar Layout hiện đại.
   - Dropdown tìm kiếm (Select2) giúp chọn sinh viên nhanh chóng.

## 🛠 Cài Đặt & Chạy Demo

### Bước 1: Cài đặt (Nếu chưa làm)
```bash
npm install
```

### Bước 2: Chạy Local Blockchain
Mở terminal 1:
```bash
npx hardhat node
```

### Bước 3: Kết nối MetaMask
- Network: Localhost 8545
- Chain ID: 1337
- RPC URL: http://127.0.0.1:8545
- Import Account #0 từ terminal hardhat node (Account Giảng viên).

### Bước 4: Deploy Contract (Cập nhật mới)
Mở terminal 2:
```bash
npx hardhat run scripts/deploy.js --network localhost
```
*Lưu ý: Script này sẽ tự động tạo danh sách sinh viên mẫu (Master List) và các buổi học.*

### Bước 5: Chạy Frontend
Mở file `client/index.html` bằng Live Server.

## 📖 Hướng Dẫn Sử Dụng

1. **Kết nối Ví**: Nhấn nút kết nối.
2. **Thêm Sinh Viên (Master List)**:
   - Ở Sidebar, nhập Tên và MSSV -> Nhấn "Thêm vào DS".
3. **Quản lý Buổi Học**:
   - **Tạo**: Nhập tên -> Tạo Mới.
   - **Sửa/Xóa**: Chọn buổi học -> Sẽ hiện ra 2 nút nhỏ (Sửa/Xóa) bên cạnh dropdown.
4. **Điểm Danh**:
   - Chọn buổi học.
   - Ở phần "Điểm Danh", bấm vào ô chọn sinh viên -> Gõ tên hoặc MSSV để tìm -> Chọn -> Xác Nhận.

## 🔍 Giải Thích Code (Nâng Cao)

### Smart Contract (`contracts/StudentAttendance.sol`)
- `struct StudentInfo`: Lưu thông tin sinh viên trong Master List.
- `masterStudents`: Mảng lưu toàn bộ sinh viên của lớp.
- `isHidden`: Cờ (flag) trong struct Session để đánh dấu buổi học đã bị xóa (thay vì xóa thật sự trên blockchain tốn kém).

### Frontend (`client/app.js`)
- **Select2**: Thư viện jQuery giúp biến thẻ `<select>` thường thành ô tìm kiếm xịn xò.
- **Logic**: Tách biệt logic load Master List và load danh sách điểm danh của từng buổi.

---
**Lưu ý**: Nếu gặp lỗi "Nonce too high", hãy **Reset Account** trong MetaMask.
