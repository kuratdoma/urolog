import React from "react";

export const EDReferenceInfo = () => (
    <div className="space-y-6 text-slate-700 bg-white p-6 rounded-xl border border-slate-100 shadow-inner max-h-[70vh] overflow-y-auto text-xs leading-relaxed">
        <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-700 uppercase border-b pb-1">1. Cinsel Öykü ve Sorunun Karakteri</h3>
            <ul className="list-disc pl-4 space-y-1">
                <li><b>Sorunun başlangıcı ve süresi:</b> Aniden mi yoksa kademeli mi gelişti?</li>
                <li><b>Durumsal değişkenlik:</b> Her aktivitede mi yoksa mastürbasyonda düzeliyor mu?</li>
                <li><b>Sabah ereksiyonları:</b> Gece/sabah kendiliğinden sertleşme oluyor mu?</li>
                <li><b>Sertleşme kalitesi:</b> İlişkiyi başlatma/sürdürme yeterli mi?</li>
                <li><b>Cinsel istek (Libido):</b> Cinsel dürtü seviyesi nasıl?</li>
                <li><b>Ejakülasyon ve Orgazm:</b> Erken/geç boşalma zorluğu var mı?</li>
            </ul>
        </div>
        <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-700 uppercase border-b pb-1">2. Tıbbi Özgeçmiş ve Risk Faktörleri</h3>
            <ul className="list-disc pl-4 space-y-1">
                <li><b>Kardiyovasküler:</b> Kalp Hast, HT, HL, Periferik damar hastalığı?</li>
                <li><b>Metabolik:</b> DM veya Metabolik Sendrom?</li>
                <li><b>Nörolojik:</b> MS, inme, omurilik yaralanması?</li>
                <li><b>Cerrahi/Travma:</b> Pelvik cerrahi (Prostat, mesane), Radyoterapi, Pelvik travma?</li>
                <li><b>Genel Sağlık:</b> Uyku apnesi?</li>
            </ul>
        </div>
        <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-700 uppercase border-b pb-1">3. İlaç Kullanımı ve Alışkanlıklar</h3>
            <ul className="list-disc pl-4 space-y-1">
                <li><b>İlaçlar:</b> Antihipertansifler, Antidepresanlar, Antipsikotikler?</li>
                <li><b>Sigara/Alkol:</b> Sigara var mı? Alkol (Günde {">"}2 kadeh)?</li>
                <li><b>Madde/Steroid:</b> Keyif verici madde veya anabolik steroid?</li>
                <li><b>Fiziksel Aktivite:</b> Düzenli egzersiz mi yoksa sedanter mi?</li>
            </ul>
        </div>
        <div className="space-y-4">
            <h3 className="text-sm font-black text-indigo-700 uppercase border-b pb-1">4. Psikososyal Değerlendirme</h3>
            <ul className="list-disc pl-4 space-y-1">
                <li><b>Ruh hali:</b> Depresyon, anksiyete, ciddi stres?</li>
                <li><b>İlişki:</b> Partnerle çatışma veya partnerin cinsel sağlığı?</li>
                <li><b>Performans kaygısı:</b> Başarısız olma korkusu?</li>
            </ul>
        </div>
    </div>
);
