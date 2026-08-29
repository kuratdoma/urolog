import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isResultAbnormal } from "@/lib/lab-utils";
import { DatePicker } from "@/components/ui/date-picker";

export interface FastLabRowType {
    id: number;
    test: string;
    result: string;
    unit: string;
    reference: string;
    date?: string;
}

interface FastLabRowProps {
    row: FastLabRowType;
    index: number;
    globalDate: Date | undefined;
    onUpdate: (id: number, field: keyof FastLabRowType, value: string) => void;
    onRemove: (id: number) => void;
    onKeyDown: (e: React.KeyboardEvent, id: number, field: keyof FastLabRowType) => void;
}

export const FastLabRow = React.memo(({
    row,
    index,
    globalDate,
    onUpdate,
    onRemove,
    onKeyDown
}: FastLabRowProps) => {
    const [localTest, setLocalTest] = useState(row.test);
    const [localResult, setLocalResult] = useState(row.result);
    const [localUnit, setLocalUnit] = useState(row.unit);
    const [localRef, setLocalRef] = useState(row.reference);
    const [localDate, setLocalDate] = useState(row.date || (globalDate ? format(globalDate, 'yyyy-MM-dd') : ''));

    useEffect(() => { setLocalTest(row.test); }, [row.test]);
    useEffect(() => { setLocalResult(row.result); }, [row.result]);
    useEffect(() => { setLocalUnit(row.unit); }, [row.unit]);
    useEffect(() => { setLocalRef(row.reference); }, [row.reference]);
    useEffect(() => {
        setLocalDate(row.date || (globalDate ? format(globalDate, 'yyyy-MM-dd') : ''));
    }, [row.date, globalDate]);

    const handleBlur = (field: keyof FastLabRowType, value: string) => {
        if (row[field] !== value) {
            onUpdate(row.id, field, value);
        }
    };

    const isAbnormal = useMemo(() => {
        const result = localResult;
        const reference = localRef;
        if (!result || !reference) return false;
        return isResultAbnormal(result, reference);
    }, [localResult, localRef]);

    return (
        <tr className="border-b border-slate-50 hover:bg-slate-50/50 group transition-colors">
            <td className="py-1 px-2 text-center text-xs text-slate-300 font-mono select-none">{index + 1}</td>
            <td className="p-1">
                <DatePicker
                    date={localDate ? localDate.substring(0, 10) : ''}
                    setDate={val => {
                        setLocalDate(val);
                        onUpdate(row.id, 'date', val);
                    }}
                    className="w-full h-9 px-2 rounded-lg text-xs font-medium text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white border-none shadow-none focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                />
            </td>
            <td className="p-1">
                <input
                    type="text"
                    list="testList"
                    placeholder="Test ara..."
                    className="w-full h-9 px-3 rounded-lg text-sm font-bold text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none uppercase placeholder:font-normal placeholder:capitalize"
                    value={localTest}
                    onChange={e => setLocalTest(e.target.value)}
                    onBlur={e => handleBlur('test', e.target.value)}
                    onKeyDown={e => onKeyDown(e, row.id, 'test')}
                    id={`name-${row.id}`}
                    autoComplete="off"
                />
            </td>
            <td className="p-1">
                <input
                    type="text"
                    placeholder="Değer"
                    className={cn(
                        "w-full h-9 px-3 rounded-lg text-sm font-bold bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:font-normal",
                        isAbnormal ? "text-red-600" : "text-blue-600"
                    )}
                    value={localResult}
                    onChange={e => setLocalResult(e.target.value)}
                    onBlur={e => handleBlur('result', e.target.value)}
                    onKeyDown={e => onKeyDown(e, row.id, 'result')}
                    id={`result-${row.id}`}
                    autoComplete="off"
                />
            </td>
            <td className="p-1">
                <input
                    type="text"
                    placeholder="Birim"
                    list="unitList"
                    className="w-full h-9 px-3 rounded-lg text-xs font-medium text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:font-normal"
                    value={localUnit}
                    onChange={e => setLocalUnit(e.target.value)}
                    onBlur={e => handleBlur('unit', e.target.value)}
                    onKeyDown={e => onKeyDown(e, row.id, 'unit')}
                    id={`unit-${row.id}`}
                    autoComplete="off"
                />
            </td>
            <td className="p-1">
                <input
                    type="text"
                    placeholder="Ref"
                    className="w-full h-9 px-3 rounded-lg text-xs font-medium text-slate-400 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all outline-none placeholder:font-normal"
                    value={localRef}
                    onChange={e => setLocalRef(e.target.value)}
                    onBlur={e => handleBlur('reference', e.target.value)}
                    onKeyDown={e => onKeyDown(e, row.id, 'reference')}
                    id={`reference-${row.id}`}
                    autoComplete="off"
                />
            </td>
            <td className="p-1 text-center">
                <button
                    onClick={() => onRemove(row.id)}
                    className="p-2 text-slate-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    tabIndex={-1}
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </td>
        </tr>
    );
});

FastLabRow.displayName = 'FastLabRow';
