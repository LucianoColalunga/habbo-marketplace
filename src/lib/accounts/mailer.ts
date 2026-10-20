import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";

/**
 * Envío de correos (verificar el email y recuperar la cuenta) por SMTP. Sirve
 * con cualquier servicio: una cuenta de Gmail del sitio con "contraseña de
 * aplicación" (smtp.gmail.com, 465), Brevo (smtp-relay.brevo.com, 587), etc.
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS y MAIL_FROM ("Stats <cuenta@gmail.com>").
 * Para probar en la PC (ACCOUNTS_DEV_STORE=1, fuera de Vercel) los correos se
 * guardan en .data/mail-outbox.json en vez de enviarse.
 */

type Env = Record<string, string | undefined>;

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

function smtpConfig(env: Env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) return null;
  const port = Number(SMTP_PORT) || 465;
  return { host: SMTP_HOST, port, user: SMTP_USER, pass: SMTP_PASS, from: MAIL_FROM };
}

function devOutbox(env: Env): boolean {
  return env.ACCOUNTS_DEV_STORE === "1" && !env.VERCEL;
}

export function mailEnabled(env: Env = process.env): boolean {
  return mailMode(env) !== "off";
}

/** Cómo salen los correos: por SMTP, al archivo de prueba o no salen. */
export function mailMode(env: Env = process.env): "smtp" | "outbox" | "off" {
  return smtpConfig(env) ? "smtp" : devOutbox(env) ? "outbox" : "off";
}

export async function sendMail(mail: Mail, env: Env = process.env): Promise<void> {
  const smtp = smtpConfig(env);
  if (smtp) {
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      // 465 = TLS directo; 587 = STARTTLS obligatorio. Nunca sin cifrar.
      secure: smtp.port === 465,
      requireTLS: smtp.port !== 465,
      auth: { user: smtp.user, pass: smtp.pass },
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
    });
    await transport.sendMail({ from: smtp.from, to: mail.to, subject: mail.subject, text: mail.text, html: mail.html });
    return;
  }
  if (devOutbox(env)) {
    const file = path.join(env.DATA_DIR || ".data", "mail-outbox.json");
    let list: (Mail & { at: number })[] = [];
    try {
      list = JSON.parse(await readFile(file, "utf8")) as (Mail & { at: number })[];
    } catch {
      // primera vez
    }
    list.push({ ...mail, at: Date.now() });
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(list.slice(-50), null, 1));
    return;
  }
  throw new Error("mail_disabled");
}
