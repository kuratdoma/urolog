"use client";

import React from "react";
import { BookOpen, X } from "lucide-react";

interface SetupReadmeModalProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

export default function SetupReadmeModal({
  isOpen,
  onClose,
  content,
}: SetupReadmeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-800/80 border-b border-slate-700/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Sunucu Kurulum ve Deploy Key Rehberi</h3>
              <p className="text-xs text-slate-400">Sunucu tarafında yapılması gereken tek seferlik SSH/Sudoers ayarları</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed bg-slate-950/60">
          {content || "Doküman yükleniyor..."}
        </div>

        <div className="bg-slate-800/40 border-t border-slate-800 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
