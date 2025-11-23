// --- GLOBAL VARIABLES ---
let provider;
let signer;
let contract;
let currentCourseId = null;
let currentSessionId = null;
let currentCourseData = null;

// DOM Elements - Views
const views = {
    courses: document.getElementById('view-courses'),
    details: document.getElementById('view-course-details'),
    attendance: document.getElementById('view-attendance'),
    students: document.getElementById('view-students')
};

// DOM Elements - UI
const walletAddressSpan = document.getElementById('walletAddress');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const pageTitle = document.getElementById('pageTitle');

// --- INITIALIZATION ---

$(document).ready(function () {
    $('#studentSelect').select2({ placeholder: "Tìm kiếm sinh viên...", allowClear: true });

    // Check config
    if (typeof CONTRACT_ADDRESS === 'undefined' || typeof CONTRACT_ABI === 'undefined') {
        alert("Chưa tìm thấy cấu hình Contract. Hãy deploy lại!");
    }
});

// --- NAVIGATION ---

function switchView(viewName) {
    // Hide all views
    Object.values(views).forEach(el => el.style.display = 'none');

    // Show selected view
    if (views[viewName.replace('view-', '')]) {
        views[viewName.replace('view-', '')].style.display = 'block';
    }

    // Update Title & Active Menu
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    if (viewName === 'view-courses') {
        pageTitle.innerText = "Danh Sách Khóa Học";
        document.querySelector('.nav-item:nth-child(1)').classList.add('active');
        loadCourses();
    } else if (viewName === 'view-students') {
        pageTitle.innerText = "Quản Lý Sinh Viên";
        document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        loadMasterStudents();
    }
}

// --- WALLET ---

async function connectWallet() {
    if (window.ethereum) {
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            signer = await provider.getSigner();
            const address = await signer.getAddress();

            walletAddressSpan.innerText = `Ví: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
            connectWalletBtn.innerText = "Đã Kết Nối";
            connectWalletBtn.disabled = true;

            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            checkOwner();
            switchView('view-courses'); // Start at Courses view

        } catch (error) {
            console.error("Lỗi kết nối:", error);
            alert("Lỗi kết nối ví.");
        }
    } else {
        alert("Vui lòng cài đặt MetaMask!");
    }
}

connectWalletBtn.addEventListener('click', connectWallet);

async function checkOwner() {
    if (!contract) return;
    try {
        const owner = await contract.owner();
        const current = await signer.getAddress();
        if (owner.toLowerCase() === current.toLowerCase()) {
            walletAddressSpan.innerHTML += ' <span style="color: #4ade80;">(Admin)</span>';
        } else {
            walletAddressSpan.innerHTML += ' <span style="color: #94a3b8;">(Student)</span>';
        }
    } catch (e) { console.error(e); }
}

// --- MODAL HELPER ---

let modalConfirmCallback = null;

function showModal(title, content, onConfirm, isConfirmOnly = false) {
    document.getElementById('modalTitle').innerText = title;
    document.getElementById('modalBody').innerHTML = content;

    const confirmBtn = document.getElementById('modalConfirmBtn');

    // Reset old listener
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.onclick = async () => {
        // Loading state
        const originalText = newBtn.innerText;
        newBtn.innerText = "Đang xử lý...";
        newBtn.disabled = true;

        try {
            const success = await onConfirm();
            if (success) {
                closeModal();
            }
        } catch (error) {
            console.error(error);
            alert("Đã có lỗi xảy ra!");
        } finally {
            // Reset state
            newBtn.innerText = originalText;
            newBtn.disabled = false;
        }
    };

    if (isConfirmOnly) {
        newBtn.className = "btn-small btn-danger";
        newBtn.innerText = "Xác Nhận";
    } else {
        newBtn.className = "btn-small btn-primary";
        newBtn.innerText = "Lưu Thay Đổi";
    }

    document.getElementById('customModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('customModal').style.display = 'none';
}

// Close on outside click
window.onclick = function (event) {
    const modal = document.getElementById('customModal');
    if (event.target == modal) {
        closeModal();
    }
}

// --- COURSE MANAGEMENT ---

async function loadCourses() {
    if (!contract) return;
    try {
        const courses = await contract.getCourses();
        const list = document.getElementById('courseList');
        list.innerHTML = "";

        courses.forEach((c, index) => {
            if (c.isHidden) return; // Skip deleted

            const card = document.createElement('div');
            card.className = 'course-card';
            card.onclick = () => showCourseDetails(index, c);
            card.innerHTML = `
                <h3>${c.name}</h3>
                <p>Mã: ${c.courseCode}</p>
            `;
            list.appendChild(card);
        });
    } catch (e) { console.error(e); }
}

document.getElementById('btnShowCreateCourse').onclick = () => $('#createCourseForm').show();

document.getElementById('btnCreateCourse').onclick = async () => {
    if (!contract) return;
    const name = document.getElementById('newCourseName').value;
    const code = document.getElementById('newCourseCode').value;
    if (!name || !code) return alert("Nhập đủ thông tin!");

    const btn = document.getElementById('btnCreateCourse');
    const originalText = btn.innerText;
    btn.innerText = "Đang tạo...";
    btn.disabled = true;

    try {
        const tx = await contract.createCourse(name, code);
        await tx.wait();
        alert("Tạo khóa học thành công!");
        $('#createCourseForm').hide();
        loadCourses();
    } catch (e) { alert("Lỗi: " + (e.reason || e.message)); }
    finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// --- COURSE DETAILS (SESSIONS) ---

async function showCourseDetails(courseId, courseData) {
    currentCourseId = courseId;
    currentCourseData = courseData;

    // Update UI
    document.getElementById('detailCourseName').innerText = courseData.name;
    document.getElementById('detailCourseCode').innerText = `Mã: ${courseData.courseCode}`;

    // Switch View
    Object.values(views).forEach(el => el.style.display = 'none');
    views.details.style.display = 'block';
    pageTitle.innerText = "Chi Tiết Khóa Học";

    loadSessions(courseId);
}

// Edit Course
document.getElementById('btnEditCourse').onclick = () => {
    if (!contract || currentCourseId === null) return;

    const content = `
        <div class="form-group">
            <label>Tên khóa học:</label>
            <input type="text" id="editCourseName" value="${currentCourseData.name}">
        </div>
        <div class="form-group">
            <label>Mã học phần:</label>
            <input type="text" id="editCourseCode" value="${currentCourseData.courseCode}">
        </div>
    `;

    showModal("Sửa Khóa Học", content, async () => {
        const newName = document.getElementById('editCourseName').value;
        const newCode = document.getElementById('editCourseCode').value;

        if (newName && newCode) {
            await updateCourse(currentCourseId, newName, newCode);
            return true;
        }
        return false;
    });
};

async function updateCourse(id, name, code) {
    try {
        const tx = await contract.updateCourse(id, name, code);
        await tx.wait();
        alert("Cập nhật thành công!");

        // Update local data and UI
        currentCourseData.name = name;
        currentCourseData.courseCode = code;

        // Refresh details view
        document.getElementById('detailCourseName').innerText = name;
        document.getElementById('detailCourseCode').innerText = `Mã: ${code}`;

    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e; // Propagate error to modal handler
    }
}

// Delete Course
document.getElementById('btnDeleteCourse').onclick = () => {
    if (!contract || currentCourseId === null) return;

    showModal("Xóa Khóa Học", "<p>Bạn có chắc muốn xóa khóa học này không?</p>", async () => {
        await deleteCourse(currentCourseId);
        return true;
    }, true);
};

async function deleteCourse(id) {
    try {
        const tx = await contract.deleteCourse(id);
        await tx.wait();
        alert("Đã xóa khóa học!");
        switchView('view-courses');
    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e;
    }
}

async function loadSessions(courseId) {
    if (!contract) return;
    try {
        const sessions = await contract.getSessions();
        const list = document.getElementById('sessionList');
        list.innerHTML = "";

        sessions.forEach((s, index) => {
            // Filter by Course ID & Hidden status
            if (s.isHidden || Number(s.courseId) !== Number(courseId)) return;

            const li = document.createElement('li');
            li.className = 'session-item';

            const statusClass = s.isOpen ? 'status-open' : 'status-closed';
            const statusText = s.isOpen ? 'Đang mở' : 'Đã đóng';

            li.innerHTML = `
                <div class="session-info" onclick="showAttendance(${index}, '${s.name}', ${s.isOpen})">
                    <strong>${s.name}</strong>
                    <span class="session-status ${statusClass}">${statusText}</span>
                </div>
                <div class="session-actions">
                    <button onclick="openEditSessionModal(${index}, '${s.name}')" title="Sửa"><i class="fas fa-edit"></i></button>
                    <button onclick="openDeleteSessionModal(${index})" title="Xóa"><i class="fas fa-trash"></i></button>
                </div>
            `;
            list.appendChild(li);
        });
    } catch (e) { console.error(e); }
}

document.getElementById('btnCreateSession').onclick = async () => {
    if (!contract) return;
    const name = document.getElementById('newSessionName').value;
    if (!name) return alert("Nhập tên buổi học!");

    const btn = document.getElementById('btnCreateSession');
    const originalText = btn.innerText;
    btn.innerText = "...";
    btn.disabled = true;

    try {
        const tx = await contract.createSession(currentCourseId, name);
        await tx.wait();
        alert("Tạo buổi học thành công!");
        document.getElementById('newSessionName').value = "";
        loadSessions(currentCourseId);
    } catch (e) { alert("Lỗi: " + (e.reason || e.message)); }
    finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};

// Edit Session Modal Wrapper
window.openEditSessionModal = (sessionId, oldName) => {
    const content = `
        <div class="form-group">
            <label>Tên buổi học:</label>
            <input type="text" id="editSessionName" value="${oldName}">
        </div>
    `;
    showModal("Sửa Buổi Học", content, async () => {
        const newName = document.getElementById('editSessionName').value;
        if (newName) {
            await updateSession(sessionId, newName);
            return true;
        }
        return false;
    });
};

async function updateSession(sessionId, newName) {
    try {
        const tx = await contract.updateSession(sessionId, newName, true);
        await tx.wait();
        loadSessions(currentCourseId);
    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e;
    }
}

// Delete Session Modal Wrapper
window.openDeleteSessionModal = (sessionId) => {
    showModal("Xóa Buổi Học", "<p>Bạn có chắc muốn xóa buổi học này?</p>", async () => {
        await deleteSession(sessionId);
        return true;
    }, true);
};

async function deleteSession(sessionId) {
    try {
        const tx = await contract.deleteSession(sessionId);
        await tx.wait();
        loadSessions(currentCourseId);
    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e;
    }
}

// --- ATTENDANCE ---

async function showAttendance(sessionId, sessionName, isOpen) {
    currentSessionId = sessionId;

    // Switch View
    Object.values(views).forEach(el => el.style.display = 'none');
    views.attendance.style.display = 'block';
    pageTitle.innerText = "Điểm Danh";

    document.getElementById('attendanceSessionName').innerText = sessionName;
    const statusEl = document.getElementById('attendanceStatus');
    const submitBtn = document.getElementById('submitBtn');

    if (isOpen) {
        statusEl.innerText = "Trạng thái: Đang mở";
        statusEl.style.color = "var(--success-color)";
        submitBtn.disabled = false;
    } else {
        statusEl.innerText = "Trạng thái: Đã đóng";
        statusEl.style.color = "var(--error-color)";
        submitBtn.disabled = true;
    }

    // Load list first, then load dropdown (to filter)
    await loadAttendanceList(sessionId);
}

function backToCourseDetails() {
    Object.values(views).forEach(el => el.style.display = 'none');
    views.details.style.display = 'block';
    pageTitle.innerText = "Chi Tiết Khóa Học";
}

let attendedStudentCodes = [];

async function loadAttendanceList(sessionId) {
    try {
        const students = await contract.getStudentsBySession(sessionId);
        attendedStudentCodes = []; // Reset list

        // Filter out revoked students for display count, but keep logic correct
        const activeStudents = students.filter(s => !s.isRevoked);

        document.getElementById('studentCount').innerText = activeStudents.length;
        const tbody = document.getElementById('studentTableBody');
        tbody.innerHTML = "";

        students.forEach((s, i) => {
            if (s.isRevoked) return; // Don't show revoked students

            attendedStudentCodes.push(s.studentCode); // Add to list to filter dropdown

            const date = new Date(Number(s.timestamp) * 1000).toLocaleString('vi-VN');
            tbody.innerHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${s.name}</td>
                    <td>${s.studentCode}</td>
                    <td>${date}</td>
                    <td><button class="btn-icon btn-danger" onclick="openRevokeModal('${s.studentCode}')"><i class="fas fa-times"></i></button></td>
                </tr>
            `;
        });

        // Reload dropdown after updating attended list
        loadStudentSelect();

    } catch (e) { console.error(e); }
}

window.openRevokeModal = (studentCode) => {
    showModal("Hủy Điểm Danh", `<p>Hủy điểm danh của sinh viên <b>${studentCode}</b>?</p>`, async () => {
        await revokeAttendance(studentCode);
        return true;
    }, true);
};

async function revokeAttendance(studentCode) {
    try {
        const tx = await contract.revokeAttendance(currentSessionId, studentCode);
        await tx.wait();
        alert("Đã hủy điểm danh!");
        loadAttendanceList(currentSessionId);
    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e;
    }
}

async function loadStudentSelect() {
    try {
        const students = await contract.getMasterStudents();
        const select = $('#studentSelect');
        select.empty();
        select.append('<option value="">-- Chọn sinh viên --</option>');

        students.forEach(s => {
            if (s.isHidden) return; // Skip deleted students

            // Skip if already attended
            if (attendedStudentCodes.includes(s.studentCode)) return;

            const val = JSON.stringify({ name: s.name, code: s.studentCode });
            select.append(new Option(`${s.name} - ${s.studentCode}`, val, false, false));
        });
        select.trigger('change');
    } catch (e) { console.error(e); }
}

document.getElementById('attendanceForm').onsubmit = async (e) => {
    e.preventDefault();
    const val = $('#studentSelect').val();
    if (!val) return alert("Chọn sinh viên!");

    const { name, code } = JSON.parse(val);
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('statusMessage');

    try {
        btn.disabled = true;
        msg.innerText = "Đang xử lý...";
        msg.className = "";

        const tx = await contract.markAttendance(currentSessionId, name, code);
        await tx.wait();

        msg.innerText = "Thành công!";
        msg.className = "success";
        loadAttendanceList(currentSessionId);
    } catch (error) {
        console.error(error);
        let errText = "Lỗi!";
        if (error.reason) errText = error.reason;
        else if (error.message && error.message.includes("da diem danh")) errText = "Đã điểm danh rồi!";
        msg.innerText = errText;
        msg.className = "error";
    } finally {
        btn.disabled = false;
    }
};

// --- MASTER STUDENTS ---

async function loadMasterStudents() {
    try {
        const students = await contract.getMasterStudents();
        const tbody = document.getElementById('masterStudentTableBody');
        tbody.innerHTML = "";

        students.forEach((s, i) => {
            if (s.isHidden) return;

            tbody.innerHTML += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${s.name}</td>
                    <td>${s.studentCode}</td>
                    <td><span style="color:green">Hoạt động</span></td>
                    <td>
                        <button class="btn-icon" onclick="openEditStudentModal('${s.studentCode}', '${s.name}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-icon btn-danger" onclick="openDeleteStudentModal('${s.studentCode}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        });
    } catch (e) { console.error(e); }
}

document.getElementById('btnAddStudent').onclick = async () => {
    if (!contract) return;
    const name = document.getElementById('newStudentName').value;
    const code = document.getElementById('newStudentCode').value;
    if (!name || !code) return alert("Nhập đủ thông tin!");

    try {
        const btn = document.getElementById('btnAddStudent');
        btn.disabled = true;
        btn.innerText = "...";

        const tx = await contract.addStudent(name, code);
        await tx.wait();

        alert("Thêm thành công!");
        document.getElementById('newStudentName').value = "";
        document.getElementById('newStudentCode').value = "";
        loadMasterStudents();
    } catch (e) { alert("Lỗi: " + (e.reason || e.message)); }
    finally {
        document.getElementById('btnAddStudent').disabled = false;
        document.getElementById('btnAddStudent').innerText = "Thêm Sinh Viên";
    }
};

window.openEditStudentModal = (code, oldName) => {
    const content = `
        <div class="form-group">
            <label>Tên sinh viên:</label>
            <input type="text" id="editStudentName" value="${oldName}">
        </div>
    `;
    showModal("Sửa Sinh Viên", content, async () => {
        const newName = document.getElementById('editStudentName').value;
        if (newName) {
            await updateStudent(code, newName);
            return true;
        }
        return false;
    });
};

async function updateStudent(code, newName) {
    try {
        const tx = await contract.updateStudent(code, newName);
        await tx.wait();
        loadMasterStudents();
    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e;
    }
}

window.openDeleteStudentModal = (code) => {
    showModal("Xóa Sinh Viên", `<p>Bạn có chắc muốn xóa sinh viên <b>${code}</b>?</p>`, async () => {
        await deleteStudent(code);
        return true;
    }, true);
};

async function deleteStudent(code) {
    try {
        const tx = await contract.deleteStudent(code);
        await tx.wait();
        loadMasterStudents();
    } catch (e) {
        alert("Lỗi: " + (e.reason || e.message));
        throw e;
    }
}
