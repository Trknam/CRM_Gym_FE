const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@gymcrm.local";
  const password = process.env.INITIAL_ADMIN_PASSWORD || "Admin@123456";
  const fullName = process.env.INITIAL_ADMIN_NAME || "Quản trị hệ thống";
  const branchCode = process.env.INITIAL_BRANCH_CODE || "CN001";
  const branchName = process.env.INITIAL_BRANCH_NAME || "Chi nhánh chính";

  const passwordHash = await bcrypt.hash(password, 12);

  const branch = await prisma.branch.upsert({
    where: { code: branchCode },
    update: { name: branchName, isActive: true },
    create: { code: branchCode, name: branchName, isActive: true },
  });

  const admin = await prisma.user.upsert({
    where: { email },
    update: { fullName, passwordHash, role: "SUPER_ADMIN", isActive: true },
    create: { email, fullName, passwordHash, role: "SUPER_ADMIN", isActive: true },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: admin.id, branchId: branch.id } },
    update: {},
    create: { userId: admin.id, branchId: branch.id },
  });

  const package1 = await prisma.gymPackage.upsert({
    where: { branchId_code: { branchId: branch.id, code: "PKG-1M" } },
    update: { name: "Gói 1 tháng", durationDays: 30, price: 500000, status: "ACTIVE" },
    create: { branchId: branch.id, code: "PKG-1M", name: "Gói 1 tháng", durationDays: 30, price: 500000 },
  });

  const package3 = await prisma.gymPackage.upsert({
    where: { branchId_code: { branchId: branch.id, code: "PKG-3M" } },
    update: { name: "Gói 3 tháng", durationDays: 90, price: 1300000, status: "ACTIVE" },
    create: { branchId: branch.id, code: "PKG-3M", name: "Gói 3 tháng", durationDays: 90, price: 1300000 },
  });

  const member1 = await prisma.member.upsert({
    where: { memberCode: "HV0001" },
    update: { fullName: "Nguyễn Văn An", phone: "0901234567", status: "ACTIVE", branchId: branch.id },
    create: { branchId: branch.id, memberCode: "HV0001", fullName: "Nguyễn Văn An", phone: "0901234567", status: "ACTIVE" },
  });

  const member2 = await prisma.member.upsert({
    where: { memberCode: "HV0002" },
    update: { fullName: "Trần Minh Anh", phone: "0912345678", status: "ACTIVE", branchId: branch.id },
    create: { branchId: branch.id, memberCode: "HV0002", fullName: "Trần Minh Anh", phone: "0912345678", status: "ACTIVE" },
  });

  const member3 = await prisma.member.upsert({
    where: { memberCode: "HV0003" },
    update: { fullName: "Phạm Ngọc Mai", phone: "0977777777", status: "INACTIVE", branchId: branch.id },
    create: { branchId: branch.id, memberCode: "HV0003", fullName: "Phạm Ngọc Mai", phone: "0977777777", status: "INACTIVE" },
  });

  const now = new Date();
  const start1 = new Date(now); start1.setDate(start1.getDate() - 10);
  const end1 = new Date(now); end1.setDate(end1.getDate() + 20);
  const start2 = new Date(now); start2.setDate(start2.getDate() - 70);
  const end2 = new Date(now); end2.setDate(end2.getDate() + 20);
  const oldStart = new Date(now); oldStart.setDate(oldStart.getDate() - 90);
  const oldEnd = new Date(now); oldEnd.setDate(oldEnd.getDate() - 10);

  const membership1 = await prisma.membership.upsert({
    where: { id: "seed-membership-1" },
    update: { memberId: member1.id, packageId: package1.id, startDate: start1, endDate: end1, price: 500000, status: "ACTIVE" },
    create: { id: "seed-membership-1", memberId: member1.id, packageId: package1.id, startDate: start1, endDate: end1, price: 500000, status: "ACTIVE" },
  });

  const membership2 = await prisma.membership.upsert({
    where: { id: "seed-membership-2" },
    update: { memberId: member2.id, packageId: package3.id, startDate: start2, endDate: end2, price: 1300000, status: "ACTIVE" },
    create: { id: "seed-membership-2", memberId: member2.id, packageId: package3.id, startDate: start2, endDate: end2, price: 1300000, status: "ACTIVE" },
  });

  await prisma.membership.upsert({
    where: { id: "seed-membership-3" },
    update: { memberId: member3.id, packageId: package1.id, startDate: oldStart, endDate: oldEnd, price: 500000, status: "EXPIRED" },
    create: { id: "seed-membership-3", memberId: member3.id, packageId: package1.id, startDate: oldStart, endDate: oldEnd, price: 500000, status: "EXPIRED" },
  });

  await prisma.payment.upsert({
    where: { id: "seed-payment-1" },
    update: { branchId: branch.id, memberId: member1.id, membershipId: membership1.id, amount: 500000, method: "BANK_TRANSFER", status: "PAID", paidAt: now },
    create: { id: "seed-payment-1", branchId: branch.id, memberId: member1.id, membershipId: membership1.id, amount: 500000, method: "BANK_TRANSFER", status: "PAID", paidAt: now },
  });

  await prisma.payment.upsert({
    where: { id: "seed-payment-2" },
    update: { branchId: branch.id, memberId: member2.id, membershipId: membership2.id, amount: 1300000, method: "CASH", status: "PAID", paidAt: now },
    create: { id: "seed-payment-2", branchId: branch.id, memberId: member2.id, membershipId: membership2.id, amount: 1300000, method: "CASH", status: "PAID", paidAt: now },
  });

  await prisma.checkIn.upsert({
    where: { id: "seed-checkin-1" },
    update: { branchId: branch.id, memberId: member1.id, checkedInAt: new Date(now.setHours(7, 30, 0, 0)), method: "QR_CODE", status: "VALID" },
    create: { id: "seed-checkin-1", branchId: branch.id, memberId: member1.id, checkedInAt: new Date(now.setHours(7, 30, 0, 0)), method: "QR_CODE", status: "VALID" },
  });

  await prisma.checkIn.upsert({
    where: { id: "seed-checkin-2" },
    update: { branchId: branch.id, memberId: member2.id, checkedInAt: new Date(now.setHours(8, 15, 0, 0)), method: "QR_CODE", status: "VALID" },
    create: { id: "seed-checkin-2", branchId: branch.id, memberId: member2.id, checkedInAt: new Date(now.setHours(8, 15, 0, 0)), method: "QR_CODE", status: "VALID" },
  });

  const trainerPasswordHash = await bcrypt.hash("Trainer@123456", 12);
  const trainer = await prisma.user.upsert({
    where: { email: "trainer@gymcrm.local" },
    update: { fullName: "Nguyễn Hoàng Nam", role: "TRAINER", isActive: true, passwordHash: trainerPasswordHash },
    create: { email: "trainer@gymcrm.local", fullName: "Nguyễn Hoàng Nam", role: "TRAINER", isActive: true, passwordHash: trainerPasswordHash },
  });

  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId: trainer.id, branchId: branch.id } },
    update: {},
    create: { userId: trainer.id, branchId: branch.id },
  });

  await prisma.trainerProfile.upsert({
    where: { userId: trainer.id },
    update: { specialty: "Strength & Hypertrophy", hourlyRate: 300000 },
    create: { userId: trainer.id, specialty: "Strength & Hypertrophy", hourlyRate: 300000 },
  });

  await prisma.lead.upsert({
    where: { id: "seed-lead-1" },
    update: { branchId: branch.id, fullName: "Đỗ Minh Đức", phone: "0901111222", source: "Facebook", status: "POTENTIAL", nextFollowUpAt: now },
    create: { id: "seed-lead-1", branchId: branch.id, fullName: "Đỗ Minh Đức", phone: "0901111222", source: "Facebook", status: "POTENTIAL", nextFollowUpAt: now, createdById: admin.id, updatedById: admin.id },
  });

  const exercises = [
    ["Barbell Squat", "Chân / Glutes", "Barbell", "Beginner"],
    ["Lat Pulldown", "Lưng", "Cable Machine", "Beginner"],
    ["Bench Press", "Ngực", "Barbell", "Intermediate"],
  ];
  for (const [name, muscle, equipment, level] of exercises) {
    await prisma.exercise.upsert({ where: { id: `seed-ex-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}` }, update: { name, muscle, equipment, level, isActive: true }, create: { id: `seed-ex-${name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`, name, muscle, equipment, level } });
  }

  await prisma.gymSetting.upsert({ where: { branchId_name: { branchId: branch.id, name: "Tên phòng Gym" } }, update: { value: branchName, group: "Phòng Gym" }, create: { branchId: branch.id, name: "Tên phòng Gym", value: branchName, group: "Phòng Gym" } });
  await prisma.gymSetting.upsert({ where: { branchId_name: { branchId: branch.id, name: "Múi giờ" } }, update: { value: "Asia/Ho_Chi_Minh", group: "Hệ thống" }, create: { branchId: branch.id, name: "Múi giờ", value: "Asia/Ho_Chi_Minh", group: "Hệ thống" } });

  await prisma.crmActivity.upsert({ where: { id: "seed-crm-1" }, update: { branchId: branch.id, memberId: member2.id, type: "CALL", note: "Nhắc gia hạn gói tập", status: "PENDING", scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), createdById: admin.id }, create: { id: "seed-crm-1", branchId: branch.id, memberId: member2.id, type: "CALL", note: "Nhắc gia hạn gói tập", status: "PENDING", scheduledAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), createdById: admin.id } });
  await prisma.crmActivity.upsert({ where: { id: "seed-crm-2" }, update: { branchId: branch.id, leadId: "seed-lead-1", type: "MESSAGE", note: "Follow-up khách tiềm năng", status: "DONE", scheduledAt: now, createdById: admin.id }, create: { id: "seed-crm-2", branchId: branch.id, leadId: "seed-lead-1", type: "MESSAGE", note: "Follow-up khách tiềm năng", status: "DONE", scheduledAt: now, createdById: admin.id } });

  await prisma.lead.upsert({
    where: { id: "seed-lead-2" },
    update: { branchId: branch.id, fullName: "Nguyễn Thu Hà", phone: "0912222333", source: "Website", status: "NEW", nextFollowUpAt: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    create: { id: "seed-lead-2", branchId: branch.id, fullName: "Nguyễn Thu Hà", phone: "0912222333", source: "Website", status: "NEW", nextFollowUpAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), createdById: admin.id, updatedById: admin.id },
  });

  console.log("Đã tạo/cập nhật dữ liệu mẫu cho Dashboard:");
  console.log("- 1 chi nhánh, 1 SUPER_ADMIN, 1 TRAINER");
  console.log("- 3 hội viên, 3 membership");
  console.log("- 2 thanh toán, 2 check-in, 2 lead");
}

main()
  .catch((error) => {
    console.error("Không thể tạo dữ liệu khởi tạo:", error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
