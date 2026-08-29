import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';

registerPDFFonts();

const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingHorizontal: 40,
        paddingBottom: 80,
        fontFamily: 'Roboto',
        fontSize: 10,
        color: '#000000',
        backgroundColor: '#ffffff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        paddingBottom: 5,
        marginBottom: 15,
        alignItems: 'flex-end',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000000',
    },
    section: {
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000000',
        letterSpacing: 1,
        marginBottom: 4,
        textDecoration: 'underline',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    label: {
        width: 130,
        fontSize: 9,
        color: '#000000',
        fontWeight: 'bold',
    },
    value: {
        flex: 1,
        fontSize: 10,
        color: '#000000',
    },
    contentSection: {
        marginBottom: 10,
    },
    contentHeader: {
        fontSize: 9,
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#000000',
        textDecoration: 'underline',
    },
    contentText: {
        fontSize: 10,
        color: '#000000',
        lineHeight: 1.4,
        textAlign: 'justify',
    },
    // Metrics grid – 2 per row
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    metricBox: {
        width: '50%',
        flexDirection: 'row',
        marginBottom: 5,
        paddingRight: 8,
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#000000',
        width: 100,
    },
    metricValue: {
        fontSize: 10,
        color: '#000000',
        fontWeight: 'bold',
    },
    metricUnit: {
        fontSize: 9,
        color: '#555555',
        marginLeft: 3,
    },
    divider: {
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        marginVertical: 8,
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
        paddingTop: 5,
    },
    clinicName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 1,
        color: '#000000',
    },
    clinicDetail: {
        fontSize: 8,
        color: '#000000',
    },
});

interface UroflowPDFProps {
    records: any[];  // LabUroflowmetri[] — multiple sessions, each printed on one page
    patient: any;
    settings: any;
}

const MetricRow = ({ label, value, unit }: { label: string; value?: number | null; unit: string }) => {
    if (value === null || value === undefined) return null;
    return (
        <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>{label}:</Text>
            <Text style={styles.metricValue}>
                {value}
                <Text style={styles.metricUnit}> {unit}</Text>
            </Text>
        </View>
    );
};

export const UroflowPDF: React.FC<UroflowPDFProps> = ({ records, patient, settings }) => {
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : '-';

    return (
        <Document title={`${patient.ad} ${patient.soyad} Üroflowmetri`}>
            {records.map((rec: any, idx: number) => {
                const formattedDate = rec.tarih ? format(parseISO(rec.tarih), 'dd.MM.yyyy') : '-';
                return (
                    <Page key={idx} size="A4" style={styles.page}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.headerTitle}>
                                    {settings['clinic_name'] || 'UroLog Üroloji Kliniği'}
                                </Text>
                                <Text style={{ fontSize: 9, letterSpacing: 1, marginTop: 4 }}>
                                    {trUpper('ÜROFLOWMETRİ RAPORU')}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                                    PROTOKOL NO: {patient.protokol_no || rec.id}
                                </Text>
                                <Text style={{ fontSize: 9, fontWeight: 'bold' }}>
                                    TARİH: {formattedDate}
                                </Text>
                            </View>
                        </View>

                        {/* Patient Identity */}
                        <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 }]}>
                            <Text style={styles.sectionTitle}>{trUpper('KİMLİK BİLGİLERİ')}</Text>
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
                                            {patient.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), 'dd.MM.yyyy') : '-'}
                                        </Text>
                                    </View>
                                    <View style={styles.row}>
                                        <Text style={styles.label}>Cinsiyet:</Text>
                                        <Text style={styles.value}>{patient.cinsiyet || '-'}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Measurement Results */}
                        <View style={styles.contentSection}>
                            <Text style={styles.contentHeader}>{trUpper('ÖLÇÜM SONUÇLARI')}</Text>
                            <View style={styles.metricsGrid}>
                                <MetricRow label="Maksimum Akım (Qmax)" value={rec.qmax} unit="ml/s" />
                                <MetricRow label="Ortalama Akım" value={rec.average_flow} unit="ml/s" />
                                <MetricRow label="İşeme Hacmi" value={rec.volume} unit="ml" />
                                <MetricRow label="Rezidüel İdrar" value={rec.residual_urine} unit="ml" />
                            </View>
                        </View>

                        <View style={styles.divider} />

                        {/* Reference Values */}
                        <View style={styles.contentSection}>
                            <Text style={styles.contentHeader}>{trUpper('REFERANS DEĞERLERİ')}</Text>
                            <View style={styles.metricsGrid}>
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricLabel}>Qmax (Normal):</Text>
                                    <Text style={[styles.metricValue, { color: '#555555', fontWeight: 'normal' }]}>≥ 15 ml/s</Text>
                                </View>
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricLabel}>İşeme Hacmi:</Text>
                                    <Text style={[styles.metricValue, { color: '#555555', fontWeight: 'normal' }]}>≥ 150 ml (yorumlanabilir)</Text>
                                </View>
                                <View style={styles.metricBox}>
                                    <Text style={styles.metricLabel}>Rezidüel İdrar:</Text>
                                    <Text style={[styles.metricValue, { color: '#555555', fontWeight: 'normal' }]}>{'< 50 ml (normal)'}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Comment / Interpretation */}
                        {rec.comment && (
                            <View style={styles.contentSection}>
                                <Text style={styles.contentHeader}>{trUpper('YORUM VE DEĞERLENDİRME')}</Text>
                                <Text style={styles.contentText}>{rec.comment}</Text>
                            </View>
                        )}

                        {/* Footer */}
                        <View style={styles.footer} fixed>
                            <View style={{ width: '60%' }}>
                                <Text style={styles.clinicName}>
                                    {settings['clinic_name'] || 'UroLog'}
                                </Text>
                                <Text style={styles.clinicDetail}>
                                    {settings['clinic_address'] || 'Rafet Karacan Blv. Ahmet Ergunes Sk. 21/12 Izmit-Kocaeli'}
                                </Text>
                                <Text style={styles.clinicDetail}>
                                    Tel: {settings['clinic_phone'] || '262 321 0141'}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={{ fontSize: 8, color: '#000000', marginBottom: 2 }}>
                                    Sistem Çıktı Tarihi: {format(new Date(), 'dd.MM.yyyy')}
                                </Text>
                                <View style={{ marginTop: 10, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#000000' }}>
                                        {settings['doctor_name'] || ''}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <PDFWatermark patient={patient} />
                    </Page>
                );
            })}
        </Document>
    );
};
