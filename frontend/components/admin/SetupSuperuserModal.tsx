"use client";

import React, { useState } from "react";
import { Lock, ShieldAlert, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

interface SetupSuperuserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<void>;
  isLoading: boolean;
}

export default function SetupSuperuserModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: SetupSuperuserModalProps) {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Şifre en az 8 karakter olmalıdır.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMsg("Şifreler eşleşmiyor.");
      return;
    }

    try {
      await onConfirm(password);
    } catch (err: any) {
      setErrorMsg(err.message || "Kurulum başarısız oldu.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-200">Süper Kullanıcı Kurulumu</h3>
            <p className="text-xs text-amber-400/80">Sistem güncellemesini başlatabilmek için bir kereliğine şifre belirleyin.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          
          <div className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg flex items-center gap-2 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Kullanıcı adı otomatik olarak <strong>superuser</strong> atanacaktır.</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Yeni Şifre
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-200"
                placeholder="En az 8 karakter"
              />
              <KeyRound className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Şifre Tekrar
            </label>
            <div className="relative">
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-200"
                placeholder="Şifreyi tekrar girin"
              />
              <KeyRound className="absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading || !password || !passwordConfirm}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-semibold text-xs rounded-lg shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Kuruluyor...</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>Şifreyi Kaydet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
