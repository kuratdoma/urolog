import React from 'react';
import { View, Text } from '@react-pdf/renderer';

interface PDFWatermarkProps {
    patient: {
        ad: string;
        soyad: string;
        tc_kimlik?: string | null;
    };
}

export const PDFWatermark: React.FC<PDFWatermarkProps> = ({ patient }) => {
    const tcKimlik = patient.tc_kimlik
        ? patient.tc_kimlik.length === 11
            ? "****" + patient.tc_kimlik.slice(4)
            : patient.tc_kimlik
        : "-";

    // Seeded PRNG (mulberry32) — deterministic positions, random font sizes
    const watermarks = React.useMemo(() => {
        let seed = 0xDEAD_BEEF;
        const rand = () => {
            seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };

        const items = [];
        const rows = 3;
        const cols = 3;
        const cellW = 595 / cols;
        const cellH = 842 / rows;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                items.push({
                    top: r * cellH + rand() * cellH,
                    left: c * cellW + rand() * cellW * 0.4,
                    rotation: -44,
                    fontSize: rand() > 0.4 ? 12 : 30,
                    opacity: 0.06,
                });
            }
        }
        return items;
    }, []);

    return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} fixed>
            {watermarks.map((wm, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        top: wm.top,
                        left: wm.left,
                        opacity: wm.opacity,
                        transform: `rotate(${wm.rotation}deg)`,
                    }}
                >
                    <Text style={{ fontSize: wm.fontSize, fontWeight: 'bold', textTransform: 'uppercase', color: '#000', textAlign: 'center' }}>
                        {patient.ad} {patient.soyad}
                    </Text>
                    <Text style={{ fontSize: wm.fontSize * 0.7, fontWeight: 'bold', color: '#000', textAlign: 'center', marginTop: 2 }}>
                        {tcKimlik}
                    </Text>
                </View>
            ))}
        </View>
    );
};
