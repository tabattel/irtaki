import { NextResponse } from "next/server";
import { z } from "zod";
import { createEmailSender } from "@/auth/email/email-sender";
import { PasswordResetService } from "@/auth/password/password-reset-service";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = z
    .object({ token: z.string().min(1), password: z.string().min(8) })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  }

  const service = new PasswordResetService(createEmailSender());

  try {
    await service.resetPassword(parsed.data);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    const code = (error as Error).message;
    const status =
      code === "EXPIRED_RESET_TOKEN" || code === "INVALID_RESET_TOKEN" ? 410 : 400;
    return NextResponse.json({ error: code }, { status });
  }
}
