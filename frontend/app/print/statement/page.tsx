"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { api, HastaEkstre, Patient } from "@/lib/api";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(amount || 0);

const formatDate = (value?: string) => {
    if (!value) return "—";
    try {
        return format(parseISO(value), "dd.MM.yyyy", { locale: tr });
    } catch {
        return value;
    }
};

function StatementContent() {
    const searchParams = useSearchParams();
    const patientId = searchParams.get("patient") || "";
    const startDate = searchParams.get("start") || undefined;
    const endDate = searchParams.get("end") || undefined;

    const [ekstre, setEkstre] = useState<HastaEkstre | null>(null);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!patientId) {
            setLoading(false);
            return;
        }
        Promise.all([
            api.finance.getPatientStatement(patientId, startDate, endDate),
            api.patients.get(patientId),
            api.settings.getAll().catch(() => []),
        ])
            .then(([e, p, s]) => {
                setEkstre(e);
                setPatient(p);
                setSettings(
                    (s as any[]).reduce((acc: Record<string, string>, c: any) => {
                        acc[c.key] = c.value || "";
                        return acc;
                    }, {})
                );
            })
            .catch((err) => console.error("Ekstre yüklenemedi", err))
            .finally(() => setLoading(false));
    }, [patientId, startDate, endDate]);

    if (loading) {
        return <div className="p-10 text-sm text-slate-500">Ekstre hazırlanıyor...</div>;
    }

    if (!ekstre || !patientId) {
        return <div className="p-10 text-sm text-slate-500">Ekstre bulunamadı.</div>;
    }

    const borclu = ekstre.bakiye > 0;

    return (
        <div className="mx-auto max-w-[210mm] bg-white p-10 text-[11px] text-slate-900 print:p-6">
            {/* Yazdır butonu — çıktıda gizli */}
            <div className="mb-6 flex justify-end print:hidden">
                <button
                    onClick={() => window.print()}
                    className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white"
                >
                    Yazdır
                </button>
            </div>

            {/* Başlık */}
            <div className="mb-6 border-b-2 border-slate-900 pb-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-bold">
                            {settings["klinik_adi"] || "Klinik"}
                        </h1>
                        {settings["klinik_adres"] && (
                            <p className="mt-0.5 text-[10px] text-slate-600">{settings["klinik_adres"]}</p>
                        )}
                        {settings["klinik_telefon"] && (
                            <p className="text-[10px] text-slate-600">Tel: {settings["klinik_telefon"]}</p>
                        )}
                    </div>
                    <div className="text-right">
                        <h2 className="text-base font-bold">HESAP EKSTRESİ</h2>
                        <p className="mt-0.5 text-[10px] text-slate-600">
                            Düzenlenme: {format(new Date(), "dd.MM.yyyy", { locale: tr })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Hasta ve dönem */}
            <div className="mb-5 grid grid-cols-2 gap-6">
                <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Hasta</p>
                    <p className="mt-1 text-sm font-bold">
                        {patient ? `${patient.ad} ${patient.soyad}` : "—"}
                    </p>
                    {patient?.tc_kimlik && (
                        <p className="text-[10px] text-slate-600">TC: {patient.tc_kimlik}</p>
                    )}
                    {patient?.cep_tel && (
                        <p className="text-[10px] text-slate-600">Tel: {patient.cep_tel}</p>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-semibold uppercase text-slate-500">Dönem</p>
                    <p className="mt-1 text-[11px]">
                        {ekstre.baslangic || ekstre.bitis
                            ? `${formatDate(ekstre.baslangic || undefined)} — ${formatDate(ekstre.bitis || undefined)}`
                            : "Tüm hareketler"}
                    </p>
                </div>
            </div>

            {/* Hareket tablosu */}
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-y border-slate-300 bg-slate-50">
                        <th className="py-1.5 pl-1 text-left font-semibold">Tarih</th>
                        <th className="py-1.5 text-left font-semibold">Referans</th>
                        <th className="py-1.5 text-left font-semibold">Açıklama</th>
                        <th className="py-1.5 pr-1 text-right font-semibold">Borç</th>
                        <th className="py-1.5 pr-1 text-right font-semibold">Alacak</th>
                        <th className="py-1.5 pr-1 text-right font-semibold">Bakiye</th>
                    </tr>
                </thead>
                <tbody>
                    {ekstre.satirlar.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-500">
                                Bu dönemde hareket yok
                            </td>
                        </tr>
                    ) : (
                        ekstre.satirlar.map((r, i) => (
                            <tr key={`${r.referans_kodu}-${i}`} className="border-b border-slate-100">
                                <td className="py-1.5 pl-1 whitespace-nowrap">{formatDate(r.tarih)}</td>
                                <td className="py-1.5 font-mono text-[10px] text-slate-500">
                                    {r.referans_kodu}
                                </td>
                                <td className="py-1.5">{r.aciklama}</td>
                                <td className="py-1.5 pr-1 text-right">
                                    {r.borc ? formatCurrency(r.borc) : ""}
                                </td>
                                <td className="py-1.5 pr-1 text-right">
                                    {r.alacak ? formatCurrency(r.alacak) : ""}
                                </td>
                                <td className="py-1.5 pr-1 text-right font-medium">
                                    {formatCurrency(r.bakiye)}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                <tfoot>
                    <tr className="border-t-2 border-slate-900 font-bold">
                        <td colSpan={3} className="py-2 pl-1">TOPLAM</td>
                        <td className="py-2 pr-1 text-right">{formatCurrency(ekstre.toplam_borc)}</td>
                        <td className="py-2 pr-1 text-right">{formatCurrency(ekstre.toplam_alacak)}</td>
                        <td className="py-2 pr-1 text-right">{formatCurrency(ekstre.bakiye)}</td>
                    </tr>
                </tfoot>
            </table>

            {/* Bakiye özeti */}
            <div className="mt-6 flex justify-end">
                <div className="w-64 rounded border border-slate-300 p-3">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-slate-600">Toplam tahakkuk</span>
                        <span>{formatCurrency(ekstre.toplam_borc)} ₺</span>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px]">
                        <span className="text-slate-600">Toplam tahsilat</span>
                        <span>{formatCurrency(ekstre.toplam_alacak)} ₺</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-slate-300 pt-2 text-sm font-bold">
                        <span>{borclu ? "Kalan borç" : "Bakiye"}</span>
                        <span>{formatCurrency(Math.abs(ekstre.bakiye))} ₺</span>
                    </div>
                    {!borclu && ekstre.bakiye !== 0 && (
                        <p className="mt-1 text-[10px] text-slate-500">Hasta lehine bakiye</p>
                    )}
                </div>
            </div>

            <p className="mt-8 text-[9px] text-slate-400">
                Bu belge {format(new Date(), "dd.MM.yyyy HH:mm", { locale: tr })} tarihinde
                sistem tarafından oluşturulmuştur.
            </p>
        </div>
    );
}

export default function StatementPrintPage() {
    return (
        <Suspense fallback={<div className="p-10 text-sm text-slate-500">Yükleniyor...</div>}>
            <StatementContent />
        </Suspense>
    );
}
