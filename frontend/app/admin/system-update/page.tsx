"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  GitBranch, 
  RefreshCw, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  FileText, 
  ShieldCheck, 
  History,
  Info
} from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import { AuthGuard } from "@/components/auth/auth-guard";
import SuperuserAuthModal from "@/components/admin/SuperuserAuthModal";
import SetupReadmeModal from "@/components/admin/SetupReadmeModal";
import SetupSuperuserModal from "@/components/admin/SetupSuperuserModal";

interface VersionStatus {
  update_available: boolean;
  current_version: { sha: string; message?: string };
  latest_version: { sha: string };
  changelog: string[];
  is_update_running: boolean;
  has_superuser: boolean;
}

export default function SystemUpdatePage() {
  // DEVRE DIŞI: bu özellik işlev dışına çıkarıldı (kullanıcı talebi).
  // Backend tarafında da /api/v1/system-update/* router'ı mount edilmiyor
  // (bkz. backend/app/main.py), bu yüzden altındaki SystemUpdateContent
  // zaten çalışmaz — kod korunuyor, tekrar açmak için bu bloğu geri al.
  return (
    <AuthGuard>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
        <AlertTriangle className="w-10 h-10 text-slate-400" />
        <h1 className="text-lg font-semibold text-slate-700">Bu özellik devre dışı</h1>
        <p className="text-sm text-slate-500 max-w-md">
          Sistem güncelleme paneli şu anda kullanım dışı bırakılmıştır.
        </p>
      </div>
    </AuthGuard>
  );
}

function SystemUpdateContent() {
  const [statusData, setStatusData] = useState<VersionStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Setup Modal State
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [setupLoading, setSetupLoading] = useState<boolean>(false);

  // Readme Modal State
  const [showReadmeModal, setShowReadmeModal] = useState<boolean>(false);
  const [readmeContent, setReadmeContent] = useState<string>("");

  // Update Progress & Logs
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<VersionStatus>("/api/v1/system-update/status");
      setStatusData(data);
      if (data.is_update_running) {
        setIsUpdating(true);
      }
    } catch (err: any) {
      setError(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReadme = async () => {
    try {
      const data = await apiFetch<{ content: string }>("/api/v1/system-update/setup-readme");
      setReadmeContent(data.content);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchReadme();
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleStartUpdate = async (username: string, password: string) => {
    setAuthLoading(true);
    try {
      await apiFetch<{ status: string; message: string }>("/api/v1/system-update/update", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setShowAuthModal(false);
      setIsUpdating(true);
      setLogs(["🚀 [Web] Güncelleme talebi iletildi. WebSocket bağlantısı kuruluyor..."]);

      // WebSocket Bağlantısını Başlat (JWT token ile kimlik doğrulamalı)
      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const { useAuthStore } = await import("@/stores/auth-store");
      const authToken = useAuthStore.getState().token;
      const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/system-update/ws-logs?token=${encodeURIComponent(authToken || "")}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        setLogs((prev) => [...prev, event.data]);
      };

      ws.onclose = () => {
        setLogs((prev) => [...prev, "\n🔌 [Web] Bağlantı kapandı."]);
        setIsUpdating(false);
        fetchStatus();
      };

      ws.onerror = (err) => {
        console.error("WS Error:", err);
        setLogs((prev) => [...prev, "\n❌ [Web] WebSocket bağlantı hatası oluştu."]);
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSetupSuperuser = async (password: string) => {
    setSetupLoading(true);
    try {
      await apiFetch<{ message: string }>("/api/v1/system-update/setup-superuser", {
        method: "POST",
        body: JSON.stringify({ password }),
      });

      setShowSetupModal(false);
      fetchStatus();
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto text-slate-100">
      {/* Üst Başlık & Eylemler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-slate-100">
            <GitBranch className="w-6 h-6 text-blue-400" />
            <span>Sistem Güncelleme & Bakım Paneli</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            UroLOG canlı sunucu versiyon kontrolleri ve otomatik dağıtım arayüzü.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowReadmeModal(true)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-2 transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Sunucu Kurulum Rehberi</span>
          </button>
          <button
            onClick={fetchStatus}
            disabled={loading || isUpdating}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
            <span>Yeniden Kontrol Et</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Versiyon Bilgi Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Yerel Versiyon */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <span>Mevcut Yüklü Versiyon</span>
          </div>
          <div className="text-lg font-bold text-slate-100 font-mono">
            {statusData?.current_version?.sha || "..."}
          </div>
          <p className="text-xs text-slate-400 truncate">
            {statusData?.current_version?.message || "Yükleniyor..."}
          </p>
        </div>

        {/* GitHub Versiyonu */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" />
            <span>GitHub En Son Versiyon</span>
          </div>
          <div className="text-lg font-bold text-slate-100 font-mono">
            {statusData?.latest_version?.sha || "..."}
          </div>
          <p className="text-xs text-slate-400">
            Branch: <span className="text-slate-300 font-semibold">origin/main</span>
          </p>
        </div>

        {/* Güncelleme Durumu & Eylem */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-3">
          <div className="text-xs text-slate-400 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Güncelleme Durumu</span>
          </div>

          <div>
            {statusData?.update_available ? (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4" />
                <span>Yeni Güncelleme Mevcut!</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Sisteminiz Güncel</span>
              </div>
            )}
          </div>
          
          {statusData?.has_superuser === false ? (
            <button
              onClick={() => setShowSetupModal(true)}
              className="w-full py-2 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Süper Kullanıcı Şifresi Belirle</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              disabled={!statusData?.update_available || isUpdating}
              className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>{isUpdating ? "Güncelleme Devam Ediyor..." : "Şimdi Güncelle"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Changelog Bölümü */}
      {statusData?.update_available && statusData.changelog?.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Yeni Versiyon Değişiklik Günlüğü (Changelog)</span>
          </h3>
          <ul className="space-y-1.5 font-mono text-xs text-slate-300 max-h-48 overflow-y-auto bg-slate-950/50 p-4 rounded-lg border border-slate-800/80">
            {statusData.changelog.map((log, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold">•</span>
                <span>{log}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Terminal / Log Ekranı */}
      {(isUpdating || logs.length > 0) && (
        <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Canlı Güncelleme Konsolu (WebSocket Stream)</span>
            </div>
            {isUpdating && (
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                CANLI AKIŞ
              </span>
            )}
          </div>
          <div className="p-4 font-mono text-xs text-emerald-400/90 bg-slate-950 h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
            {logs.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Superuser Modal */}
      <SuperuserAuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onConfirm={handleStartUpdate}
        isLoading={authLoading}
      />

      {/* Setup Superuser Modal */}
      <SetupSuperuserModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        onConfirm={handleSetupSuperuser}
        isLoading={setupLoading}
      />

      {/* Setup Readme Modal */}
      <SetupReadmeModal
        isOpen={showReadmeModal}
        onClose={() => setShowReadmeModal(false)}
        content={readmeContent}
      />
    </div>
  );
}
