import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';

registerPDFFonts();

// Use local fonts to avoid network issues in production/Docker


const styles = StyleSheet.create({
    page: {
        padding: 40,
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
        width: 80,
        fontSize: 9,
        color: '#000000',
        fontWeight: 'bold'
    },
    value: {
        flex: 1,
        fontSize: 10,
        color: '#000000'
    },
    drugList: {
        marginTop: 5
    },
    drugItem: {
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#000000',
        borderStyle: 'dashed',
        paddingBottom: 4
    },
    drugHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 2
    },
    drugName: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#000000'
    },
    drugQuantity: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#000000'
    },
    drugDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 15
    },
    drugDetailItem: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    drugDetailLabel: {
        fontSize: 8,
        color: '#000000',
        fontWeight: 'bold',
        marginRight: 4
    },
    drugDetailValue: {
        fontSize: 9,
        color: '#000000'
    },
    drugNote: {
        fontSize: 9,
        fontStyle: 'italic',
        color: '#000000',
        marginTop: 1
    },
    notesSection: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#000000',
        paddingTop: 5
    },
    noteText: {
        fontSize: 9,
        color: '#000000',
        lineHeight: 1.3
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
    footerLeft: {
        maxWidth: '60%'
    },
    footerRight: {
        alignItems: 'flex-end',
        minWidth: 150
    },
    clinicName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 1,
        color: '#000000'
    },
    clinicAddress: {
        fontSize: 8,
        color: '#000000',
        lineHeight: 1.2
    },
    doctorName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 1,
        color: '#000000'
    },
    doctorDetail: {
        fontSize: 8,
        color: '#000000'
    }
});

interface PrescriptionPDFProps {
    data: any;
    settings: any;
}

export const PrescriptionPDF: React.FC<PrescriptionPDFProps> = ({ data, settings }) => {
    const { patient, doctor, drugs, date, note } = data;
    const formattedDate = date ? format(new Date(date), "dd.MM.yyyy") : format(new Date(), "dd.MM.yyyy");
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    return (
        <Document title={`${patient.ad} ${patient.soyad} Reçete`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 12, marginTop: 4, letterSpacing: 2 }}>{trUpper("REÇETE")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.subHeader}>PROTOKOL NO: {patient.protokol_no || "-"}</Text>
                        <Text style={styles.subHeader}>TARİH: {formattedDate}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5 }]}>
                    <Text style={styles.sectionTitle}>{trUpper("HASTA BİLGİLERİ")}</Text>
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
                                <Text style={styles.label}>Doğum Tar.:</Text>
                                <Text style={styles.value}>
                                    {patient.dogum_tarihi ? format(new Date(patient.dogum_tarihi), "dd.MM.yyyy") : "-"}
                                </Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.label}>Cinsiyet:</Text>
                                <Text style={styles.value}>{patient.cinsiyet || "-"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Content: Either Structured Drugs or Raw Text */}
                {drugs && drugs.length > 0 ? (
                    <View style={styles.drugList}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                            <Text style={{ fontSize: 14, fontWeight: 'bold', marginRight: 5 }}>Rx</Text>
                        </View>

                        {drugs.map((drug: any, index: number) => (
                            <View key={index} style={styles.drugItem}>
                                <View style={styles.drugHeader}>
                                    <Text style={styles.drugName}>{index + 1}. {drug.name}</Text>
                                    <Text style={styles.drugQuantity}>({drug.boxQty} Kutu)</Text>
                                </View>
                                <View style={styles.drugDetails}>
                                    <View style={styles.drugDetailItem}>
                                        <Text style={styles.drugDetailLabel}>Doz:</Text>
                                        <Text style={styles.drugDetailValue}>{drug.dose}</Text>
                                    </View>
                                    {drug.period && (
                                        <View style={styles.drugDetailItem}>
                                            <Text style={styles.drugDetailLabel}>Periyod:</Text>
                                            <Text style={styles.drugDetailValue}>{drug.period}</Text>
                                        </View>
                                    )}
                                    <View style={styles.drugDetailItem}>
                                        <Text style={styles.drugDetailLabel}>Kullanım:</Text>
                                        <Text style={styles.drugDetailValue}>{drug.usage}</Text>
                                    </View>
                                </View>
                                {drug.description && (
                                    <Text style={styles.drugNote}>Not: {drug.description}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                ) : data.content ? (
                    <View style={[styles.section, { marginTop: 10 }]}>
                        <Text style={styles.sectionTitle}>{trUpper("REÇETE İÇERİĞİ")}</Text>
                        <Text style={[styles.noteText, { fontSize: 11, fontFamily: 'Roboto' }]}>
                            {data.content}
                        </Text>
                    </View>
                ) : null}

                {/* Notes */}
                {note && (
                    <View style={styles.notesSection}>
                        <Text style={styles.sectionTitle}>{trUpper("GENEL NOTLAR")}</Text>
                        <Text style={styles.noteText}>{note}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerLeft}>
                        {settings["clinic_footer"] ? (
                            <Text style={styles.clinicAddress}>{settings["clinic_footer"]}</Text>
                        ) : (
                            <>
                                <Text style={styles.clinicName}>{settings["clinic_name"] || "UroLog"}</Text>
                                <Text style={styles.clinicAddress}>
                                    {settings["clinic_address"] || "Adres Bilgisi Girilmemiş"}
                                </Text>
                                <Text style={[styles.clinicAddress, { marginTop: 2 }]}>
                                    {settings["clinic_phone"] ? `Tel: ${settings["clinic_phone"]}` : ""}
                                </Text>
                            </>
                        )}
                    </View>
                    <View style={styles.footerRight}>
                        <Text style={styles.doctorName}>{doctor?.adSoyad || ""}</Text>
                        {doctor?.diplomaNo && <Text style={styles.doctorDetail}>Dip. No: {doctor.diplomaNo}</Text>}
                        {doctor?.bransKodu && <Text style={styles.doctorDetail}>{doctor.bransKodu}</Text>}
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
