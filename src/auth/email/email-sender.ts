import type { PasswordResetEmail } from "../password/password-reset-service";

export interface EmailSender {
  sendPasswordReset(email: PasswordResetEmail): Promise<void>;
}

export class ConsoleEmailSender implements EmailSender {
  async sendPasswordReset({ to, resetUrl }: PasswordResetEmail): Promise<void> {
    console.info(`[DEV EMAIL] Password reset\n  to: ${to}\n  url: ${resetUrl}`);
  }
}

export class SmtpEmailSender implements EmailSender {
  private readonly from: string;
  private readonly appName: string;

  constructor(opts: { from: string; appName?: string }) {
    this.from = opts.from;
    this.appName = opts.appName ?? "Irtaki";
  }

  private async getTransport() {
    const nodemailer = await import("nodemailer");
    return nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  async sendPasswordReset({ to, resetUrl }: PasswordResetEmail): Promise<void> {
    const transport = await this.getTransport();
    await transport.sendMail({
      from: `"${this.appName}" <${this.from}>`,
      to,
      subject: `Réinitialisation de votre mot de passe ${this.appName}`,
      html: `
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p><a href="${resetUrl}">Cliquez ici pour choisir un nouveau mot de passe</a></p>
        <p>Ce lien est valable 1 heure.</p>
      `,
      text: `Réinitialisez votre mot de passe : ${resetUrl} (valable 1 heure)`,
    });
  }
}

export function createEmailSender(): EmailSender {
  if (process.env.SMTP_HOST) {
    return new SmtpEmailSender({
      from: process.env.SMTP_FROM ?? "no-reply@irtaki.local",
    });
  }
  return new ConsoleEmailSender();
}
