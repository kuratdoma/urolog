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
        marginBottom: 2,
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
    table: {
        width: 'auto',
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000000',
        borderRightWidth: 0,
        borderBottomWidth: 0,
    },
    tableRow: {
        flexDirection: 'row',
        minHeight: 25,
        alignItems: 'center',
    },
    tableHeader: {
        backgroundColor: '#F3F4F6',
        fontWeight: 'bold',
    },
    tableCell: {
        fontSize: 8,
        borderStyle: 'solid',
        borderWidth: 1,
        borderColor: '#000000',
        borderLeftWidth: 0,
        borderTopWidth: 0,
        padding: 4,
    },
    colDate: { width: '15%' },
    colTest: { width: '35%' },
    colResult: { width: '20%' },
    colUnit: { width: '15%' },
    colRef: { width: '15%' },
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

interface LabBatchPDFProps {
    results: any[];
    patient: any;
    settings: any;
}

export const LabBatchPDF: React.FC<LabBatchPDFProps> = ({ results, patient, settings }) => {
    const reportDate = format(new Date(), "dd.MM.yyyy");
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    return (
        <Document title={`${patient.ad}_${patient.soyad}_Toplu_Lab_Sonuclari`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 9, letterSpacing: 1, marginTop: 4 }}>{trUpper("TOPLU LABORATUVAR SONUÇLARI")}</Text>
                    </View>
                    <View style={styles.headerDetails}>
                        <Text>TOPLAM TEST: {results.length}</Text>
                        <Text>TARİH: {reportDate}</Text>
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
                    </View>
                </View>

                {/* Results Table */}
                <View>
                    <Text style={styles.sectionTitle}>{trUpper("LABORATUVAR SONUÇLARI")}</Text>
                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <Text style={[styles.tableCell, styles.colDate]}>{trUpper("Tarih")}</Text>
                            <Text style={[styles.tableCell, styles.colTest]}>{trUpper("Tetkik")}</Text>
                            <Text style={[styles.tableCell, styles.colResult]}>{trUpper("Sonuç")}</Text>
                            <Text style={[styles.tableCell, styles.colUnit]}>{trUpper("Birim")}</Text>
                            <Text style={[styles.tableCell, styles.colRef]}>{trUpper("Referans")}</Text>
                        </View>
                        {results.map((item, index) => {
                            const rawVal = item.sonuc != null ? String(item.sonuc) : "-";
                            const formattedVal = formatLabDecimal(rawVal);
                            const refVal = String(item.referans_araligi ?? item.referans_degeri ?? item.referans ?? "");
                            const abnormal = isResultAbnormal(rawVal, refVal);

                            return (
                                <View key={index} style={styles.tableRow} wrap={false}>
                                    <Text style={[styles.tableCell, styles.colDate]}>
                                        {item.tarih ? format(parseISO(item.tarih), "dd.MM.yyyy") : "-"}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.colTest, { fontWeight: abnormal ? 'bold' : 'normal' }]}>
                                        {trUpper(item.tetkik_adi)}
                                    </Text>
                                    <Text style={[
                                        styles.tableCell,
                                        styles.colResult,
                                        {
                                            fontWeight: abnormal ? 'bold' : 'normal',
                                            color: abnormal ? '#d32f2f' : '#000000'
                                        }
                                    ]}>
                                        {formattedVal}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.colUnit]}>
                                        {item.birim || "-"}
                                    </Text>
                                    <Text style={[styles.tableCell, styles.colRef, { fontStyle: 'italic', color: '#666' }]}>
                                        {formatRefRange(refVal, item.birim) || "-"}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

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
