import "server-only";
import { cookies } from "next/headers";
import { EncryptJWT, jwtDecrypt } from "jose";
import { createHash } from "node:crypto";
const settings = () => {
  const secret = process.env.ACCOUNT_SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error(
      "Configure ACCOUNT_SESSION_SECRET before enabling accounts.",
    );
  return {
    key: createHash("sha256").update(secret).digest(),
    secure: process.env.SITE_URL?.startsWith("https://") || false,
  };
};
export async function setPrivate(
  name: string,
  data: Record<string, unknown>,
  seconds = 604800,
) {
  const s = settings();
  const value = await new EncryptJWT(data)
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuer("ceylon-commerce")
    .setAudience(name)
    .setIssuedAt()
    .setExpirationTime(`${seconds}s`)
    .encrypt(s.key);
  if (value.length > 3800) throw new Error("Session exceeds safe size.");
  (await cookies()).set(`ceylon_${name}`, value, {
    httpOnly: true,
    secure: s.secure,
    sameSite: "lax",
    path: "/",
    maxAge: seconds,
  });
}
export async function getPrivate(
  name: string,
): Promise<Record<string, any> | null> {
  try {
    const value = (await cookies()).get(`ceylon_${name}`)?.value;
    if (!value) return null;
    const { payload } = await jwtDecrypt(value, settings().key, {
      issuer: "ceylon-commerce",
      audience: name,
    });
    return payload;
  } catch {
    return null;
  }
}
export async function clearPrivate(name: string) {
  (await cookies()).set(`ceylon_${name}`, "", {
    httpOnly: true,
    secure: settings().secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export async function customerToken() {
  return (await getPrivate("customer"))?.token as string | undefined;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin !== new URL(process.env.SITE_URL || request.url).origin)
    throw new Error("Please submit this request from the Ceylon website.");
}
