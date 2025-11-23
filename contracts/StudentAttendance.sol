// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StudentAttendance {
    struct Student {
        uint256 id;
        string name;
        string studentCode;
        uint256 timestamp;
        bool isRevoked; // New: Support revoking attendance
    }

    struct StudentInfo {
        string name;
        string studentCode;
        bool exists;
        bool isHidden; // New: Soft delete for Master List
    }

    struct Course {
        uint256 id;
        string name;
        string courseCode;
        bool isHidden;
    }

    struct Session {
        uint256 id;
        uint256 courseId;
        string name;
        bool isOpen;
        bool isHidden;
        uint256 createdAt;
    }

    address public owner;
    
    // Data Storage
    Course[] public courses;
    Session[] public sessions;
    StudentInfo[] public masterStudents;
    
    // Mappings
    mapping(string => bool) public studentCodeExists;
    mapping(uint256 => Student[]) public sessionStudents; // sessionId -> Students
    mapping(uint256 => mapping(string => bool)) public hasAttended; // sessionId -> studentCode -> bool
    
    // Events
    event CourseCreated(uint256 id, string name, string courseCode);
    event CourseUpdated(uint256 id, string name, string courseCode);
    event CourseDeleted(uint256 id);
    
    event SessionCreated(uint256 id, uint256 courseId, string name);
    event SessionUpdated(uint256 id, string name, bool isOpen);
    event SessionDeleted(uint256 id);
    
    event StudentAdded(string name, string studentCode);
    event StudentUpdated(string studentCode, string name);
    event StudentDeleted(string studentCode);
    
    event AttendanceMarked(uint256 sessionId, string name, string studentCode, uint256 timestamp);
    event AttendanceRevoked(uint256 sessionId, string studentCode);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Chi giang vien moi duoc thuc hien thao tac nay");
        _;
    }

    // --- COURSE MANAGEMENT ---

    function createCourse(string memory _name, string memory _courseCode) public onlyOwner {
        uint256 newId = courses.length;
        courses.push(Course(newId, _name, _courseCode, false));
        emit CourseCreated(newId, _name, _courseCode);
    }

    function updateCourse(uint256 _id, string memory _name, string memory _courseCode) public onlyOwner {
        require(_id < courses.length, "Khoa hoc khong ton tai");
        courses[_id].name = _name;
        courses[_id].courseCode = _courseCode;
        emit CourseUpdated(_id, _name, _courseCode);
    }

    function deleteCourse(uint256 _id) public onlyOwner {
        require(_id < courses.length, "Khoa hoc khong ton tai");
        courses[_id].isHidden = true;
        emit CourseDeleted(_id);
    }

    function getCourses() public view returns (Course[] memory) {
        return courses;
    }

    // --- SESSION MANAGEMENT ---

    function createSession(uint256 _courseId, string memory _name) public {
        require(_courseId < courses.length, "Khoa hoc khong ton tai");
        require(!courses[_courseId].isHidden, "Khoa hoc da bi xoa");
        
        uint256 newId = sessions.length;
        sessions.push(Session(newId, _courseId, _name, true, false, block.timestamp));
        emit SessionCreated(newId, _courseId, _name);
    }

    function updateSession(uint256 _sessionId, string memory _newName, bool _isOpen) public onlyOwner {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        sessions[_sessionId].name = _newName;
        sessions[_sessionId].isOpen = _isOpen;
        emit SessionUpdated(_sessionId, _newName, _isOpen);
    }

    function deleteSession(uint256 _sessionId) public onlyOwner {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        sessions[_sessionId].isHidden = true;
        emit SessionDeleted(_sessionId);
    }

    function getSessions() public view returns (Session[] memory) {
        return sessions;
    }

    // --- STUDENT MANAGEMENT (MASTER LIST) ---

    function addStudent(string memory _name, string memory _studentCode) public onlyOwner {
        require(!studentCodeExists[_studentCode], "Sinh vien nay da ton tai");
        masterStudents.push(StudentInfo(_name, _studentCode, true, false));
        studentCodeExists[_studentCode] = true;
        emit StudentAdded(_name, _studentCode);
    }

    function updateStudent(string memory _studentCode, string memory _newName) public onlyOwner {
        require(studentCodeExists[_studentCode], "Sinh vien khong ton tai");
        // Find student (inefficient loop but okay for demo with small list)
        for(uint i = 0; i < masterStudents.length; i++) {
            if (keccak256(bytes(masterStudents[i].studentCode)) == keccak256(bytes(_studentCode))) {
                masterStudents[i].name = _newName;
                emit StudentUpdated(_studentCode, _newName);
                break;
            }
        }
    }

    function deleteStudent(string memory _studentCode) public onlyOwner {
        require(studentCodeExists[_studentCode], "Sinh vien khong ton tai");
        for(uint i = 0; i < masterStudents.length; i++) {
            if (keccak256(bytes(masterStudents[i].studentCode)) == keccak256(bytes(_studentCode))) {
                masterStudents[i].isHidden = true;
                emit StudentDeleted(_studentCode);
                break;
            }
        }
    }

    function getMasterStudents() public view returns (StudentInfo[] memory) {
        return masterStudents;
    }

    // --- ATTENDANCE ---

    function markAttendance(uint256 _sessionId, string memory _name, string memory _studentCode) public {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        require(!sessions[_sessionId].isHidden, "Buoi hoc da bi xoa");
        require(sessions[_sessionId].isOpen, "Buoi hoc da ket thuc");
        
        // Check if already attended AND not revoked
        if (hasAttended[_sessionId][_studentCode]) {
            // Check if last record was revoked, if so allow re-marking
            // But simpler logic: just check hasAttended. If we revoke, we set hasAttended = false?
            // Better: Loop through sessionStudents to check status? No, too expensive.
            // Solution: We will update hasAttended to false when revoking.
            require(!hasAttended[_sessionId][_studentCode], "Sinh vien nay da diem danh roi!");
        }

        uint256 newId = sessionStudents[_sessionId].length + 1;
        uint256 currentTime = block.timestamp;

        sessionStudents[_sessionId].push(Student(newId, _name, _studentCode, currentTime, false));
        hasAttended[_sessionId][_studentCode] = true;

        emit AttendanceMarked(_sessionId, _name, _studentCode, currentTime);
    }

    function revokeAttendance(uint256 _sessionId, string memory _studentCode) public onlyOwner {
        require(_sessionId < sessions.length, "Buoi hoc khong ton tai");
        require(hasAttended[_sessionId][_studentCode], "Sinh vien nay chua diem danh");

        // Find and mark as revoked
        Student[] storage students = sessionStudents[_sessionId];
        for (uint i = 0; i < students.length; i++) {
            if (keccak256(bytes(students[i].studentCode)) == keccak256(bytes(_studentCode)) && !students[i].isRevoked) {
                students[i].isRevoked = true;
                hasAttended[_sessionId][_studentCode] = false; // Allow re-marking
                emit AttendanceRevoked(_sessionId, _studentCode);
                break;
            }
        }
    }

    function getStudentsBySession(uint256 _sessionId) public view returns (Student[] memory) {
        return sessionStudents[_sessionId];
    }
}
