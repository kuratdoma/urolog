import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { PDFWatermark } from './PDFWatermark';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';

registerPDFFonts();

// Register Turkish-supported font if necessary, but standard fonts usually suffice for basic Latin
// Using standard fonts for reliability in this environment

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
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    headerDetails: {
        fontSize: 10,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    section: {
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    gridItem: {
        width: '50%',
        marginBottom: 6,
        paddingRight: 10,
    },
    label: {
        fontSize: 8,
        color: '#666666',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        color: '#000000',
        fontWeight: 'bold',
    },
    addressBlock: {
        marginTop: 5,
        fontSize: 10,
        fontStyle: 'italic',
        color: '#333333',
        lineHeight: 1.4,
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
        fontSize: 11,
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

interface PatientCardPDFProps {
    patient: any;
    settings: any;
}

export const PatientCardPDF: React.FC<PatientCardPDFProps> = ({ patient, settings }) => {
    const formattedDate = format(new Date(), "dd.MM.yyyy");
    const birthDate = patient.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), "dd.MM.yyyy") : "-";
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    return (
        <Document title={`Hasta_Kimlik_${patient.ad}_${patient.soyad}`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                    </View>
                    <View style={styles.headerDetails}>
                        <Text>PROTOKOL NO: {patient.protokol_no || patient.id}</Text>
                        <Text>TARİH: {formattedDate}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("KİŞİSEL BİLGİLER")}</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Adı Soyadı")}</Text>
                            <Text style={styles.value}>{patient.ad} {patient.soyad}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("TC Kimlik No")}</Text>
                            <Text style={styles.value}>{maskedTc}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Doğum Tarihi")}</Text>
                            <Text style={styles.value}>{birthDate}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Doğum Yeri")}</Text>
                            <Text style={styles.value}>{patient.dogum_yeri || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Cinsiyet")}</Text>
                            <Text style={styles.value}>{patient.cinsiyet || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Medeni Hali")}</Text>
                            <Text style={styles.value}>{patient.medeni_hal || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Kan Grubu")}</Text>
                            <Text style={styles.value}>{patient.kan_grubu || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Çocuk Sayısı")}</Text>
                            <Text style={styles.value}>{patient.cocuk_sayisi || "-"}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("İLETİŞİM BİLGİLERİ")}</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Cep Telefonu")}</Text>
                            <Text style={styles.value}>{patient.cep_tel || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("E-Posta")}</Text>
                            <Text style={styles.value}>{patient.email || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("İletişim Kişisi")}</Text>
                            <Text style={styles.value}>{
                                Array.isArray(patient.iletisim_kisi) && patient.iletisim_kisi.length > 0
                                    ? `${patient.iletisim_kisi[0].isim} ${patient.iletisim_kisi[0].telefon ? `(${patient.iletisim_kisi[0].telefon})` : ''}`
                                    : "-"
                            }</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("KURUM BİLGİLERİ")}</Text>
                    <View style={styles.grid}>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Kurum")}</Text>
                            <Text style={styles.value}>{patient.kurum || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Meslek")}</Text>
                            <Text style={styles.value}>{patient.meslek || "-"}</Text>
                        </View>
                        <View style={styles.gridItem}>
                            <Text style={styles.label}>{trUpper("Özel Sigorta")}</Text>
                            <Text style={styles.value}>{patient.ozelsigorta || "-"}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("ADRES BİLGİLERİ")}</Text>
                    {patient.adres ? (
                        <View style={styles.addressBlock}>
                            <Text>{patient.adres}</Text>
                            <Text>{patient.ilce ? `${patient.ilce} / ` : ""}{patient.sehir} {patient.postakodu || ""}</Text>
                        </View>
                    ) : (
                        <Text style={[styles.addressBlock, { color: '#999999' }]}>Adres bilgisi girilmemiştir.</Text>
                    )}
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={{ width: '60%' }}>
                        <Text style={styles.clinicName}>{settings["clinic_name"] || "UroLog"}</Text>
                        <Text style={styles.clinicDetail}>{settings["clinic_address"] || ""}</Text>
                        <Text style={styles.clinicDetail}>Tel: {settings["clinic_phone"] || ""}</Text>
                        <Text style={styles.clinicDetail}>E-posta: {settings["clinic_email"] || ""}</Text>
                    </View>
                    <View style={styles.signatureBlock}>
                        <Text style={styles.reportDate}>Sistem Çıktı Tarihi: {formattedDate}</Text>
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
