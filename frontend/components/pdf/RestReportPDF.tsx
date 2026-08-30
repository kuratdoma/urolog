import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';

registerPDFFonts();

// Use local fonts to avoid network issues in production/Docker


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
    contentHeader: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 2,
        color: '#000000',
        textDecoration: 'underline'
    },
    contentText: {
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.4,
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

interface RestReportPDFProps {
    report: any;
    patient: any;
    settings: any;
}

export const RestReportPDF: React.FC<RestReportPDFProps> = ({ report, patient, settings }) => {
    const parseDateSafe = (dateString: any) => {
        if (!dateString) return new Date();
        const parsed = parseISO(dateString);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
    };

    const formattedDate = report.tarih ? format(parseDateSafe(report.tarih), "dd.MM.yyyy") : "-";
    const maskedTc = patient.tc_kimlik ? `****${String(patient.tc_kimlik).substring(4)}` : "-";

    const baslangic = parseDateSafe(report.baslangic_tarihi);
    const bitis = parseDateSafe(report.bitis_tarihi);
    const gunSayisi = differenceInDays(bitis, baslangic) + 1;
    const isBasiTarihi = addDays(bitis, 1);

    const formattedBaslangic = format(baslangic, 'dd.MM.yyyy');
    const formattedBitis = format(bitis, 'dd.MM.yyyy');
    const formattedIsBasi = format(isBasiTarihi, 'dd.MM.yyyy');

    let kararText = "";
    if (report.karar === 'calisir') {
        kararText = `${formattedIsBasi} tarihinde görevine dönmesi uygundur.`;
    } else if (report.karar === 'kontrol') {
        const kontrolDate = report.kontrol_tarihi ? format(parseDateSafe(report.kontrol_tarihi), 'dd.MM.yyyy') : "belirtilen";
        kararText = `${kontrolDate} tarihinde kontrol için muayenesi gereklidir.`;
    }

    const taniLines = (report.tani || "").split('\n').filter(Boolean);
    const diagnosisPart = `${report.icd_kodu ? `${report.icd_kodu} ` : ""}${taniLines[0] || "Tanı Belirtilmemiş"}${taniLines.length > 1 ? ` ${taniLines[1]}` : ""}`;
    const description = taniLines.slice(2).join(' ').trim();
    const explanationPart = description ? `${description} ` : "";

    const reportContentString = `Kurumumuzda muayene edilen ${patient.ad || ""} ${patient.soyad || ""} isimli hastaya, yapılan tetkikler sonucunda ${diagnosisPart} teşhisi konulmuştur. ${explanationPart}Hastamızın sağlık durumu göz önünde bulundurularak, ${formattedBaslangic} tarihinden ${formattedBitis} tarihine kadar (belirtilen tarihler dahil olmak üzere) toplam ${gunSayisi} gün süreyle istirahat etmesi tıbben uygun görülmüştür.\n\n${kararText}\n\nGereğini rica ederim.`;

    return (
        <Document title={`${patient.ad || ""} ${patient.soyad || ""} İstirahat Raporu`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 10, letterSpacing: 1, marginTop: 4 }}>{trUpper("İSTİRAHAT RAPORU")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.subHeader}>PROTOKOL NO: {patient.protokol_no || report.id}</Text>
                        <Text style={styles.subHeader}>TARİH: {formattedDate}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 }]}>
                    <Text style={styles.sectionTitle}>{trUpper("KİMLİK BİLGİLERİ")}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <View style={{ width: '50%' }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("Adı Soyadı")}:</Text>
                                <Text style={styles.value}>{patient.ad || ""} {patient.soyad || ""}</Text>
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

                {/* Report Body */}
                <View style={styles.contentSection}>
                    <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', textDecoration: 'underline' }}>Konu: İstirahat Raporu Hakkında</Text>
                    </View>

                    <Text style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 10 }}>İlgili Makama,</Text>

                    <Text style={styles.contentText}>
                        {reportContentString}
                    </Text>
                </View>

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
