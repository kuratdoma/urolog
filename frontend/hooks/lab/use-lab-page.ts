import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { api } from "@/lib/api";
import { 
    LabBiochemistry, 
    LabHemogram, 
    LabUrine, 
    LabSpermiogram, 
    LabTrusBiopsy, 
    LabUroflowmetriCreate, 
    Patient 
} from "@/lib/api/types";
import { useAuthStore } from "@/stores/auth-store";
import { normalizeTestName, canonicalizeTestName } from "@/lib/lab-utils";
import { FastLabRowType } from "@/components/lab/FastLabRow";

export const useLabPage = () => {
    const params = useParams();
    const patientId = String(params.id);
    const queryClient = useQueryClient();
    const { token: authToken } = useAuthStore();

    // -- Global State --
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [activeTab, setActiveTab] = useState("biochemistry");

    // -- Tab States --
    const [fastLabRows, setFastLabRows] = useState<FastLabRowType[]>([
        { id: 1, test: '', result: '', unit: '', reference: '' }, 
        { id: 2, test: '', result: '', unit: '', reference: '' }
    ]);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<number[]>([]);
    const [isLabAnalysisOpen, setIsLabAnalysisOpen] = useState(false);
    const [historySearch, setHistorySearch] = useState("");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'tarih', direction: 'desc' });
    
    // Trend Chart States
    const [trendModalOpen, setTrendModalOpen] = useState(false);
    const [selectedTrendTest, setSelectedTrendTest] = useState<string | null>(null);

    // Section specific states
    const [hemoValues, setHemoValues] = useState<Partial<LabHemogram>>({});
    const [urineValues, setUrineValues] = useState<Partial<LabUrine>>({});
    const [spermValues, setSpermValues] = useState<Partial<LabSpermiogram>>({});
    const [trusValues, setTrusValues] = useState<Partial<LabTrusBiopsy>>({});
    const [biopsyDate, setBiopsyDate] = useState<Date | undefined>();
    const [pathologyChecks, setPathologyChecks] = useState<string[]>([]);
    const [tumorChecks, setTumorChecks] = useState<string[]>([]);
    const [uroflowValues, setUroflowValues] = useState<Partial<LabUroflowmetriCreate>>({});
    const [uroflowFile, setUroflowFile] = useState<File | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

    // Paste Logic
    const [pasteText, setPasteText] = useState("");
    const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);

    // -- Queries --
    const { data: patient } = useQuery({
        queryKey: ['patient', patientId],
        queryFn: () => api.patients.get(patientId),
    });

    const { data: shardedTetkikler = [] } = useQuery({
        queryKey: ['definitions', 'tetkik-tanimlari', 'LAB'],
        queryFn: () => api.definitions.tetkikTanimlari.list('LAB'),
    });

    const { data: biopsiSablonlari = [] } = useQuery({
        queryKey: ['definitions', 'biyopsi-sablonlari'],
        queryFn: () => api.definitions.biyopsiSablonlari.list(),
    });

    const { data: receteSablonlari = [] } = useQuery({
        queryKey: ['definitions', 'recete-sablonlari'],
        queryFn: () => api.definitions.receteSablonlari.list(),
    });

    const genelLabsQuery = useQuery({
        queryKey: ['labs', patientId, 'genel'],
        queryFn: () => api.clinical.getLabs(patientId, 'genel'),
    });

    const trusQuery = useQuery({
        queryKey: ['trus-biopsies', patientId],
        queryFn: () => api.clinical.getTrusBiopsies(patientId),
        enabled: activeTab === 'trus_biopsy',
    });

    // -- Logic & Memos --
    const ORDER_SETS = useMemo(() => {
        const sets: Record<string, string[]> = {};
        receteSablonlari.forEach(s => {
            sets[s.ad] = s.icerik.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        });
        return sets;
    }, [receteSablonlari]);

    const sortItems = useCallback((items: any[]) => {
        if (!sortConfig) return items;
        return [...items].sort((a: any, b: any) => {
            if (sortConfig.key === 'tarih') {
                const dateA = a.tarih ? new Date(a.tarih).getTime() : 0;
                const dateB = b.tarih ? new Date(b.tarih).getTime() : 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (sortConfig.key === 'tetkik_adi') {
                const valA = a.tetkik_adi || "";
                const valB = b.tetkik_adi || "";
                return sortConfig.direction === 'asc'
                    ? valA.localeCompare(valB, 'tr')
                    : valB.localeCompare(valA, 'tr');
            }
            return 0;
        });
    }, [sortConfig]);

    const filteredLabs = useMemo(() => {
        const EXCLUDED = ['Üroflowmetri', 'Semen Analizi', 'TRUS / Prostat Biyopsi'];
        if (!genelLabsQuery.data) return [];
        let filtered = genelLabsQuery.data.filter((lab: any) => !EXCLUDED.includes(lab.tetkik_adi));
        if (historySearch) {
            filtered = filtered.filter((lab: any) => (lab.tetkik_adi || "").toLowerCase().includes(historySearch.toLowerCase()));
        }
        return sortItems(filtered);
    }, [genelLabsQuery.data, historySearch, sortItems]);

    const trusTemplates = useMemo(() => biopsiSablonlari.map(s => `${s.no}|${s.lokasyon}`), [biopsiSablonlari]);
    
    // History Memos
    const spermHistory = useMemo(() => sortItems(genelLabsQuery.data?.filter((l: any) => l.tetkik_adi === 'Spermiogram' || l.tetkik_adi === 'Semen Analizi') || []), [genelLabsQuery.data, sortItems]);
    const urineHistory = useMemo(() => sortItems(genelLabsQuery.data?.filter((l: any) => (l.tetkik_adi || '').startsWith('İdrar')) || []), [genelLabsQuery.data, sortItems]);
    const trusHistory = useMemo(() => sortItems(trusQuery.data || []), [trusQuery.data, sortItems]);
    const uroflowHistory = useMemo(() => sortItems(genelLabsQuery.data?.filter((lab: any) => lab.tetkik_adi === 'Üroflowmetri') || []), [genelLabsQuery.data, sortItems]);

    // Trend Data
    const trendData = useMemo(() => {
        if (!selectedTrendTest || !genelLabsQuery.data) return [];
        return (genelLabsQuery.data as any[])
            .filter(l => normalizeTestName(l.tetkik_adi) === normalizeTestName(selectedTrendTest))
            .map(l => ({
                date: l.tarih ? format(parseISO(l.tarih), 'dd.MM.yy') : '-',
                fullDate: l.tarih,
                value: parseFloat(String(l.sonuc || "").replace(',', '.')),
                originalResult: l.sonuc,
                unit: l.birim
            }))
            .filter(l => !isNaN(l.value))
            .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    }, [selectedTrendTest, genelLabsQuery.data]);

    // -- Callbacks --
    const toggleSort = useCallback((key: string) => {
        setSortConfig(prev => (prev?.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' }));
    }, []);

    const applyOrderSet = useCallback((setName: string) => {
        const tests = ORDER_SETS[setName];
        if (!tests) return;
        const newRows = tests.map((test, index) => ({ id: Date.now() + index, test, result: '', unit: '', reference: '' }));
        newRows.push({ id: Date.now() + tests.length, test: '', result: '', unit: '', reference: '' });
        setFastLabRows(newRows);
        toast.success(`${setName} paketi uygulandı.`);
    }, [ORDER_SETS]);

    const handleApplyLabAnalysis = useCallback((results: any[], reportDate?: string) => {
        const newRows = results.map((item, index) => ({
            id: Date.now() + index,
            test: canonicalizeTestName(item.test_name),
            result: item.result_value,
            unit: item.unit || '',
            reference: item.reference_range || '',
            date: item.report_date?.replace(" ", "T") || (date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'))
        }));
        setFastLabRows(prev => [...prev.filter(r => r.test !== ''), ...newRows, { id: Date.now() + 999, test: '', result: '', unit: '', reference: '' }]);
        toast.success(`${newRows.length} sonuç listeye eklendi.`);
        setActiveTab('biochemistry');
    }, [date]);

    const handleFastLabChange = useCallback((id: number, field: keyof FastLabRowType, value: string) => {
        setFastLabRows(prev => {
            const newRows = prev.map(row => row.id === id ? { ...row, [field]: value } : row);
            const lastRow = newRows[newRows.length - 1];
            if (lastRow.id === id && value !== '') {
                return [...newRows, { id: Date.now(), test: '', result: '', unit: '', reference: '' }];
            }
            return newRows;
        });
    }, []);

    const removeFastLabRow = useCallback((id: number) => {
        setFastLabRows(prev => prev.length <= 1 ? [{ id: Date.now(), test: '', result: '', unit: '', reference: '' }] : prev.filter(row => row.id !== id));
    }, []);

    const handleFastLabKeyDown = useCallback((e: React.KeyboardEvent, id: number, field: keyof FastLabRowType) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const fieldMap: Record<string, string> = { test: 'result', result: 'unit', unit: 'reference' };
            if (fieldMap[field]) {
                document.getElementById(`${fieldMap[field]}-${id}`)?.focus();
            } else if (field === 'reference') {
                const index = fastLabRows.findIndex(r => r.id === id);
                if (index === fastLabRows.length - 1) {
                    setFastLabRows(prev => [...prev, { id: Date.now(), test: '', result: '', unit: '', reference: '' }]);
                    setTimeout(() => {
                        const inputs = document.querySelectorAll('input[id^="name-"]');
                        (inputs[inputs.length - 1] as HTMLInputElement)?.focus();
                    }, 50);
                } else {
                    document.getElementById(`name-${fastLabRows[index + 1].id}`)?.focus();
                }
            }
        }
    }, [fastLabRows]);

    const handleTrendClick = useCallback((testName: string) => {
        setSelectedTrendTest(testName);
        setTrendModalOpen(true);
    }, []);

    const handleDownloadChart = () => {
        if (trendData.length === 0) return;
        const csvContent = ["Tarih,Test,Sonuç,Birim", ...trendData.map(d => `${d.fullDate},${selectedTrendTest},${d.originalResult},${d.unit}`)].join('\n');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }));
        link.download = `${selectedTrendTest}_trend.csv`;
        link.click();
    };

    // -- Mutations --
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!date) throw new Error("Tarih gerekli");
            const baseData = { hasta_id: patientId, tarih: format(date, 'yyyy-MM-dd') };
            
            if (activeTab === 'biochemistry') {
                const rows = fastLabRows.filter(r => r.test.trim() !== '').map(row => ({
                    ...baseData,
                    tarih: row.date || baseData.tarih,
                    tetkik_adi: row.test,
                    sonuc: row.result,
                    birim: row.unit,
                    referans_araligi: row.reference
                }));
                if (rows.length === 0) throw new Error("Veri yok");
                return api.clinical.createGenelLabBatch(rows);
            }

            if (activeTab === 'trus_biopsy') {
                const tumorLocations = tumorChecks.map(check => trusTemplates.find(t => t.startsWith(check + '|')) || check);
                const payload = {
                    ...baseData,
                    tarih: biopsyDate ? format(biopsyDate, 'yyyy-MM-dd') : baseData.tarih,
                    ...trusValues,
                    prosedur_notu: [
                        trusValues.trus_bulgu ? `Bulgular: ${trusValues.trus_bulgu}` : '',
                        trusValues.trus_tani ? `Tanı: ${trusValues.trus_tani}` : '',
                        trusValues.prostat_volum ? `Volüm: ${trusValues.prostat_volum} cc` : '',
                        `Patoloji: ${pathologyChecks.join(', ')}`,
                        `Tümörlü Alanlar: ${tumorLocations.join(', ')}`
                    ].filter(Boolean).join('\n'),
                    lokasyonlar: JSON.stringify([])
                };
                return api.clinical.createTrusBiopsy(payload as any);
            }

            if (activeTab === 'uroflowmetri') {
                let pdfUrl = '';
                if (uroflowFile) pdfUrl = (await api.documents.upload(uroflowFile)).url;
                const payload = { ...baseData, ...uroflowValues, pdf_url: pdfUrl || undefined };
                return api.clinical.createUroflowmetri(payload as any);
            }

            const tabValues: Record<string, any> = { hemogram: hemoValues, urine: urineValues, spermiogram: spermValues };
            return api.clinical.createLab(activeTab, { ...baseData, ...tabValues[activeTab] });
        },
        onSuccess: () => {
            toast.success("Kayıt Başarılı");
            queryClient.invalidateQueries({ queryKey: ['labs', patientId] });
            if (activeTab === 'trus_biopsy') queryClient.invalidateQueries({ queryKey: ['trus-biopsies', patientId] });
            if (activeTab === 'biochemistry') setFastLabRows([{ id: Date.now(), test: '', result: '', unit: '', reference: '' }, { id: Date.now() + 1, test: '', result: '', unit: '', reference: '' }]);
            if (activeTab === 'uroflowmetri') { setUroflowValues({}); setUroflowFile(null); }
        },
        onError: () => toast.error("Kayıt Başarısız")
    });

    const deleteHistoryMutation = useMutation({
        mutationFn: () => api.clinical.deleteGenelLabBatch(selectedHistoryIds),
        onSuccess: () => {
            toast.success("Silindi");
            setSelectedHistoryIds([]);
            queryClient.invalidateQueries({ queryKey: ['labs', patientId] });
        },
        onError: () => toast.error("Hata")
    });

    const deleteUroflowmetriBatchMutation = useMutation({
        mutationFn: async () => {
            await Promise.all(selectedHistoryIds.map(id => api.clinical.deleteUroflowmetri(String(id))));
        },
        onSuccess: () => {
            toast.success("Seçili üroflowmetri kayıtları silindi");
            setSelectedHistoryIds([]);
            queryClient.invalidateQueries({ queryKey: ['labs', patientId] });
        },
        onError: () => toast.error("Silme işlemi başarısız")
    });

    const deleteTrusBiopsyBatchMutation = useMutation({
        mutationFn: async () => {
            await Promise.all(selectedHistoryIds.map(id => api.clinical.deleteTrusBiopsy(String(id))));
        },
        onSuccess: () => {
            toast.success("Seçili TRUS biyopsi kayıtları silindi");
            setSelectedHistoryIds([]);
            queryClient.invalidateQueries({ queryKey: ['trus-biopsies', patientId] });
        },
        onError: () => toast.error("Silme işlemi başarısız")
    });


    const parsePasteMutation = useMutation({
        mutationFn: (text: string) => api.clinical.parseLabText(text),
        onSuccess: (data: any) => {
            if (data.report_date) setDate(parseISO(data.report_date));
            if (data.results?.length > 0) {
                const newRows = data.results.map((res: any, i: number) => ({
                    id: Date.now() + i,
                    test: canonicalizeTestName(res.test_name),
                    result: res.value?.toString() || '',
                    unit: res.unit || '',
                    reference: res.reference_range || '',
                    date: res.date
                }));
                newRows.push({ id: Date.now() + 999, test: '', result: '', unit: '', reference: '' });
                setFastLabRows(newRows);
                setIsPasteDialogOpen(false);
                setPasteText("");
            }
        }
    });

    return {
        patient,
        date, setDate,
        activeTab, setActiveTab,
        fastLabRows, handleFastLabChange, removeFastLabRow, handleFastLabKeyDown,
        hemoValues, setHemoValues,
        urineValues, setUrineValues,
        spermValues, setSpermValues,
        trusValues, setTrusValues,
        biopsyDate, setBiopsyDate,
        pathologyChecks, setPathologyChecks,
        tumorChecks, setTumorChecks,
        uroflowValues, setUroflowValues,
        uroflowFile, setUroflowFile,
        pdfPreviewUrl, setPdfPreviewUrl,
        filteredLabs,
        urineHistory,
        spermHistory,
        trusHistory,
        uroflowHistory,
        selectedHistoryIds, setSelectedHistoryIds,
        historySearch, setHistorySearch,
        sortConfig, toggleSort,
        trendModalOpen, setTrendModalOpen,
        selectedTrendTest, trendData, handleTrendClick, handleDownloadChart,
        ORDER_SETS, applyOrderSet,
        isLabAnalysisOpen, setIsLabAnalysisOpen, handleApplyLabAnalysis,
        isPasteDialogOpen, setIsPasteDialogOpen, pasteText, setPasteText,
        handlePasteAnalysis: () => parsePasteMutation.mutate(pasteText),
        saveMutation,
        deleteHistoryMutation,
        deleteUroflowmetriBatchMutation,
        deleteTrusBiopsyBatchMutation,
        toggleHistorySelection: (id: number) => setSelectedHistoryIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]),
        toggleSelectAllHistory: (customIds?: number[]) => {
            const allIds = customIds || filteredLabs.map((l: any) => l.id);
            setSelectedHistoryIds(selectedHistoryIds.length > 0 && selectedHistoryIds.length === allIds.length ? [] : allIds);
        },
        handlePrint: () => {
            if (selectedHistoryIds.length === 0) return toast.error("Seçim yapın");
            window.open(`/print/lab/batch?ids=${selectedHistoryIds.join(',')}`, "_blank");
        },
        trusTemplates
    };
};
