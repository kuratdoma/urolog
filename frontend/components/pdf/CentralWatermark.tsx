import React from 'react';
import { View, Text } from '@react-pdf/renderer';

interface CentralWatermarkProps {
    patient: {
        ad: string;
        soyad: string;
        tc_kimlik?: string | null;
    };
}

export const CentralWatermark: React.FC<CentralWatermarkProps> = ({ patient }) => {
    return (
        <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10
        }} fixed>
            <View
                style={{
                    position: 'absolute',
                    top: 380,
                    left: 0,
                    width: 595,
                    opacity: 0.1,
                    transform: 'rotate(-45deg)',
                }}
            >
                <Text style={{
                    fontSize: 48,
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: '#000',
                    textAlign: 'center'
                }}>
                    {patient.ad} {patient.soyad}
                </Text>
            </View>
        </View>
    );
};
