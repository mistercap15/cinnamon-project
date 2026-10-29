import { appendFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
export function localDemo() {
  return (
    process.env.DEMO_MODE === "true" &&
    ["localhost", "127.0.0.1"].includes(
      new URL(process.env.FRONTEND_URL || "https://invalid.example").hostname,
    )
  );
}
const file = () => path.resolve(process.cwd(), "../.demo/inbox.jsonl");
export async function sendMail(to: string, subject: string, text: string) {
  if (localDemo()) {
    mkdirSync(path.dirname(file()), { recursive: true });
    appendFileSync(
      file(),
      JSON.stringify({
        id: randomUUID(),
        to,
        subject,
        text,
        createdAt: new Date().toISOString(),
      }) + "\n",
      { mode: 0o600 },
    );
    return;
  }
  if (!process.env.SMTP_URL || !process.env.MAIL_FROM)
    throw new Error(
      "Configure SMTP_URL and MAIL_FROM before sending customer email.",
    );
  const nodemailer = await import("nodemailer");
  await nodemailer
    .createTransport(process.env.SMTP_URL)
    .sendMail({ from: process.env.MAIL_FROM, to, subject, text });
}
export function demoInbox() {
  return existsSync(file())
    ? readFileSync(file(), "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line))
        .reverse()
        .slice(0, 100)
    : [];
}
