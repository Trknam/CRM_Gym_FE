import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { isEmail, normalizePhone, validateRegister } from "@/lib/validation/auth";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = {
      fullName: String(body.fullName ?? ""),
      identifier: String(body.identifier ?? ""),
      password: String(body.password ?? ""),
      confirmPassword: String(body.confirmPassword ?? ""),
    };

    const errors = validateRegister(input);
    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ message: "Dữ liệu đăng ký không hợp lệ.", errors }, { status: 400 });
    }

    const email = isEmail(input.identifier) ? input.identifier.trim().toLowerCase() : null;
    const phone = email ? null : normalizePhone(input.identifier);

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: email ?? undefined }, { phone: phone ?? undefined }] },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: "Email hoặc số điện thoại đã được đăng ký." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        fullName: input.fullName.trim(),
        email,
        phone,
        passwordHash: await hashPassword(input.password),
        role: "STAFF",
      },
      select: { id: true, fullName: true, email: true, phone: true, role: true },
    });

    // Tài khoản nhân viên phải thuộc ít nhất một chi nhánh để branch-scope
    // có thể trả về dữ liệu. Tài khoản đăng ký mới được gán vào chi nhánh
    // đang hoạt động đầu tiên; quản trị viên vẫn có thể đổi phân công sau.
    const defaultBranch = await prisma.branch.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    if (defaultBranch) {
      await prisma.userBranch.create({
        data: { userId: user.id, branchId: defaultBranch.id },
      });
    }

    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Không thể tạo tài khoản lúc này." }, { status: 500 });
  }
}
