import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format, parseISO } from 'date-fns';
import { TrusBiyopsi, Patient } from '@/lib/api';
import { registerPDFFonts, trUpper } from '@/lib/pdf-fonts';

registerPDFFonts();

// Use local fonts to avoid network issues in production/Docker


const styles = StyleSheet.create({
    page: { paddingTop: 40, paddingHorizontal: 40, paddingBottom: 80, fontFamily: 'Roboto', fontSize: 10, color: '#000000', backgroundColor: '#ffffff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#000000', paddingBottom: 5, marginBottom: 15, alignItems: 'center' },
    headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#000000' },
    headerSubTitle: { fontSize: 10, color: '#444' },
    section: { marginBottom: 12, padding: 0 },
    sectionTitle: { fontSize: 10, fontWeight: 'bold', color: '#000000', backgroundColor: '#f0f0f0', padding: 4, marginBottom: 5, borderLeftWidth: 3, borderLeftColor: '#333' },
    row: { flexDirection: 'row', marginBottom: 4 },
    label: { width: 120, fontSize: 9, fontWeight: 'bold' },
    value: { flex: 1, fontSize: 10 },

    // Table Styles
    table: { display: "flex", width: "auto", borderStyle: "solid", borderWidth: 1, borderColor: "#bfbfbf", marginTop: 5 },
    tableRow: { margin: "auto", flexDirection: "row" },
    tableCol1: { width: "10%", borderStyle: "solid", borderWidth: 1, borderColor: "#bfbfbf", borderLeftWidth: 0, borderTopWidth: 0 },
    tableCol2: { width: "90%", borderStyle: "solid", borderWidth: 1, borderColor: "#bfbfbf", borderTopWidth: 0, borderRightWidth: 0 },
    tableCell: { margin: 4, fontSize: 9 },
    tableHeader: { backgroundColor: '#f0f0f0', fontWeight: 'bold' },

    footer: { position: 'absolute', bottom: 30, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 5 },
});

interface TrusBiopsyPDFProps {
    trus: TrusBiyopsi;
    patient: Patient;
    settings: any;
    biopsyTemplates?: any[];
}

export const TrusBiopsyPDF: React.FC<TrusBiopsyPDFProps> = ({ trus, patient, settings, biopsyTemplates }) => {
    // Parse cores
    let cores: { id: string | number, label: string }[] = [];
    try {
        const parsed = JSON.parse(trus.lokasyonlar || "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
            cores = parsed;
        }
    } catch { cores = []; }

    // Fallback to Template if empty
    if (cores.length === 0 && Array.isArray(biopsyTemplates) && biopsyTemplates.length > 0) {
        cores = biopsyTemplates.map(t => ({
            id: t.kadran || t.id,
            label: t.ad
        }));
    }

    const formattedDate = trus.tarih ? format(parseISO(trus.tarih), "dd.MM.yyyy") : "-";

    // Split cores into two columns for better view if many
    const mid = Math.ceil(cores.length / 2);
    const col1 = cores.slice(0, mid);
    const col2 = cores.slice(mid);

    return (
        <Document title={`TRUS_Patoloji_${patient.ad}_${patient.soyad}`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "Prof. Dr. Tayyar Alp ÖZKAN"}</Text>
                        <Text style={styles.headerSubTitle}>{trUpper("PATOLOJİ TETKİK İSTEK FORMU")}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>Tarih: {formattedDate}</Text>
                        <Text style={{ fontSize: 9 }}>Protokol: {patient.protokol_no || "-"}</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("HASTA BİLGİLERİ")}</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>Adı Soyadı:</Text>
                        <Text style={styles.value}>{patient.ad} {patient.soyad}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>TC Kimlik / Doğum:</Text>
                        <Text style={styles.value}>{patient.tc_kimlik || "-"} / {patient.dogum_tarihi ? format(parseISO(patient.dogum_tarihi), "dd.MM.yyyy") : "-"}</Text>
                    </View>
                </View>

                {/* Clinical Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("KLİNİK BİLGİLERİ")}</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>PSA (Total):</Text>
                        <Text style={styles.value}>{trus.psa_total || "-"}</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Rektal Tuşe (DRE):</Text>
                        <Text style={styles.value}>{trus.rektal_tuse || "-"}</Text>
                    </View>
                </View>

                {/* MRI Info */}
                {trus.mri_var && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{trUpper("MULTIPARAMETRIK MRI ve LEZYON BİLGİLERİ")}</Text>
                        <View style={styles.row}>
                            <Text style={styles.label}>Tarih:</Text>
                            <Text style={styles.value}>{trus.mri_tarih ? format(parseISO(trus.mri_tarih), "dd.MM.yyyy") : "-"}</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>PIRADS Skoru:</Text>
                            <Text style={styles.value}>{trus.mri_ozet || "-"}</Text>
                        </View>
                        {/* 
                           User requested to EXCLUDE dimensions and location from the print form.
                           They are typically just for the record or procedure note, not for the pathology request necessarily,
                           or the user specifically wants them hidden here.
                        */}
                    </View>
                )}

                {/* Cores Table */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{trUpper("BİYOPSİ ÖRNEKLERİ (LOKASYONLAR)")}</Text>

                    <View style={styles.table}>
                        <View style={[styles.tableRow, styles.tableHeader]}>
                            <View style={styles.tableCol1}><Text style={styles.tableCell}>No</Text></View>
                            <View style={styles.tableCol2}><Text style={styles.tableCell}>Lokasyon</Text></View>
                        </View>
                        {cores.length > 0 ? (
                            cores.map((core: any) => (
                                <View style={styles.tableRow} key={core.id}>
                                    <View style={styles.tableCol1}><Text style={styles.tableCell}>{core.id}</Text></View>
                                    <View style={styles.tableCol2}><Text style={styles.tableCell}>{core.label}</Text></View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.tableRow}>
                                <View style={styles.tableCol2}><Text style={styles.tableCell}>Örnek bilgisi bulunamadı.</Text></View>
                            </View>
                        )}
                    </View>
                    <Text style={{ fontSize: 9, marginTop: 5 }}>Toplam {cores.length} adet örnek gönderilmiştir.</Text>
                </View>

                {/* Notes */}
                {trus.prosedur_notu && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{trUpper("NOTLAR")}</Text>
                        <Text style={{ fontSize: 10 }}>{trus.prosedur_notu}</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View>
                        <Text style={{ fontSize: 9 }}>İstek Yapan Hekim:</Text>
                        <Text style={{ fontSize: 10, fontWeight: 'bold', marginTop: 5 }}>{settings["clinic_doctor"] || "Prof. Dr. Tayyar Alp ÖZKAN"}</Text>
                        <Text style={{ fontSize: 9 }}>Üroloji Uzmanı</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', justifyContent: 'flex-end' }}>
                        <Text style={{ fontSize: 8 }}>{settings["clinic_address"]}</Text>
                        <Text style={{ fontSize: 8 }}>{settings["clinic_phone"]}</Text>
                    </View>
                </View>

            </Page>
        </Document>
    );
};
