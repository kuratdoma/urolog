"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { usePatientStore } from "@/stores/patient-store";
import { api, Photo, Patient } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { PatientHeader } from "@/components/clinical/patient-header";
import { toast } from "sonner";

// Modüler Alt Bileşenler
import { PhotoLightboxDialog } from "@/components/photos/PhotoLightboxDialog";
import { PhotoSidebarList } from "@/components/photos/PhotoSidebarList";
import { PhotoActionBar } from "@/components/photos/PhotoActionBar";
import { PhotoFormAndDropzone } from "@/components/photos/PhotoFormAndDropzone";

export default function PhotoArchivePage() {
    const params = useParams();
    const patientId = String(params.id);
    const { activePatient, setActivePatient } = usePatientStore();
    const { token: authToken } = useAuthStore();
    const [patient, setPatient] = useState<Patient | null>(null);

    // Data State
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [, setLoading] = useState(true);

    // Form State
    const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [stage, setStage] = useState<string>("HPV");
    const [title, setTitle] = useState<string>("");
    const [tags, setTags] = useState<string>("");
    const [notes, setNotes] = useState<string>("");

    // File State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [previewUrls, setPreviewUrls] = useState<string[]>([]);
    const [fileUrl, setFileUrl] = useState<string>("");
    const [isDragging, setIsDragging] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Multi-Select State
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);

    // Lightbox State
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Search State
    const [searchTerm, setSearchTerm] = useState("");
    const filteredPhotos = useMemo(() => photos.filter(p =>
        (p.etiketler || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.asama || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.notlar || "").toLowerCase().includes(searchTerm.toLowerCase())
    ), [photos, searchTerm]);

    const loadData = useCallback(async () => {
        if (!patientId) return;
        try {
            const patientData = await api.patients.get(patientId);
            setPatient(patientData);
            if (!activePatient || activePatient.id !== patientId) {
                setActivePatient({
                    id: patientData.id,
                    ad: patientData.ad,
                    soyad: patientData.soyad,
                    tc_kimlik: patientData.tc_kimlik,
                });
            }

            const data = await api.clinical.getPhotos(patientId);
            data.sort((a, b) => new Date(b.tarih || '').getTime() - new Date(a.tarih || '').getTime());
            setPhotos(data);
        } catch (error) {
            console.error(error);
            toast.error("Veriler yüklenirken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [patientId, activePatient, setActivePatient]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleNewPhoto = useCallback(() => {
        setSelectedPhotoId(null);
        setSelectedPhotoIds([]);
        setDate(new Date().toISOString().split('T')[0]);
        setStage("HPV");
        setTitle("");
        setTags("");
        setNotes("");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setFileUrl("");
        toast.info("Yeni fotoğraf formu.");
    }, []);

    const handleSelectPhoto = useCallback((photo: Photo) => {
        setSelectedPhotoId(photo.id || null);
        setDate(photo.tarih || new Date().toISOString().split('T')[0]);
        setStage(photo.asama || "HPV");
        setTitle(photo.baslik || "");
        setTags(photo.etiketler || "");
        setNotes(photo.notlar || "");
        setSelectedFiles([]);
        setPreviewUrls([]);
        setFileUrl(photo.dosya_yolu || "");
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            if (selectedPhotoId) {
                const file = files[0];
                setSelectedFiles([file]);
                setPreviewUrls([URL.createObjectURL(file)]);
                toast.success("Değiştirilecek dosya: " + file.name);
            } else {
                setSelectedFiles(prev => [...prev, ...files]);
                const newUrls = files.map(f => URL.createObjectURL(f));
                setPreviewUrls(prev => [...prev, ...newUrls]);
                toast.success(`${files.length} fotoğraf eklendi.`);
            }
        }
    };

    const handleRemoveFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setPreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

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
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length === 0) {
                toast.error("Lütfen sadece görsel dosyaları yükleyin.");
                return;
            }
            if (selectedPhotoId) {
                const file = files[0];
                setSelectedFiles([file]);
                setPreviewUrls([URL.createObjectURL(file)]);
                toast.success("Değiştirilecek dosya: " + file.name);
            } else {
                setSelectedFiles(prev => [...prev, ...files]);
                const newUrls = files.map(f => URL.createObjectURL(f));
                setPreviewUrls(prev => [...prev, ...newUrls]);
                toast.success(`${files.length} fotoğraf eklendi.`);
            }
        }
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            if (selectedPhotoId) {
                let finalFileUrl = fileUrl;
                if (selectedFiles.length > 0) {
                    const uploadResp = await api.documents.upload(selectedFiles[0]);
                    if (uploadResp.url) finalFileUrl = uploadResp.url;
                }

                await api.clinical.updatePhoto(selectedPhotoId, {
                    hasta_id: patientId,
                    tarih: date,
                    asama: stage,
                    baslik: title,
                    etiketler: tags,
                    notlar: notes,
                    dosya_yolu: finalFileUrl,
                    dosya_adi: selectedFiles.length > 0 ? selectedFiles[0].name : (tags || "image.jpg")
                });
                toast.success("Fotoğraf güncellendi.");
            } else {
                if (selectedFiles.length === 0 && !fileUrl) {
                    toast.error("Lütfen en az bir fotoğraf seçin.");
                    setIsSaving(false);
                    return;
                }

                if (selectedFiles.length > 0) {
                    let successCount = 0;
                    for (const file of selectedFiles) {
                        try {
                            const uploadResp = await api.documents.upload(file);
                            if (uploadResp.url) {
                                await api.clinical.createPhoto({
                                    hasta_id: patientId,
                                    tarih: date,
                                    asama: stage,
                                    baslik: title || file.name,
                                    etiketler: tags,
                                    notlar: notes,
                                    dosya_yolu: uploadResp.url,
                                    dosya_adi: file.name
                                });
                                successCount++;
                            }
                        } catch (e) {
                            console.error("Fotoğraf yükleme hatası:", file.name, e);
                        }
                    }
                    toast.success(`${successCount} fotoğraf kaydedildi.`);
                }
            }
            handleNewPhoto();
            loadData();
        } catch {
            toast.error("Kaydetme sırasında bir hata oluştu.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        const idsToDelete = selectedPhotoIds.length > 0
            ? selectedPhotoIds
            : (selectedPhotoId ? [selectedPhotoId] : []);

        if (idsToDelete.length === 0) return;

        try {
            for (const id of idsToDelete) {
                await api.clinical.deletePhoto(id);
            }
            toast.success(`${idsToDelete.length} fotoğraf silindi.`);
            setSelectedPhotoIds([]);
            handleNewPhoto();
            loadData();
        } catch {
            toast.error("Silme işlemi başarısız.");
        }
    };

    const handleDownload = (ids?: string[]) => {
        const targets = ids || (selectedPhotoIds.length > 0 ? selectedPhotoIds : (selectedPhotoId ? [selectedPhotoId] : []));
        if (targets.length === 0) return;

        targets.forEach(id => {
            const downloadUrl = `/api/v1/clinical/photos/${id}/download?token=${authToken}`;
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = '';
            link.click();
        });
    };

    const togglePhotoSelection = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedPhotoIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAllPhotos = () => {
        if (selectedPhotoIds.length === filteredPhotos.length) {
            setSelectedPhotoIds([]);
        } else {
            setSelectedPhotoIds(filteredPhotos.map(p => p.id).filter(Boolean) as string[]);
        }
    };

    const getPhotoUrl = (photo?: Photo) => {
        if (!photo || !photo.dosya_yolu) return "";
        if (photo.dosya_yolu.startsWith("blob:") || photo.dosya_yolu.startsWith("http")) return photo.dosya_yolu;
        if (photo.id) return `/api/v1/clinical/photos/${photo.id}/download?token=${authToken}`;
        return `/api/v1/documents/download-path?path=${encodeURIComponent(photo.dosya_yolu)}&token=${authToken}`;
    };

    const openLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setIsLightboxOpen(true);
    };

    const nextPhoto = useCallback(() => {
        setLightboxIndex(prev => (prev + 1) % filteredPhotos.length);
    }, [filteredPhotos.length]);

    const prevPhoto = useCallback(() => {
        setLightboxIndex(prev => (prev - 1 + filteredPhotos.length) % filteredPhotos.length);
    }, [filteredPhotos.length]);

    useKeyboardShortcuts({
        onSave: () => {
            if (!isSaving) handleSave();
        },
        onNew: handleNewPhoto
    });

    return (
        <div className="flex h-full flex-col gap-6 p-6 lg:flex-row bg-slate-50/50 min-h-screen">
            {/* Left Side: Main Content */}
            <div className="flex-1 space-y-6">
                <PatientHeader patient={patient} moduleName="Fotoğraf Arşivi" />

                <PhotoActionBar
                    date={date}
                    setDate={setDate}
                    handleNewPhoto={handleNewPhoto}
                    handleFileSelect={handleFileSelect}
                    handleSave={handleSave}
                    handleDelete={handleDelete}
                    handleDownload={handleDownload}
                    selectedPhotoId={selectedPhotoId}
                    selectedPhotoIds={selectedPhotoIds}
                    isSaving={isSaving}
                />

                <PhotoFormAndDropzone
                    title={title}
                    setTitle={setTitle}
                    tags={tags}
                    setTags={setTags}
                    stage={stage}
                    setStage={setStage}
                    notes={notes}
                    setNotes={setNotes}
                    isDragging={isDragging}
                    handleDragOver={handleDragOver}
                    handleDragLeave={handleDragLeave}
                    handleDrop={handleDrop}
                    previewUrls={previewUrls}
                    fileUrl={fileUrl}
                    selectedFiles={selectedFiles}
                    selectedPhotoId={selectedPhotoId}
                    authToken={authToken}
                    handleRemoveFile={handleRemoveFile}
                    openLightbox={openLightbox}
                    filteredPhotos={filteredPhotos}
                    setSelectedFiles={setSelectedFiles}
                    setPreviewUrls={setPreviewUrls}
                />
            </div>

            {/* Right Side: Sidebar */}
            <PhotoSidebarList
                photos={photos}
                filteredPhotos={filteredPhotos}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                selectedPhotoId={selectedPhotoId}
                selectedPhotoIds={selectedPhotoIds}
                patientId={patientId}
                handleSelectPhoto={handleSelectPhoto}
                togglePhotoSelection={togglePhotoSelection}
                selectAllPhotos={selectAllPhotos}
                openLightbox={openLightbox}
                getPhotoUrl={getPhotoUrl}
                onRefresh={loadData}
            />

            {/* Lightbox Modal */}
            <PhotoLightboxDialog
                isLightboxOpen={isLightboxOpen}
                setIsLightboxOpen={setIsLightboxOpen}
                filteredPhotos={filteredPhotos}
                lightboxIndex={lightboxIndex}
                setLightboxIndex={setLightboxIndex}
                getPhotoUrl={getPhotoUrl}
                handleDownload={handleDownload}
                prevPhoto={prevPhoto}
                nextPhoto={nextPhoto}
            />
        </div>
    );
}
