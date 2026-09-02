import React from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface DiagnosisFilterSectionProps {
    diagnosisIcd: string;
    setDiagnosisIcd: (val: string) => void;
    diagnosisText: string;
    setDiagnosisText: (val: string) => void;
    onSearch: () => void;
}

export function DiagnosisFilterSection({
    diagnosisIcd,
    setDiagnosisIcd,
    diagnosisText,
    setDiagnosisText,
    onSearch,
}: DiagnosisFilterSectionProps) {
    return (
        <Card className="border-white shadow-sm overflow-hidden border-l-4 border-l-indigo-500">
            <CardHeader className="bg-white border-b border-slate-50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Search className="h-4 w-4 text-indigo-500" /> Tanı Bazlı Hasta Filtresi
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                            &quot;Son 2 yılda C67 (Mesane Tümörü) tanılı hastaların listesini çıkar&quot;
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        <Input
                            placeholder="ICD-10 Kodu (örn: C67)"
                            value={diagnosisIcd}
                            onChange={(e) => setDiagnosisIcd(e.target.value)}
                            className="h-9 w-[150px] text-xs"
                            onKeyDown={(e) => e.key === "Enter" && onSearch()}
                        />
                        <Input
                            placeholder="Tanı Adı"
                            value={diagnosisText}
                            onChange={(e) => setDiagnosisText(e.target.value)}
                            className="h-9 w-[200px] text-xs"
                            onKeyDown={(e) => e.key === "Enter" && onSearch()}
                        />
                        <Button onClick={onSearch} className="h-9 bg-indigo-600 hover:bg-indigo-700">
                            <Search className="h-4 w-4 mr-2" /> Filtrele
                        </Button>
                    </div>
                </div>
            </CardHeader>
        </Card>
    );
}
