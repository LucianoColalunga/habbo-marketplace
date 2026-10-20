import type { Lang } from "@/lib/i18n/config";
import type { Mail } from "./mailer";

/** Correos de la cuenta, en el idioma de la persona. Todo lo variable se escapa. */

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const T = {
  es: {
    verifySubject: "Confirmá tu email en Bomhams Market",
    verifyIntro: (name: string) => `Hola ${name}: confirmá que este email es tuyo. Así vas a poder recuperar tu cuenta si te olvidás la contraseña.`,
    verifyButton: "Confirmar mi email",
    verifyExpires: "El enlace vence en 24 horas.",
    resetSubject: "Recuperar tu cuenta de Bomhams Market",
    resetIntro: "Pediste recuperar tu cuenta. Estas son las cuentas con este email:",
    resetUser: (name: string) => `Usuario: ${name}`,
    resetButton: "Elegir una contraseña nueva",
    resetExpires: "Cada enlace vence en 1 hora y sirve una sola vez.",
    notYou: "Si no fuiste vos, ignorá este correo: no cambia nada.",
    footer: "Bomhams Market · sitio de fans no oficial de Habbo. Nunca te vamos a pedir tu contraseña por correo.",
  },
  pt: {
    verifySubject: "Confirme seu e-mail no Bomhams Market",
    verifyIntro: (name: string) => `Olá ${name}: confirme que este e-mail é seu. Assim você poderá recuperar sua conta se esquecer a senha.`,
    verifyButton: "Confirmar meu e-mail",
    verifyExpires: "O link vence em 24 horas.",
    resetSubject: "Recuperar sua conta do Bomhams Market",
    resetIntro: "Você pediu para recuperar sua conta. Estas são as contas com este e-mail:",
    resetUser: (name: string) => `Usuário: ${name}`,
    resetButton: "Escolher uma nova senha",
    resetExpires: "Cada link vence em 1 hora e só pode ser usado uma vez.",
    notYou: "Se não foi você, ignore este e-mail: nada muda.",
    footer: "Bomhams Market · site de fãs não oficial do Habbo. Nunca vamos pedir sua senha por e-mail.",
  },
  en: {
    verifySubject: "Confirm your email on Bomhams Market",
    verifyIntro: (name: string) => `Hi ${name}: confirm this email is yours, so you can recover your account if you forget your password.`,
    verifyButton: "Confirm my email",
    verifyExpires: "The link expires in 24 hours.",
    resetSubject: "Recover your Bomhams Market account",
    resetIntro: "You asked to recover your account. These are the accounts with this email:",
    resetUser: (name: string) => `Username: ${name}`,
    resetButton: "Choose a new password",
    resetExpires: "Each link expires in 1 hour and works only once.",
    notYou: "If this wasn't you, ignore this email: nothing changes.",
    footer: "Bomhams Market · unofficial Habbo fan site. We will never ask for your password by email.",
  },
} satisfies Record<Lang, unknown>;

function layout(body: string, footer: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f7;font-family:Arial,Helvetica,sans-serif;color:#1c2030">
<div style="max-width:520px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:12px;padding:24px">
<p style="margin:0 0 16px;font-size:20px;font-weight:bold">Bomhams <span style="color:#6d4fd8">Market</span></p>
${body}
</div>
<p style="font-size:12px;color:#6b7080;margin:16px 4px 0">${esc(footer)}</p>
</div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#6d4fd8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">${esc(label)}</a></p>`;
}

export function verifyEmail(lang: Lang, to: string, name: string, link: string): Mail {
  const t = T[lang];
  return {
    to,
    subject: t.verifySubject,
    text: `${t.verifyIntro(name)}\n\n${t.verifyButton}: ${link}\n\n${t.verifyExpires}\n${t.notYou}\n\n${t.footer}`,
    html: layout(
      `<p>${esc(t.verifyIntro(name))}</p>${button(link, t.verifyButton)}<p style="font-size:13px;color:#6b7080">${esc(t.verifyExpires)} ${esc(t.notYou)}</p>`,
      t.footer,
    ),
  };
}

export function resetEmail(lang: Lang, to: string, accounts: { name: string; link: string }[]): Mail {
  const t = T[lang];
  return {
    to,
    subject: t.resetSubject,
    text: `${t.resetIntro}\n\n${accounts.map((a) => `${t.resetUser(a.name)}\n${t.resetButton}: ${a.link}`).join("\n\n")}\n\n${t.resetExpires}\n${t.notYou}\n\n${t.footer}`,
    html: layout(
      `<p>${esc(t.resetIntro)}</p>${accounts
        .map((a) => `<p style="margin:16px 0 0;font-weight:bold">${esc(t.resetUser(a.name))}</p>${button(a.link, t.resetButton)}`)
        .join("")}<p style="font-size:13px;color:#6b7080">${esc(t.resetExpires)} ${esc(t.notYou)}</p>`,
      t.footer,
    ),
  };
}
