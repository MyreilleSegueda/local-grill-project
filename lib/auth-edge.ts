/**
 * lib/auth-edge.ts
 * Vérification JWT compatible Edge Runtime (middleware Next.js).
 * N'importe pas Node.js crypto — utilise jose (Web Crypto).
 *
 * Installer : npm install jose
 */
import { jwtVerify } from "jose";

export interface JwtPayload {
  id:          number;
  email:       string;
  role:        string;        // rôle principal
  roles:       string[];      // tous les rôles
  permissions: string[];      // toutes les permissions
  iat?:        number;
  exp?:        number;
}

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "change-me"
);

export async function verifyJwtEdge(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}