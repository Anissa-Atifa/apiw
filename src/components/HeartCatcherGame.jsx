"use client";

import React, { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { IconGamepad, IconPixelHeart, IconSpotifyWave } from "./ArcadeIcons";

// Efek Suara 8-Bit Retro Ringan via Web Audio API (Tanpa File MP3 Eksternal)
function playRetroBeep(type = "catch", soundEnabled = true) {
  if (!soundEnabled || typeof window === "undefined") return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === "catch") {
      osc.type = "square";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.07); // E5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === "bug") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.setValueAtTime(120, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === "win") {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "square";
        o.connect(g);
        g.connect(ctx.destination);
        o.frequency.setValueAtTime(freq, now + idx * 0.09);
        g.gain.setValueAtTime(0.09, now + idx * 0.09);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.22);
        o.start(now + idx * 0.09);
        o.stop(now + idx * 0.09 + 0.22);
      });
    }
  } catch {
    // Abaikan jika browser memblokir autoplay audio
  }
}

export default function HeartCatcherGame({
  appConfig,
  isAdminUnlocked,
  onOpenPrizeEditor,
  onNavigateStage
}) {
  const canvasRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [hasWon, setHasWon] = useState(false);
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [zoomPhoto, setZoomPhoto] = useState(null);

  const TARGET_SCORE = 5;

  // State internal game loop
  const gameRef = useRef({
    playerX: 160,
    playerWidth: 76,
    items: [],
    lastSpawn: 0,
    score: 0,
    running: false,
    moveLeft: false,
    moveRight: false
  });

  // Parse foto hadiah kemenangan dari JSON
  let winPhotos = [];
  try {
    winPhotos = JSON.parse(appConfig?.winPhotosJson || "[]");
  } catch {
    winPhotos = [];
  }

  const triggerWinCelebration = () => {
    setIsPlaying(false);
    setHasWon(true);
    setShowPrizeModal(true);
    playRetroBeep("win", soundEnabled);

    try {
      confetti({
        particleCount: 95,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#00ff66", "#ff007f", "#00f3ff", "#ffffff"]
      });
      setTimeout(() => {
        confetti({
          particleCount: 65,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#ff007f", "#00ff66", "#00f3ff"]
        });
      }, 400);
    } catch {
      // Fallback aman
    }
  };

  const startGame = () => {
    gameRef.current = {
      playerX: 150,
      playerWidth: 78,
      items: [],
      lastSpawn: performance.now(),
      score: 0,
      running: true,
      moveLeft: false,
      moveRight: false
    };
    setScore(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (!isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animId;

    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        gameRef.current.moveLeft = true;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        gameRef.current.moveRight = true;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        gameRef.current.moveLeft = false;
      }
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        gameRef.current.moveRight = false;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const renderLoop = (timestamp) => {
      if (!gameRef.current.running) return;

      const W = canvas.width;
      const H = canvas.height;
      const st = gameRef.current;

      // Gerakan keranjang Apiw
      if (st.moveLeft) st.playerX = Math.max(8, st.playerX - 6.2);
      if (st.moveRight) st.playerX = Math.min(W - st.playerWidth - 8, st.playerX + 6.2);

      // Spawn Pixel Heart atau System Bug setiap 680ms
      if (timestamp - st.lastSpawn > 680) {
        const isBug = Math.random() < 0.25;
        st.items.push({
          x: 24 + Math.random() * (W - 48),
          y: -20,
          speed: 2.3 + Math.random() * 1.6,
          type: isBug ? "bug" : "heart"
        });
        st.lastSpawn = timestamp;
      }

      // Bersihkan latar canvas
      ctx.fillStyle = "#0a0a0c";
      ctx.fillRect(0, 0, W, H);

      // Garis grid tipis di dalam arena
      ctx.strokeStyle = "rgba(0, 243, 255, 0.08)";
      ctx.lineWidth = 1;
      for (let gx = 0; gx < W; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }

      // Gambar keranjang penangkap (PLAYER 1: APIW)
      const catcherY = H - 38;
      ctx.fillStyle = "#00ff66";
      ctx.shadowColor = "#00ff66";
      ctx.shadowBlur = 12;
      ctx.fillRect(st.playerX, catcherY, st.playerWidth, 14);
      ctx.shadowBlur = 0;

      ctx.fillStyle = "#0a0a0c";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("APIW LV.25", st.playerX + st.playerWidth / 2, catcherY + 11);

      // Update & gambar item jatuh
      const remaining = [];
      for (const item of st.items) {
        item.y += item.speed;

        // Cek tabrakan dengan keranjang Apiw
        const hitY = item.y >= catcherY - 12 && item.y <= catcherY + 18;
        const hitX = item.x >= st.playerX - 10 && item.x <= st.playerX + st.playerWidth + 10;

        if (hitX && hitY) {
          if (item.type === "heart") {
            st.score += 1;
            setScore(st.score);
            playRetroBeep("catch", soundEnabled);
            if (st.score >= TARGET_SCORE) {
              st.running = false;
              triggerWinCelebration();
              return;
            }
          } else {
            st.score = Math.max(0, st.score - 1);
            setScore(st.score);
            playRetroBeep("bug", soundEnabled);
          }
          continue;
        }

        if (item.y < H + 20) {
          remaining.push(item);

          if (item.type === "heart") {
            // Gambar Pixel Heart (#ff007f)
            ctx.fillStyle = "#ff007f";
            ctx.shadowColor = "#ff007f";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(item.x - 5, item.y, 6, 0, Math.PI * 2);
            ctx.arc(item.x + 5, item.y, 6, 0, Math.PI * 2);
            ctx.moveTo(item.x - 11, item.y + 2);
            ctx.lineTo(item.x, item.y + 14);
            ctx.lineTo(item.x + 11, item.y + 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            // Gambar Bug (#00f3ff / merah)
            ctx.fillStyle = "#f43f5e";
            ctx.font = "bold 12px monospace";
            ctx.textAlign = "center";
            ctx.fillText("[BUG]", item.x, item.y + 4);
          }
        }
      }
      st.items = remaining;

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isPlaying, soundEnabled]);

  // Geser keranjang langsung dengan sentuhan jari / mouse di atas canvas
  const handlePointerMove = (e) => {
    if (!isPlaying || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const relX = ((clientX - rect.left) / rect.width) * canvasRef.current.width;
    const w = gameRef.current.playerWidth;
    gameRef.current.playerX = Math.max(
      8,
      Math.min(canvasRef.current.width - w - 8, relX - w / 2)
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Stage 3 */}
      <div className="bg-panel/90 border border-hotPink/40 rounded-2xl p-5 sm:p-6 shadow-hotPink">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-terminal uppercase tracking-wider bg-hotPink/15 text-hotPink border border-hotPink/40">
              <IconGamepad className="w-4 h-4" />
              STAGE 03 // MINI-GAME QUEST
            </span>
            <h2 className="font-pixel text-lg sm:text-xl text-white mt-2">
              CATCH 5 HEARTS TO UNLOCK YOUR PRIZE!
            </h2>
            <p className="text-sm text-zinc-300 mt-1">
              Tangkap <span className="text-hotPink font-semibold">5 Hati Pink</span> dan hindari{" "}
              <span className="text-rose-400 font-mono">[BUG]</span> untuk membuka Surat Cinta
              Rahasia, Foto Spesial Kita &amp; Barcode Spotify!
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="arcade-btn px-3 py-2 rounded-xl border border-cyberCyan/40 bg-void text-xs font-terminal text-cyberCyan hover:bg-cyberCyan/10"
            >
              {soundEnabled ? "SFX: ON" : "SFX: MUTE"}
            </button>

            {hasWon && (
              <button
                type="button"
                onClick={() => setShowPrizeModal(true)}
                className="arcade-btn px-4 py-2 rounded-xl bg-hotPink text-white text-xs font-pixel shadow-hotPink"
              >
                BUKA HADIAH LAGI
              </button>
            )}

            {isAdminUnlocked && (
              <button
                type="button"
                onClick={onOpenPrizeEditor}
                className="arcade-btn px-3 py-2 rounded-xl bg-neonGreen/15 border border-neonGreen text-neonGreen text-xs font-terminal"
              >
                + Edit Hadiah &amp; Barcode Spotify (PIN)
              </button>
            )}
          </div>
        </div>

        {/* Bar Skor & Progress */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 bg-void/90 border border-zinc-800 rounded-xl p-3.5">
          <div className="flex items-center gap-2">
            <span className="font-pixel text-xs text-neonGreen tabular-nums">
              SCORE: {score} / {TARGET_SCORE}
            </span>
            <div className="flex items-center gap-1.5 ml-2">
              {[...Array(TARGET_SCORE)].map((_, idx) => (
                <IconPixelHeart
                  key={idx}
                  className={`w-5 h-5 transition-all ${
                    idx < score ? "text-hotPink scale-110" : "text-zinc-700"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="text-xs font-terminal text-cyberCyan">
            TIP: Geser jari di layar HP atau gunakan tombol Kiri / Kanan di bawah
          </div>
        </div>

        {/* Arena Canvas Game */}
        <div className="mt-4 relative flex flex-col items-center">
          <div className="relative w-full max-w-[420px] rounded-2xl overflow-hidden border-2 border-cyberCyan/50 bg-void shadow-cyberCyan">
            <canvas
              ref={canvasRef}
              width={380}
              height={340}
              onMouseMove={handlePointerMove}
              onTouchMove={handlePointerMove}
              className="w-full h-auto block touch-none cursor-pointer"
            />

            {!isPlaying && (
              <div className="absolute inset-0 bg-void/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <IconPixelHeart className="w-12 h-12 text-hotPink animate-bounce mb-3" />
                <p className="font-pixel text-sm text-neonGreen mb-2">
                  {hasWon ? "STAGE CLEARED! LEVEL 25 CHAMPION" : "READY PLAYER 1 (APIW)?"}
                </p>
                <p className="text-xs text-zinc-300 max-w-xs mb-5">
                  Kumpulkan 5 hati cinta dariku untuk membuka pesan rahasia, foto kita, dan barcode
                  Spotify spesial!
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={startGame}
                    className="arcade-btn px-5 py-3 rounded-xl bg-neonGreen text-void font-pixel text-xs shadow-neonGreen"
                  >
                    {hasWon ? "MAIN LAGI" : "START MINI-GAME"}
                  </button>
                  {hasWon && (
                    <button
                      type="button"
                      onClick={() => setShowPrizeModal(true)}
                      className="arcade-btn px-5 py-3 rounded-xl bg-hotPink text-white font-pixel text-xs shadow-hotPink"
                    >
                      LIHAT SURAT &amp; SPOTIFY
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tombol Kontrol Ramah Jempol HP */}
          <div className="grid grid-cols-2 gap-4 w-full max-w-[420px] mt-4">
            <button
              type="button"
              onMouseDown={() => {
                gameRef.current.moveLeft = true;
              }}
              onMouseUp={() => {
                gameRef.current.moveLeft = false;
              }}
              onMouseLeave={() => {
                gameRef.current.moveLeft = false;
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                gameRef.current.moveLeft = true;
              }}
              onTouchEnd={() => {
                gameRef.current.moveLeft = false;
              }}
              className="arcade-btn py-3.5 rounded-xl bg-panel border border-cyberCyan/50 text-cyberCyan font-pixel text-xs active:bg-cyberCyan active:text-void select-none"
            >
              ◀ GESER KIRI
            </button>
            <button
              type="button"
              onMouseDown={() => {
                gameRef.current.moveRight = true;
              }}
              onMouseUp={() => {
                gameRef.current.moveRight = false;
              }}
              onMouseLeave={() => {
                gameRef.current.moveRight = false;
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                gameRef.current.moveRight = true;
              }}
              onTouchEnd={() => {
                gameRef.current.moveRight = false;
              }}
              className="arcade-btn py-3.5 rounded-xl bg-panel border border-cyberCyan/50 text-cyberCyan font-pixel text-xs active:bg-cyberCyan active:text-void select-none"
            >
              GESER KANAN ▶
            </button>
          </div>
        </div>
      </div>

      {/* MODAL HADIAH KEMENANGAN: SURAT CINTA + FOTO BERDUA + BARCODE SPOTIFY */}
      {showPrizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-panel border-2 border-hotPink rounded-2xl p-5 sm:p-7 shadow-hotPink my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <IconPixelHeart className="w-6 h-6 text-hotPink" />
                <span className="font-pixel text-xs sm:text-sm text-neonGreen">
                  SECRET PRIZE UNLOCKED // LEVEL 25
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPrizeModal(false)}
                className="arcade-btn px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-terminal hover:bg-rose-600 hover:text-white"
              >
                TUTUP [X]
              </button>
            </div>

            {/* 1. Pesan Cinta Kustom Sesuai Permintaan */}
            <div className="mt-5 bg-void/90 border border-hotPink/40 rounded-2xl p-5">
              <p className="text-sm sm:text-base text-zinc-100 leading-relaxed whitespace-pre-line font-medium">
                {appConfig?.winMessage}
              </p>
            </div>

            {/* 2. Beberapa Foto Kita Berdua */}
            {winPhotos.length > 0 && (
              <div className="mt-6">
                <h4 className="font-pixel text-xs text-cyberCyan mb-3 uppercase">
                  OUR FAVORITE MOMENTS TOGETHER &lt;3
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {winPhotos.map((photo, index) => (
                    <div
                      key={index}
                      onClick={() => setZoomPhoto(photo)}
                      className="arcade-card cursor-pointer bg-void border border-cyberCyan/30 rounded-xl overflow-hidden"
                    >
                      <div className="aspect-video w-full bg-zinc-900 overflow-hidden">
                        <img
                          src={photo.imageUrl}
                          alt={photo.title || `Foto Kita ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-terminal text-base text-neonGreen">{photo.title}</p>
                        {photo.caption && (
                          <p className="text-xs text-zinc-300 mt-0.5">{photo.caption}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Kartu Barcode Spotify yang Bisa Di-Scan Apiw */}
            <div className="mt-6 bg-void border-2 border-neonGreen/60 rounded-2xl p-4 sm:p-5 text-center shadow-neonGreen">
              <div className="inline-flex items-center gap-2 text-neonGreen font-pixel text-xs mb-2">
                <IconSpotifyWave className="w-5 h-5" />
                <span>SCAN BARCODE SPOTIFY INI YA BABEE!</span>
              </div>
              <p className="text-xs text-zinc-300 mb-3">
                Buka aplikasi <strong>Spotify</strong> di HP kamu &rarr; ketuk menu{" "}
                <strong>Search (Cari)</strong> &rarr; ketuk ikon <strong>Kamera</strong> di pojok
                kanan atas &rarr; arahkan ke barcode di bawah ini:
              </p>
              <div className="bg-panel p-3 rounded-xl border border-zinc-800 inline-block max-w-full">
                <img
                  src={appConfig?.spotifyBarcodeUrl}
                  alt="Spotify Barcode untuk Apiw"
                  className="max-h-40 w-auto mx-auto rounded-lg object-contain"
                />
              </div>
            </div>

            {/* Tombol Lanjut ke Undangan Ngedate Hari Kamis di Blok M */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-zinc-800">
              {isAdminUnlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPrizeModal(false);
                    onOpenPrizeEditor();
                  }}
                  className="arcade-btn px-4 py-2.5 rounded-xl border border-cyberCyan text-cyberCyan text-xs font-terminal"
                >
                  Ubah Foto Hadiah / Upload Barcode Spotify
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setShowPrizeModal(false);
                  onNavigateStage("date");
                }}
                className="arcade-btn ml-auto px-5 py-3 rounded-xl bg-neonGreen text-void font-pixel text-xs shadow-neonGreen"
              >
                LANJUT: BUKA UNDANGAN DATE KAMIS ▶
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Perbesar Foto Hadiah */}
      {zoomPhoto && (
        <div
          onClick={() => setZoomPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-lg w-full bg-panel border border-cyberCyan rounded-2xl overflow-hidden p-3">
            <img
              src={zoomPhoto.imageUrl}
              alt={zoomPhoto.title}
              className="w-full max-h-[70vh] object-contain rounded-xl"
            />
            <p className="text-center font-terminal text-lg text-neonGreen mt-2">
              {zoomPhoto.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
