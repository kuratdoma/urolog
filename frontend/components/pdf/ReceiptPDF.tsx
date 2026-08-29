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
        backgroundColor: '#FFFFFF',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 30,
        borderBottomWidth: 3,
        borderBottomColor: '#000000',
        paddingBottom: 15,
    },
    clinicTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 4,
    },
    dekontLabel: {
        fontSize: 10,
        color: '#6B7280',
        letterSpacing: 1,
        fontWeight: 'bold',
    },
    dateBox: {
        backgroundColor: '#F3F4F6',
        borderRadius: 4,
        padding: 8,
        minWidth: 100,
        alignItems: 'center',
    },
    dateText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#111827',
    },
    infoGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    personSection: {
        width: '60%',
    },
    personLabel: {
        fontSize: 8,
        color: '#9CA3AF',
        fontWeight: 'bold',
        marginBottom: 2,
    },
    personName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#000000'
    },
    personTc: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 2,
    },
    typeSection: {
        width: '35%',
        alignItems: 'flex-end',
    },
    typeBadge: {
        backgroundColor: '#111827',
        color: '#FFFFFF',
        borderRadius: 15,
        paddingHorizontal: 12,
        paddingVertical: 4,
        fontSize: 9,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableContainer: {
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 30,
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        padding: 10,
    },
    tableRow: {
        flexDirection: 'row',
        padding: 15,
        minHeight: 80,
    },
    tableFooter: {
        backgroundColor: '#F9FAFB',
        flexDirection: 'row',
        padding: 12,
    },
    colDesc: { flex: 3 },
    colAmount: { flex: 1, textAlign: 'right' },
    thText: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#6B7280'
    },
    descMain: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    descSub: {
        fontSize: 9,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    amountValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    totalLabel: {
        flex: 3,
        textAlign: 'right',
        fontSize: 10,
        fontWeight: 'bold',
        color: '#6B7280',
        paddingRight: 15,
        justifyContent: 'center',
    },
    totalValue: {
        flex: 1,
        textAlign: 'right',
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    noteSection: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 30,
        alignItems: 'center',
    },
    noteBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 12,
        padding: 15,
    },
    noteText: {
        fontSize: 9,
        color: '#4B5563',
        lineHeight: 1.4,
        fontStyle: 'italic',
    },
    approvalBox: {
        width: 150,
        alignItems: 'center',
    },
    signatureSpace: {
        width: 120,
        height: 60,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB',
        borderStyle: 'dashed',
        marginBottom: 8,
    },
    approvalLabel: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#9CA3AF',
        letterSpacing: 1,
    },
    footer: {
        marginTop: 'auto',
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        paddingTop: 15,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    footerInfo: {
        fontSize: 9,
        color: '#9CA3AF',
    },
    footerClinic: {
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 2,
    },
    footerAuto: {
        fontSize: 8,
        color: '#D1D5DB',
        fontStyle: 'italic',
    }
});

interface ReceiptPDFProps {
    data: {
        patient: any;
        transaction: {
            id: number;
            tarih: string;
            aciklama: string;
            borc: number;
            alacak: number;
            hizmet_ad?: string;
            odeme_yontemi?: string;
        };
        doctor?: string;
    };
    settings: any;
}

export const ReceiptPDF: React.FC<ReceiptPDFProps> = ({ data, settings }) => {
    const { patient, transaction } = data;
    const formattedDate = transaction.tarih ? format(parseISO(transaction.tarih), "dd.MM.yyyy") : format(new Date(), "dd.MM.yyyy");
    const amount = transaction.borc || transaction.alacak || 0;
    const isPayment = transaction.alacak > 0;

    return (
        <Document title={`Makbuz_${patient.ad}_${patient.soyad}_${formattedDate}`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.clinicTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={styles.dekontLabel}>{trUpper(`CARİ HAREKET DEKONTU #RT-${transaction.id}`)}</Text>
                    </View>
                    <View style={styles.dateBox}>
                        <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.personSection}>
                        <Text style={styles.personLabel}>{trUpper("SAYIN")}</Text>
                        <Text style={styles.personName}>{trUpper(`${patient.ad} ${patient.soyad}`)}</Text>
                        {patient.tc_kimlik && <Text style={styles.personTc}>TC: {patient.tc_kimlik}</Text>}
                    </View>
                    <View style={styles.typeSection}>
                        <Text style={styles.personLabel}>{trUpper("İŞLEM TİPİ")}</Text>
                        <Text style={styles.typeBadge}>
                            {isPayment ? trUpper("TAHSİLAT / ÖDEME") : trUpper("HİZMET / BORÇ")}
                        </Text>
                    </View>
                </View>

                {/* Detail Table */}
                <View style={styles.tableContainer}>
                    <View style={styles.tableHeader}>
                        <View style={styles.colDesc}><Text style={styles.thText}>{trUpper("Açıklama")}</Text></View>
                        <View style={styles.colAmount}><Text style={styles.thText}>{trUpper("Tutar")}</Text></View>
                    </View>
                    <View style={styles.tableRow}>
                        <View style={styles.colDesc}>
                            <Text style={styles.descMain}>
                                {transaction.aciklama || transaction.hizmet_ad || "Genel İşlem"}
                            </Text>
                            <Text style={styles.descSub}>
                                İşlem Tarihi: {formattedDate}
                                {transaction.odeme_yontemi ? ` • Ödeme: ${transaction.odeme_yontemi}` : ""}
                            </Text>
                        </View>
                        <View style={styles.colAmount}>
                            <Text style={styles.amountValue}>
                                {amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                            </Text>
                        </View>
                    </View>
                    <View style={styles.tableFooter}>
                        <View style={styles.totalLabel}><Text>{trUpper("TOPLAM")}</Text></View>
                        <View style={styles.colAmount}>
                            <Text style={styles.totalValue}>
                                {amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Bottom Info */}
                <View style={styles.noteSection}>
                    <View style={styles.noteBox}>
                        <Text style={styles.noteText}>
                            Sayın hastamız, bu belge kliniğimiz tarafından gerçekleştirilen mali işlemin dökümüdür. Lütfen muhafaza ediniz.
                        </Text>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={styles.footerRow}>
                        <View style={styles.footerInfo}>
                            <Text style={styles.footerClinic}>{settings["clinic_name"] || "UroLog"}</Text>
                            <Text>{settings["clinic_address"]}</Text>
                            <Text>{settings["clinic_phone"]}</Text>
                        </View>
                        <Text style={styles.footerAuto}>Bu belge sistem tarafından otomatik oluşturulmuştur.</Text>
                    </View>
                </View>

                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
