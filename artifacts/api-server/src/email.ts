import nodemailer from "nodemailer";

interface SendPasswordResetParams {
  to: string;
  name?: string | null;
  code: string;
}

export async function sendPasswordResetEmail({
  to,
  name,
  code,
}: SendPasswordResetParams): Promise<{ sent: boolean; provider: string; error?: string }> {
  const recipientName = name?.trim() || "Fellowship Member";
  const subject = "LOGOS Library - Your Password Recovery Code";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #0c0c0c; border: 1px solid #27272a; border-radius: 16px; padding: 36px 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.8);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">LOGOS Library</h1>
      <p style="margin: 6px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa;">Hawassa University Fellowship</p>
    </div>
    
    <p style="margin: 0 0 16px; font-size: 15px; color: #e4e4e7; line-height: 1.6;">
      Hello <strong>${recipientName}</strong>,
    </p>
    
    <p style="margin: 0 0 20px; font-size: 14px; color: #a1a1aa; line-height: 1.6;">
      We received a request to recover access to your LOGOS Library account registered under <strong>${to}</strong>. Use the 6-digit verification code below to set a new password:
    </p>
    
    <div style="text-align: center; margin: 28px 0; padding: 20px 16px; background-color: #000000; border: 1px solid #3f3f46; border-radius: 12px;">
      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #ffffff; display: inline-block;">${code}</span>
    </div>
    
    <p style="margin: 0 0 12px; font-size: 13px; color: #a1a1aa; line-height: 1.5;">
      ⏱️ This code expires in <strong>15 minutes</strong>.
    </p>
    
    <p style="margin: 0; font-size: 12px; color: #71717a; line-height: 1.6; border-top: 1px solid #27272a; padding-top: 20px;">
      If you did not request this recovery code, someone may have entered your email by mistake. Your account remains secure and no action is required.
    </p>
  </div>
</body>
</html>`;

  const text = `LOGOS Library - Password Recovery Code

Hello ${recipientName},

We received a request to recover your LOGOS Library account (${to}).
Your 6-digit verification code is:

${code}

This code will expire in 15 minutes.
If you did not request this, please ignore this email.`;

  // 1. Try Gmail (Google Mail) directly if GMAIL_USER and GMAIL_APP_PASSWORD are provided
  const gmailUser = process.env.GMAIL_USER || (process.env.SMTP_USER?.includes("@gmail.com") ? process.env.SMTP_USER : undefined);
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ""), // clean any spaces from 16-character app password
        },
      });

      const fromAddress = `LOGOS Library <${gmailUser}>`;
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text,
      });

      console.log(`[AUTH-EMAIL] Verification code successfully delivered via Google Mail to ${to}`);
      return { sent: true, provider: "gmail" };
    } catch (err: any) {
      console.warn("[AUTH-EMAIL] Google Mail (Gmail SMTP) error:", err?.message);
    }
  }

  // 2. Try Resend if RESEND_API_KEY is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const fromEmail = process.env.RESEND_FROM_EMAIL || "LOGOS Library <onboarding@resend.dev>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (res.ok) {
        console.log(`[AUTH-EMAIL] Password recovery code dispatched via Resend to ${to}`);
        return { sent: true, provider: "resend" };
      }
      const data = await res.json().catch(() => ({}));
      console.warn(`[AUTH-EMAIL] Resend returned status ${res.status}:`, data);
    } catch (err: any) {
      console.warn("[AUTH-EMAIL] Resend fetch error:", err?.message);
    }
  }

  // 3. Try standard custom SMTP (host/port)
  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || (process.env.SMTP_SECURE === "true" ? 465 : 587)),
        secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
        auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        } : undefined,
      });

      const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "LOGOS Library <noreply@logoslibrary.org>";
      await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        text,
      });

      console.log(`[AUTH-EMAIL] Password recovery code dispatched via SMTP to ${to}`);
      return { sent: true, provider: "smtp" };
    } catch (err: any) {
      console.warn("[AUTH-EMAIL] Custom SMTP error:", err?.message);
      return { sent: false, provider: "smtp", error: err?.message };
    }
  }

  // Fallback log
  console.log(`[AUTH-EMAIL] Recovery code ${code} prepared for registered user ${to}`);
  return { sent: false, provider: "none", error: "No email service configured" };
}
