const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Dang bat dau deploy contract...");

  const StudentAttendance = await hre.ethers.getContractFactory("StudentAttendance");
  const attendance = await StudentAttendance.deploy();
  await attendance.waitForDeployment();

  const contractAddress = await attendance.getAddress();
  console.log(`StudentAttendance da duoc deploy tai dia chi: ${contractAddress}`);

  // --- SEED DATA ---
  console.log("Dang tao du lieu mau...");

  // 1. Tạo Master List (Danh sách sinh viên lớp)
  const masterStudents = [
    { name: "Nguyen Van A", code: "B20DCCN001" },
    { name: "Tran Thi B", code: "B20DCCN002" },
    { name: "Le Van C", code: "B20DCCN003" },
    { name: "Pham Van D", code: "B20DCCN004" },
    { name: "Hoang Thi E", code: "B20DCCN005" }
  ];

  console.log("Dang them sinh vien vao Master List...");
  for (const s of masterStudents) {
    const tx = await attendance.addStudent(s.name, s.code);
    await tx.wait();
    console.log(`Da them: ${s.name} (${s.code})`);
  }

  // 2. Tạo Courses
  const courses = [
    { name: "Lap trinh Blockchain", code: "INT1408" },
    { name: "An toan thong tin", code: "INT1409" },
    { name: "Phat trien ung dung Web", code: "INT1410" }
  ];

  console.log("Dang tao khoa hoc...");
  for (const c of courses) {
    const tx = await attendance.createCourse(c.name, c.code);
    await tx.wait();
    console.log(`Da tao khoa hoc: ${c.name}`);
  }

  // 3. Tạo Sessions cho Course 0 (Blockchain)
  const sessions = ["Tuan 1: Gioi thieu", "Tuan 2: Smart Contract", "Tuan 3: DApp"];
  console.log("Dang tao session cho khoa hoc Blockchain...");
  for (const sessionName of sessions) {
    // createSession(courseId, name) -> courseId 0
    const tx = await attendance.createSession(0, sessionName);
    await tx.wait();
    console.log(`Da tao buoi hoc: ${sessionName}`);
  }

  // 4. Điểm danh mẫu
  console.log("Dang diem danh mau...");
  // Điểm danh 3 sinh viên đầu tiên vào buổi 1 của khóa 1 (Session ID 0)
  for (let i = 0; i < 3; i++) {
    const s = masterStudents[i];
    const tx = await attendance.markAttendance(0, s.name, s.code);
    await tx.wait();
    console.log(`Da diem danh: ${s.name} vao buoi 1`);
  }

  console.log("Da tao du lieu mau xong!");

  // --- SAVE CONFIG ---
  const configPath = path.join(__dirname, "../client/config.js");
  const configContent = `const CONTRACT_ADDRESS = "${contractAddress}";`;
  fs.writeFileSync(configPath, configContent);
  console.log(`Da luu dia chi contract vao ${configPath}`);

  // Lưu ABI
  const artifactPath = path.join(__dirname, "../artifacts/contracts/StudentAttendance.sol/StudentAttendance.json");

  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiContent = `const CONTRACT_ABI = ${JSON.stringify(artifact.abi)};`;
    const abiPath = path.join(__dirname, "../client/abi.js");
    fs.writeFileSync(abiPath, abiContent);
    console.log(`Da luu ABI vao ${abiPath}`);
  } else {
    console.warn("Khong tim thay artifact de trich xuat ABI.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
