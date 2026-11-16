import { createClient } from "@supabase/supabase-js";
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_BIRTHDAY_WISHES,
  DEFAULT_MEMORY_QUESTS,
  DEFAULT_PHOTO_VAULT
} from "./defaultData";

// ============================================================================
// KONFIGURASI OTOMATIS DATABASE CLOUD SUPABASE (APIW-BIRTHDAY)
// Otomatis menggunakan URL & Anon Public Key project "rhhrofilapqdyltzmbwq"
// dan kebal terhadap kesalahan ketik di Environment Variables Vercel!
// ============================================================================

const BUILTIN_SUPABASE_URL = "https://rhhrofllapqdyltzmbwq.supabase.co";
const BUILTIN_SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoaHJvZmxsYXBxZHlsdHptYndxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4MTA0MTgsImV4cCI6MjExMDM4NjQxOH0.oZP30aSQAuruekEoyZficg73mEYIwCm5fvfQSSJTI9U";

const rawEnvUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
const rawEnvKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

// Gunakan env var hanya jika formatnya valid (https://...supabase.co dan eyJ...),
// jika tidak valid/kosong, otomatis pakai koneksi bawaan apiw-birthday!
const supabaseUrl =
  rawEnvUrl.startsWith("https://") &&
  rawEnvUrl.includes(".supabase.co") &&
  !rawEnvUrl.includes("your-project-id")
    ? rawEnvUrl
    : BUILTIN_SUPABASE_URL;

const supabaseAnonKey =
  rawEnvKey.startsWith("eyJ") && !rawEnvKey.includes("your-supabase")
    ? rawEnvKey
    : BUILTIN_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    })
  : null;

// Penyimpanan fallback di memori server jika sewaktu-waktu offline
if (!globalThis.__APIW_ARCADE_STORE__) {
  globalThis.__APIW_ARCADE_STORE__ = {
    appConfig: { ...DEFAULT_APP_CONFIG },
    memoryQuests: [...DEFAULT_MEMORY_QUESTS],
    photoVault: [...DEFAULT_PHOTO_VAULT],
    birthdayWishes: [...DEFAULT_BIRTHDAY_WISHES]
  };
}

export const memoryStore = globalThis.__APIW_ARCADE_STORE__;

// Format Waktu Baku WIB (Asia/Jakarta): dd/MM/yyyy HH:mm:ss
export function getJakartaTimestamp() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  return formatter.format(now).replace(/\./g, ":");
}

// Generator Kode Unik Sekuensial Anti-Tabrakan (MAX + 1)
export function generateSequentialId(prefix, existingIds = []) {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const periodPrefix = `${prefix}-${yyyy}${mm}${dd}-`;

  let maxNum = 0;
  for (const rawId of existingIds) {
    if (typeof rawId === "string" && rawId.startsWith(prefix + "-")) {
      const parts = rawId.split("-");
      const lastPart = parseInt(parts[parts.length - 1], 10);
      if (!Number.isNaN(lastPart) && lastPart > maxNum) {
        maxNum = lastPart;
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, "0");
  return `${periodPrefix}${nextNum}`;
}
