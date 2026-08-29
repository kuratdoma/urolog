import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { Patient } from '@/lib/api';
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
    section: {
        marginBottom: 8
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
    mriBox: {
        backgroundColor: '#f8f8f8',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 6,
        marginTop: 3
    },
    // 2-column location list
    locationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 3
    },
    locationItem: {
        width: '50%',
        flexDirection: 'row',
        marginBottom: 1
    },
    locationNo: {
        width: 20,
        fontSize: 9,
        fontWeight: 'bold'
    },
    locationLabel: {
        flex: 1,
        fontSize: 9
    }
});

interface MriData {
    pirads: string;
    lezyonYeri: string;
    lezyonBoyut: string;
    mriVar: boolean;
}

interface ProstatData {
    width: string;
    height: string;
    length: string;
    volume: string; // From TRUS form directly
}

interface PsaRecord {
    tarih: string;
    sonuc: string;
}

interface PathologyFormPDFProps {
    patient: Patient;
    biopsyCount: number;
    biopsyDate?: Date;
    template: string[];
    settings: any;
    mriData?: MriData;
    psaHistory?: PsaRecord[];
    prostatData?: ProstatData;
    rektalTuse?: string;
}

// Calculate prostate volume: V = d1 × d2 × d3 × 0.524 (ellipsoid formula, mm to cc)
function calculateProstateVolume(w: string, h: string, l: string): number | null {
    const width = parseFloat(w);
    const height = parseFloat(h);
    const length = parseFloat(l);
    if (isNaN(width) || isNaN(height) || isNaN(length) || width <= 0 || height <= 0 || length <= 0) return null;
    // Convert mm to cm and multiply by 0.524
    return (width / 10) * (height / 10) * (length / 10) * 0.524;
}

// Calculate PSA density: PSA / Volume
function calculatePsaDensity(psa: number, volume: number): number {
    return psa / volume;
}

// Calculate PSA doubling time using natural log formula
// DT = (ln(2) × t) / (ln(PSA2) - ln(PSA1))
// where t is time between measurements in months
function calculatePsaDoublingTime(psaHistory: PsaRecord[]): { doublingTime: number; unit: string } | null {
    if (psaHistory.length < 2) return null;

    // Use oldest and newest PSA values
    const newest = psaHistory[0];
    const oldest = psaHistory[psaHistory.length - 1];

    const psa2 = parseFloat(newest.sonuc);
    const psa1 = parseFloat(oldest.sonuc);

    if (isNaN(psa1) || isNaN(psa2) || psa1 <= 0 || psa2 <= 0) return null;
    if (psa2 <= psa1) return null; // PSA must be rising for positive doubling time

    const date2 = new Date(newest.tarih);
    const date1 = new Date(oldest.tarih);

    // Calculate time difference in months
    const timeDiffMonths = (date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24 * 30.44);

    if (timeDiffMonths <= 0) return null;

    const doublingTime = (Math.log(2) * timeDiffMonths) / (Math.log(psa2) - Math.log(psa1));

    if (doublingTime <= 0 || !isFinite(doublingTime)) return null;

    return { doublingTime: Math.round(doublingTime * 10) / 10, unit: 'ay' };
}

export const PathologyFormPDF: React.FC<PathologyFormPDFProps> = ({
    patient,
    biopsyCount,
    biopsyDate,
    template,
    settings,
    mriData,
    psaHistory,
    prostatData,
    rektalTuse
}) => {
    // Parse template items and limit to biopsyCount
    const cores = template.slice(0, biopsyCount).map((tpl: any, index) => {
        // Handle both legacy string format and new object format
        if (typeof tpl === 'string') {
            const parts = tpl.split('|');
            return {
                id: parts[0]?.trim() || String(index + 1),
                label: parts[1]?.trim() || `Lokasyon ${index + 1}`
            };
        }
        return {
            id: tpl.kadran || tpl.id || String(index + 1),
            label: tpl.ad || `Lokasyon ${index + 1}`
        };
    });

    // If template has fewer items than biopsyCount, pad with numbered entries
    while (cores.length < biopsyCount) {
        cores.push({
            id: String(cores.length + 1),
            label: `Lokasyon ${cores.length + 1}`
        });
    }

    const formattedDate = biopsyDate ? format(biopsyDate, "dd.MM.yyyy") : format(new Date(), "dd.MM.yyyy");
    const maskedTc = patient.tc_kimlik ? `****${patient.tc_kimlik.substring(4)}` : "-";

    // Check if we have any MRI data to display
    const hasMriData = mriData?.mriVar && (mriData.pirads || mriData.lezyonYeri || mriData.lezyonBoyut);

    // Calculate prostate volume from dimensions (for display only)
    const calculatedVolume = prostatData
        ? calculateProstateVolume(prostatData.width, prostatData.height, prostatData.length)
        : null;

    // Use TRUS form volume for density calculation, fallback to calculated
    const trusVolume = prostatData?.volume ? parseFloat(prostatData.volume) : null;
    const displayVolume = (trusVolume && !isNaN(trusVolume)) ? trusVolume : calculatedVolume;

    // Get latest PSA for density calculation
    const latestPsa = psaHistory && psaHistory.length > 0 ? parseFloat(psaHistory[0].sonuc) : null;

    // Calculate PSA density using TRUS volume
    const psaDensity = (displayVolume && latestPsa && !isNaN(latestPsa))
        ? calculatePsaDensity(latestPsa, displayVolume)
        : null;

    // Calculate PSA doubling time (only if 2+ measurements)
    const doublingTimeResult = psaHistory ? calculatePsaDoublingTime(psaHistory) : null;

    return (
        <Document title={`Patoloji_Form_${patient.ad}_${patient.soyad}`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9, fontWeight: 'bold' }}>PROTOKOL NO: {patient.protokol_no || "-"}</Text>
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
                                <Text style={styles.value}>{patient.dogum_tarihi ? format(new Date(patient.dogum_tarihi), "dd.MM.yyyy") : "-"}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Prostate Info */}
                {prostatData && (prostatData.width || prostatData.height || prostatData.length) && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("PROSTAT BİLGİLERİ")}</Text>
                        <View style={{ marginTop: 3 }}>
                            <Text style={{ fontSize: 10 }}>
                                {prostatData.width || '-'}×{prostatData.height || '-'}×{prostatData.length || '-'}
                                {displayVolume ? ` = ${displayVolume.toFixed(1)} cc` : ' mm'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Rectal Exam Info */}
                {rektalTuse && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("REKTAL TUŞE BULGULARI")}</Text>
                        <View style={{ marginTop: 3 }}>
                            <Text style={styles.contentText}>{rektalTuse}</Text>
                        </View>
                    </View>
                )}

                {/* PSA History with Calculations */}
                {psaHistory && psaHistory.length > 0 && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("PSA GEÇMİŞİ VE ANALİZ")}</Text>
                        <View style={{ marginTop: 3 }}>
                            {psaHistory.map((psa, index) => (
                                <Text key={index} style={{ fontSize: 10, marginBottom: 2 }}>
                                    {psa.tarih ? format(new Date(psa.tarih), "dd.MM.yyyy") : "-"}, PSA: {psa.sonuc} ng/mL
                                </Text>
                            ))}

                            {/* PSA Density */}
                            {psaDensity && (
                                <Text style={{ fontSize: 10, marginTop: 5, fontWeight: 'bold' }}>
                                    PSA Dansitesi: {psaDensity.toFixed(3)} ng/mL/cc
                                </Text>
                            )}

                            {/* PSA Doubling Time */}
                            {doublingTimeResult && (
                                <Text style={{ fontSize: 10, fontWeight: 'bold' }}>
                                    PSA Doubling Time: {doublingTimeResult.doublingTime} {doublingTimeResult.unit}
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* MRI / PIRADS Info */}
                {hasMriData && (
                    <View style={styles.contentSection}>
                        <Text style={styles.contentHeader}>{trUpper("MULTİPARAMETRİK MRI VE LEZYON BİLGİLERİ")}</Text>
                        <View style={styles.mriBox}>
                            <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
                                {mriData?.pirads && `PIRADS ${mriData.pirads}`}
                                {mriData?.pirads && (mriData.lezyonYeri || mriData.lezyonBoyut) && ', '}
                                {mriData?.lezyonYeri && `Lezyon yeri ${mriData.lezyonYeri}`}
                                {mriData?.lezyonYeri && mriData.lezyonBoyut && ', '}
                                {mriData?.lezyonBoyut && `Lezyon boyutu ${mriData.lezyonBoyut} mm`}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Procedure Info */}
                <View style={styles.contentSection}>
                    <Text style={styles.contentHeader}>{trUpper("İŞLEM BİLGİLERİ")}</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>İşlem:</Text>
                        <Text style={styles.value}>TRUS Eşliğinde Prostat Biyopsisi</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.label}>Örnek Sayısı:</Text>
                        <Text style={styles.value}>{biopsyCount} adet kor biyopsi</Text>
                    </View>
                </View>

                {/* Biopsy Cores - 2 Column Layout */}
                <View style={styles.contentSection}>
                    <Text style={styles.contentHeader}>{trUpper("BİYOPSİ LOKASYONLARI")}</Text>
                    <View style={styles.locationGrid}>
                        {cores.map((core) => (
                            <View style={styles.locationItem} key={core.id}>
                                <Text style={styles.locationNo}>{core.id}.</Text>
                                <Text style={styles.locationLabel}>{core.label}</Text>
                            </View>
                        ))}
                    </View>
                    <Text style={{ fontSize: 9, marginTop: 5, fontStyle: 'italic' }}>
                        Toplam {biopsyCount} adet kor biyopsi örneği %10 formaldehit içinde gönderilmiştir.
                    </Text>
                </View>

                {/* Footer */}
                <View style={styles.footer} fixed>
                    <View style={{ width: '60%' }}>
                        <Text style={styles.clinicName}>{settings["clinic_name"] || "UroLog"}</Text>
                        <Text style={styles.clinicDetail}>{settings["clinic_address"] || ""}</Text>
                        <Text style={styles.clinicDetail}>Tel: {settings["clinic_phone"] || ""}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 8, color: '#000000', marginBottom: 2 }}>Form Tarihi: {format(new Date(), "dd.MM.yyyy")}</Text>
                        <View style={{ marginTop: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#000000' }}>{settings["clinic_doctor"] || "Prof. Dr. Tayyar Alp ÖZKAN"}</Text>
                        </View>
                    </View>
                </View>

                {/* Watermark */}
                <PDFWatermark patient={patient} />
            </Page>
        </Document>
    );
};
