"use client";

import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

/**
 * Yazarken ekrana yansımanın gecikmemesi için kullanılan metin alanları.
 *
 * Muayene sayfasında tüm alanlar tek bir `formData` state'inde tutuluyor; her
 * tuş vuruşu üst bileşeni yeniden render ettiği için karakterler geç görünüyordu.
 * Bu bileşenler metni kendi lokal state'lerinde tutar (anında ekrana yansır) ve
 * üst bileşene yalnızca `delay` ms yazma durduktan sonra, blur'da veya unmount'ta
 * bildirir.
 */
function useDebouncedValue(
    value: string,
    onValueChange: (val: string) => void,
    delay: number
) {
    const [local, setLocal] = React.useState(value ?? "");
    const localRef = React.useRef(value ?? "");
    // Üst bileşenden en son görülen değer. Dış kaynaklı bir değişikliği (geçmiş
    // muayeneden aktarma, AI scribe, forma sıfırlama) kullanıcının kendi yazdığı
    // metinden ayırt etmek için gerekli — yalnızca `pending` bayrağına bakmak,
    // debounce penceresi içinde gelen dış yazmaları sessizce yutuyordu.
    const lastPropRef = React.useRef(value ?? "");
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const onChangeRef = React.useRef(onValueChange);
    React.useEffect(() => {
        onChangeRef.current = onValueChange;
    }, [onValueChange]);

    const clearTimer = React.useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Dışarıdan gelen her gerçek değişikliği uygula ve bekleyen yazmayı iptal et:
    // dış kaynak her zaman kazanır, aksi halde eski yerel metin onun üstüne yazardı.
    React.useEffect(() => {
        const next = value ?? "";
        if (next === lastPropRef.current) return;
        lastPropRef.current = next;
        if (next !== localRef.current) {
            clearTimer();
            localRef.current = next;
            setLocal(next);
        }
    }, [value, clearTimer]);

    const flush = React.useCallback(() => {
        clearTimer();
        if (localRef.current !== lastPropRef.current) {
            lastPropRef.current = localRef.current;
            onChangeRef.current(localRef.current);
        }
    }, [clearTimer]);

    const flushRef = React.useRef(flush);
    React.useEffect(() => {
        flushRef.current = flush;
    }, [flush]);

    // Bileşen kaldırılırken bekleyen değişikliği kaybetme.
    React.useEffect(() => () => flushRef.current(), []);

    const handleChange = React.useCallback(
        (val: string) => {
            localRef.current = val;
            setLocal(val);
            clearTimer();
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                flushRef.current();
            }, delay);
        },
        [delay, clearTimer]
    );

    return { local, handleChange, flush };
}

type DebouncedTextareaProps = Omit<
    React.ComponentProps<typeof Textarea>,
    "value" | "onChange"
> & {
    value: string;
    onValueChange: (val: string) => void;
    delay?: number;
};

export const DebouncedTextarea = React.memo(function DebouncedTextarea({
    value,
    onValueChange,
    delay = 300,
    onBlur,
    ...props
}: DebouncedTextareaProps) {
    const { local, handleChange, flush } = useDebouncedValue(value, onValueChange, delay);

    return (
        <Textarea
            {...props}
            value={local}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={(e) => {
                flush();
                onBlur?.(e);
            }}
        />
    );
});

type DebouncedInputProps = Omit<
    React.ComponentProps<typeof Input>,
    "value" | "onChange"
> & {
    value: string;
    onValueChange: (val: string) => void;
    delay?: number;
    /** Her tuş vuruşunda yerel metne uygulanır — üst bileşendeki temizlemenin
     *  ekrana 300ms gecikmeyle yansımasını (yazdıktan sonra "geri sıçrama")
     *  önler. Üst katman yine de kendi doğrulamasını yapmalıdır. */
    sanitize?: (val: string) => string;
};

export const DebouncedInput = React.memo(function DebouncedInput({
    value,
    onValueChange,
    delay = 300,
    sanitize,
    onBlur,
    ...props
}: DebouncedInputProps) {
    const { local, handleChange, flush } = useDebouncedValue(value, onValueChange, delay);

    return (
        <Input
            {...props}
            value={local}
            onChange={(e) => handleChange(sanitize ? sanitize(e.target.value) : e.target.value)}
            onBlur={(e) => {
                flush();
                onBlur?.(e);
            }}
        />
    );
});
