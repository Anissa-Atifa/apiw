-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA (SAFE MIGRATION & NON-DESTRUCTIVE)
-- Projek: APIW.EXE // Happy Birthday 25 Babee ! <3 (17 November)
-- Catatan: Nama tabel menggunakan PascalCase murni tanpa karakter underscore (_)
-- Cara Pakai: Copy-Paste seluruh isi file ini ke menu "SQL Editor" di Supabase lalu klik RUN
-- ============================================================================

-- 1. Tabel Konfigurasi Utama (Dashboard, Hadiah Menang Game, Barcode Spotify & Undangan Date Kamis)
CREATE TABLE IF NOT EXISTS "AppConfig" (
  "id" VARCHAR(30) PRIMARY KEY,
  "dashboardTitle" VARCHAR(150) NOT NULL,
  "dashboardWish" TEXT NOT NULL,
  "winMessage" TEXT NOT NULL,
  "winPhotosJson" TEXT NOT NULL,
  "spotifyBarcodeUrl" TEXT NOT NULL,
  "dateDay" VARCHAR(80) NOT NULL,
  "dateLocation" VARCHAR(120) NOT NULL,
  "dateTimePlan" VARCHAR(120) NOT NULL,
  "dateNote" TEXT NOT NULL,
  "updatedAt" VARCHAR(30) NOT NULL
);

-- 2. Tabel Cerita Perjalanan Cinta (Stage 1: Memory Timeline)
CREATE TABLE IF NOT EXISTS "MemoryQuests" (
  "id" VARCHAR(30) PRIMARY KEY,
  "questCode" VARCHAR(30) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "eventDate" VARCHAR(50) NOT NULL,
  "story" TEXT NOT NULL,
  "badgeText" VARCHAR(50) NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 1
);

-- 3. Tabel Galeri Foto Kenangan & Waktu (Stage 2: Photo Vault)
CREATE TABLE IF NOT EXISTS "PhotoVault" (
  "id" VARCHAR(30) PRIMARY KEY,
  "title" VARCHAR(100) NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "caption" TEXT NOT NULL,
  "dateTaken" VARCHAR(50) NOT NULL,
  "createdAt" VARCHAR(30) NOT NULL
);

-- 4. Tabel Buku Tamu, Balasan Apiw & Konfirmasi Date Kamis (Stage 4: Interactive Wishes & RSVP)
CREATE TABLE IF NOT EXISTS "BirthdayWishes" (
  "id" VARCHAR(30) PRIMARY KEY,
  "senderName" VARCHAR(80) NOT NULL,
  "dateStatus" VARCHAR(60) NOT NULL,
  "preferredSpot" VARCHAR(120) NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" VARCHAR(30) NOT NULL
);

-- Buka akses baca/tulis untuk aplikasi web (Row Level Security Policy)
ALTER TABLE "AppConfig" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MemoryQuests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PhotoVault" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BirthdayWishes" ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'AppConfig' AND policyname = 'Public Access AppConfig') THEN
    CREATE POLICY "Public Access AppConfig" ON "AppConfig" FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'MemoryQuests' AND policyname = 'Public Access MemoryQuests') THEN
    CREATE POLICY "Public Access MemoryQuests" ON "MemoryQuests" FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'PhotoVault' AND policyname = 'Public Access PhotoVault') THEN
    CREATE POLICY "Public Access PhotoVault" ON "PhotoVault" FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'BirthdayWishes' AND policyname = 'Public Access BirthdayWishes') THEN
    CREATE POLICY "Public Access BirthdayWishes" ON "BirthdayWishes" FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
