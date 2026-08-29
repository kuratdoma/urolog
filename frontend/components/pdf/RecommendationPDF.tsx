import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path, Circle } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { CentralWatermark } from './CentralWatermark';
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
        marginBottom: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        marginTop: 6,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1d4ed8', // blue-700
        marginLeft: 6,
    },
    introText: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#475569', // slate-600
        marginBottom: 6,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 3,
        paddingLeft: 4,
    },
    bullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
        marginTop: 2,
    },
    itemText: {
        flex: 1,
        fontSize: 10,
        lineHeight: 1.4,
        color: '#334155', // slate-700
    },
    footerContainer: {
        marginTop: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    footerQuote: {
        fontSize: 12,
        fontStyle: 'italic',
        textAlign: 'center',
        padding: 10,
        backgroundColor: '#f8fafc',
        color: '#1e40af', // blue-800
        marginBottom: 20,
    },
    pageFooter: {
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
    }
});

interface RecommendationPDFProps {
    data: any;
    patient: any;
    settings: any;
}

// Icons for PDF
const IconStop = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#ef4444" />
        <Path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const IconCheck = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#10b981" />
        <Path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const IconIdea = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#f59e0b" />
        <Path d="M12 7v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M9.5 9a3.5 3.5 0 015 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const IconInfo = () => (
    <Svg width="16" height="16" viewBox="0 0 24 24">
        <Circle cx="12" cy="12" r="10" fill="#3b82f6" />
        <Path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const getIcon = (style: string) => {
    switch (style) {
        case 'red': return <IconStop />;
        case 'green': return <IconCheck />;
        case 'gold': return <IconIdea />;
        case 'blue': return <IconInfo />;
        default: return <IconInfo />;
    }
};

// Strips common emojis to correct PDF rendering artifacts
const cleanText = (text: string) => {
    if (!text) return "";
    // Basic regex to strip emoji ranges (surrogate pairs)
    return text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim();
};

export const RecommendationPDF: React.FC<RecommendationPDFProps> = ({ data, patient, settings }) => {
    const formattedDate = format(new Date(), "dd.MM.yyyy");

    const renderContent = () => {
        if (Array.isArray(data.content) && data.content.length > 0 && typeof data.content[0] === 'object') {
            return (
                <View>
                    {data.content.map((section: any, idx: number) => (
                        <View key={idx} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                {getIcon(section.listStyle)}
                                <Text style={styles.sectionTitle}>{cleanText(section.title)}</Text>
                            </View>
                            {section.intro && (
                                <Text style={styles.introText}>{cleanText(section.intro)}</Text>
                            )}
                            <View>
                                {section.items.map((item: string, i: number) => {
                                    // Parse bold markdown **text**
                                    const parts = item.split(/(\*\*.*?\*\*)/g);

                                    // Determine bullet color
                                    let bulletColor = '#94a3b8'; // slate-400
                                    if (section.listStyle === 'red') bulletColor = '#ef4444';
                                    if (section.listStyle === 'green') bulletColor = '#10b981';
                                    if (section.listStyle === 'blue') bulletColor = '#3b82f6';
                                    if (section.listStyle === 'gold') bulletColor = '#f59e0b';

                                    return (
                                        <View key={i} style={styles.listItem}>
                                            <View style={[styles.bullet, { backgroundColor: bulletColor }]} />
                                            <Text style={styles.itemText}>
                                                {parts.map((part, pIdx) => {
                                                    const cleanPart = cleanText(part);
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <Text key={pIdx} style={{ fontWeight: 'bold', color: '#0f172a' }}>{cleanPart.slice(2, -2)}</Text>;
                                                    }
                                                    return <Text key={pIdx}>{cleanPart}</Text>;
                                                })}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    ))}
                </View>
            );
        }

        // Legacy flat list
        return (
            <View style={styles.section}>
                {data.content.map((item: string, idx: number) => (
                    <View key={idx} style={styles.listItem}>
                        <View style={[styles.bullet, { backgroundColor: '#3b82f6', width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' }]}>
                            <Text style={{ color: 'white', fontSize: 8, fontWeight: 'bold' }}>{idx + 1}</Text>
                        </View>
                        <Text style={[styles.itemText, { marginLeft: 4 }]}>{cleanText(item)}</Text>
                    </View>
                ))}
            </View>
        );
    };

    return (
        <Document title={`${patient?.ad} ${patient?.soyad} - ${data.title}`}>
            <Page size="A4" style={styles.page}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>{settings["clinic_name"] || "UroLog Üroloji Kliniği"}</Text>
                        <Text style={{ fontSize: 10, marginTop: 4 }}>{settings["doctor_name"] || "Dr. Alp Özkan"}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 9 }}>TARİH: {formattedDate}</Text>
                    </View>
                </View>



                {/* Main Title */}
                <View style={{ marginBottom: 15, borderLeftWidth: 3, borderLeftColor: '#1d4ed8', paddingLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1d4ed8' }}>{trUpper(data.title)}</Text>
                    {data.intro && (
                        <Text style={{ fontSize: 10, fontStyle: 'italic', color: '#475569', marginTop: 5 }}>{data.intro}</Text>
                    )}
                </View>

                {/* Content */}
                {renderContent()}

                {/* Footer Quote */}
                <View style={styles.footerContainer}>
                    <Text style={styles.footerQuote}>{data.footer}</Text>
                </View>

                {/* Page Footer */}
                <View style={styles.pageFooter} fixed>
                    <View style={{ width: '60%' }}>
                        <Text style={styles.clinicName}>{settings["clinic_name"] || "UroLog"}</Text>
                        <Text style={styles.clinicDetail}>{settings["clinic_address"] || "Rafet Karacan Blv. Ahmet Ergunes Sk. 21/12 Izmit-Kocaeli"}</Text>
                        <Text style={styles.clinicDetail}>Tel: {settings["clinic_phone"] || "262 321 0141"}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 8, color: '#000000', marginBottom: 2 }}>Sistem Çıktı Tarihi: {formattedDate}</Text>
                        <View style={{ marginTop: 10, alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#000000' }}>{settings["doctor_name"] || "Dr. Alp Özkan"}</Text>
                        </View>
                    </View>
                </View>

                {patient && <CentralWatermark patient={patient} />}
            </Page>
        </Document>
    );
};
