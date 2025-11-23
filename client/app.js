// Kiểm tra config
if (typeof CONTRACT_ADDRESS === 'undefined' || typeof CONTRACT_ABI === 'undefined') {
    alert("Chưa tìm thấy cấu hình Contract. Hãy chắc chắn bạn đã deploy contract và chạy đúng thư mục.");
}

let provider;
let signer;
let contract;
let currentSessionId = null;

// DOM Elements
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletAddressSpan = document.getElementById('walletAddress');
const attendanceForm = document.getElementById('attendanceForm');
const statusMessage = document.getElementById('statusMessage');
const studentTableBody = document.getElementById('studentTableBody');
const studentCountSpan = document.getElementById('studentCount');
const sessionSelect = document.getElementById('sessionSelect');
const createSessionBtn = document.getElementById('createSessionBtn');
const newSessionNameInput = document.getElementById('newSessionName');
const sessionStatus = document.getElementById('sessionStatus');
const sessionActions = document.getElementById('sessionActions');
const editSessionBtn = document.getElementById('editSessionBtn');
const deleteSessionBtn = document.getElementById('deleteSessionBtn');

// New Elements for Master List
const addStudentBtn = document.getElementById('addStudentBtn');
const newStudentNameInput = document.getElementById('newStudentName');
const newStudentCodeInput = document.getElementById('newStudentCode');
const studentSelect = $('#studentSelect'); // jQuery object for Select2

// --- INITIALIZATION ---

$(document).ready(function () {
    // Init Select2
    studentSelect.select2({
        placeholder: "Tìm kiếm sinh viên...",
        allowClear: true
    });
});

// --- WALLET CONNECTION ---

async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            const address = await signer.getAddress();

            walletAddressSpan.innerText = `Đã kết nối: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
            connectWalletBtn.innerText = "Đã Kết Nối";
            connectWalletBtn.disabled = true;

            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            // Load Initial Data
            await loadSessions();
            await loadMasterStudents();
            await checkOwner();

        } catch (error) {
            console.error("Lỗi kết nối ví:", error);
            alert("Không thể kết nối ví.");
        }
    } else {
        alert("Vui lòng cài đặt MetaMask!");
    }
}

connectWalletBtn.addEventListener('click', connectWallet);

// --- SESSION MANAGEMENT ---

async function loadSessions() {
    if (!contract) return;
    try {
        const sessions = await contract.getSessions();
        sessionSelect.innerHTML = '<option value="">-- Chọn buổi học --</option>';

        let lastOpenSessionIndex = -1;

        sessions.forEach((session, index) => {
            // Skip deleted sessions
            if (session.isHidden) return;

            const option = document.createElement('option');
            option.value = index;
            const status = session.isOpen ? "(Mở)" : "(Đóng)";
            option.text = `${session.name} ${status}`;
            sessionSelect.appendChild(option);

            if (session.isOpen) lastOpenSessionIndex = index;
        });

        // Auto select last open session
        if (lastOpenSessionIndex !== -1) {
            sessionSelect.value = lastOpenSessionIndex;
            handleSessionChange(lastOpenSessionIndex);
        }

    } catch (error) {
        console.error("Lỗi load sessions:", error);
    }
}

async function handleSessionChange(val) {
    if (val !== "") {
        currentSessionId = val;
        sessionActions.style.display = 'flex'; // Show edit/delete buttons

        const sessions = await contract.getSessions();
        const session = sessions[currentSessionId];

        updateSessionStatus(session);
        loadStudents(currentSessionId);
    } else {
        currentSessionId = null;
        sessionActions.style.display = 'none';
        studentTableBody.innerHTML = "";
        studentCountSpan.innerText = "0";
        sessionStatus.innerText = "";
    }
}

sessionSelect.addEventListener('change', (e) => handleSessionChange(e.target.value));

function updateSessionStatus(session) {
    if (session.isOpen) {
        sessionStatus.innerText = "Trạng thái: Đang mở";
        sessionStatus.style.color = "var(--success-color)";
        document.getElementById('submitBtn').disabled = false;
    } else {
        sessionStatus.innerText = "Trạng thái: Đã đóng";
        sessionStatus.style.color = "var(--error-color)";
        document.getElementById('submitBtn').disabled = true;
    }
}

createSessionBtn.addEventListener('click', async () => {
    if (!contract) { alert("Vui lòng kết nối ví!"); return; }
    const name = newSessionNameInput.value;
    if (!name) { alert("Vui lòng nhập tên buổi học!"); return; }

    try {
        createSessionBtn.disabled = true;
        createSessionBtn.innerText = "...";

        const tx = await contract.createSession(name);
        await tx.wait();

        alert("Tạo buổi học thành công!");
        newSessionNameInput.value = "";
        loadSessions();
    } catch (error) {
        console.error(error);
        alert("Lỗi khi tạo buổi học");
    } finally {
        createSessionBtn.disabled = false;
        createSessionBtn.innerText = "Tạo Mới";
    }
});

// Edit Session
editSessionBtn.addEventListener('click', async () => {
    if (currentSessionId === null) return;
    const newName = prompt("Nhập tên mới cho buổi học:");
    if (newName) {
        try {
            // Mặc định giữ nguyên trạng thái isOpen (true/false) - cần logic phức tạp hơn nếu muốn toggle
            // Ở đây demo đơn giản: coi như đang mở
            const tx = await contract.updateSession(currentSessionId, newName, true);
            await tx.wait();
            alert("Cập nhật thành công!");
            loadSessions();
        } catch (error) {
            console.error(error);
            alert("Lỗi cập nhật (Chỉ giảng viên)");
        }
    }
});

// Delete Session
deleteSessionBtn.addEventListener('click', async () => {
    if (currentSessionId === null) return;
    if (confirm("Bạn có chắc muốn xóa buổi học này?")) {
        try {
            const tx = await contract.deleteSession(currentSessionId);
            await tx.wait();
            alert("Đã xóa buổi học!");
            loadSessions();
            currentSessionId = null;
            handleSessionChange("");
        } catch (error) {
            console.error(error);
            alert("Lỗi xóa (Chỉ giảng viên)");
        }
    }
});

// --- MASTER STUDENT LIST ---

async function loadMasterStudents() {
    if (!contract) return;
    try {
        const students = await contract.getMasterStudents();

        // Clear existing options (keep placeholder)
        studentSelect.empty();
        studentSelect.append('<option value="">-- Chọn sinh viên --</option>');

        students.forEach((s) => {
            // Value là JSON string để dễ lấy cả tên và code
            const value = JSON.stringify({ name: s.name, code: s.studentCode });
            const text = `${s.name} - ${s.studentCode}`;
            const option = new Option(text, value, false, false);
            studentSelect.append(option);
        });

        studentSelect.trigger('change'); // Notify Select2 update

    } catch (error) {
        console.error("Lỗi load master list:", error);
    }
}

// --- OWNER CHECK ---
async function checkOwner() {
    if (!contract || !signer) return;
    try {
        const owner = await contract.owner();
        const currentAddress = await signer.getAddress();

        if (owner.toLowerCase() === currentAddress.toLowerCase()) {
            walletAddressSpan.innerHTML += ' <span style="color: #4ade80; font-weight: bold;">(Admin)</span>';
        } else {
            walletAddressSpan.innerHTML += ' <span style="color: #94a3b8;">(Student)</span>';
            // Show hint
            walletAddressSpan.innerHTML += `<br><small style="font-size: 0.7em; color: #ef4444;">Admin là: ${owner.substring(0, 6)}...${owner.substring(owner.length - 4)}</small>`;
        }
        console.log("Contract Owner:", owner);
        console.log("Current Address:", currentAddress);
    } catch (error) {
        console.error("Error checking owner:", error);
    }
}

addStudentBtn.addEventListener('click', async () => {
    if (!contract) { alert("Vui lòng kết nối ví!"); return; }
    const name = newStudentNameInput.value;
    const code = newStudentCodeInput.value;

    if (!name || !code) { alert("Vui lòng nhập đủ thông tin!"); return; }

    try {
        addStudentBtn.disabled = true;
        addStudentBtn.innerText = "Đang xử lý...";

        const tx = await contract.addStudent(name, code);
        await tx.wait();

        alert("Thêm sinh viên thành công!");
        newStudentNameInput.value = "";
        newStudentCodeInput.value = "";
        loadMasterStudents();

    } catch (error) {
        console.error("Full Error:", error);

        let msg = "Lỗi không xác định!";
        if (error.reason) {
            msg = error.reason;
        } else if (error.message) {
            if (error.message.includes("Chi giang vien moi duoc thuc hien")) {
                msg = "Lỗi: Bạn không phải là Giảng viên (Owner)!";
            } else if (error.message.includes("Sinh vien nay da ton tai")) {
                msg = "Lỗi: Mã sinh viên này đã tồn tại!";
            } else {
                msg = "Lỗi chi tiết: " + error.message;
            }
        }

        alert(msg);
    } finally {
        addStudentBtn.disabled = false;
        addStudentBtn.innerText = "Thêm vào DS";
    }
});

// --- ATTENDANCE ---

async function loadStudents(sessionId) {
    if (!contract || sessionId === null) return;

    try {
        const students = await contract.getStudentsBySession(sessionId);
        studentCountSpan.innerText = students.length;
        studentTableBody.innerHTML = "";

        students.forEach((student, index) => {
            const row = document.createElement('tr');
            const date = new Date(Number(student.timestamp) * 1000);
            const timeString = date.toLocaleString('vi-VN');

            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${student.name}</td>
                <td>${student.studentCode}</td>
                <td>${timeString}</td>
            `;
            studentTableBody.appendChild(row);
        });
    } catch (error) {
        console.error("Lỗi load danh sách điểm danh:", error);
    }
}

attendanceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!contract) { alert("Vui lòng kết nối ví!"); return; }
    if (currentSessionId === null) { alert("Vui lòng chọn buổi học!"); return; }

    // Lấy dữ liệu từ Select2
    const selectedData = studentSelect.val();
    if (!selectedData) { alert("Vui lòng chọn sinh viên!"); return; }

    const studentObj = JSON.parse(selectedData);
    const name = studentObj.name;
    const code = studentObj.code;
    const submitBtn = document.getElementById('submitBtn');

    try {
        statusMessage.innerText = "Đang xử lý...";
        statusMessage.className = "";
        submitBtn.disabled = true;

        const tx = await contract.markAttendance(currentSessionId, name, code);
        statusMessage.innerText = "Đang chờ xác nhận...";
        await tx.wait();

        statusMessage.innerText = "Điểm danh thành công!";
        statusMessage.className = "success";
        loadStudents(currentSessionId);

    } catch (error) {
        console.error("Lỗi điểm danh:", error);
        let errorMessage = "Có lỗi xảy ra!";
        if (error.reason) errorMessage = error.reason;
        else if (error.message && error.message.includes("Sinh vien nay da diem danh")) errorMessage = "Đã điểm danh rồi!";

        statusMessage.innerText = errorMessage;
        statusMessage.className = "error";
    } finally {
        submitBtn.disabled = false;
    }
});
