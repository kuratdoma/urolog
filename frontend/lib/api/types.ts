import { ReceteSablonu, SablonTanim } from '../api_types';

export type { ReceteSablonu, SablonTanim };

// Always use Next.js proxy to avoid CORS issues
// The proxy is configured in next.config.js to forward /api/v1/* to backend


export interface Definition {
    id: string;
    ad: string;
    aktif: boolean;
    sira?: number;
    grup?: string;
    created_at?: string;
}

export interface RandevuTuru {
    id: string;
    ad: string;
    sure: number;
    renk: string;
    aktif: boolean;
    created_at?: string;
}

export interface BiyopsiSablonu {
    id: string;
    no?: number;
    lokasyon: string;
    aktif: boolean;
    created_at?: string;
}

export interface Doktor {
    id: string;
    ad_soyad: string;
    brans?: string;
    diploma_no?: string;
    tescil_no?: string;
    uzmanlik_tescil_no?: string;
    aktif: boolean;
    created_at?: string;
}



// Types - (Keeping existing types, just updating endpoint calls below)
export interface Patient {
    id: string;
    tc_kimlik?: string;
    ad: string;
    soyad: string;
    cinsiyet?: string;
    dogum_tarihi?: string;
    dogum_yeri?: string;
    kan_grubu?: string;
    medeni_hal?: string;
    meslek?: string;
    adres?: string;
    ev_tel?: string;
    is_tel?: string;
    cep_tel?: string;
    email?: string;
    kimlik_notlar?: string;
    doktor?: string;
    created_at?: string;
    updated_at?: string;
    son_muayene_tarihi?: string;
    son_tani?: string;

    // New Fields
    referans?: string;
    postakodu?: string;
    kurum?: string;
    sigorta?: string;
    ozelsigorta?: string;
    cocuk_sayisi?: string;
    faks?: string;
    ilce?: string;
    sehir?: string;
    hasta_rec_id?: string;
    telefon_gorusme_sayisi?: number;

    // Visual based new fields
    sms_izin?: string;
    email_izin?: string;
    iletisim_kaynagi?: string;
    iletisim_tercihi?: string;
    indirim_grubu?: string;
    dil?: string;
    personel_ids?: string;
    etiketler?: string;
    kayit_notu?: string;
    protokol_no?: string;
}

export interface PatientReportDTO {
    demographics?: Patient;
    examinations: Muayene[];
    lab_results: Record<string, unknown>[];
    finance_summary?: Record<string, unknown>;
    warnings: string[];
    generated_at: string;
}

export interface Muayene {
    id: string;
    hasta_id: string;
    tarih?: string;
    sikayet?: string;
    oyku?: string;
    tansiyon?: string;
    ates?: string;
    kvah?: string;
    bobrek_sag?: string;
    bobrek_sol?: string;
    suprapubik_kitle?: string;
    ego?: string;
    rektal_tuse?: string;
    disuri?: string;
    pollakiuri?: string;
    nokturi?: string;
    hematuri?: string;
    genital_akinti?: string;
    kabizlik?: string;
    tas_oyku?: string;
    takip_notu?: string;
    sistem_sorgu?: string;
    ipss_skor?: string;
    ipss_qol?: string;
    iief_ef_skor?: string;
    iief_ef_answers?: string;
    ozgecmis?: string;
    soygecmis?: string;
    kullandigi_ilaclar?: string;
    aliskanliklar?: string;
    fizik_muayene?: string;
    catallanma?: string;
    projeksiyon_azalma?: string;
    kalibre_incelme?: string;
    idrar_bas_zorluk?: string;
    kesik_idrar_yapma?: string;
    terminal_damlama?: string;
    residiv_hissi?: string;
    inkontinans?: string;
    tani?: string;
    tani1?: string;
    tani2?: string;
    tani3?: string;
    tani4?: string;
    tani5?: string;
    sonuc?: string;
    tedavi?: string;
    oneriler?: string;
    erektil_islev?: string;
    ejakulasyon?: string;
    mshq?: string;
    prosedur?: string;
    tani1_kodu?: string;
    tani2_kodu?: string;
    tani3_kodu?: string;
    tani4_kodu?: string;
    tani5_kodu?: string;
    doktor?: string;
    bulgu_notu?: string;
    recete?: string;
    allerjiler?: string;
    kan_sulandirici?: number;
}

export interface Operation {
    id: string;
    hasta_id: string;
    tarih?: string;
    ameliyat?: string;
    pre_op_tani?: string;
    post_op_tani?: string;
    notlar?: string;
    ekip?: string;
    patoloji?: string;
    anestezi_tur?: string;
    claviendindo?: string;
    hastane_id?: string;
    asa_skoru?: string;
    anestezi_sekli?: string;
    status?: string;
    pre_op_checklist?: string;
}

export interface OperationCreate {
    hasta_id: string;
    tarih?: string;
    ameliyat?: string;
    pre_op_tani?: string;
    post_op_tani?: string;
    notlar?: string;
    ekip?: string;
    patoloji?: string;
    anestezi_tur?: string;
    claviendindo?: string;
    hastane_id?: string;
    asa_skoru?: string;
    anestezi_sekli?: string;
    status?: string;
    pre_op_checklist?: string;
}

export interface PatientCreate {
    ad: string;
    soyad: string;
    tc_kimlik?: string;
    cinsiyet?: string;
    dogum_tarihi?: string;
    dogum_yeri?: string;
    kan_grubu?: string;
    medeni_hal?: string;
    meslek?: string;
    adres?: string;
    ev_tel?: string;
    is_tel?: string;
    cep_tel?: string;
    email?: string;
    kimlik_notlar?: string;
    doktor?: string;

    // New Fields
    referans?: string;
    postakodu?: string;
    kurum?: string;
    sigorta?: string;
    ozelsigorta?: string;
    ocuk_sayisi?: string;
    faks?: string;

    // Visual based new fields
    sms_izin?: string;
    email_izin?: string;
    iletisim_kaynagi?: string;
    iletisim_tercihi?: string;
    indirim_grubu?: string;
    dil?: string;
    personel_ids?: string;
    etiketler?: string;
    kayit_notu?: string;
    protokol_no?: string;
}

export interface MuayeneCreate {
    hasta_id: string;
    tarih?: string;
    sikayet?: string;
    oyku?: string;
    tansiyon?: string;
    ates?: string;
    kvah?: string;
    bobrek_sag?: string;
    bobrek_sol?: string;
    suprapubik_kitle?: string;
    ego?: string;
    rektal_tuse?: string;
    disuri?: string;
    pollakiuri?: string;
    nokturi?: string;
    hematuri?: string;
    genital_akinti?: string;
    kabizlik?: string;
    takip_notu?: string;
    sistem_sorgu?: string;
    ipss_skor?: string;
    ipss_qol?: string;
    iief_ef_skor?: string;
    iief_ef_answers?: string;
    ozgecmis?: string;
    soygecmis?: string;
    kullandigi_ilaclar?: string;
    fizik_muayene?: string;
    catallanma?: string;
    projeksiyon_azalma?: string;
    kalibre_incelme?: string;
    idrar_bas_zorluk?: string;
    kesik_idrar_yapma?: string;
    terminal_damlama?: string;
    residiv_hissi?: string;
    inkontinans?: string;
    tani?: string;
    tani1?: string;
    tani2?: string;
    tani3?: string;
    tani4?: string;
    tani5?: string;
    sonuc?: string;
    tedavi?: string;
    oneriler?: string;
    erektil_islev?: string;
    ejakulasyon?: string;
    mshq?: string;
    prosedur?: string;
    tani1_kodu?: string;
    tani2_kodu?: string;
    tani3_kodu?: string;
    tani4_kodu?: string;
    tani5_kodu?: string;
    doktor?: string;
    bulgu_notu?: string;
    recete?: string;
    allerjiler?: string;
    aliskanliklar?: string;
    kan_sulandirici?: number;
}

export interface TimelineItem {
    id: string;
    date?: string;
    type: string; // appointment, payment, service, operation, examination, lab, imaging, photo, followup, plan, report, phone, document
    title: string;
    description?: string;
    personnel?: string;
    status?: string;
    amount?: number;
    time?: string;
    extra1?: string;
    extra2?: string;
    extra3?: string;
    raw_status?: string;
}

export interface AuditLog {
    id: string;
    action: string;
    user_id?: number;
    username?: string;
    resource_type?: string;
    resource_id?: string;
    details?: Record<string, unknown>;
    ip_address?: string;
    user_agent?: string;
    created_at: string;
}

// API methods
export interface StockProduct {
    id: number;
    urun_adi: string;
    marka?: string;
    urun_tipi?: string;
    birim?: string;
    birim_fiyat?: number;
    mevcut_stok: number;
    min_stok?: number;
    barkod?: string;
    aktif?: boolean;
}

export interface StockProductCreate {
    urun_adi: string;
    marka?: string;
    urun_tipi?: string;
    birim?: string;
    birim_fiyat?: number;
    min_stok?: number;
    barkod?: string;
}

export interface StockMovement {
    id: number;
    urun_id: number;
    hasta_id?: string;
    hareket_tipi: string;
    miktar: number;
    islem_tarihi?: string;
    kaynak?: string;
    kaynak_ref?: string;
    notlar?: string;
    kullanici_id?: number;
    urun_adi?: string;
    hasta_adi?: string;
}

export interface StockPurchase {
    id: number;
    urun_id: number;
    firma_id?: number;
    alim_tarihi?: string;
    miktar: number;
    birim_fiyat: number;
    toplam_tutar: number;
    fatura_no?: string;
    notlar?: string;
}

export interface StockSummary {
    toplam_urun: number;
    toplam_stok_adedi: number;
    toplam_stok_degeri: number;
    dusuk_stoklu_urunler: number;
}

export interface TrusBiyopsi {
    id: string;
    hasta_id: string;
    tarih?: string;
    psa_total?: string;
    rektal_tuse?: string;
    mri_var: boolean;
    mri_tarih?: string;
    mri_ozet?: string;
    lokasyonlar?: string;
    prosedur_notu?: string;
    created_at?: string;
}

export interface TrusBiyopsiCreate {
    hasta_id: string;
    tarih?: string;
    psa_total?: string;
    rektal_tuse?: string;
    mri_var?: boolean;
    mri_tarih?: string;
    mri_ozet?: string;
    lokasyonlar?: string;
    prosedur_notu?: string;
}

export interface LabDataPoint {
    value: number;
    date: string;
    unit: string;
    flag?: string | null;
}

export interface LabTrendResponse {
    test_name: string;
    current_value: number;
    unit: string;
    trend_slope: number;
    is_critical: boolean;
    history: LabDataPoint[];
}

export interface LabTrendRequest {
    patient_id: string;
    test_names: string[];
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}


export interface Operation {
    id: string;
    hasta_id: string;
    tarih?: string;
    ameliyat?: string;
    pre_op_tani?: string;
    post_op_tani?: string;
    ekip?: string;
    hemsire?: string;
    anestezi_ekip?: string;
    anestezi_tur?: string;
    notlar?: string;
    patoloji?: string;
    post_op?: string;
    video_url?: string;
    status?: string;
    pre_op_checklist?: string;
}

export interface OperationCreate {
    hasta_id: string;
    tarih?: string;
    ameliyat?: string;
    pre_op_tani?: string;
    post_op_tani?: string;
    ekip?: string;
    hemsire?: string;
    anestezi_ekip?: string;
    anestezi_tur?: string;
    notlar?: string;
    patoloji?: string;
    post_op?: string;
    video_url?: string;
    status?: string;
    pre_op_checklist?: string;
}

export interface FollowUp {
    id: string;
    hasta_id: string;
    tarih?: string;
    tur?: string; // 'Genel Takip', etc.
    durum?: string; // 'Normal', 'Acil'
    notlar?: string;
    etiketler?: string;
    created_at?: string;
}

export interface FollowUpCreate {
    hasta_id: string;
    tarih?: string;
    tur?: string;
    durum?: string;
    notlar?: string;
    etiketler?: string;
}

export interface Imaging {
    id: string;
    hasta_id: string;
    tarih?: string;
    tetkik_adi?: string; // 'USG', 'BT', 'MR', etc. - mapped to 'tetkik' in UI
    sembol?: string;
    sonuc?: string; // Report text
    created_at?: string;
}

export interface ImagingCreate {
    hasta_id: string;
    tarih?: string;
    tetkik_adi?: string;
    sembol?: string;
    sonuc?: string;
}

export interface LabBiochemistry {
    id: string;
    hasta_id: string;
    tarih?: string;
    psa_total?: string;
    psa_free?: string;
    ure?: string;
    kreatinin?: string;
    egfr?: string;
    glukoz?: string;
    hba1c?: string;
    ast?: string;
    alt?: string;
    na?: string;
    k?: string;
    crp?: string;
    created_at?: string;
}

export interface LabHemogram {
    id: string;
    hasta_id: string;
    tarih?: string;
    wbc?: string;
    hb?: string;
    hct?: string;
    plt?: string;
    neu?: string;
    lym?: string;
    created_at?: string;
}

export interface LabUrine {
    id: string;
    hasta_id: string;
    tarih?: string;
    dansite?: string;
    ph?: string;
    protein?: string;
    glukoz?: string;
    keton?: string;
    bilirubin?: string;
    urobilinojen?: string;
    nitrit?: string;
    lokosit_esteraz?: string;
    kan?: string;
    sediment?: string; // Legacy field
    mik_lokosit?: string;
    mik_eritrosit?: string;
    mik_epitel?: string;
    mik_bakteri?: string;
    mik_kristaller?: string;
    mik_silindirler?: string;
    notlar?: string;
    kultur?: string; // 'Ureme Var', 'Ureme Yok'
    koloni?: string;
    bakteri?: string; // Culture bacteria
    antibiyotik?: string; // Antibiogram text
    created_at?: string;
}

export interface LabSpermiogram {
    id: string;
    hasta_id: string;
    tarih?: string;

    // Old/Common Fields
    volum?: string;
    konsantrasyon?: string;
    motilite?: string;
    morfoloji?: string;
    notlar?: string;

    // New Detailed Fields
    ph?: string;
    viskozite?: string;
    likefaksiyon?: string;
    total_sperm_sayisi?: string;

    // WHO Motility
    motilite_pr?: string;
    motilite_np?: string;
    motilite_im?: string;

    // Old Motility
    motilite_4?: string;
    motilite_3?: string;
    motilite_2?: string;
    motilite_1?: string;

    // Morphology Details
    morfoloji_bas?: string;
    morfoloji_boyun?: string;
    morfoloji_kuyruk?: string;

    created_at?: string;
}

export interface LabTrusBiopsy {
    id: string;
    hasta_id: string;
    tarih?: string;
    prostat_boyut_w?: string;
    prostat_boyut_h?: string;
    prostat_boyut_l?: string;
    prostat_volum?: string;
    tz_volum?: string;
    trus_bulgu?: string;
    trus_tani?: string;

    // New MRI/PIRADS fields
    psa_total?: string;
    rektal_tuse?: string;
    mri_var?: boolean;
    mri_tarih?: string;
    mri_ozet?: string;
    pirads_lezyon_boyut?: string;
    pirads_lezyon_lokasyon?: string;

    biopsi_tarih?: string;
    biopsi_sayi?: string;
    patoloji?: string; // JSON or separated string for checkboxes
    tumor_alanlari?: string; // JSON or separated string

    created_at?: string;
}

export interface LabUroflowmetri {
    id: string;
    hasta_id: string;
    tarih?: string;
    qmax?: number;
    average_flow?: number;
    volume?: number;
    residual_urine?: number;
    comment?: string;
    pdf_url?: string;
    created_at?: string;
}

export interface LabUroflowmetriCreate {
    hasta_id: string;
    tarih?: string;
    qmax?: number;
    average_flow?: number;
    volume?: number;
    residual_urine?: number;
    comment?: string;
    pdf_url?: string;
}

export interface ClinicalBrief {
    son_muayene_tarih?: string | null;
    son_muayene_sikayet?: string | null;
    son_muayene_tani?: string | null;
    son_muayene_sonuc?: string | null;
    son_muayene_tedavi?: string | null;
    son_not_tarih?: string | null;
    son_not_icerik?: string | null;
    son_not_tip?: string | null;
}

export interface Appointment {
    id: string;
    hasta_id?: string | null;
    title: string;
    start: string;
    end: string;
    status: 'scheduled' | 'completed' | 'cancelled' | 'confirmed' | 'unreachable' | 'blocked';
    type: string; // 'Muayene' | 'Kontrol' | 'Operasyon' | 'BLOCKED' | etc.
    notes?: string;
    doctor?: {
        id: string;
        username: string;
        full_name?: string;
        email?: string;
    };
    doctor_id?: string;
    hasta?: {
        id: string;
        ad: string;
        soyad: string;
        tc_kimlik?: string;
        cep_tel?: string;
    };
    created_at?: string;
    updated_at?: string;
    is_deleted?: number;
    cancel_reason?: string;
    delete_reason?: string;
    payment_status?: 'paid' | 'unpaid' | null;
    has_lab_results?: boolean;
    google_event_id?: string;
    clinical_brief?: ClinicalBrief | null;
}

export interface AppointmentCreate {
    hasta_id?: string | null;
    title: string;
    status?: string | null;
    start: string;
    end: string;
    type: string;
    notes?: string;
    doctor_id?: string;
}

export interface SystemUser {
    id: string;
    username: string;
    full_name?: string;
    email?: string;
    role?: string;
    is_active: boolean;
    is_superuser: boolean;
}

export interface SystemUserCreate {
    username: string;
    password: string;
    full_name?: string;
    email?: string;
    role?: string;
    is_superuser?: boolean;
    is_active?: boolean;
}

export interface Photo {
    id: string;
    hasta_id: string;
    tarih?: string;
    asama?: string;
    baslik?: string;
    etiketler?: string;
    dosya_yolu?: string;
    dosya_adi?: string;
    notlar?: string;
    created_at?: string;
}

export interface PhotoCreate {
    hasta_id: string;
    tarih?: string;
    asama?: string;
    baslik?: string;
    etiketler?: string;
    dosya_yolu?: string;
    dosya_adi?: string;
    notlar?: string;
}

export interface SystemSetting {
    key: string;
    value?: string;
    description?: string;
    updated_at?: string;
}

export interface SystemSettingCreate {
    key: string;
    value?: string;
    description?: string;
}

export interface BackupResponse {
    name: string;
    size: number;
    created_at: string;
    modified_at: string;
}

export interface DashboardKPI {
    total_patients: number;
    new_patients_month: number;
    total_operations_month: number;
    monthly_revenue: number;
    monthly_revenue_change: number;
}

export interface PerformanceKPI {
    appointment_loyalty_rate: number;
    total_appointments: number;
    completed_appointments: number;
    no_show_appointments: number;
    exam_count: number;
    procedure_count: number;
    procedure_ratio: number;
    avg_revenue_per_patient: number;
    return_rate: number;
    returning_patients: number;
    first_time_patients: number;
}

export interface ChartDataPoint {
    name: string;
    value: number;
    value2?: number;
}

export interface HeatmapData {
    day: number; // 0=Mon, 6=Sun
    hour: number; // 0-23
    value: number;
}

export interface CohortRow {
    cohort_month: string;
    total_patients: number;
    month_0: number;
    month_1: number;
    month_2: number;
    month_3: number;
    month_4: number;
    month_5: number;
    month_6: number;
}

export interface DiagnosisFilterResult {
    id: string;
    ad: string;
    soyad: string;
    tani: string;
    tani_kodu: string;
    tarih: string;
}

export interface DiagnosisTrendPoint {
    period: string;
    count: number;
}

export interface DiagnosisStats {
    total_count: number;
    percentage_of_portfolio: number;
    trend: DiagnosisTrendPoint[];
    patients: DiagnosisFilterResult[];
}

export interface ReferenceCategory {
    category: string;
    category_label: string;
    count: number;
    percentage: number;
    sources: ChartDataPoint[];
}

export interface ServiceDistribution {
    name: string;
    count: number;
    percentage: number;
}

export interface ExtendedReportStats {
    kpi: DashboardKPI;
    performance: PerformanceKPI;
    patient_trend: ChartDataPoint[];
    revenue_chart: ChartDataPoint[];
    operation_chart: ChartDataPoint[];
    reference_stats?: ChartDataPoint[];
    reference_categories?: ReferenceCategory[];
    weekly_new_patients?: ChartDataPoint[];
    service_distribution?: ServiceDistribution[];
    heatmap?: HeatmapData[];
    cancellation_stats: ChartDataPoint[] | null;
}

export interface ReportStats {
    kpi: DashboardKPI;
    patient_trend: ChartDataPoint[];
    revenue_chart: ChartDataPoint[];
    operation_chart: ChartDataPoint[];
    reference_stats?: ChartDataPoint[];
    weekly_new_patients?: ChartDataPoint[];
}

export interface ReferencePatient {
    id: string;
    ad: string;
    soyad: string;
}

export interface ICDTani {
    id: number;
    kodu: string;
    adi?: string;
    ust_kodu?: string;
    aktif?: string;
    seviye?: string;
}

export interface ICDTaniCreate {
    kodu: string;
    adi: string;
    ust_kodu?: string;
    aktif?: string;
    seviye?: string;
}

export interface IlacResponse {
    id: number;
    name: string;
    barcode?: string;
    etkin_madde?: string;
    atc_kodu?: string;
    fiyat?: string;
    firma?: string;
    recete_tipi?: string;
    aktif?: boolean;
}

export interface PhoneCall {
    id: string;
    hasta_id: string;
    tarih?: string;
    notlar?: string;
    doktor?: string;
    created_at?: string;
}

export interface PhoneCallCreate {
    hasta_id: string;
    tarih?: string;
    notlar?: string;
    doktor?: string;
}

export interface PrivateNote {
    id: string;
    hasta_id: string;
    icerik?: string;
    created_at?: string;
    updated_at?: string;
}

export interface PrivateNoteCreate {
    hasta_id: string;
    icerik?: string;
}

export interface KasaTanim {
    id: string;
    ad: string;
    tip: string; // 'NAKIT', 'BANKA', 'POS'
    para_birimi?: string;
    aktif: boolean;
    created_at?: string;
}

export interface KasaTanimCreate {
    ad: string;
    tip: string;
    para_birimi?: string;
    aktif?: boolean;
}

export interface HizmetTanim {
    id: string;
    ad: string;
    kod?: string;
    fiyat?: number;
    para_birimi?: string;
    kdv_orani?: number;
    aktif: boolean;
}

export interface HizmetTanimCreate {
    ad: string;
    kod?: string;
    fiyat?: number;
    para_birimi?: string;
    kdv_orani?: number;
    aktif?: boolean;
}

export interface HastaFinansHareket {
    id: string;
    hasta_id: string;
    tarih?: string;
    islem_tipi: string; // 'HIZMET' | 'TAHSILAT'
    hizmet_id?: string;
    kasa_id?: string;
    odeme_yontemi?: string;
    odeme_araci?: string;
    referans_kodu?: string;
    aciklama?: string;
    borc?: number;
    alacak?: number;
    bakiye?: number;
    doktor?: string;
    hizmet_ad?: string; // Optional (helper)
    kasa_ad?: string; // Optional (helper)
    muayene_id?: string;
    created_at?: string;
}

export interface HastaFinansHareketCreate {
    hasta_id: string;
    tarih?: string;
    islem_tipi: string;
    hizmet_id?: string;
    kasa_id?: string;
    odeme_yontemi?: string;
    odeme_araci?: string;
    referans_kodu?: string;
    aciklama?: string;
    borc?: number;
    alacak?: number;
    doktor?: string;
    muayene_id?: string;
}

export interface RestReport {
    id: string;
    hasta_id: string;
    tarih?: string;
    baslangic_tarihi?: string;
    bitis_tarihi?: string;
    icd_kodu?: string;
    tani?: string;
    karar?: string; // 'calisir' | 'kontrol'
    kontrol_tarihi?: string;
    created_at?: string;
}

export interface RestReportCreate {
    hasta_id: string;
    tarih?: string;
    baslangic_tarihi?: string;
    bitis_tarihi?: string;
    icd_kodu?: string;
    tani?: string;
    karar?: string;
    kontrol_tarihi?: string;
}

export interface RestReport {
    id: string;
    hasta_id: string;
    tarih?: string;
    baslangic_tarihi?: string;
    bitis_tarihi?: string;
    icd_kodu?: string;
    tani?: string;
    karar?: string; // 'calisir', 'kontrol'
    kontrol_tarihi?: string;
    created_at?: string;
}

export interface RestReportCreate {
    hasta_id: string;
    tarih?: string;
    baslangic_tarihi?: string;
    bitis_tarihi?: string;
    icd_kodu?: string;
    tani?: string;
    karar?: string;
    kontrol_tarihi?: string;
}

export interface StatusReport {
    id: string;
    hasta_id: string;
    tarih?: string;
    tani_bulgular?: string;
    icd_kodu?: string;
    sonuc_kanaat?: string;
    created_at?: string;
}

export interface StatusReportCreate {
    hasta_id: string;
    tarih?: string;
    tani_bulgular?: string;
    icd_kodu?: string;
    sonuc_kanaat?: string;
}

export interface ConsultationReport {
    id: string;
    hasta_id: string;
    tarih?: string;
    hitap_klinisyen?: string;
    ozgecmis?: string;
    tani?: string;
    ilaclar?: string;
    sikayet?: string;
    oyku?: string;
    talep?: string;
    konsultasyon_sorular?: string;
    doktor?: string;
    rapor_metni?: string;
    sistem_sorgu?: string;
    aliskanliklar?: string;
    created_at?: string;
}

export interface ConsultationReportCreate {
    hasta_id: string;
    tarih?: string;
    hitap_klinisyen?: string;
    ozgecmis?: string;
    tani?: string;
    ilaclar?: string;
    sikayet?: string;
    oyku?: string;
    talep?: string;
    konsultasyon_sorular?: string;
    doktor?: string;
    rapor_metni?: string;
    sistem_sorgu?: string;
    aliskanliklar?: string;
}

export interface MedicalReport {
    id: string;
    hasta_id: string;
    tarih?: string;
    protokol_no?: string;
    yapilan_islem?: string;
    islem_basligi?: string;
    islem_detayi?: string;
    tani?: string;
    sonuc_oneriler?: string;
    created_at?: string;
}

export interface MedicalReportCreate {
    hasta_id: string;
    tarih?: string;
    protokol_no?: string;
    yapilan_islem?: string;
    tani?: string;
    sonuc_oneriler?: string;
}

export interface FinansKategori {
    id: number;
    ad: string;
    tip: string; // 'gelir' | 'gider'
    ust_kategori_id?: number | null;
    renk?: string | null;
    ikon?: string | null;
    aktif: boolean;
    created_at?: string;
}

export interface FinansKategoriCreate {
    ad: string;
    tip: string;
    ust_kategori_id?: string;
    renk?: string;
    ikon?: string;
    aktif?: boolean;
}

export interface FinansHizmet {
    id: number;
    ad: string;
    kod?: string;
    kategori?: string;
    varsayilan_fiyat?: number;
    para_birimi?: string;
    kdv_orani: number;
    aktif: boolean;
    created_at?: string;
}

export interface FinansHizmetCreate {
    ad: string;
    kod?: string;
    kategori?: string;
    varsayilan_fiyat?: number;
    para_birimi?: string;
    kdv_orani?: number;
    aktif?: boolean;
}

export interface FinansKasa {
    id: number;
    ad: string;
    tip: string; // 'nakit' | 'banka' | 'pos'
    bakiye: number;
    para_birimi: string;
    banka_adi?: string;
    iban?: string;
    aktif: boolean;
    sira_no?: number;
    created_at?: string;
}

export interface FinansKasaCreate {
    ad: string;
    tip: string;
    bakiye?: number;
    para_birimi?: string;
    banka_adi?: string;
    iban?: string;
    aktif?: boolean;
    sira_no?: number;
}

export interface KasaHareket {
    id: string;
    kasa_id: string;
    islem_id?: string;
    odeme_id?: string;
    tarih?: string;
    hareket_tipi: string;
    tutar: number;
    onceki_bakiye?: number;
    sonraki_bakiye?: number;
    aciklama?: string;
    created_by?: string;
    created_at?: string;
}

export interface Firma {
    id: number;
    ad: string;
    vergi_no?: string;
    telefon?: string;
    email?: string;
    adres?: string;
    notlar?: string;
    toplam_borc?: number;
    created_at?: string;
}

export interface FirmaCreate {
    ad: string;
    vergi_no?: string;
    telefon?: string;
    email?: string;
    adres?: string;
    notlar?: string;
}

export interface FirmaBorcOzet {
    id: number;
    ad: string;
    toplam_borc: number;
    en_yakin_vade?: string;
}

export interface FinansIslemSatir {
    id: number;
    islem_id: number;
    hizmet_id?: number;
    hizmet_adi: string;
    adet: number;
    birim_fiyat: number;
    toplam: number;
    doktor?: string;
}

export interface FinansTaksit {
    id: number;
    odeme_id: number;
    taksit_no: number;
    tutar: number;
    vade_tarihi: string;
    tahsil_tarihi?: string;
    durum: string;
    created_at?: string;
}

export interface FinansOdeme {
    id: number;
    islem_id: number;
    kasa_id?: number;
    odeme_tarihi: string;
    tutar: number;
    odeme_yontemi: string;
    banka?: string;
    taksit_sayisi?: number;
    kapora?: boolean;
    notlar?: string;
    kasa_adi?: string;
    created_at?: string;
    taksitler?: FinansTaksit[];
}

export interface FinansIslem {
    /** Backend'de Integer PK — UUID değil. */
    id: number;
    referans_kodu: string;
    hasta_id?: string;
    muayene_id?: string;
    tarih: string;
    islem_tipi: string;
    durum: string;
    kategori_id?: number;
    aciklama?: string;
    tutar: number;
    kdv_orani?: number;
    kdv_tutari?: number;
    net_tutar: number;
    para_birimi?: string;
    kasa_id?: number;
    firma_id?: number;
    doktor?: string;
    vade_tarihi?: string;
    notlar?: string;
    belge_url?: string;
    iptal_tarihi?: string;
    iptal_nedeni?: string;
    created_at?: string;
    updated_at?: string;
    created_by?: number;
    hasta_adi?: string;
    kategori_adi?: string;
    kasa_adi?: string;
    firma_adi?: string;
    /** Liste görünümünde (GET /transactions, /overdue) hesaplanır. */
    odenen_tutar?: number;
    kalan_tutar?: number;
    odeme_sayisi?: number;
    /** Tek ödeme varsa yöntemi; çoklu ödemede null döner. */
    odeme_yontemi?: string;
    satirlar?: FinansIslemSatir[];
    odemeler?: FinansOdeme[];
}

export interface FinansIslemCreate {
    hasta_id?: string;
    muayene_id?: string;
    tarih: string;
    islem_tipi: string;
    durum?: string;
    kategori_id?: number;
    aciklama?: string;
    tutar: number;
    kdv_orani?: number;
    kdv_tutari?: number;
    net_tutar: number;
    para_birimi?: string;
    kasa_id?: number;
    firma_id?: number;
    doktor?: string;
    vade_tarihi?: string;
    notlar?: string;
    satirlar?: { hizmet_id?: number; hizmet_adi: string; adet: number; birim_fiyat: number; toplam: number; doktor?: string; }[];
    odemeler?: { kasa_id?: number; odeme_tarihi: string; tutar: number; odeme_yontemi: string; banka?: string; taksit_sayisi?: number; kapora?: boolean; notlar?: string; }[];
}

export interface FinansIslemFilters {
    start_date?: string;
    end_date?: string;
    islem_tipi?: string;
    durum?: string;
    kategori_id?: string;
    hasta_id?: string;
    muayene_id?: string;
    firma_id?: string;
    kasa_id?: string;
    referans?: string;
    vade_gecmis?: boolean;
}

export interface HastaCari {
    hasta_id: string;
    hasta_adi?: string;
    toplam_borc: number;
    toplam_odeme: number;
    bakiye: number;
    vadesi_gecmis_borc: number;
    son_islem_tarihi?: string;
}

export interface BorcluHasta {
    hasta_id: string;
    /** Hasta kaydı eksikse backend null döner. */
    hasta_adi?: string;
    toplam_borc: number;
    toplam_odeme: number;
    bakiye: number;
    vadesi_gecmis_borc?: number;
    son_islem_tarihi?: string;
}

export interface AcikIslem {
    id: number;
    referans_kodu: string;
    tarih: string;
    vade_tarihi?: string | null;
    aciklama?: string | null;
    net_tutar: number;
    odenen_tutar: number;
    kalan_tutar: number;
}

export interface TahsilatDagitimSatiri {
    islem_id: number;
    referans_kodu: string;
    tutar: number;
    kalan_borc: number;
}

export interface TopluTahsilatSonuc {
    tahsil_edilen: number;
    islem_sayisi: number;
    dagitim: TahsilatDagitimSatiri[];
}

export interface KategoriKirilim {
    kategori_id?: number | null;
    kategori_adi: string;
    renk?: string | null;
    toplam: number;
    islem_sayisi: number;
    yuzde: number;
}

export interface YaslandirmaKova {
    kova: string;
    etiket: string;
    tutar: number;
    islem_sayisi: number;
}

export interface FinansOzet {
    toplam_gelir: number;
    toplam_gider: number;
    net_bakiye: number;
    bekleyen_tahsilat: number;
    vadesi_gecmis_islem_sayisi: number;
    bugun_gelir: number;
    bugun_gider: number;
}

export interface GunlukOzet {
    tarih: string;
    gelir: number;
    gider: number;
    net: number;
}

export interface AylikOzet {
    yil: number;
    ay: number;
    ay_adi: string;
    gelir: number;
    gider: number;
    net: number;
}

export interface AIScribeStatus {
    enabled: boolean;
    gemini_available: boolean;
    local_whisper: boolean;
    local_ollama: boolean;
    templates_count: number;
}

export interface AIScribeTemplate {
    id: string;
    name: string;
    description: string;
}

export interface AIScribeResponse {
    mode_used: 'gemini' | 'local' | 'hybrid_google_local' | 'hybrid_google_gemini'; // Updated modes
    processing_time_seconds: number;
    transcript?: string;
    confidence_score?: number;

    // Clinical data
    sikayet?: string;
    oyku?: string;
    disuri?: string;
    pollakiuri?: string;
    nokturi?: string;
    hematuri?: string;
    genital_akinti?: string;
    kabizlik?: string;
    tas_oyku?: string;

    // IPSS symptoms
    catallanma?: string;
    projeksiyon_azalma?: string;
    kalibre_incelme?: string;
    idrar_bas_zorluk?: string;
    kesik_idrar_yapma?: string;
    terminal_damlama?: string;
    residiv_hissi?: string;
    inkontinans?: string;

    // Sexual function
    erektil_islev?: string;
    ejakulasyon?: string;
    iief_ef_answers?: string;

    // Medical history
    ozgecmis?: string;
    soygecmis?: string;
    kullandigi_ilaclar?: string;
    kan_sulandirici?: number;
    aliskanliklar?: string;
    sigara?: string;
    alkol?: string;
    allerjiler?: string;

    // Diagnosis
    tani1?: string;
    tani1_icd?: string;
    tani2?: string;
    tani2_icd?: string;
    tani3?: string;
    tani3_icd?: string;
    ayirici_tanilar?: string;
    tedavi?: string;
    oneriler?: string;
    tetkikler?: string;
    clinical_note?: string;

    // Extracted Data (Dynamic)
    extracted_keywords?: string[];
}

