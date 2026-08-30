"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { usePatientStore } from "@/stores/patient-store";
import { api, Patient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { PatientHeader } from "@/components/clinical/patient-header";
import { toast } from "sonner";

// Modüler Alt Bileşenler
import { DocumentPreviewDialog } from "@/components/archive/DocumentPreviewDialog";
import { DocumentSidebarList } from "@/components/archive/DocumentSidebarList";
import { DocumentFormFields } from "@/components/archive/DocumentFormFields";
import { DocumentUploadDropzone } from "@/components/archive/DocumentUploadDropzone";
import { DocumentActionBar } from "@/components/archive/DocumentActionBar";

interface Document {
    id: number;
    hasta_id: string;
    tarih: string;
    kategori: string;
    dosya_tipi: string;
    dosya_adi: string;
    dosya_yolu: string;
    aciklama: string;
    etiketler?: string;
    arsiv_no: string;
    created_at: string;
}

export default function DocumentArchivePage() {
    const params = useParams();
    const patientId = String(params.id);
    const { activePatient, setActivePatient } = usePatientStore();
    const { token: authToken } = useAuthStore();
    const [patient, setPatient] = useState<Patient | null>(null);

    // Data State
    const [documents, setDocuments] = useState<Document[]>([]);
    const [, setLoading] = useState(true);

    // Form State
    const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState<string>("Epikriz");
    const [title, setTitle] = useState<string>("");
    const [notes, setNotes] = useState<string>("");
    const [tags, setTags] = useState<string>("");
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isViewing, setIsViewing] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [fitMode, setFitMode] = useState<"contain" | "cover" | "none">("contain");

    // Drag & Drop State
    const [isDragging, setIsDragging] = useState(false);
    const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const fileList = Array.from(e.dataTransfer.files);
            setSelectedFiles(fileList);
            const firstFile = fileList[0];
            setFileUrl(URL.createObjectURL(firstFile));
            if (!title) {
                const nameWithoutExt = firstFile.name.substring(0, firstFile.name.lastIndexOf('.')) || firstFile.name;
                setTitle(nameWithoutExt);
            }
        }
    };

    // Filter & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterCategory, setFilterCategory] = useState("Hepsi");

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            if (!activePatient || activePatient.id !== patientId) {
                const p = await api.patients.get(patientId);
                setPatient(p);
                setActivePatient({
                    id: p.id,
                    ad: p.ad,
                    soyad: p.soyad,
                    tc_kimlik: p.tc_kimlik,
                    dogum_tarihi: p.dogum_tarihi,
                    protokol_no: p.protokol_no,
                    cinsiyet: p.cinsiyet,
                });
            } else {
                setPatient(activePatient as unknown as Patient);
            }

            const data = (await api.documents.list(patientId)) as unknown as Document[];
            data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setDocuments(data || []);
        } catch {
            toast.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [patientId, activePatient, setActivePatient]);

    useEffect(() => {
        if (patientId) {
            loadData();
        }
    }, [patientId, loadData]);

    const handleSelectDoc = useCallback((doc: Document) => {
        setSelectedDocId(doc.id);
        setDate(doc.tarih ? doc.tarih.split('T')[0] : "");
        setCategory(doc.kategori || "Epikriz");
        setTitle(doc.dosya_adi || "");
        setNotes(doc.aciklama || "");
        setTags(doc.etiketler || "");
        setSelectedFiles([]);
        setFileUrl(doc.dosya_yolu);
    }, []);

    const handleNewDoc = useCallback(() => {
        setSelectedDocId(null);
        setDate(new Date().toISOString().split('T')[0]);
        setCategory("Epikriz");
        setTitle("");
        setNotes("");
        setTags("");
        setSelectedFiles([]);
        setFileUrl("");
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const fileList = Array.from(e.target.files);
            setSelectedFiles(fileList);
            const firstFile = fileList[0];
            setFileUrl(URL.createObjectURL(firstFile));
            if (!title) {
                const nameWithoutExt = firstFile.name.substring(0, firstFile.name.lastIndexOf('.')) || firstFile.name;
                setTitle(nameWithoutExt);
            }
        }
    };

    const handleSave = async () => {
        if (!title && selectedFiles.length === 0) {
            toast.error("Lütfen belge başlığı giriniz veya dosya yükleyiniz.");
            return;
        }

        try {
            if (selectedDocId) {
                let finalFileUrl = fileUrl;
                let fileType = documents.find(d => d.id === selectedDocId)?.dosya_tipi || "PDF";

                if (selectedFiles.length > 0) {
                    const uploadResp = await api.documents.upload(selectedFiles[0]);
                    if (uploadResp.url) finalFileUrl = uploadResp.url;
                    fileType = selectedFiles[0].type;
                }

                await api.documents.update(selectedDocId, {
                    patient_id: patientId,
                    tarih: date,
                    kategori: category,
                    dosya_adi: title,
                    dosya_tipi: fileType,
                    dosya_yolu: finalFileUrl,
                    aciklama: notes,
                    etiketler: tags
                });
                toast.success("Belge güncellendi.");
            } else {
                if (selectedFiles.length === 0) {
                    toast.error("Lütfen en az bir dosya seçin.");
                    return;
                }

                toast.info(`${selectedFiles.length} belge kaydediliyor...`);

                for (let i = 0; i < selectedFiles.length; i++) {
                    const file = selectedFiles[i];
                    const uploadResp = await api.documents.upload(file);

                    if (uploadResp.url) {
                        await api.documents.create({
                            hasta_id: patientId,
                            tarih: date,
                            kategori: category,
                            dosya_adi: selectedFiles.length === 1 ? title : file.name,
                            dosya_tipi: file.type,
                            dosya_yolu: uploadResp.url,
                            aciklama: notes,
                            etiketler: tags,
                            arsiv_no: `DOC-${Date.now()}-${i}`
                        });
                    }
                }
                toast.success(`${selectedFiles.length} belge başarıyla kaydedildi.`);
            }

            handleNewDoc();
            loadData();
        } catch {
            toast.error("Kaydetme işlemi başarısız.");
        }
    };

    const handleDelete = async () => {
        if (!selectedDocId) return;

        try {
            await api.documents.delete(selectedDocId);
            toast.success("Belge silindi.");
            handleNewDoc();
            loadData();
        } catch {
            toast.error("Silme işlemi başarısız.");
        }
    };

    const handleDownload = (docId?: number) => {
        const idToDownload = docId || selectedDocId;
        if (!idToDownload) return;

        const downloadUrl = `/api/v1/documents/download/${idToDownload}?token=${authToken}&download=1`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = '';
        link.click();
    };

    const toggleDocSelection = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllDocs = () => {
        if (selectedDocIds.length === filteredDocs.length) {
            setSelectedDocIds([]);
        } else {
            setSelectedDocIds(filteredDocs.map(d => d.id));
        }
    };

    const filteredDocs = useMemo(() => {
        return documents.filter(doc => {
            const matchesCat = filterCategory === "Hepsi" || doc.kategori === filterCategory;
            const matchesSearch = !searchQuery ||
                doc.dosya_adi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.aciklama?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.etiketler?.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCat && matchesSearch;
        });
    }, [documents, filterCategory, searchQuery]);

    const isPdf = useMemo(() => Boolean(
        (selectedFiles.length > 0 && selectedFiles[0].type === 'application/pdf') ||
        (fileUrl && fileUrl.toLowerCase().split('?')[0].split('#')[0].endsWith('.pdf')) ||
        (selectedDocId && (
            documents.find(d => d.id === selectedDocId)?.dosya_tipi?.toLowerCase().includes('pdf') ||
            documents.find(d => d.id === selectedDocId)?.dosya_adi?.toLowerCase().endsWith('.pdf')
        ))
    ), [selectedFiles, fileUrl, selectedDocId, documents]);

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Left Side: Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="Belge Arşivi" />

                {/* Action Bar */}
                <DocumentActionBar
                    date={date}
                    setDate={setDate}
                    handleNewDoc={handleNewDoc}
                    handleFileSelect={handleFileSelect}
                    handleSave={handleSave}
                    handleDelete={handleDelete}
                    handleDownload={handleDownload}
                    selectedDocId={selectedDocId}
                    selectedDocIds={selectedDocIds}
                />

                {/* Two-Column Layout: Left 30% (Form Fields) | Right 70% (Upload Area) */}
                <div className="flex flex-col md:flex-row gap-4" style={{ minHeight: '500px' }}>
                    <DocumentFormFields
                        title={title}
                        setTitle={setTitle}
                        tags={tags}
                        setTags={setTags}
                        category={category}
                        setCategory={setCategory}
                        notes={notes}
                        setNotes={setNotes}
                    />

                    <DocumentUploadDropzone
                        fileUrl={fileUrl}
                        isPdf={isPdf}
                        title={title}
                        isDragging={isDragging}
                        handleDragOver={handleDragOver}
                        handleDragLeave={handleDragLeave}
                        handleDrop={handleDrop}
                        handleFileSelect={handleFileSelect}
                        setIsViewing={setIsViewing}
                    />
                </div>
            </div>

            {/* Right Sidebar: Documents List */}
            <DocumentSidebarList
                filterCategory={filterCategory}
                setFilterCategory={setFilterCategory}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filteredDocs={filteredDocs}
                selectedDocId={selectedDocId}
                selectedDocIds={selectedDocIds}
                handleSelectDoc={handleSelectDoc}
                toggleDocSelection={toggleDocSelection}
                selectAllDocs={selectAllDocs}
            />

            {/* Document Preview Modal */}
            <DocumentPreviewDialog
                isViewing={isViewing}
                setIsViewing={setIsViewing}
                title={title}
                fileUrl={fileUrl}
                selectedDocId={selectedDocId}
                authToken={authToken}
                documents={documents}
                selectedFiles={selectedFiles}
                zoom={zoom}
                setZoom={setZoom}
                fitMode={fitMode}
                setFitMode={setFitMode}
                handleSelectDoc={handleSelectDoc}
            />
        </div>
    );
}
