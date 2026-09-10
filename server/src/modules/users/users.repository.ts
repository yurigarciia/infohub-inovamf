import { maybeOne, query } from "../../shared/sql.js";
import type { MeResponse, StaffRole, User } from "./users.types.js";

interface UserDbRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: User["role"];
  is_active: boolean;
  lgpd_consented_at: string | null;
  created_at: string;
  updated_at: string;
}

function toUser(r: UserDbRow): User {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    role: r.role,
    isActive: r.is_active,
    lgpdConsentedAt: r.lgpd_consented_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const USER_COLS = `id, name, email, phone, role, is_active, lgpd_consented_at, created_at, updated_at`;

export async function findMe(id: string): Promise<MeResponse | null> {
  const user = await maybeOne<UserDbRow>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  if (!user) return null;
  const profile =
    user.role === "STUDENT"
      ? await maybeOne<{ user_id: string; course: string; period: string }>(
          `SELECT user_id, course, period FROM student_profiles WHERE user_id = $1`,
          [id],
        )
      : null;
  return {
    ...toUser(user),
    studentProfile: profile
      ? { userId: profile.user_id, course: profile.course, period: profile.period }
      : null,
  };
}

export async function listMentors(): Promise<User[]> {
  const rows = await query<UserDbRow>(
    `SELECT ${USER_COLS} FROM users WHERE role = 'MENTOR' ORDER BY name`,
  );
  return rows.map(toUser);
}

export async function listStaff(): Promise<User[]> {
  const rows = await query<UserDbRow>(
    `SELECT ${USER_COLS} FROM users WHERE role IN ('ADMIN', 'MENTOR') ORDER BY role, name`,
  );
  return rows.map(toUser);
}

export async function findById(id: string): Promise<User | null> {
  const row = await maybeOne<UserDbRow>(`SELECT ${USER_COLS} FROM users WHERE id = $1`, [id]);
  return row ? toUser(row) : null;
}

export async function emailExists(email: string): Promise<boolean> {
  const row = await maybeOne<{ x: number }>(
    `SELECT 1 AS x FROM users WHERE lower(email) = lower($1)`,
    [email],
  );
  return row !== null;
}

export async function insertStaff(input: {
  name: string;
  email: string;
  phone: string | null;
  role: StaffRole;
  passwordHash: string;
}): Promise<User> {
  const rows = await query<UserDbRow>(
    `INSERT INTO users (name, email, phone, role, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${USER_COLS}`,
    [input.name, input.email, input.phone, input.role, input.passwordHash],
  );
  return toUser(rows[0]!);
}

export async function updateStaff(
  id: string,
  patch: { name?: string; phone?: string | null; role?: StaffRole },
): Promise<User | null> {
  const rows = await query<UserDbRow>(
    `UPDATE users SET
        name  = COALESCE($2, name),
        phone = CASE WHEN $3::text IS NOT NULL THEN NULLIF($3, '') ELSE phone END,
        role  = COALESCE($4, role),
        updated_at = now()
      WHERE id = $1 AND role IN ('ADMIN', 'MENTOR')
      RETURNING ${USER_COLS}`,
    [id, patch.name ?? null, patch.phone ?? null, patch.role ?? null],
  );
  return rows[0] ? toUser(rows[0]) : null;
}

export async function setActive(id: string, isActive: boolean): Promise<User | null> {
  const rows = await query<UserDbRow>(
    `UPDATE users SET is_active = $2, updated_at = now()
      WHERE id = $1 AND role IN ('ADMIN', 'MENTOR')
      RETURNING ${USER_COLS}`,
    [id, isActive],
  );
  return rows[0] ? toUser(rows[0]) : null;
}
