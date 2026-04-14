import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  return NextResponse.next();
}

export default proxy;

// Gunakan wildcard sederhana, hindari Regex lookahead yang sering bug di Next.js
export const config = {
  matcher: ["/:path*"],
};