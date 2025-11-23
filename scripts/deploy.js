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

  // 2. Tạo Sessions
  const sessions = ["Lap trinh Blockchain - Tuan 1", "Lap trinh Blockchain - Tuan 2"];
  for (const sessionName of sessions) {
    const tx = await attendance.createSession(sessionName);
    await tx.wait();
    console.log(`Da tao buoi hoc: ${sessionName}`);
  }

  // 3. Điểm danh mẫu (lấy từ Master List)
  console.log("Dang diem danh mau...");
  // Điểm danh 3 sinh viên đầu tiên vào buổi 1 (ID 0)
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
