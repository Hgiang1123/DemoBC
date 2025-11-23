// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StudentAttendance {
    struct Student {
        uint256 id;
        string name;
        string studentCode;
        uint256 timestamp;
    }

    // Struct cho danh sách sinh viên gốc (Master List)
    struct StudentInfo {
        string name;
        string studentCode;
        bool exists;
    }

    struct Session {
        uint256 id;
        string name;
        bool isOpen;
        bool isHidden; // Soft delete
        uint256 createdAt;
    }

    address public owner;
    
    // Danh sách các buổi học
    Session[] public sessions;
    
    // Danh sách sinh viên gốc (Master List)
    StudentInfo[] public masterStudents;
    mapping(string => bool) public studentCodeExists; // Kiểm tra trùng MSSV

    // Mapping từ Session ID -> Danh sách sinh viên tham gia
    mapping(uint256 => Student[]) public sessionStudents;
    
    // Mapping để kiểm tra sinh viên đã điểm danh trong buổi học chưa (SessionID -> MSSV -> bool)
    mapping(uint256 => mapping(string => bool)) public hasAttended;

    event SessionCreated(uint256 id, string name, uint256 timestamp);
    event SessionUpdated(uint256 id, string name, bool isOpen);
    event SessionDeleted(uint256 id);
    event AttendanceMarked(uint256 sessionId, string name, string studentCode, uint256 timestamp);
    event StudentAdded(string name, string studentCode);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Chi giang vien moi duoc thuc hien thao tac nay");
        _;
    }

    // --- QUẢN LÝ SINH VIÊN (MASTER LIST) ---

    function addStudent(string memory _name, string memory _studentCode) public onlyOwner {
        require(!studentCodeExists[_studentCode], "Sinh vien nay da ton tai");
        
        masterStudents.push(StudentInfo(_name, _studentCode, true));
        studentCodeExists[_studentCode] = true;
        
        emit StudentAdded(_name, _studentCode);
    }

    function getMasterStudents() public view returns (StudentInfo[] memory) {
        return masterStudents;
    }

    // --- QUẢN LÝ BUỔI HỌC ---

    function createSession(string memory _name) public {
        uint256 newId = sessions.length;
        sessions.push(Session(newId, _name, true, false, block.timestamp));
        emit SessionCreated(newId, _name, block.timestamp);
    }

    function updateSession(uint256 _sessionId, string memory _newName, bool _isOpen) public onlyOwner {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        require(!sessions[_sessionId].isHidden, "Buoi hoc da bi xoa");

        sessions[_sessionId].name = _newName;
        sessions[_sessionId].isOpen = _isOpen;
        
        emit SessionUpdated(_sessionId, _newName, _isOpen);
    }

    function deleteSession(uint256 _sessionId) public onlyOwner {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        sessions[_sessionId].isHidden = true; // Soft delete
        emit SessionDeleted(_sessionId);
    }

    function getSessions() public view returns (Session[] memory) {
        return sessions;
    }

    // --- ĐIỂM DANH ---

    function markAttendance(uint256 _sessionId, string memory _name, string memory _studentCode) public {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        require(!sessions[_sessionId].isHidden, "Buoi hoc da bi xoa");
        require(sessions[_sessionId].isOpen, "Buoi hoc da ket thuc");
        require(!hasAttended[_sessionId][_studentCode], "Sinh vien nay da diem danh trong buoi nay roi!");

        // Kiểm tra xem sinh viên có trong Master List không (Tùy chọn, ở đây ta cho phép linh hoạt nhưng khuyến khích có)
        // Nếu muốn bắt buộc: require(studentCodeExists[_studentCode], "Sinh vien khong co trong danh sach lop");

        uint256 newId = sessionStudents[_sessionId].length + 1;
        uint256 currentTime = block.timestamp;

        sessionStudents[_sessionId].push(Student(newId, _name, _studentCode, currentTime));
        hasAttended[_sessionId][_studentCode] = true;

        emit AttendanceMarked(_sessionId, _name, _studentCode, currentTime);
    }

    function getStudentsBySession(uint256 _sessionId) public view returns (Student[] memory) {
        return sessionStudents[_sessionId];
    }
}
