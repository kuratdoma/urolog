import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
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
        fontSize: 14,
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
        lineHeight: 1.3,
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
    },
});

interface StatusReportPDFProps {
    report: any;
    patient: any;
    settings: any;
    doctorName?: string;
}

export const StatusReportPDF: React.FC<StatusReportPDFProps> = ({ report, patient, settings, doctorName }) => {
    const formattedDate = report.tarih ? format(parseISO(report.tarih), "dd.MM.yyyy") : "-";
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    return (
        <Document title={`${patient.ad} ${patient.soyad} Durum Bildirir Raporu`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 10, letterSpacing: 1, marginTop: 4 }}>{trUpper("DURUM BİLDİRİR SAĞLIK RAPORU")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.subHeader}>PROTOKOL NO: {patient.protokol_no || report.id}</Text>
                        <Text style={styles.subHeader}>TARİH: {formattedDate}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 }]}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <View style={{ width: '50%' }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("Adı Soyadı")}:</Text>
                                <Text style={styles.value}>{patient.ad} {patient.soyad}</Text>
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
                                    {patient.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), "dd.MM.yyyy") : "-"}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>{trUpper("Protokol No")}:</Text>
                                <Text style={styles.value}>{patient.protokol_no || report.id}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Medical Assessment */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>{trUpper("TIBBİ DEĞERLENDİRME")}</Text>
                    <Text style={[styles.contentText, { marginBottom: 6, fontStyle: 'italic' }]}>
                        Yukarıda bilgileri yer alan şahsın kurumumuzda yapılan fiziksel muayenesi ve tetkik sonuçları neticesinde;
                    </Text>

                    <Text style={[styles.contentHeader, { fontSize: 9, marginTop: 4 }]}>BULGULAR:</Text>
                    <Text style={styles.contentText}>{report.tani_bulgular || "-"}</Text>

                    {report.icd_kodu && (
                        <View style={{ marginTop: 6 }}>
                            <Text style={[styles.contentHeader, { fontSize: 9 }]}>ICD KODU:</Text>
                            <Text style={[styles.contentText, { fontWeight: 'bold' }]}>{report.icd_kodu}</Text>
                        </View>
                    )}
                </View>

                {/* Conclusion */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>{trUpper("SONUÇ VE KANAAT")}</Text>
                    <Text style={styles.contentText}>
                        Yapılan değerlendirme neticesinde; {" "}
                        {report.sonuc_kanaat || "kanaat belirtilmemiştir."}
                        {" "}dair işbu durum bildirir kanaat raporu düzenlenmiştir.
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
                        <Text style={{ fontSize: 8, color: '#000000', marginBottom: 2 }}>Sistem Çıktı Tarihi: {format(new Date(), "dd.MM.yyyy")}</Text>
                        <View style={{ marginTop: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#000000' }}>{doctorName || ""}</Text>
                        </View>
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
