import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.OODA_PASSWORD || "1234";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  if (password === PASSWORD) {
    const res = NextResponse.json({ success: true });
    res.cookies.set("ooda-auth", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  }

  return NextResponse.json({ error: "Invalid password" }, { status: 401 });
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.delete("ooda-auth");
  return res;
}
