export type JwtPayload = {
  sub?: string;
  user_id?: number | string;
  username?: string;
  email?: string;
  roles?: string[];
  permisos?: string[];
  exp?: number;
  iat?: number;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export function normalizeRolesFromToken(roles?: string[] | null): string[] {
  if (!Array.isArray(roles)) return [];
  return roles.map((role) => String(role ?? "").trim().toLowerCase()).filter(Boolean);
}
