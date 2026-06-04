/**
 * Intentionally vulnerable SQL login sandbox.
 * NEVER connect this to Supabase — isolated in-memory simulation only.
 */

export const WARUNG_LOGIN_FLAG = "NusaCTF{sql_injection_warung_basic_0192}";

interface WarungUser {
  id: number;
  username: string;
  password: string;
  role: string;
}

const USERS: WarungUser[] = [
  { id: 1, username: "admin", password: "warung_super_secret!", role: "admin" },
  { id: 2, username: "kasir", password: "kasir123", role: "staff" },
];

export interface WarungLoginInput {
  username: string;
  password: string;
}

export interface WarungLoginResult {
  success: boolean;
  message: string;
  flag?: string;
  debugQuery?: string;
}

/**
 * Simulates naive string-concatenation SQL:
 * SELECT * FROM users WHERE username = '$username' AND password = '$password'
 */
export function attemptWarungLogin(input: WarungLoginInput): WarungLoginResult {
  const username = input.username ?? "";
  const password = input.password ?? "";

  const debugQuery = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  const bypassPattern = /'\s*OR\s*'1'\s*=\s*'1/i;
  const isBypass =
    bypassPattern.test(username) ||
    bypassPattern.test(password) ||
    (username.includes("'") && username.toLowerCase().includes("or"));

  if (isBypass) {
    return {
      success: true,
      message: "Login berhasil! Admin panel terbuka.",
      flag: WARUNG_LOGIN_FLAG,
      debugQuery,
    };
  }

  const matchedUser = USERS.find(
    (user) => user.username === username && user.password === password
  );

  if (matchedUser?.role === "admin") {
    return {
      success: true,
      message: "Selamat datang, admin warung!",
      flag: WARUNG_LOGIN_FLAG,
      debugQuery,
    };
  }

  return {
    success: false,
    message: "Username atau password salah.",
    debugQuery,
  };
}
