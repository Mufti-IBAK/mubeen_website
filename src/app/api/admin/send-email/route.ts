import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, reply_to } = await req.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const EMAIL_FROM = process.env.EMAIL_FROM || "Mubeen Academy <noreply@example.com>";
    if (!RESEND_API_KEY) {
      console.warn("RESEND_API_KEY not set; skipping admin email");
      return NextResponse.json({ ok: true, skipped: true });
    }
    const resend = new Resend(RESEND_API_KEY);
    const payload: Record<string, any> = { from: EMAIL_FROM, to, subject, html };
    if (reply_to) payload.reply_to = reply_to;
    await resend.emails.send(payload as any);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin/send-email error", err);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

