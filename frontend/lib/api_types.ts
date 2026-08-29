export interface Definition {
    id: string;
    ad: string;
    aktif: boolean;
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

export interface ReceteSablonu {
    id: string;
    ad: string;
    icerik: string; // JSON string
    aktif: boolean;
    created_at?: string;
}

export interface SablonTanim {
    id: string;
    grup: string;
    kod: string;
    icerik: string;
    aktif: boolean;
    created_at?: string;
}
