
import {
    AIScribeResponse, AIScribeStatus, AIScribeTemplate, Appointment, AppointmentCreate, AuditLog, AylikOzet, BiyopsiSablonu, BorcluHasta, ChartDataPoint,
    CohortRow, ConsultationReport, ConsultationReportCreate, DashboardKPI, Definition, DiagnosisFilterResult, DiagnosisStats, DiagnosisTrendPoint, Doktor, ExtendedReportStats,
    FinansHizmet, FinansHizmetCreate, FinansIslem, FinansIslemCreate, FinansIslemFilters, FinansIslemSatir, FinansKasa, FinansKasaCreate, FinansKategori, FinansKategoriCreate,
    FinansOdeme, FinansOzet, Firma, FirmaBorcOzet, FirmaCreate, FollowUp, FollowUpCreate, GunlukOzet, HastaCari, HastaFinansHareket,
    HastaFinansHareketCreate, HeatmapData, HizmetTanim, HizmetTanimCreate, ICDTani, ICDTaniCreate, IlacResponse, Imaging, ImagingCreate, KasaHareket,
    KasaTanim, KasaTanimCreate, LabBiochemistry, LabDataPoint, LabHemogram, LabSpermiogram, LabTrendRequest, LabTrendResponse, LabTrusBiopsy, LabUrine,
    LabUroflowmetri, LabUroflowmetriCreate, MedicalReport, MedicalReportCreate, Muayene, MuayeneCreate, Operation, OperationCreate, PaginatedResponse, Patient,
    PatientCreate, PatientReportDTO, PerformanceKPI, PhoneCall, PhoneCallCreate, Photo, PhotoCreate, RandevuTuru, ReferenceCategory, ReferencePatient,
    ReportStats, RestReport, RestReportCreate, ServiceDistribution, StatusReport, StatusReportCreate, StockMovement, StockProduct, StockProductCreate, StockPurchase,
    StockSummary, SystemSetting, SystemSettingCreate, SystemUser, SystemUserCreate, TimelineItem, TrusBiyopsi, TrusBiyopsiCreate, ReceteSablonu, SablonTanim,
    BackupResponse
} from './api/types';

export * from './api/types';
export type {
    AIScribeResponse, AIScribeStatus, AIScribeTemplate, Appointment, AppointmentCreate, AuditLog, AylikOzet, BiyopsiSablonu, BorcluHasta, ChartDataPoint,
    CohortRow, ConsultationReport, ConsultationReportCreate, DashboardKPI, Definition, DiagnosisFilterResult, DiagnosisStats, DiagnosisTrendPoint, Doktor, ExtendedReportStats,
    FinansHizmet, FinansHizmetCreate, FinansIslem, FinansIslemCreate, FinansIslemFilters, FinansIslemSatir, FinansKasa, FinansKasaCreate, FinansKategori, FinansKategoriCreate,
    FinansOdeme, FinansOzet, Firma, FirmaBorcOzet, FirmaCreate, FollowUp, FollowUpCreate, GunlukOzet, HastaCari, HastaFinansHareket,
    HastaFinansHareketCreate, HeatmapData, HizmetTanim, HizmetTanimCreate, ICDTani, ICDTaniCreate, IlacResponse, Imaging, ImagingCreate, KasaHareket,
    KasaTanim, KasaTanimCreate, LabBiochemistry, LabDataPoint, LabHemogram, LabSpermiogram, LabTrendRequest, LabTrendResponse, LabTrusBiopsy, LabUrine,
    LabUroflowmetri, LabUroflowmetriCreate, MedicalReport, MedicalReportCreate, Muayene, MuayeneCreate, Operation, OperationCreate, PaginatedResponse, Patient,
    PatientCreate, PatientReportDTO, PerformanceKPI, PhoneCall, PhoneCallCreate, Photo, PhotoCreate, RandevuTuru, ReferenceCategory, ReferencePatient,
    ReportStats, RestReport, RestReportCreate, ServiceDistribution, StatusReport, StatusReportCreate, StockMovement, StockProduct, StockProductCreate, StockPurchase,
    StockSummary, SystemSetting, SystemSettingCreate, SystemUser, SystemUserCreate, TimelineItem, TrusBiyopsi, TrusBiyopsiCreate, ReceteSablonu, SablonTanim,
    BackupResponse
};

export { apiFetch } from './api/client';
export type { FetchOptions } from './api/client';

const API_BASE_URL = '';

import { patientsApi } from './api/patients';
import { clinicalApi } from './api/clinical';
import { appointmentsApi } from './api/appointments';
import { documentsApi } from './api/documents';
import { authApi } from './api/auth';
import { dashboardApi } from './api/dashboard';
import { settingsApi } from './api/settings';
import { reportsApi } from './api/reports';
import { systemApi } from './api/system';
import { financeApi } from './api/finance';
import { auditApi } from './api/audit';
import { stockApi } from './api/stock';
import { aiScribeApi } from './api/aiScribe';
import { definitionsApi } from './api/definitions';
import { integrationsApi } from './api/integrations';
import { labAnalysisApi } from './api/labAnalysis';
import { lipusApi } from './api/lipus';
import { consentFormsApi } from './api/consentForms';
import { hpvBriefingApi } from './api/hpvBriefing';
import { insuranceProvisionApi } from './api/insuranceProvision';

export const api = {
    patients: patientsApi,
    clinical: clinicalApi,
    appointments: appointmentsApi,
    documents: documentsApi,
    auth: authApi,
    dashboard: dashboardApi,
    settings: settingsApi,
    reports: reportsApi,
    system: systemApi,
    finance: financeApi,
    audit: auditApi,
    stock: stockApi,
    aiScribe: aiScribeApi,
    definitions: definitionsApi,
    integrations: integrationsApi,
    labAnalysis: labAnalysisApi,
    lipus: lipusApi,
    consentForms: consentFormsApi,
    hpvBriefing: hpvBriefingApi,
    insuranceProvision: insuranceProvisionApi,
};
