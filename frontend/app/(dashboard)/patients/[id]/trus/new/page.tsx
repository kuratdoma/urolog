"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, Patient } from "@/lib/api";
import { useForm, Controller } from "react-hook-form";
import { DatePicker } from "@/components/ui/date-picker";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type CoreLocation = {
    id: number;
    label: string;
    taken: boolean;
};

const DEFAULT_CORES: CoreLocation[] = [
    { id: 1, label: "R Taban Lateral", taken: true },
    { id: 2, label: "R Orta Lateral", taken: true },
    { id: 3, label: "R Apex Lateral", taken: true },
    { id: 4, label: "R Taban Medial", taken: true },
    { id: 5, label: "R Orta Medial", taken: true },
    { id: 6, label: "R Apex Medial", taken: true },
    { id: 7, label: "L Taban Medial", taken: true },
    { id: 8, label: "L Orta Medial", taken: true },
    { id: 9, label: "L Apex Medial", taken: true },
    { id: 10, label: "L Taban Lateral", taken: true },
    { id: 11, label: "L Orta Lateral", taken: true },
    { id: 12, label: "L Apex Lateral", taken: true },
];

export default function NewTrusBiopsyPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;
    const [patient, setPatient] = useState<Patient | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [cores, setCores] = useState<CoreLocation[]>(DEFAULT_CORES);
    const [mriEnabled, setMriEnabled] = useState(false);

    const { register, handleSubmit, control, formState: { errors } } = useForm();

    useEffect(() => {
        api.patients.get(patientId).then(setPatient).catch(console.error);
    }, [patientId]);

    const toggleCore = (id: number) => {
        setCores(prev => prev.map(c => c.id === id ? { ...c, taken: !c.taken } : c));
    };

    const onSubmit = async (data: any) => {
        setIsSubmitting(true);
        try {
            const payload = {
                hasta_id: patientId,
                tarih: new Date().toISOString().split('T')[0],
                psa_total: data.psa_total,
                rektal_tuse: data.rektal_tuse,
                mri_var: mriEnabled,
                mri_tarih: data.mri_tarih,
                mri_ozet: data.mri_ozet,
                lokasyonlar: JSON.stringify(cores.filter(c => c.taken)),
                prosedur_notu: data.prosedur_notu
            };

            const result = await api.clinical.createTrusBiopsy(payload);
            toast.success("TRUS Biyopsi kaydı oluşturuldu.");
            // Redirect to Print Page
            router.push(`/print/trus-biopsy/${result.id}`);
        } catch (error) {
            console.error(error);
            toast.error("Kaydetme başarısız.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!patient) return <div className="p-10">Yükleniyor...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link href={`/patients/${patientId}`} className="text-slate-500 hover:text-slate-700">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-800">Yeni TRUS Biyopsi Patoloji İsteği</h1>
                    <p className="text-slate-500 text-sm">{patient.ad} {patient.soyad}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Klinik Bilgiler */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">PSA (Total)</label>
                            <input {...register("psa_total")} className="w-full border-slate-300 rounded-lg p-2.5 bg-slate-50" placeholder="örn. 5.4 ng/mL" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Parmakla Muayene (DRE)</label>
                            <input {...register("rektal_tuse")} className="w-full border-slate-300 rounded-lg p-2.5 bg-slate-50" placeholder="örn. Benign, Nodül yok" />
                        </div>
                    </div>

                    <hr className="my-4" />

                    {/* MRI Bilgileri */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <input
                                type="checkbox"
                                id="mri_chk"
                                checked={mriEnabled}
                                onChange={e => setMriEnabled(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer"
                            />
                            <label htmlFor="mri_chk" className="font-semibold text-slate-800 cursor-pointer select-none">Multiparametrik Prostat MRI Var</label>
                        </div>

                        {mriEnabled && (
                            <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fadeIn">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Görüntüleme Tarihi</label>
                                    <Controller
                                        control={control}
                                        name="mri_tarih"
                                        render={({ field }) => (
                                            <DatePicker
                                                date={field.value}
                                                setDate={field.onChange}
                                                className="bg-white border-slate-300"
                                            />
                                        )}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">MRI Özeti (PIRADS, Boyut, Lezyon)</label>
                                    <textarea
                                        {...register("mri_ozet")}
                                        rows={4}
                                        className="w-full border-slate-300 rounded-lg p-3"
                                        placeholder="Özet: PIRADS 4 lezyon, Periferal zon posterorda 12mm..."
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <hr className="my-4" />

                    {/* Biyopsi Lokasyonları */}
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-3">Biyopsi Lokasyonları</h3>
                        <p className="text-sm text-slate-500 mb-4">Alınan örnekleri işaretleyiniz.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cores.map(core => (
                                <div
                                    key={core.id}
                                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${core.taken ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                    onClick={() => toggleCore(core.id)}
                                >
                                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${core.taken ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                        {core.taken && <Save size={12} className="text-white" />}
                                    </div>
                                    <span className={`font-medium ${core.taken ? 'text-blue-900' : 'text-slate-600'}`}>{core.id}. {core.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ek Notlar / Prosedür Notu</label>
                        <textarea
                            {...register("prosedur_notu")}
                            rows={3}
                            className="w-full border-slate-300 rounded-lg p-3"
                            placeholder="İşlemle ilgili özel notlar..."
                        />
                    </div>

                    <div className="flex justify-end pt-6">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 flex items-center gap-2 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                        >
                            <Save size={20} />
                            {isSubmitting ? "Kaydediliyor..." : "Kaydet ve PDF Oluştur"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
