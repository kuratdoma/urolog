import { EDCData } from './schema';

export const generateNarrative = (data: EDCData): string | null => {
    let narrative = "\n[ ANDROLOJİ DEĞERLENDİRME (ED FORMU) ]\n";
    const q = (id: keyof EDCData) => data[id];
    let sentences: string[] = [];

    // 1. Cinsel Öykü
    if (q("c_q1") || q("c_q2")) {
        sentences.push(`${q("c_q1") ? q("c_q1") + " başlangıçlı " : ""}${q("c_q2") ? q("c_q2") + " " + (q("c_q2_unit") || "yıl") + " süredir devam eden " : ""}ereksiyon sorunu mevcut.`);
    }
    if (q("c_q3")) sentences.push(`Sabah ereksiyonları ${q("c_q3")?.toLowerCase()}.`);
    if (q("c_q4") || q("c_q5")) {
        sentences.push(`Mastürbasyonda ereksiyon kalitesi ${q("c_q4") ? q("c_q4")?.toLowerCase() : "farklılık gösteriyor"}, genel sertlik düzeyi ${q("c_q5") || "5"}/10 olarak ifade edildi.`);
    }
    if (q("c_q6")) sentences.push(`Sorun temel olarak ereksiyon ${q("c_q6")?.toLowerCase()} odaklıdır.`);
    if (q("c_q7")) sentences.push(`Libido ${q("c_q7")?.toLowerCase()}.`);
    if (q("c_q8")) sentences.push(`Boşalma/Orgazm: ${q("c_q8")}.`);

    if (q("c_q10")) sentences.push(`Son 1 ayda ilişki sayısı: ${q("c_q10")}.`);

    // 2. Tıbbi
    const medical: string[] = [];
    if (q("c_m1") === "Var") medical.push("Kalp Hastalığı");
    if (q("c_m2") === "Var") medical.push("Hipertansiyon");
    if (q("c_m3") === "Var") medical.push("Hiperlipidemi");
    if (q("c_m4") === "Var") medical.push("DM");

    if (q("c_m6") === "Var") medical.push("Nörolojik Patoloji");
    if (q("c_m7") === "Var") medical.push("Pelvik Cerrahi");
    if (q("c_m8") === "Var") medical.push("Uyku Apnesi");
    if (medical.length > 0) sentences.push(`Tıbbi Özgeçmiş: ${medical.join(", ")}.`);
    if (q("c_m9") === "Evet") sentences.push("Hormonal eksiklik belirtileri (kas kaybı, halsizlik) mevcut.");

    // 3. İlaç ve Alışkanlık
    if (q("c_h1") === "Var") sentences.push(`Düzenli ilaç kullanımı: ${q("c_h1_detail") || "belirtilmedi"}.`);
    if (q("c_h2") === "Var") sentences.push(`Sigara: ${q("c_h2_detail") || ""} paket/yıl.`);
    if (q("c_h3")) sentences.push(`Alkol tüketimi ${q("c_h3")?.toLowerCase()}.`);
    if (q("c_h5")) sentences.push(`${q("c_h5") === "Sedanter" ? "Sedanter bir yaşam sürüyor" : "Düzenli fiziksel aktivite mevcut"}.`);

    // 4. Psikososyal
    if (q("c_p1")) sentences.push(`Stres/Kaygı durumu ${q("c_p1")?.toLowerCase()}.`);
    if (q("c_p2") === "Evet") sentences.push("Performans kaygısı mevcut.");
    if (q("c_p5")) sentences.push(`${q("c_p5") === "Var" ? "Partneri var" : "Partneri yok"}.`);
    if (q("c_p3")) sentences.push(`Partner ilişkisi ${q("c_p3")?.toLowerCase()}.`);
    if (q("c_p6")) sentences.push(`Partner yaklaşımı ${q("c_p6")?.toLowerCase()}.`);
    if (q("c_p7")) sentences.push(`Partnere karşı çekim kaybı ${q("c_p7")?.toLowerCase()}.`);
    if (q("c_p4") === "Evet") sentences.push("Depresif belirtiler mevcut.");

    // 5. Tedavi
    if (q("c_t1") === "Evet") {
        sentences.push(`ED ilaç deneyimi mevcut (Yanıt: ${q("c_t2") ? q("c_t2")?.toLowerCase() : "belirtilmedi"}).`);
    }
    if (q("c_t3") === "Evet") sentences.push("Sertlik kaybı endişesiyle aceleci cinsel birleşme mevcut.");

    if (sentences.length === 0) return null;

    narrative += sentences.join(" ");
    return "\n" + narrative.trim() + "\n";
};
