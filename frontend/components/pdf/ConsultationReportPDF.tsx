import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';
import { formatToSentenceCasePreservingAbbreviations } from '@/lib/utils';

registerPDFFonts();

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 80,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#000000',
        backgroundColor: '#ffffff'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        paddingBottom: 5,
        marginBottom: 15,
        alignItems: 'flex-end'
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000'
    },
    subHeader: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000000',
        textAlign: 'right'
    },
    section: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000000',
        letterSpacing: 1,
        marginBottom: 4,
        textDecoration: 'underline'
    },
    row: {
        flexDirection: 'row',
        marginBottom: 2
    },
    label: {
        width: 100,
        fontSize: 9,
        color: '#000000',
        fontWeight: 'bold'
    },
    value: {
        flex: 1,
        fontSize: 10,
        color: '#000000'
    },
    contentSection: {
        marginBottom: 12
    },
    contentText: {
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.5,
        textAlign: 'justify'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#000000',
        paddingTop: 5
    },
    clinicName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 1,
        color: '#000000'
    },
    clinicDetail: {
        fontSize: 8,
        color: '#000000'
    }
});

interface ConsultationReportPDFProps {
    report: {
        id: string;
        tarih?: string;
        hitap_klinisyen?: string;
        ozgecmis?: string;
        tani?: string;
        ilaclar?: string;
        sikayet?: string;
        oyku?: string;
        talep?: string;
        doktor?: string;
        rapor_metni?: string;
        konsultasyon_sorular?: string;
        sistem_sorgu?: string;
        aliskanliklar?: string;
    };
    patient: {
        ad: string;
        soyad: string;
        tc_kimlik?: string | null;
        dogum_tarihi?: string | null;
        protokol_no?: string | null;
    };
    settings: Record<string, string>;
}

export const ConsultationReportPDF: React.FC<ConsultationReportPDFProps> = ({ report, patient, settings }) => {
    const parseDateSafe = (dateString: string | undefined | null) => {
        if (!dateString) return new Date();
        const parsed = parseISO(dateString);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const formattedDate = report.tarih ? format(parseDateSafe(report.tarih), "dd.MM.yyyy") : "-";
    const maskedTc = patient.tc_kimlik ? `****${String(patient.tc_kimlik).substring(4)}` : "-";

    const hastaAdi = `${patient.ad || ""} ${patient.soyad || ""}`.trim();
    const hitap = report.hitap_klinisyen || "[Hitap Edilen Hekim/Klinik]";
    const ozgecmis = formatToSentenceCasePreservingAbbreviations(report.ozgecmis || "");
    const tani = formatToSentenceCasePreservingAbbreviations(report.tani || "");
    const ilaclar = formatToSentenceCasePreservingAbbreviations(report.ilaclar || "");
    const sikayet = formatToSentenceCasePreservingAbbreviations(report.sikayet || "");
    const oyku = formatToSentenceCasePreservingAbbreviations(report.oyku || "");
    const talep = formatToSentenceCasePreservingAbbreviations(report.talep || "");
    const konsultasyonSorular = formatToSentenceCasePreservingAbbreviations(report.konsultasyon_sorular || "");
    const sistemSorgu = formatToSentenceCasePreservingAbbreviations(report.sistem_sorgu || "");
    const aliskanliklar = formatToSentenceCasePreservingAbbreviations(report.aliskanliklar || "");
    const doktor = report.doktor || "";

    const hasRaporMetni = !!report.rapor_metni;

    // Fallback structured letter parts structured EXACTLY like the new template requested by user
    const letterBodyParts: string[] = [
        `Hastamız ${hastaAdi} ${sikayet ? `bugün ${sikayet} ile başvurdu.` : 'başvurdu.'} ${tani ? `Hastamızda ${tani} ön tanısı düşünülmüştür.` : ''}`,
        `Hastamızın ${talep || "[Konsültasyon Talebi]"} konusunda tarafınızca değerlendirilmesini ve\n${konsultasyonSorular || "[Konsültasyon soruları]"} konusunda görüşlerinizin bildirilmesini rica ederim.`,
        oyku ? `Hastamızın öyküsünde ${oyku} vardı.` : '',
        sistemSorgu ? `${sistemSorgu}` : '',
        [
            ozgecmis ? `Özgeçmişinde ${ozgecmis} vardı.` : '',
            ilaclar ? `Kullandığı ilaçları ${ilaclar}.` : '',
            aliskanliklar ? `Alışkanlıkları: ${aliskanliklar}.` : ''
        ].filter(Boolean).join(" ")
    ].filter(Boolean);

    const letterBody = report.rapor_metni || [
        `Konu: Konsültasyon Talebi`,
        `Sayın Dr. ${hitap},`,
        ...letterBodyParts,
        `Saygılarımla,\n${doktor}`
    ].join("\n\n");

    return (
        <Document title={`${hastaAdi} Konsültasyon Raporu`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 10, letterSpacing: 1, marginTop: 4 }}>{trUpper("KONSÜLTASYON TALEP FORMU")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.subHeader}>PROTOKOL NO: {patient.protokol_no || report.id}</Text>
                        <Text style={styles.subHeader}>{trUpper("TARİH")}: {formattedDate}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 }]}>
                    <Text style={styles.sectionTitle}>{trUpper("KİMLİK BİLGİLERİ")}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <View style={{ width: '50%' }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("Adı Soyadı")}:</Text>
                                <Text style={styles.value}>{hastaAdi}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("TC Kimlik")}:</Text>
                                <Text style={styles.value}>{maskedTc}</Text>
                            </View>
                        </View>
                        <View style={{ width: '50%' }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("Doğum Tarihi")}:</Text>
                                <Text style={styles.value}>
                                    {patient.dogum_tarihi ? format(parseDateSafe(patient.dogum_tarihi), "dd.MM.yyyy") : "-"}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("Protokol No")}:</Text>
                                <Text style={styles.value}>{patient.protokol_no || report.id}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Letter Body */}
                <View style={styles.contentSection}>
                    {!hasRaporMetni && (
                        <>
                            {/* If we don't have custom report text, we render individual styled parts manually to match letterParts spacing */}
                            <View style={{ marginBottom: 10 }}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', textDecoration: 'underline' }}>Konu: Konsültasyon Talebi</Text>
                            </View>

                            <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 14 }}>Sayın Dr. {hitap},</Text>
                        </>
                    )}

                    <Text style={styles.contentText}>
                        {hasRaporMetni ? letterBody : letterBodyParts.join("\n\n")}
                    </Text>
                </View>

                {/* Signature - only render if not custom report text, as custom text already includes it at the end */}
                {!hasRaporMetni && (
                    <View style={{ marginTop: 30, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 10, marginBottom: 4 }}>Saygılarımla,</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{doktor}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={{ width: '60%' }}>
                        <Text style={styles.clinicName}>{settings["clinic_name"] || "UroLog"}</Text>
                        <Text style={styles.clinicDetail}>{settings["clinic_address"] || "Rafet Karacan Blv. Ahmet Ergunes Sk. 21/12 Izmit-Kocaeli"}</Text>
                        <Text style={styles.clinicDetail}>Tel: {settings["clinic_phone"] || "262 321 0141"}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 8, color: '#000000' }}>Sistem Çıktı Tarihi: {format(new Date(), "dd.MM.yyyy")}</Text>
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
