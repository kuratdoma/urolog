'use client';

export function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <div className="pt-1 border-t border-slate-200/60 w-full text-center">
            <p className="text-[9px] font-semibold text-slate-600">
                &copy; {currentYear} Dr. Alp Özkan
            </p>
            <p className="text-[8px] text-slate-500 uppercase tracking-tighter">
                Tüm Hakları Saklıdır | UroLog
            </p>
        </div>
    );
}
