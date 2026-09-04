import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { isEmail, normalizePhone } from "@/lib/validation/auth";
import { createSession } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");

    if (!identifier || !password) {
      return NextResponse.json({ message: "Vui lòng nhập đầy đủ thông tin." }, { status: 400 });
    }

    const user = await prisma.user.findFirst({
      where: isEmail(identifier)
        ? { email: identifier.toLowerCase() }
        : { phone: normalizePhone(identifier) },
    });

    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      return NextResponse.json({ message: "Thông tin đăng nhập không chính xác." }, { status: 401 });
    }

    await createSession(user.id);
    return NextResponse.json({
      user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role },
    });
  } catch {
    return NextResponse.json({ message: "Không thể đăng nhập lúc này." }, { status: 500 });
  }
}
