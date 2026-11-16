"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_BIRTHDAY_WISHES,
  DEFAULT_MEMORY_QUESTS,
  DEFAULT_PHOTO_VAULT
} from "@/lib/defaultData";
import {
  IconCameraVault,
  IconDateTicket,
  IconGamepad,
  IconLockPin,
  IconPixelHeart,
  IconQuestScroll,
  IconSpotifyWave
} from "@/components/ArcadeIcons";
import HeartCatcherGame from "@/components/HeartCatcherGame";

// ============================================================================
// CLIENT-SIDE IN-MEMORY CACHE (Perpindahan Halaman Instan 0 Detik)
// ============================================================================
const clientCache = {
  loaded: false,
  appConfig: null,
  memoryQuests: null,
  photoVault: null,
  birthdayWishes: null,
  totalWishes: 0
};

// Kompres gambar dari galeri HP/Laptop agar ringan disimpan ke Database Supabase
function compressImageFile(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = ev.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Rekomendasi pilihan jam & rute main di Blok M untuk Hari Kamis (bisa dipilih Apiw)
const BLOK_M_TIME_OPTIONS = [
  "Kamis Sore (Habis Kerja ~17.00 WIB)",
  "Kamis Siang / Sore Santai (~15.00 WIB)",
  "Kamis Malam Dinner & Jalan (~19.00 WIB)",
  "Bebas Jam Berapa Aja Asal Bareng Kamu <3"
];

const BLOK_M_SPOT_OPTIONS = [
  "Kulineran Blok M (Ramen / Gultik / Claypot) + Photobox Bareng",
  "Jalan Sore di M Bloc Space + Jajan Kopi / Matcha & Dessert",
  "Nongkrong Santai di Taman Literasi Blok M + Hunting Foto Berdua",
  "Surprise Route: Terserah Sayangku, Aku Ikut Ke Mana Aja!"
];

export default function BirthdayArcadePage() {
  // Layar Pembuka Mesin Dingdong (Insert Coin / Level 25 Start)
  const [hasEnteredArcade, setHasEnteredArcade] = useState(false);

  // Navigasi Halaman Aktif: "dashboard" | "memories" | "photos" | "game" | "date"
  const [activeTab, setActiveTab] = useState("dashboard");

  // State Data Utama
  const [appConfig, setAppConfig] = useState(DEFAULT_APP_CONFIG);
  const [memoryQuests, setMemoryQuests] = useState(DEFAULT_MEMORY_QUESTS);
  const [photoVault, setPhotoVault] = useState(DEFAULT_PHOTO_VAULT);
  const [birthdayWishes, setBirthdayWishes] = useState(DEFAULT_BIRTHDAY_WISHES);
  const [totalWishes, setTotalWishes] = useState(DEFAULT_BIRTHDAY_WISHES.length);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // State Pencarian & Pagination Buku Tamu / Konfirmasi Date Kamis (Backend-Driven)
  const [searchWish, setSearchWish] = useState("");
  const [wishOffset, setWishOffset] = useState(0);
  const WISH_LIMIT = 10;

  // State Form Undangan Date Kamis & Balasan Apiw (Stage 4)
  const [senderName, setSenderName] = useState("Apiw (Birthday Boy <3)");
  const [selectedTimeOption, setSelectedTimeOption] = useState(BLOK_M_TIME_OPTIONS[0]);
  const [selectedSpotOption, setSelectedSpotOption] = useState(BLOK_M_SPOT_OPTIONS[0]);
  const [wishMessage, setWishMessage] = useState("");
  const [isSubmittingWish, setIsSubmittingWish] = useState(false);

  // State Mode Admin Rahasia Pasangan (PIN: 250325)
  const [adminPin, setAdminPin] = useState("");
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // State Modal Edit Cerita, Foto, dan Konfigurasi (Dashboard / Barcode Spotify / Date Kamis)
  const [questModalData, setQuestModalData] = useState(null);
  const [photoModalData, setPhotoModalData] = useState(null);
  const [configModalType, setConfigModalType] = useState(null); // "dashboard" | "prize" | "date"
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  // Notifikasi Toast Cyberpunk Kustom (Anti-Alert Browser)
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = (message, type = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 4000);
  };

  // Fetch data dari Backend API dengan In-Memory Cache
  const fetchAllArcadeData = async (forceRefresh = false) => {
    if (clientCache.loaded && !forceRefresh) {
      setAppConfig(clientCache.appConfig);
      setMemoryQuests(clientCache.memoryQuests);
      setPhotoVault(clientCache.photoVault);
      setBirthdayWishes(clientCache.birthdayWishes);
      setTotalWishes(clientCache.totalWishes);
      return;
    }

    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/arcade?section=all&limit=${WISH_LIMIT}&offset=0`, {
        cache: "no-store"
      });
      const json = await res.json();
      if (json.ok) {
        const cfg = json.appConfig || DEFAULT_APP_CONFIG;
        const quests = json.memoryQuests || DEFAULT_MEMORY_QUESTS;
        const photos = json.photoVault || DEFAULT_PHOTO_VAULT;
        const wishes = json.birthdayWishes || DEFAULT_BIRTHDAY_WISHES;
        const total = json.totalWishes ?? wishes.length;

        clientCache.loaded = true;
        clientCache.appConfig = cfg;
        clientCache.memoryQuests = quests;
        clientCache.photoVault = photos;
        clientCache.birthdayWishes = wishes;
        clientCache.totalWishes = total;

        setAppConfig(cfg);
        setMemoryQuests(quests);
        setPhotoVault(photos);
        setBirthdayWishes(wishes);
        setTotalWishes(total);
      }
    } catch {
      // Gunakan default jika offline
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAllArcadeData(false);
  }, []);

  // Pencarian & Pagination Pesan di Backend
  const fetchFilteredWishes = async (queryText, newOffset = 0) => {
    try {
      const params = new URLSearchParams({
        section: "wishes",
        search: queryText,
        limit: String(WISH_LIMIT),
        offset: String(newOffset)
      });
      const res = await fetch(`/api/arcade?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.ok) {
        setBirthdayWishes(json.wishes || []);
        setTotalWishes(json.totalWishes ?? 0);
        setWishOffset(newOffset);
      }
    } catch {
      showToast("Gagal memuat pencarian pesan.", "error");
    }
  };

  // Verifikasi PIN 250325
  const handleVerifyPinSubmit = async (e) => {
    e.preventDefault();
    const cleanPin = String(pinInput || "").trim();
    if (!cleanPin) return;

    setIsVerifyingPin(true);
    try {
      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verifyPin", pin: cleanPin })
      });
      const json = await res.json();
      if (json.ok) {
        setAdminPin(cleanPin);
        setIsAdminUnlocked(true);
        setShowPinModal(false);
        showToast("PIN 250325 Aktif! Sekarang kamu bisa tambah/edit cerita, foto & barcode Spotify.");
      } else {
        showToast(json.error || "PIN tidak sesuai.", "error");
      }
    } catch {
      showToast("Gagal memverifikasi PIN.", "error");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Kirim Konfirmasi Date Kamis Blok M & Balasan Apiw (Stage 4) + Optimistic UI
  const handleAddWishSubmit = async (e) => {
    e.preventDefault();
    const cleanSender = String(senderName || "").trim();
    const cleanMsg = String(wishMessage || "").trim();
    const cleanDateStatus = String(selectedTimeOption || "").trim();
    const cleanSpot = String(selectedSpotOption || "").trim();

    if (!cleanSender || !cleanMsg) {
      showToast("Isi nama dan pesan balasanmu dulu ya Babee!", "error");
      return;
    }

    setIsSubmittingWish(true);
    try {
      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "addWish",
          senderName: cleanSender,
          dateStatus: cleanDateStatus,
          preferredSpot: cleanSpot,
          message: cleanMsg
        })
      });
      const json = await res.json();
      if (json.ok && json.item) {
        const updatedList = [json.item, ...birthdayWishes];
        setBirthdayWishes(updatedList);
        setTotalWishes((prev) => prev + 1);
        clientCache.birthdayWishes = updatedList;
        clientCache.totalWishes = (clientCache.totalWishes || 0) + 1;
        setWishMessage("");
        showToast("Yeay! Konfirmasi Date Kamis di Blok M & pesanmu sudah tersimpan!");
      } else {
        showToast(json.error || "Gagal menyimpan pesan.", "error");
      }
    } catch {
      showToast("Koneksi terputus saat menyimpan pesan.", "error");
    } finally {
      setIsSubmittingWish(false);
    }
  };

  // Simpan Cerita Perjalanan Cinta (Stage 1) via PIN 250325
  const handleSaveQuestSubmit = async (e) => {
    e.preventDefault();
    if (!questModalData) return;

    setIsSavingAdmin(true);
    try {
      const payload = {
        action: "saveQuest",
        pin: adminPin,
        id: questModalData.id || "",
        questCode: String(questModalData.questCode || "OUR CHAPTER"),
        title: String(questModalData.title || ""),
        eventDate: String(questModalData.eventDate || ""),
        story: String(questModalData.story || ""),
        badgeText: String(questModalData.badgeText || "+1000 LOVE XP"),
        sortOrder: Number(questModalData.sortOrder) || memoryQuests.length + 1
      };

      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok && json.item) {
        const exists = memoryQuests.some((q) => q.id === json.item.id);
        const nextQuests = exists
          ? memoryQuests.map((q) => (q.id === json.item.id ? json.item : q))
          : [...memoryQuests, json.item];
        nextQuests.sort((a, b) => a.sortOrder - b.sortOrder);

        setMemoryQuests(nextQuests);
        clientCache.memoryQuests = nextQuests;
        setQuestModalData(null);
        showToast("Cerita perjalanan cinta berhasil disimpan!");
      } else {
        showToast(json.error || "Gagal menyimpan cerita.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan saat menyimpan cerita.", "error");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteQuest = async (id) => {
    setIsSavingAdmin(true);
    try {
      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteQuest", pin: adminPin, id })
      });
      const json = await res.json();
      if (json.ok) {
        const nextQuests = memoryQuests.filter((q) => q.id !== id);
        setMemoryQuests(nextQuests);
        clientCache.memoryQuests = nextQuests;
        showToast("Cerita berhasil dihapus.");
      }
    } catch {
      showToast("Gagal menghapus cerita.", "error");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Simpan Foto Kenangan (Stage 2) via PIN 250325
  const handleSavePhotoSubmit = async (e) => {
    e.preventDefault();
    if (!photoModalData) return;

    setIsSavingAdmin(true);
    try {
      const payload = {
        action: "savePhoto",
        pin: adminPin,
        id: photoModalData.id || "",
        title: String(photoModalData.title || ""),
        imageUrl: String(photoModalData.imageUrl || ""),
        caption: String(photoModalData.caption || ""),
        dateTaken: String(photoModalData.dateTaken || "")
      };

      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok && json.item) {
        const exists = photoVault.some((p) => p.id === json.item.id);
        const nextPhotos = exists
          ? photoVault.map((p) => (p.id === json.item.id ? json.item : p))
          : [...photoVault, json.item];

        setPhotoVault(nextPhotos);
        clientCache.photoVault = nextPhotos;
        setPhotoModalData(null);
        showToast("Foto kenangan berhasil disimpan!");
      } else {
        showToast(json.error || "Gagal menyimpan foto.", "error");
      }
    } catch {
      showToast("Terjadi kesalahan saat menyimpan foto.", "error");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeletePhoto = async (id) => {
    setIsSavingAdmin(true);
    try {
      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deletePhoto", pin: adminPin, id })
      });
      const json = await res.json();
      if (json.ok) {
        const nextPhotos = photoVault.filter((p) => p.id !== id);
        setPhotoVault(nextPhotos);
        clientCache.photoVault = nextPhotos;
        showToast("Foto berhasil dihapus.");
      }
    } catch {
      showToast("Gagal menghapus foto.", "error");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Simpan Konfigurasi Dashboard / Hadiah Game + Barcode Spotify / Rencana Date Kamis
  const handleSaveConfigSubmit = async (e) => {
    e.preventDefault();
    if (!configModalType) return;

    setIsSavingAdmin(true);
    try {
      const res = await fetch("/api/arcade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveConfig",
          pin: adminPin,
          ...appConfig
        })
      });
      const json = await res.json();
      if (json.ok && json.item) {
        setAppConfig(json.item);
        clientCache.appConfig = json.item;
        setConfigModalType(null);
        showToast("Perubahan berhasil disimpan!");
      } else {
        showToast(json.error || "Gagal menyimpan pengaturan.", "error");
      }
    } catch {
      showToast("Gagal menghubungi server.", "error");
    } finally {
      setIsSavingAdmin(false);
    }
  };

  // Helper ubah foto hadiah di dalam modal edit hadiah game
  let parsedWinPhotos = [];
  try {
    parsedWinPhotos = JSON.parse(appConfig.winPhotosJson || "[]");
  } catch {
    parsedWinPhotos = [];
  }

  const handleAddWinPhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 850, 0.8);
      const nextList = [
        ...parsedWinPhotos,
        {
          title: "Our Special Memory <3",
          caption: "Happy 25th Birthday Apiw!",
          imageUrl: compressed
        }
      ];
      setAppConfig((prev) => ({
        ...prev,
        winPhotosJson: JSON.stringify(nextList)
      }));
      showToast("Foto hadiah ditambahkan! Jangan lupa klik Simpan.");
    } catch {
      showToast("Gagal memproses gambar.", "error");
    }
  };

  // ============================================================================
  // LAYAR PEMBUKA MESIN ARCADE (INSERT COIN / LEVEL 25 START)
  // ============================================================================
  if (!hasEnteredArcade) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-xl bg-panel/95 border-2 border-neonGreen rounded-3xl p-6 sm:p-10 text-center shadow-neonGreen relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neonGreen/10 border border-neonGreen/40 text-neonGreen font-terminal text-sm mb-5">
            <span>SYSTEM BOOT // 17 NOVEMBER SPECIAL EDITION</span>
          </div>

          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-hotPink/15 border-2 border-hotPink flex items-center justify-center shadow-hotPink">
              <IconPixelHeart className="w-9 h-9 text-hotPink animate-pulse" />
            </div>
          </div>

          <h1 className="font-pixel text-xl sm:text-2xl text-white leading-relaxed">
            HAPPY BIRTHDAY 25 BABEE ! &lt;3
          </h1>

          <p className="font-terminal text-xl text-cyberCyan mt-3">
            PLAYER 1: APIW • LEVEL 25 UNLOCKED • CO-OP SINCE 25.03.2025
          </p>

          <p className="text-sm text-zinc-300 mt-4 max-w-md mx-auto leading-relaxed">
            Selamat datang di mesin waktu &amp; arcade spesial ulang tahunmu yang ke-25! Tekan
            tombol di bawah untuk membuka ucapan, kenangan kita, mini-game berhadiah barcode
            Spotify, dan undangan ngedate hari Kamis di Blok M!
          </p>

          <div className="mt-8">
            <button
              type="button"
              onClick={() => setHasEnteredArcade(true)}
              className="arcade-btn w-full sm:w-auto px-8 py-4 rounded-2xl bg-neonGreen text-void font-pixel text-xs sm:text-sm shadow-neonGreen hover:bg-emerald-400"
            >
              ▶ PRESS START (MASUK DASHBOARD)
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-xs font-terminal text-zinc-400">
            <span>CREDIT: ∞ LOVE COINS</span>
            <span>BUILT WITH &lt;3 FOR APIW</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex flex-col pb-24 sm:pb-12">
      {/* Toast Notification Kustom */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-sm bg-panel border-2 border-neonGreen text-zinc-100 px-4 py-3 rounded-2xl shadow-neonGreen flex items-center gap-3">
          <IconPixelHeart
            className={`w-5 h-5 shrink-0 ${
              toast.type === "error" ? "text-rose-500" : "text-neonGreen"
            }`}
          />
          <span className="text-xs sm:text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Top Navbar (HUD Arcade Header + Tombol Gembok PIN 250325) */}
      <header className="sticky top-0 z-30 bg-void/90 backdrop-blur-md border-b border-zinc-800/90">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className="flex items-center gap-2.5 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-hotPink/20 border border-hotPink flex items-center justify-center">
              <IconPixelHeart className="w-5 h-5 text-hotPink group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <span className="font-pixel text-[11px] sm:text-xs text-neonGreen block">
                APIW.EXE // LVL 25
              </span>
              <span className="font-terminal text-xs text-zinc-400 block">
                17 NOV • HAPPY BIRTHDAY BABEE &lt;3
              </span>
            </div>
          </button>

          {/* Menu Navigasi Desktop */}
          <nav className="hidden md:flex items-center gap-1.5 bg-panel p-1.5 rounded-2xl border border-zinc-800">
            {[
              { id: "dashboard", label: "Dashboard" },
              { id: "memories", label: "1. Cerita Kita" },
              { id: "photos", label: "2. Foto Kenangan" },
              { id: "game", label: "3. Mini-Game" },
              { id: "date", label: "4. Kamis Ngedate!" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`arcade-btn px-3.5 py-2 rounded-xl text-xs font-terminal tracking-wide ${
                  activeTab === tab.id
                    ? "bg-hotPink text-white shadow-hotPink"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tombol Refresh & Mode Edit PIN 250325 */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAllArcadeData(true)}
              title="Sinkronkan ulang dari database"
              className="arcade-btn px-2.5 py-2 rounded-xl bg-panel border border-zinc-800 text-xs font-terminal text-zinc-300 hover:border-cyberCyan hover:text-cyberCyan"
            >
              {isLoadingData ? "SYNC..." : "REFRESH"}
            </button>

            <button
              type="button"
              onClick={() => {
                if (isAdminUnlocked) {
                  setIsAdminUnlocked(false);
                  showToast("Mode Edit PIN dikunci kembali.");
                } else {
                  setShowPinModal(true);
                }
              }}
              className={`arcade-btn inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-terminal border ${
                isAdminUnlocked
                  ? "bg-neonGreen/15 border-neonGreen text-neonGreen"
                  : "bg-panel border-zinc-700 text-zinc-300 hover:border-hotPink"
              }`}
            >
              <IconLockPin unlocked={isAdminUnlocked} className="w-3.5 h-3.5" />
              <span>{isAdminUnlocked ? "EDIT ON" : "PIN"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Konten Utama */}
      <main className="max-w-5xl w-full mx-auto px-4 pt-6 flex-1 space-y-6">
        {/* ===================================================================
            HALAMAN UTAMA: DASHBOARD ("Happy Birthday 25 Babee ! <3")
           =================================================================== */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* Hero Banner Ucapan Ulang Tahun */}
            <section className="bg-panel/95 border-2 border-hotPink/60 rounded-3xl p-6 sm:p-8 shadow-hotPink relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neonGreen/15 border border-neonGreen/40 text-neonGreen font-terminal text-sm">
                  <IconPixelHeart className="w-4 h-4 text-hotPink" />
                  SPECIAL BIRTHDAY DASHBOARD // 17 NOVEMBER
                </span>

                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={() => setConfigModalType("dashboard")}
                    className="arcade-btn px-3 py-1.5 rounded-xl bg-neonGreen/20 border border-neonGreen text-neonGreen text-xs font-terminal"
                  >
                    + Edit Ucapan Dashboard (PIN)
                  </button>
                )}
              </div>

              <h1 className="font-pixel text-xl sm:text-3xl text-white leading-snug">
                {appConfig.dashboardTitle}
              </h1>

              <p className="mt-4 text-sm sm:text-base text-zinc-200 leading-relaxed whitespace-pre-line bg-void/80 border border-zinc-800 rounded-2xl p-4 sm:p-5">
                {appConfig.dashboardWish}
              </p>

              {/* Grid 3 Kolom Status Karakter Apiw (Anti-Tumpuk Vertikal) */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mt-5">
                <div className="bg-void/90 border border-neonGreen/40 rounded-2xl p-3 sm:p-4">
                  <span className="font-terminal text-xs sm:text-sm text-zinc-400 block">
                    BIRTHDAY BOY
                  </span>
                  <span className="font-pixel text-xs sm:text-sm text-neonGreen tabular-nums mt-1 block">
                    APIW • LVL 25
                  </span>
                </div>

                <div className="bg-void/90 border border-hotPink/40 rounded-2xl p-3 sm:p-4">
                  <span className="font-terminal text-xs sm:text-sm text-zinc-400 block">
                    OUR ANNIVERSARY
                  </span>
                  <span className="font-pixel text-xs sm:text-sm text-hotPink tabular-nums mt-1 block">
                    25.03.2025
                  </span>
                </div>

                <div className="bg-void/90 border border-cyberCyan/40 rounded-2xl p-3 sm:p-4">
                  <span className="font-terminal text-xs sm:text-sm text-zinc-400 block">
                    THURSDAY PLAN
                  </span>
                  <span className="font-pixel text-xs sm:text-sm text-cyberCyan tabular-nums mt-1 block">
                    BLOK M DATE
                  </span>
                </div>
              </div>
            </section>

            {/* 4 Tombol Utama Menuju Halaman Kejutan */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-pixel text-xs sm:text-sm text-cyberCyan uppercase">
                  SELECT YOUR BIRTHDAY STAGE (PILIH MENU DI BAWAH):
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tombol 1: Cerita Perjalanan Cinta Kita */}
                <button
                  type="button"
                  onClick={() => setActiveTab("memories")}
                  className="arcade-card text-left bg-panel/95 border-2 border-neonGreen/50 hover:border-neonGreen rounded-2xl p-5 flex items-start gap-4 shadow-neonGreen"
                >
                  <div className="w-12 h-12 rounded-2xl bg-neonGreen/15 border border-neonGreen flex items-center justify-center shrink-0 text-neonGreen">
                    <IconQuestScroll className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="font-terminal text-xs text-neonGreen uppercase">
                      STAGE 01 // MEMORY TIMELINE
                    </span>
                    <h3 className="font-pixel text-sm text-white mt-1">
                      Cerita Perjalanan Cinta Kita
                    </h3>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Baca kembali setiap bab perjalanan cinta kita dari awal kenal, jadian 25 Maret
                      2025, sampai hari ulang tahunmu yang ke-25!
                    </p>
                    <span className="inline-block mt-3 font-terminal text-sm text-neonGreen">
                      BUKA CERITA KITA &rarr;
                    </span>
                  </div>
                </button>

                {/* Tombol 2: Foto-Foto Kenangan Kita */}
                <button
                  type="button"
                  onClick={() => setActiveTab("photos")}
                  className="arcade-card text-left bg-panel/95 border-2 border-cyberCyan/50 hover:border-cyberCyan rounded-2xl p-5 flex items-start gap-4 shadow-cyberCyan"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyberCyan/15 border border-cyberCyan flex items-center justify-center shrink-0 text-cyberCyan">
                    <IconCameraVault className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="font-terminal text-xs text-cyberCyan uppercase">
                      STAGE 02 // PHOTO VAULT
                    </span>
                    <h3 className="font-pixel text-sm text-white mt-1">
                      Foto-Foto Kenangan Kita
                    </h3>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Koleksi foto kenangan favorit kita berdua lengkap dengan waktu dan cerita
                      manis di balik setiap fotonya.
                    </p>
                    <span className="inline-block mt-3 font-terminal text-sm text-cyberCyan">
                      LIHAT GALERI FOTO &rarr;
                    </span>
                  </div>
                </button>

                {/* Tombol 3: Mini-Game Berhadiah Surat Cinta + Foto + Barcode Spotify */}
                <button
                  type="button"
                  onClick={() => setActiveTab("game")}
                  className="arcade-card text-left bg-panel/95 border-2 border-hotPink/60 hover:border-hotPink rounded-2xl p-5 flex items-start gap-4 shadow-hotPink"
                >
                  <div className="w-12 h-12 rounded-2xl bg-hotPink/15 border border-hotPink flex items-center justify-center shrink-0 text-hotPink">
                    <IconGamepad className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="font-terminal text-xs text-hotPink uppercase">
                      STAGE 03 // PLAY MINI-GAME
                    </span>
                    <h3 className="font-pixel text-sm text-white mt-1">
                      Game &quot;Catch the Heart&quot; + Spotify Prize
                    </h3>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Mainkan game tangkap 5 hati! Kalau kamu menang, ada pesan rahasia, foto kita,
                      dan Barcode Spotify yang bisa kamu scan!
                    </p>
                    <span className="inline-block mt-3 font-terminal text-sm text-hotPink">
                      MAINKAN GAME SEKARANG &rarr;
                    </span>
                  </div>
                </button>

                {/* Tombol 4: Undangan Ngedate Hari Kamis di Blok M */}
                <button
                  type="button"
                  onClick={() => setActiveTab("date")}
                  className="arcade-card text-left bg-panel/95 border-2 border-emerald-400/50 hover:border-emerald-400 rounded-2xl p-5 flex items-start gap-4 shadow-neonGreen"
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400 flex items-center justify-center shrink-0 text-emerald-400">
                    <IconDateTicket className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <span className="font-terminal text-xs text-emerald-400 uppercase">
                      STAGE 04 // SPECIAL DATE INVITATION
                    </span>
                    <h3 className="font-pixel text-sm text-white mt-1">
                      Undangan Ngedate Hari Kamis (Blok M)
                    </h3>
                    <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                      Tiket spesial buat jalan bareng aku hari Kamis di Blok M! Pilih jam &amp;
                      rute main kita lalu kirim pesan balasanmu di sini ya.
                    </p>
                    <span className="inline-block mt-3 font-terminal text-sm text-emerald-400">
                      BUKA UNDANGAN DATE KAMIS &rarr;
                    </span>
                  </div>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ===================================================================
            STAGE 1: CERITA PERJALANAN CINTA KITA (MEMORY TIMELINE)
           =================================================================== */}
        {activeTab === "memories" && (
          <div className="space-y-6">
            <div className="bg-panel/90 border border-neonGreen/40 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-terminal text-sm text-neonGreen uppercase">
                  STAGE 01 // MEMORY TIMELINE
                </span>
                <h2 className="font-pixel text-lg sm:text-xl text-white mt-1">
                  Cerita Perjalanan Cinta Kita &lt;3
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  Setiap langkah dan momen berharga yang sudah kita lewati bareng-bareng.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isAdminUnlocked ? (
                  <button
                    type="button"
                    onClick={() =>
                      setQuestModalData({
                        id: "",
                        questCode: `STAGE 0${memoryQuests.length + 1}`,
                        title: "",
                        eventDate: "",
                        story: "",
                        badgeText: "+1000 LOVE XP",
                        sortOrder: memoryQuests.length + 1
                      })
                    }
                    className="arcade-btn px-4 py-2.5 rounded-xl bg-neonGreen text-void font-pixel text-xs shadow-neonGreen"
                  >
                    + TAMBAH CERITA BARU
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="arcade-btn px-3.5 py-2 rounded-xl border border-zinc-700 text-xs font-terminal text-zinc-300 hover:border-neonGreen"
                  >
                    Buka PIN (250325) untuk Tambah/Edit Cerita
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memoryQuests.map((quest) => (
                <article
                  key={quest.id}
                  className="arcade-card bg-panel/95 border border-neonGreen/35 rounded-2xl p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="font-terminal text-sm text-neonGreen px-2.5 py-0.5 rounded-md bg-neonGreen/10 border border-neonGreen/30">
                        {quest.questCode}
                      </span>
                      <span className="font-terminal text-sm text-hotPink tabular-nums">
                        {quest.eventDate}
                      </span>
                    </div>

                    <h3 className="font-pixel text-sm sm:text-base text-white mt-3">
                      {quest.title}
                    </h3>

                    <p className="text-sm text-zinc-300 mt-3 leading-relaxed whitespace-pre-line">
                      {quest.story}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <span className="font-terminal text-xs text-cyberCyan uppercase">
                      ACHIEVEMENT: {quest.badgeText}
                    </span>

                    {isAdminUnlocked && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setQuestModalData(quest)}
                          className="text-xs font-terminal text-neonGreen hover:underline"
                        >
                          [Edit]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuest(quest.id)}
                          className="text-xs font-terminal text-rose-400 hover:underline"
                        >
                          [Hapus]
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className="arcade-btn px-4 py-2.5 rounded-xl bg-panel border border-zinc-700 text-xs font-terminal text-zinc-300"
              >
                &larr; KEMBALI KE DASHBOARD
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("photos")}
                className="arcade-btn px-5 py-2.5 rounded-xl bg-cyberCyan text-void font-pixel text-xs shadow-cyberCyan"
              >
                LANJUT KE FOTO KENANGAN &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            STAGE 2: FOTO-FOTO KENANGAN KITA + CAPTION & WAKTU (PHOTO VAULT)
           =================================================================== */}
        {activeTab === "photos" && (
          <div className="space-y-6">
            <div className="bg-panel/90 border border-cyberCyan/40 rounded-2xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-terminal text-sm text-cyberCyan uppercase">
                  STAGE 02 // PHOTO VAULT
                </span>
                <h2 className="font-pixel text-lg sm:text-xl text-white mt-1">
                  Foto-Foto Kenangan Kita &lt;3
                </h2>
                <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                  Klik pada foto untuk memperbesar tampilan. Semua momen manis kita tersimpan di
                  sini lengkap dengan waktu dan ceritanya.
                </p>
              </div>

              <div>
                {isAdminUnlocked ? (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoModalData({
                        id: "",
                        title: "",
                        imageUrl: "",
                        caption: "",
                        dateTaken: ""
                      })
                    }
                    className="arcade-btn px-4 py-2.5 rounded-xl bg-cyberCyan text-void font-pixel text-xs shadow-cyberCyan"
                  >
                    + UPLOAD FOTO KENANGAN
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPinModal(true)}
                    className="arcade-btn px-3.5 py-2 rounded-xl border border-zinc-700 text-xs font-terminal text-zinc-300 hover:border-cyberCyan"
                  >
                    Buka PIN (250325) untuk Upload Foto
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {photoVault.map((photo) => (
                <div
                  key={photo.id}
                  className="arcade-card bg-panel/95 border border-cyberCyan/35 rounded-2xl overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div
                      onClick={() => setLightboxPhoto(photo)}
                      className="aspect-[4/3] w-full bg-void overflow-hidden cursor-pointer relative group"
                    >
                      <img
                        src={photo.imageUrl}
                        alt={photo.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-md bg-void/85 border border-cyberCyan/40 font-terminal text-xs text-cyberCyan tabular-nums">
                        {photo.dateTaken}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="font-pixel text-xs sm:text-sm text-white">{photo.title}</h3>
                      <p className="text-xs sm:text-sm text-zinc-300 mt-2 leading-relaxed">
                        {photo.caption}
                      </p>
                    </div>
                  </div>

                  {isAdminUnlocked && (
                    <div className="px-4 py-2.5 bg-void/60 border-t border-zinc-800 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setPhotoModalData(photo)}
                        className="text-xs font-terminal text-cyberCyan hover:underline"
                      >
                        [Edit Foto/Caption]
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(photo.id)}
                        className="text-xs font-terminal text-rose-400 hover:underline"
                      >
                        [Hapus]
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("memories")}
                className="arcade-btn px-4 py-2.5 rounded-xl bg-panel border border-zinc-700 text-xs font-terminal text-zinc-300"
              >
                &larr; CERITA KITA
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("game")}
                className="arcade-btn px-5 py-2.5 rounded-xl bg-hotPink text-white font-pixel text-xs shadow-hotPink"
              >
                LANJUT MAIN MINI-GAME &rarr;
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            STAGE 3: MINI-GAME ("CATCH THE HEART") + HADIAH BARCODE SPOTIFY
           =================================================================== */}
        {activeTab === "game" && (
          <HeartCatcherGame
            appConfig={appConfig}
            isAdminUnlocked={isAdminUnlocked}
            onOpenPrizeEditor={() => setConfigModalType("prize")}
            onNavigateStage={(stage) => setActiveTab(stage)}
          />
        )}

        {/* ===================================================================
            STAGE 4: UNDANGAN NGEDATE HARI KAMIS DI BLOK M + BUKU TAMU DATABASE
           =================================================================== */}
        {activeTab === "date" && (
          <div className="space-y-6">
            {/* Tiket VIP Undangan Ngedate Hari Kamis di Blok M */}
            <section className="bg-panel/95 border-2 border-neonGreen rounded-3xl p-5 sm:p-7 shadow-neonGreen relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <IconDateTicket className="w-6 h-6 text-neonGreen" />
                  <span className="font-pixel text-xs sm:text-sm text-neonGreen">
                    VIP DATE INVITATION // SPECIAL FOR APIW
                  </span>
                </div>

                {isAdminUnlocked && (
                  <button
                    type="button"
                    onClick={() => setConfigModalType("date")}
                    className="arcade-btn px-3 py-1.5 rounded-xl bg-neonGreen/15 border border-neonGreen text-neonGreen text-xs font-terminal"
                  >
                    + Edit Info Undangan Date (PIN)
                  </button>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <h2 className="font-pixel text-lg sm:text-xl text-white">
                    UNDANGAN NGEDATE HARI KAMIS BARENG AKU! &lt;3
                  </h2>
                  <p className="text-sm sm:text-base text-zinc-200 leading-relaxed whitespace-pre-line">
                    {appConfig.dateNote}
                  </p>
                </div>

                <div className="bg-void/90 border border-cyberCyan/40 rounded-2xl p-4 flex flex-col justify-center space-y-2.5">
                  <div>
                    <span className="font-terminal text-xs text-zinc-400 block">HARI / JADWAL:</span>
                    <span className="font-pixel text-xs text-neonGreen">{appConfig.dateDay}</span>
                  </div>
                  <div>
                    <span className="font-terminal text-xs text-zinc-400 block">DESTINASI UTAMA:</span>
                    <span className="font-pixel text-xs text-hotPink">
                      {appConfig.dateLocation}
                    </span>
                  </div>
                  <div>
                    <span className="font-terminal text-xs text-zinc-400 block">JAM &amp; RUTE:</span>
                    <span className="text-xs text-cyberCyan font-medium">
                      {appConfig.dateTimePlan}
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Interaktif untuk Apiw Memilih Jam & Rute Blok M + Menulis Balasan */}
              <form onSubmit={handleAddWishSubmit} className="mt-6 pt-6 border-t border-zinc-800 space-y-5">
                <h3 className="font-pixel text-xs sm:text-sm text-cyberCyan">
                  ISI KONFIRMASI DATE KAMIS &amp; PESAN BALASANMU DI SINI YA BABEE:
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Pilihan Jam Ketemu Hari Kamis */}
                  <div>
                    <label className="block font-terminal text-sm text-neonGreen mb-2">
                      1. Pilih Kira-Kira Jam Berapa Kita Enaknya Jalan di Hari Kamis?
                    </label>
                    <div className="space-y-2">
                      {BLOK_M_TIME_OPTIONS.map((option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setSelectedTimeOption(option)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                            selectedTimeOption === option
                              ? "bg-neonGreen/15 border-neonGreen text-white font-semibold"
                              : "bg-void border-zinc-800 text-zinc-300 hover:border-zinc-600"
                          }`}
                        >
                          {selectedTimeOption === option ? "● " : "○ "}
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pilihan Aktivitas / Spot di Blok M */}
                  <div>
                    <label className="block font-terminal text-sm text-hotPink mb-2">
                      2. Pilih Ide Rute Main di Blok M yang Paling Kamu Pengen:
                    </label>
                    <div className="space-y-2">
                      {BLOK_M_SPOT_OPTIONS.map((spot) => (
                        <button
                          key={spot}
                          type="button"
                          onClick={() => setSelectedSpotOption(spot)}
                          className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-xs transition-all ${
                            selectedSpotOption === spot
                              ? "bg-hotPink/15 border-hotPink text-white font-semibold"
                              : "bg-void border-zinc-800 text-zinc-300 hover:border-zinc-600"
                          }`}
                        >
                          {selectedSpotOption === spot ? "♥ " : "♡ "}
                          {spot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-terminal text-sm text-zinc-300 mb-1">
                      Nama Kamu:
                    </label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      placeholder="Apiw (Birthday Boy)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-void border border-zinc-700 text-sm text-white focus:outline-none focus:border-neonGreen"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-terminal text-sm text-zinc-300 mb-1">
                      Atau Ketik Jam / Tempat Spesifik di Blok M yang Kamu Mau:
                    </label>
                    <input
                      type="text"
                      value={selectedSpotOption}
                      onChange={(e) => setSelectedSpotOption(e.target.value)}
                      placeholder="Contoh: Kamis jam 5 sore kita makan ramen di Blok M terus photobox yaa"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-void border border-zinc-700 text-sm text-white focus:outline-none focus:border-cyberCyan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-terminal text-sm text-zinc-300 mb-1">
                    Pesan Balasan / Wish Ulang Tahun ke-25 dari Apiw buat Aku:
                  </label>
                  <textarea
                    rows={3}
                    value={wishMessage}
                    onChange={(e) => setWishMessage(e.target.value)}
                    placeholder="Tulis balasan ucapan ulang tahunmu dan konfirmasi ngedate hari Kamis kita di sini ya sayang..."
                    className="w-full px-4 py-3 rounded-xl bg-void border border-zinc-700 text-sm text-white focus:outline-none focus:border-hotPink"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingWish}
                  className="arcade-btn w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-neonGreen text-void font-pixel text-xs shadow-neonGreen disabled:opacity-50"
                >
                  {isSubmittingWish
                    ? "MENYIMPAN KE DATABASE..."
                    : "▶ KIRIM KONFIRMASI DATE KAMIS & BALASAN"}
                </button>
              </form>
            </section>

            {/* Papan Pesan Live & Riwayat Konfirmasi Date (Tersimpan di Database) */}
            <section className="bg-panel/90 border border-cyberCyan/35 rounded-3xl p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-pixel text-xs sm:text-sm text-cyberCyan">
                    LIVE MESSAGE WALL &amp; THURSDAY DATE RSVP ({totalWishes})
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Semua pesan balasan dan rencana ngedate hari Kamis di Blok M otomatis tersimpan
                    di sini.
                  </p>
                </div>

                {/* Kotak Pencarian Backend */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    value={searchWish}
                    onChange={(e) => {
                      setSearchWish(e.target.value);
                      fetchFilteredWishes(e.target.value, 0);
                    }}
                    placeholder="Cari pesan / rencana..."
                    className="w-full sm:w-56 px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white focus:outline-none focus:border-cyberCyan"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {birthdayWishes.map((item) => (
                  <div
                    key={item.id}
                    className="bg-void/90 border border-zinc-800 hover:border-neonGreen/40 rounded-2xl p-4 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-pixel text-xs text-neonGreen">{item.senderName}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-terminal bg-hotPink/15 border border-hotPink/40 text-hotPink">
                          {item.dateStatus}
                        </span>
                      </div>
                      <span className="font-terminal text-xs text-zinc-400 tabular-nums">
                        {item.id} • {item.createdAt}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-cyberCyan font-terminal">
                      RENCANA BLOK M: {item.preferredSpot}
                    </div>

                    <p className="mt-2 text-sm text-zinc-200 leading-relaxed whitespace-pre-line">
                      {item.message}
                    </p>
                  </div>
                ))}
              </div>

              {/* Tombol Pagination jika pesan lebih dari batas per halaman */}
              {totalWishes > WISH_LIMIT && (
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    disabled={wishOffset === 0}
                    onClick={() => fetchFilteredWishes(searchWish, Math.max(0, wishOffset - WISH_LIMIT))}
                    className="arcade-btn px-3.5 py-2 rounded-xl bg-void border border-zinc-700 text-xs font-terminal disabled:opacity-40"
                  >
                    &larr; SEBELUMNYA
                  </button>
                  <span className="font-terminal text-xs text-zinc-400 tabular-nums">
                    Menampilkan {wishOffset + 1} - {Math.min(wishOffset + WISH_LIMIT, totalWishes)} dari{" "}
                    {totalWishes}
                  </span>
                  <button
                    type="button"
                    disabled={wishOffset + WISH_LIMIT >= totalWishes}
                    onClick={() => fetchFilteredWishes(searchWish, wishOffset + WISH_LIMIT)}
                    className="arcade-btn px-3.5 py-2 rounded-xl bg-void border border-zinc-700 text-xs font-terminal disabled:opacity-40"
                  >
                    BERIKUTNYA &rarr;
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Navigasi Bawah Khusus Layar HP (Mobile Bottom Navigation Bar) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-void/95 backdrop-blur-md border-t border-zinc-800 px-2 py-2">
        <div className="grid grid-cols-5 gap-1">
          {[
            { id: "dashboard", label: "Home", icon: IconPixelHeart },
            { id: "memories", label: "Cerita", icon: IconQuestScroll },
            { id: "photos", label: "Foto", icon: IconCameraVault },
            { id: "game", label: "Game", icon: IconGamepad },
            { id: "date", label: "Kamis", icon: IconDateTicket }
          ].map((item) => {
            const IconComp = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1.5 rounded-xl text-[11px] font-terminal ${
                  active ? "bg-hotPink/20 text-hotPink border border-hotPink/40" : "text-zinc-400"
                }`}
              >
                <IconComp className="w-4 h-4 mb-0.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* =====================================================================
          MODAL 1: VERIFIKASI PIN RAHASIA PASANGAN (250325)
         ===================================================================== */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleVerifyPinSubmit}
            className="w-full max-w-sm bg-panel border-2 border-hotPink rounded-2xl p-6 space-y-4 shadow-hotPink"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-hotPink">MODE EDIT PASANGAN</span>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-xs font-terminal text-zinc-400 hover:text-white"
              >
                [TUTUP]
              </button>
            </div>
            <p className="text-xs text-zinc-300">
              Masukkan 6 digit PIN tanggal jadian kalian (<strong>250325</strong>) untuk menambah
              atau mengedit cerita, foto, barcode Spotify, dan rencana ngedate Kamis:
            </p>
            <input
              type="password"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="Masukkan PIN (250325)"
              className="w-full px-4 py-3 rounded-xl bg-void border border-zinc-700 text-center font-pixel text-sm text-neonGreen tracking-widest focus:outline-none focus:border-neonGreen"
              autoFocus
            />
            <button
              type="submit"
              disabled={isVerifyingPin}
              className="arcade-btn w-full py-3 rounded-xl bg-neonGreen text-void font-pixel text-xs shadow-neonGreen disabled:opacity-50"
            >
              {isVerifyingPin ? "MEMERIKSA..." : "BUKA KUNCI EDIT"}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: TAMBAH / EDIT CERITA PERJALANAN CINTA (STAGE 1)
         ===================================================================== */}
      {questModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveQuestSubmit}
            className="w-full max-w-lg bg-panel border-2 border-neonGreen rounded-2xl p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-neonGreen">
                {questModalData.id ? "EDIT CERITA KITA" : "TAMBAH CERITA KITA"}
              </span>
              <button
                type="button"
                onClick={() => setQuestModalData(null)}
                className="text-xs font-terminal text-zinc-400"
              >
                [BATAL]
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-terminal text-zinc-300 mb-1">
                  Kode Chapter / Stage:
                </label>
                <input
                  type="text"
                  value={questModalData.questCode}
                  onChange={(e) =>
                    setQuestModalData({ ...questModalData, questCode: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-terminal text-zinc-300 mb-1">
                  Tanggal / Waktu Momen:
                </label>
                <input
                  type="text"
                  value={questModalData.eventDate}
                  onChange={(e) =>
                    setQuestModalData({ ...questModalData, eventDate: e.target.value })
                  }
                  placeholder="Contoh: 25 Maret 2025"
                  className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-terminal text-zinc-300 mb-1">Judul Cerita:</label>
              <input
                type="text"
                value={questModalData.title}
                onChange={(e) => setQuestModalData({ ...questModalData, title: e.target.value })}
                placeholder="Judul momen manis kalian"
                className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-terminal text-zinc-300 mb-1">
                Isi Cerita Perjalanan Cinta:
              </label>
              <textarea
                rows={4}
                value={questModalData.story}
                onChange={(e) => setQuestModalData({ ...questModalData, story: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-terminal text-zinc-300 mb-1">Badge XP:</label>
                <input
                  type="text"
                  value={questModalData.badgeText}
                  onChange={(e) =>
                    setQuestModalData({ ...questModalData, badgeText: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-terminal text-zinc-300 mb-1">
                  Nomor Urut Tampil:
                </label>
                <input
                  type="number"
                  value={questModalData.sortOrder}
                  onChange={(e) =>
                    setQuestModalData({ ...questModalData, sortOrder: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingAdmin}
              className="arcade-btn w-full py-3 rounded-xl bg-neonGreen text-void font-pixel text-xs"
            >
              {isSavingAdmin ? "MENYIMPAN..." : "SIMPAN CERITA"}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: UPLOAD / EDIT FOTO KENANGAN & WAKTU (STAGE 2)
         ===================================================================== */}
      {photoModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePhotoSubmit}
            className="w-full max-w-lg bg-panel border-2 border-cyberCyan rounded-2xl p-6 space-y-4 my-auto"
          >
            <div className="flex items-center justify-between">
              <span className="font-pixel text-xs text-cyberCyan">
                {photoModalData.id ? "EDIT FOTO KENANGAN" : "UPLOAD FOTO KENANGAN BARU"}
              </span>
              <button
                type="button"
                onClick={() => setPhotoModalData(null)}
                className="text-xs font-terminal text-zinc-400"
              >
                [BATAL]
              </button>
            </div>

            <div>
              <label className="block text-xs font-terminal text-cyberCyan mb-1">
                Pilih Foto dari Galeri HP / Laptop:
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const dataUrl = await compressImageFile(file, 900, 0.8);
                    setPhotoModalData((prev) => ({ ...prev, imageUrl: dataUrl }));
                  } catch {
                    showToast("Gagal membaca file gambar.", "error");
                  }
                }}
                className="w-full text-xs text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-cyberCyan file:text-void file:font-semibold"
              />
            </div>

            {photoModalData.imageUrl && (
              <div className="h-36 bg-void rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center">
                <img
                  src={photoModalData.imageUrl}
                  alt="Preview"
                  className="max-h-full object-contain"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-terminal text-zinc-300 mb-1">Judul Foto:</label>
                <input
                  type="text"
                  value={photoModalData.title}
                  onChange={(e) => setPhotoModalData({ ...photoModalData, title: e.target.value })}
                  placeholder="Contoh: First Photobox Kita"
                  className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-terminal text-zinc-300 mb-1">
                  Waktu / Tanggal Foto:
                </label>
                <input
                  type="text"
                  value={photoModalData.dateTaken}
                  onChange={(e) =>
                    setPhotoModalData({ ...photoModalData, dateTaken: e.target.value })
                  }
                  placeholder="Contoh: 25 Maret 2025"
                  className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-terminal text-zinc-300 mb-1">
                Caption / Cerita Foto:
              </label>
              <textarea
                rows={3}
                value={photoModalData.caption}
                onChange={(e) => setPhotoModalData({ ...photoModalData, caption: e.target.value })}
                placeholder="Ceritakan momen manis di balik foto ini..."
                className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSavingAdmin}
              className="arcade-btn w-full py-3 rounded-xl bg-cyberCyan text-void font-pixel text-xs"
            >
              {isSavingAdmin ? "MENYIMPAN..." : "SIMPAN FOTO KENANGAN"}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: EDIT DASHBOARD / HADIAH GAME + BARCODE SPOTIFY / DATE KAMIS
         ===================================================================== */}
      {configModalType && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveConfigSubmit}
            className="w-full max-w-xl bg-panel border-2 border-hotPink rounded-2xl p-6 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="font-pixel text-xs text-hotPink uppercase">
                {configModalType === "dashboard" && "EDIT UCAPAN DASHBOARD UTAMA"}
                {configModalType === "prize" && "EDIT HADIAH GAME & UPLOAD BARCODE SPOTIFY"}
                {configModalType === "date" && "EDIT RENCANA UNDANGAN DATE KAMIS BLOK M"}
              </span>
              <button
                type="button"
                onClick={() => setConfigModalType(null)}
                className="text-xs font-terminal text-zinc-400"
              >
                [TUTUP]
              </button>
            </div>

            {configModalType === "dashboard" && (
              <>
                <div>
                  <label className="block text-xs font-terminal text-neonGreen mb-1">
                    Judul Utama Dashboard:
                  </label>
                  <input
                    type="text"
                    value={appConfig.dashboardTitle}
                    onChange={(e) =>
                      setAppConfig({ ...appConfig, dashboardTitle: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-terminal text-neonGreen mb-1">
                    Kalimat Doa &amp; Wish Ulang Tahun di Bawah Judul:
                  </label>
                  <textarea
                    rows={5}
                    value={appConfig.dashboardWish}
                    onChange={(e) => setAppConfig({ ...appConfig, dashboardWish: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                  />
                </div>
              </>
            )}

            {configModalType === "prize" && (
              <>
                <div>
                  <label className="block text-xs font-terminal text-neonGreen mb-1">
                    Pesan Cinta Saat Apiw Menang Mini-Game:
                  </label>
                  <textarea
                    rows={4}
                    value={appConfig.winMessage}
                    onChange={(e) => setAppConfig({ ...appConfig, winMessage: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                  />
                </div>

                <div className="bg-void/90 border border-neonGreen/40 rounded-xl p-4 space-y-2">
                  <label className="block text-xs font-terminal text-neonGreen">
                    Upload Gambar Barcode Spotify (Untuk Di-Scan Apiw):
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        const dataUrl = await compressImageFile(file, 800, 0.85);
                        setAppConfig((prev) => ({ ...prev, spotifyBarcodeUrl: dataUrl }));
                      } catch {
                        showToast("Gagal memproses gambar barcode.", "error");
                      }
                    }}
                    className="w-full text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-neonGreen file:text-void file:font-semibold"
                  />
                  {appConfig.spotifyBarcodeUrl && (
                    <img
                      src={appConfig.spotifyBarcodeUrl}
                      alt="Preview Barcode Spotify"
                      className="max-h-28 mx-auto rounded-lg object-contain mt-2"
                    />
                  )}
                </div>

                <div className="bg-void/90 border border-cyberCyan/40 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-terminal text-cyberCyan">
                      Daftar Foto Berdua di Hadiah Menang Game ({parsedWinPhotos.length} Foto):
                    </span>
                    <label className="cursor-pointer px-3 py-1 rounded-lg bg-cyberCyan text-void font-terminal text-xs font-bold">
                      + Tambah Foto Hadiah
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAddWinPhotoFile}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {parsedWinPhotos.map((p, idx) => (
                      <div
                        key={idx}
                        className="bg-panel border border-zinc-800 rounded-lg p-2 flex flex-col justify-between"
                      >
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          className="h-20 w-full object-cover rounded"
                        />
                        <input
                          type="text"
                          value={p.title}
                          onChange={(e) => {
                            const copy = [...parsedWinPhotos];
                            copy[idx] = { ...copy[idx], title: e.target.value };
                            setAppConfig((prev) => ({
                              ...prev,
                              winPhotosJson: JSON.stringify(copy)
                            }));
                          }}
                          className="mt-1.5 px-2 py-1 rounded bg-void border border-zinc-700 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const copy = parsedWinPhotos.filter((_, i) => i !== idx);
                            setAppConfig((prev) => ({
                              ...prev,
                              winPhotosJson: JSON.stringify(copy)
                            }));
                          }}
                          className="mt-1 text-[11px] font-terminal text-rose-400 text-right"
                        >
                          [Hapus Foto Ini]
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {configModalType === "date" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-terminal text-neonGreen mb-1">
                      Hari Ngedate:
                    </label>
                    <input
                      type="text"
                      value={appConfig.dateDay}
                      onChange={(e) => setAppConfig({ ...appConfig, dateDay: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-terminal text-neonGreen mb-1">
                      Lokasi Tujuan:
                    </label>
                    <input
                      type="text"
                      value={appConfig.dateLocation}
                      onChange={(e) => setAppConfig({ ...appConfig, dateLocation: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-terminal text-neonGreen mb-1">
                    Rencana Jam / Waktu Ketemu:
                  </label>
                  <input
                    type="text"
                    value={appConfig.dateTimePlan}
                    onChange={(e) => setAppConfig({ ...appConfig, dateTimePlan: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-terminal text-neonGreen mb-1">
                    Kalimat Ajakan Ngedate Hari Kamis di Blok M:
                  </label>
                  <textarea
                    rows={4}
                    value={appConfig.dateNote}
                    onChange={(e) => setAppConfig({ ...appConfig, dateNote: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-void border border-zinc-700 text-sm text-white"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isSavingAdmin}
              className="arcade-btn w-full py-3 rounded-xl bg-neonGreen text-void font-pixel text-xs shadow-neonGreen"
            >
              {isSavingAdmin ? "MENYIMPAN..." : "SIMPAN PERUBAHAN"}
            </button>
          </form>
        </div>
      )}

      {/* Lightbox Perbesar Foto Galeri (Stage 2) */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-xl w-full bg-panel border-2 border-cyberCyan rounded-2xl p-4 space-y-3">
            <img
              src={lightboxPhoto.imageUrl}
              alt={lightboxPhoto.title}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            <div className="flex items-center justify-between">
              <h4 className="font-pixel text-xs sm:text-sm text-white">{lightboxPhoto.title}</h4>
              <span className="font-terminal text-sm text-cyberCyan">
                {lightboxPhoto.dateTaken}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300">{lightboxPhoto.caption}</p>
          </div>
        </div>
      )}
    </div>
  );
}
