import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Ambil secret key dari env, dengan fallback sementara untuk mode development
const secretKey = process.env.SESSION_SECRET || "super-secret-key-yang-sangat-panjang-dan-aman";
const encodedKey = new TextEncoder().encode(secretKey);

export async function encrypt(payload: any) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Sesi berlaku selama 7 hari
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = "") {
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch (error) {
    return null; // Token tidak valid atau kedaluwarsa
  }
}

export async function createSession(user: { id: string; username: string; nama_lengkap: string }) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ user, expiresAt });
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true, // Tidak bisa diakses oleh client-side JavaScript (XSS Protection)
    secure: process.env.NODE_ENV === "production", // Hanya kirim via HTTPS di production
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}