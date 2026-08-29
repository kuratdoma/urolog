export interface DashboardSummary {
    totalPatients: {
        value: number;
        growth: number; // percentage
        trend: 'up' | 'down' | 'neutral';
    };
    occupancy: {
        rate: number; // percentage
        filled: number;
        total: number;
        breakdown: {
            examination: number;
            control: number;
        };
    };
    pendingLabs: {
        count: number;
        urgent: number;
    };
    statistics: {
        today_new_patients: number;
        today_appointments: number;
        week_new_patients: number;
        week_appointments: number;
        month_new_patients: number;
        month_appointments: number;
        last_month_new_patients: number;
        last_month_appointments: number;
    };
}

export type HeatmapIntensity = 'low' | 'medium' | 'high' | 'very-high';

export interface HeatmapCell {
    day: string; // Pzt, Sal, etc.
    hour: string; // 09:00, 10:00, etc.
    value: number;
    intensity: HeatmapIntensity;
}

export type AppointmentStatus = 'completed' | 'in-progress' | 'waiting' | 'cancelled';

export interface RecentActivity {
    id: string;
    patientName: string;
    protocolNo: string;
    procedure: string; // İşlem
    doctor: string;
    time: string;
    status: AppointmentStatus;
    patientId?: string;
}

export interface DashboardData {
    summary: DashboardSummary;
    heatmap: HeatmapCell[];
    recentActivity: RecentActivity[];
}
