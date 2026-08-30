import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper, formatSafeDate } from '@/lib/pdf-fonts';
import { formatLabDecimal, formatRefRange, isResultAbnormal } from '@/lib/lab-utils';

registerPDFFonts();

// Use local fonts to avoid network issues in production/Docker
// Font.register({
//     family: 'Roboto',
//     fonts: [
//         { src: '/fonts/Roboto-Regular.ttf', fontWeight: 'normal' },
//         { src: '/fonts/Roboto-Bold.ttf', fontWeight: 'bold' },
//         { src: '/fonts/Roboto-Italic.ttf', fontWeight: 'normal', fontStyle: 'italic' },
//         { src: '/fonts/Roboto-BoldItalic.ttf', fontWeight: 'bold', fontStyle: 'italic' },
//     ],
// });


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
    section: {
        marginBottom: 8,
        // Removed borders and background for cleaner B&W look
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
        width: 110,
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
        marginBottom: 10
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

interface ExaminationPDFProps {
    exam: any;
    patient: any;
    settings: any;
    computedData: {
        sq: any;
        ipssData: {
            total: number;
            obstructive: number;
            irritative: number;
            detailText: string;
            individual: any;
        } | null;
        iiefData: {
            score: number;
            severity: string;
            color: string;
        } | null;
        systemInquiry: string;
    };
    selectedLabs?: any[];
    selectedImaging?: any[];
}

export const ExaminationPDF: React.FC<ExaminationPDFProps> = ({ exam, patient, settings, computedData, selectedLabs, selectedImaging }) => {
    const { sq, ipssData, iiefData, systemInquiry } = computedData;
    const formattedDate = formatSafeDate(exam.tarih, "dd.MM.yyyy");
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    return (
        <Document title={`${patient.ad} ${patient.soyad} Muayene`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>PROTOKOL NO: {patient.protokol_no || exam.id}</Text>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>TARİH: {formattedDate}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 }]}>
                    <Text style={styles.sectionTitle}>{trUpper("KİMLİK BİLGİLERİ")}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <View style={{ width: '50%' }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Adı Soyadı:</Text>
                                <Text style={styles.value}>{patient.ad} {patient.soyad}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>TC Kimlik:</Text>
                                <Text style={styles.value}>{maskedTc}</Text>
                            </View>
                        </View>
                        <View style={{ width: '50%' }}>
                            <View style={styles.row}>
                                <Text style={styles.label}>Doğum Tarihi:</Text>
                                <Text style={styles.value}>
                                    {formatSafeDate(patient.dogum_tarihi, "dd.MM.yyyy")}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Cinsiyet:</Text>
                                <Text style={styles.value}>{patient.cinsiyet || "-"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Complaints & History */}
                {exam.sikayet && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("ŞİKAYET")}</Text>
                        <Text style={styles.contentText}>{exam.sikayet}</Text>
                    </View>
                )}

                {exam.oyku && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("ÖYKÜ")}</Text>
                        <Text style={styles.contentText}>{exam.oyku}</Text>
                    </View>
                )}

                {(systemInquiry || ipssData || iiefData) && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("SİSTEMLERİN SORGUSU")}</Text>
                        {/* System Inquiry - comma separated inline */}
                        {systemInquiry ? <Text style={styles.contentText}>{systemInquiry}.</Text> : null}

                        {/* IPSS - inline compact format */}
                        {ipssData && (
                            <Text style={[styles.contentText, { marginTop: 4 }]}>
                                {ipssData.detailText}
                            </Text>
                        )}

                        {/* IIEF - inline compact format */}
                        {iiefData && (
                            <Text style={[styles.contentText, { marginTop: 2 }]}>
                                IIEF-EF: {iiefData.score}/30 → {iiefData.severity}
                            </Text>
                        )}
                    </View>
                )}

                {/* Medical Background */}
                {(sq.sigara || (exam as any).sigara || sq.alkol || (exam as any).alkol || exam.ozgecmis || exam.kullandigi_ilaclar || exam.allerjiler || exam.soygecmis) && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("TIBBİ GEÇMİŞ")}</Text>
                        <View style={{ gap: 2 }}>
                            {(sq.sigara || (exam as any).sigara) && (
                                <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Sigara:</Text><Text style={styles.contentText}>{sq.sigara || (exam as any).sigara}</Text></View>
                            )}
                            {(sq.alkol || (exam as any).alkol) && (
                                <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Alkol:</Text><Text style={styles.contentText}>{sq.alkol || (exam as any).alkol}</Text></View>
                            )}
                            {exam.ozgecmis && (
                                <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Özgeçmiş:</Text><Text style={styles.contentText}>{exam.ozgecmis}</Text></View>
                            )}
                            {exam.kullandigi_ilaclar && (
                                <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>İlaçlar:</Text><Text style={styles.contentText}>{exam.kullandigi_ilaclar}</Text></View>
                            )}
                            {exam.allerjiler && (
                                <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Allerji:</Text><Text style={[styles.contentText, { fontWeight: 'bold', textDecoration: 'underline' }]}>{exam.allerjiler}</Text></View>
                            )}
                            {exam.soygecmis && (
                                <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Soygeçmiş:</Text><Text style={styles.contentText}>{exam.soygecmis}</Text></View>
                            )}
                        </View>
                    </View>
                )}

                {/* Physical Exam */}
                {(exam.kvah || exam.bobrek_sag || exam.bobrek_sol || exam.suprapubik_kitle || exam.ego || exam.bulgu_notu || exam.fizik_muayene || exam.rektal_tuse) && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("FİZİK MUAYENE")}</Text>
                        <View style={{ gap: 2 }}>
                            {exam.kvah && <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>KVAH:</Text><Text style={styles.contentText}>{exam.kvah}</Text></View>}
                            {exam.bobrek_sag && <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Sağ Böbrek:</Text><Text style={styles.contentText}>{exam.bobrek_sag}</Text></View>}
                            {exam.bobrek_sol && <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Sol Böbrek:</Text><Text style={styles.contentText}>{exam.bobrek_sol}</Text></View>}
                            {exam.suprapubik_kitle && <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>Suprapubik:</Text><Text style={styles.contentText}>{exam.suprapubik_kitle}</Text></View>}
                            {exam.ego && <View style={styles.row}><Text style={[styles.label, { width: 80 }]}>EGO:</Text><Text style={styles.contentText}>{exam.ego}</Text></View>}

                            {exam.fizik_muayene && (
                                <View style={{ marginTop: 4 }}>
                                    <Text style={[styles.label, { width: '100%', marginBottom: 2 }]}>Genel Muayene Notları:</Text>
                                    <Text style={[styles.contentText, { marginLeft: 10 }]}>{exam.fizik_muayene}</Text>
                                </View>
                            )}
                            {exam.rektal_tuse && (
                                <View style={{ marginTop: 4 }}>
                                    <Text style={[styles.label, { width: '100%', marginBottom: 2 }]}>DRE (Parmakla Muayene):</Text>
                                    <Text style={[styles.contentText, { marginLeft: 10 }]}>{exam.rektal_tuse}</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {/* Selected Laboratory Results */}
                {selectedLabs && selectedLabs.length > 0 && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("LABORATUVAR SONUÇLARI")}</Text>
                        <View style={{ marginTop: 2 }}>
                            {selectedLabs.map((lab, index) => {
                                const labDate = formatSafeDate(lab.tarih, "dd.MM.yyyy");
                                const testName = lab.tetkik_adi || lab.test_adi || "Laboratuvar Testi";
                                const rawVal = lab.sonuc || lab.val || "-";
                                const formattedVal = formatLabDecimal(rawVal);
                                const refVal = lab.referans_degeri || lab.referans || lab.referans_araligi || "";
                                const unit = lab.birim || "";
                                const abnormal = isResultAbnormal(rawVal, refVal);

                                return (
                                    <View key={lab.id || index} style={{ flexDirection: 'row', marginBottom: 3, alignItems: 'center' }}>
                                        <Text style={{ width: 75, fontSize: 8, color: '#444444' }}>{labDate}</Text>
                                        <Text style={{ width: 150, fontSize: 9, fontWeight: abnormal ? 'bold' : 'normal' }}>{testName}:</Text>
                                        <Text style={{ fontSize: 9, fontWeight: abnormal ? 'bold' : 'normal', color: abnormal ? '#d32f2f' : '#000000' }}>
                                            {formattedVal} {unit}
                                        </Text>
                                        {refVal ? (
                                            <Text style={{ fontSize: 8, color: '#555555', marginLeft: 8 }}>
                                                {formatRefRange(refVal, unit)}
                                            </Text>
                                        ) : null}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Selected Imaging Reports */}
                {selectedImaging && selectedImaging.length > 0 && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("GÖRÜNTÜLEME VE RADYOLOJİ RAPORLARI")}</Text>
                        <View style={{ marginTop: 2 }}>
                            {selectedImaging.map((img, index) => {
                                const imgDate = formatSafeDate(img.tarih, "dd.MM.yyyy");
                                const title = img.tetkik_adi || "Görüntüleme Raporu";
                                return (
                                    <View key={img.id || index} style={{ marginBottom: 5 }}>
                                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                                            • {title} ({imgDate})
                                        </Text>
                                        {img.sonuc && (
                                            <Text style={[styles.contentText, { marginLeft: 8, marginTop: 1 }]}>
                                                {img.sonuc}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Diagnosis */}
                {(exam.tani1 || exam.tani2) && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("TANI")}</Text>
                        <View>
                            {exam.tani1 && <Text style={[styles.contentText, { fontWeight: 'bold' }]}>• {exam.tani1} {exam.tani1_kodu ? `(${exam.tani1_kodu})` : ""}</Text>}
                            {exam.tani2 && <Text style={[styles.contentText, { fontWeight: 'bold' }]}>• {exam.tani2} {exam.tani2_kodu ? `(${exam.tani2_kodu})` : ""}</Text>}
                        </View>
                    </View>
                )}

                {/* Result & Plan */}
                {(exam.sonuc || exam.tedavi) && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("SONUÇ VE TEDAVİ")}</Text>
                        {exam.sonuc && (
                            <View style={{ marginBottom: 5 }}>
                                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>SONUÇ:</Text>
                                <Text style={styles.contentText}>{exam.sonuc}</Text>
                            </View>
                        )}
                        {exam.tedavi && (
                            <View>
                                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>TEDAVİ PLANI:</Text>
                                <Text style={styles.contentText}>{exam.tedavi}</Text>
                            </View>
                        )}
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
                        <Text style={{ fontSize: 8, color: '#000000', marginBottom: 2 }}>Sistem Çıktı Tarihi: {format(new Date(), "dd.MM.yyyy")}</Text>
                        <View style={{ marginTop: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#000000' }}>{exam.doktor || ""}</Text>
                        </View>
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
