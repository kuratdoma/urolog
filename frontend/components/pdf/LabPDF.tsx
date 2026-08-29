import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';
import { formatLabDecimal, formatRefRange, isResultAbnormal } from '@/lib/lab-utils';

registerPDFFonts();

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 80,
        fontFamily: 'Roboto',
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#000000',
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
    },
    headerDetails: {
        fontSize: 9,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    patientInfo: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 4,
        padding: 12,
        marginBottom: 20,
    },
    infoTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#9CA3AF',
        letterSpacing: 1,
        marginBottom: 6,
    },
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    infoItem: {
        width: '50%',
        flexDirection: 'row',
        marginBottom: 4,
    },
    infoLabel: {
        fontSize: 9,
        color: '#6B7280',
        fontWeight: 'bold',
        width: 80,
    },
    infoValue: {
        fontSize: 9,
        color: '#111827',
        fontWeight: 'bold',
        flex: 1,
    },
    contentSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000000',
        letterSpacing: 1,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        paddingBottom: 2,
    },
    testInfo: {
        marginBottom: 15,
    },
    testRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    testLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000000',
        width: 100,
    },
    testValue: {
        fontSize: 9,
        color: '#374151',
        flex: 1,
    },
    sonucContainer: {
        marginTop: 5,
    },
    sonucText: {
        fontSize: 10,
        color: '#1F2937',
        lineHeight: 1.5,
        backgroundColor: '#FFFFFF',
        padding: 10,
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        borderTopWidth: 1.5,
        borderTopColor: '#000000',
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    clinicName: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 2,
    },
    clinicDetail: {
        fontSize: 8,
        color: '#444444',
        marginBottom: 1,
    },
    signatureBlock: {
        alignItems: 'flex-end',
    },
    reportDate: {
        fontSize: 8,
        color: '#000000',
        marginBottom: 10,
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#000000',
        paddingTop: 2,
        width: 100,
        alignItems: 'center',
    },
    signatureText: {
        fontSize: 6,
        fontWeight: 'bold',
        color: '#000000'
    }
});

interface LabPDFProps {
    lab: any;
    patient: any;
    settings: any;
}

export const LabPDF: React.FC<LabPDFProps> = ({ lab, patient, settings }) => {
    const formattedDate = lab.tarih ? format(parseISO(lab.tarih), "dd.MM.yyyy") : "-";
    const reportDate = format(new Date(), "dd.MM.yyyy");
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    return (
        <Document title={`${patient.ad}_${patient.soyad}_Laboratuvar_Raporu`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 9, letterSpacing: 1, marginTop: 4 }}>{trUpper("LABORATUVAR RAPORU")}</Text>
                    </View>
                    <View style={styles.headerDetails}>
                        <Text>PROTOKOL NO: {patient.protokol_no || lab.id}</Text>
                        <Text>TARİH: {formattedDate}</Text>
                    </View>
                </View>

                {/* Identity Card */}
                <View style={styles.patientInfo}>
                    <Text style={styles.infoTitle}>{trUpper("KİMLİK BİLGİLERİ")}</Text>
                    <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Adı Soyadı:</Text>
                            <Text style={styles.infoValue}>{patient.ad} {patient.soyad}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>TC Kimlik:</Text>
                            <Text style={styles.infoValue}>{maskedTc}</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Doğum Tar.:</Text>
                            <Text style={styles.infoValue}>
                                {patient.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), "dd.MM.yyyy") : "-"}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={styles.infoLabel}>Cinsiyet:</Text>
                            <Text style={styles.infoValue}>{patient.cinsiyet || "-"}</Text>
                        </View>
                    </View>
                </View>

                {/* Test Bilgileri */}
                <View style={styles.contentSection}>
                    <Text style={styles.sectionTitle}>{trUpper("LABORATUVAR TEST BİLGİLERİ")}</Text>
                    <View style={styles.testInfo}>
                        <View style={styles.testRow}>
                            <Text style={styles.testLabel}>Test Adı:</Text>
                            <Text style={styles.testValue}>{lab.tetkik_adi || "-"}</Text>
                        </View>
                    </View>
                </View>

                {/* Değerler ve Sonuç */}
                {(() => {
                    const rawVal = lab.sonuc || "";
                    const formattedVal = formatLabDecimal(rawVal);
                    const refVal = lab.referans_degeri || lab.referans || lab.referans_araligi || "";
                    const unit = lab.birim || "";
                    const abnormal = isResultAbnormal(rawVal, refVal);

                    return (
                        <View style={styles.contentSection}>
                            <Text style={styles.sectionTitle}>{trUpper("DEĞERLER VE SONUÇ")}</Text>
                            <View style={styles.sonucContainer}>
                                <Text style={[
                                    styles.sonucText,
                                    { fontWeight: abnormal ? 'bold' : 'normal', color: abnormal ? '#d32f2f' : '#000000' }
                                ]}>
                                    {formattedVal ? `${formattedVal} ${unit}`.trim() : "Sonuç girilmemiştir."}
                                </Text>
                                {refVal ? (
                                    <Text style={{ fontSize: 9, color: '#555555', marginTop: 4 }}>
                                        {formatRefRange(refVal, unit)}
                                    </Text>
                                ) : null}
                            </View>
                        </View>
                    );
                })()}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={{ width: '60%' }}>
                        <Text style={styles.clinicName}>{settings["clinic_name"] || "UroLog"}</Text>
                        <Text style={styles.clinicDetail}>{settings["clinic_address"] || ""}</Text>
                        <Text style={styles.clinicDetail}>Tel: {settings["clinic_phone"] || ""}</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        <Text style={styles.reportDate}>Sistem Çıktı Tarihi: {reportDate}</Text>
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
