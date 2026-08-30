/**
 * DebouncedText davranış testleri.
 *
 * Bu bileşenler muayene formunda "yazarken takılma" sorununu çözmek için
 * metni lokal state'te tutup üst bileşene gecikmeli bildiriyor. Bu, sessizce
 * bozulabilen bir eşzamanlılık mantığı: hangi yazmanın kazanacağı (kullanıcı
 * mı, dışarıdan gelen programatik güncelleme mi) ve bekleyen metnin nerede
 * flush edileceği kritik. Klinik veri kaybına yol açabileceği için burada
 * kilitleniyor.
 */
import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { DebouncedTextarea, DebouncedInput } from "./DebouncedText";

const DELAY = 300;

/** Kontrollü bir üst bileşen: gerçek sayfadaki gibi value'yu state'te tutar. */
function Harness({
    onValueChange,
    initial = "",
}: {
    onValueChange: (v: string) => void;
    initial?: string;
}) {
    const [value, setValue] = React.useState(initial);
    return (
        <>
            <DebouncedTextarea
                value={value}
                onValueChange={(v) => {
                    setValue(v);
                    onValueChange(v);
                }}
                delay={DELAY}
                aria-label="sikayet"
            />
            {/* Dışarıdan (geçmiş muayeneden aktarma / AI scribe) yazmayı taklit eder */}
            <button onClick={() => setValue("DISARIDAN")}>dis-yazma</button>
        </>
    );
}

/** Fake timer ile etkileşimi basit tutmak için doğrudan native input olayı. */
function type(el: HTMLElement, text: string) {
    act(() => {
        const setter = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(el),
            "value"
        )!.set!;
        setter.call(el, text);
        el.dispatchEvent(new Event("input", { bubbles: true }));
    });
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
});

describe("DebouncedTextarea", () => {
    it("yazılan metni anında gösterir ama üst bileşene hemen bildirmez", () => {
        const onChange = vi.fn();
        render(<Harness onValueChange={onChange} />);
        const box = screen.getByLabelText("sikayet") as HTMLTextAreaElement;

        type(box, "hematuri");

        // Yerel input DOM'unda anında görünür...
        expect(box.value).toBe("hematuri");
        // ...ama henüz delay dolmadığı için üst bileşen haberdar değildir.
        expect(onChange).not.toHaveBeenCalled();
    });

    it("yazma durduktan delay ms sonra üst bileşene bildirir", () => {
        const onChange = vi.fn();
        render(<Harness onValueChange={onChange} />);
        const box = screen.getByLabelText("sikayet");

        type(box, "dizuri");
        act(() => {
            vi.advanceTimersByTime(DELAY);
        });

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("dizuri");
    });

    it("blur olduğunda beklemeden flush eder", () => {
        const onChange = vi.fn();
        render(<Harness onValueChange={onChange} />);
        const box = screen.getByLabelText("sikayet");

        type(box, "hematuri");
        act(() => {
            fireEvent.blur(box);
        });

        // Kaydet butonuna basmadan önce blur olur; metin kaybolmamalı.
        expect(onChange).toHaveBeenCalledWith("hematuri");
    });

    it("unmount edilirken bekleyen metni kaybetmez", () => {
        const onChange = vi.fn();
        const { unmount } = render(<Harness onValueChange={onChange} />);
        const box = screen.getByLabelText("sikayet");

        type(box, "yarim kalan");
        unmount();

        expect(onChange).toHaveBeenCalledWith("yarim kalan");
    });

    it("debounce penceresi içinde gelen dış yazmayı yutmaz", () => {
        // Regresyon: eskiden bekleyen bir düzenleme varken dış güncelleme
        // sessizce atlanıyor, sonra eski yerel metin onun üstüne yazıyordu.
        const onChange = vi.fn();
        render(<Harness onValueChange={onChange} />);
        const box = screen.getByLabelText("sikayet");

        type(box, "kullanici metni");
        act(() => {
            screen.getByText("dis-yazma").click();
        });

        // Dış yazma kazanmalı ve ekrana yansımalı.
        expect(box).toHaveValue("DISARIDAN");

        // Bekleyen timer dolduğunda eski metin geri gelmemeli.
        act(() => {
            vi.advanceTimersByTime(DELAY * 2);
        });
        expect(box).toHaveValue("DISARIDAN");
        expect(onChange).not.toHaveBeenCalledWith("kullanici metni");
    });

    it("aynı değer tekrar bildirilmez", () => {
        const onChange = vi.fn();
        render(<Harness onValueChange={onChange} initial="ayni" />);
        const box = screen.getByLabelText("sikayet");

        type(box, "ayni");
        act(() => {
            vi.advanceTimersByTime(DELAY);
        });

        expect(onChange).not.toHaveBeenCalled();
    });
});

describe("DebouncedInput", () => {
    it("sanitize prop'u yazarken anında uygulanır", () => {
        // Regresyon: temizleme yalnızca üst bileşende yapıldığında, yazılan
        // harfler 300ms ekranda kalıp sonra "geri sıçrıyordu".
        const onChange = vi.fn();
        render(
            <DebouncedInput
                value=""
                onValueChange={onChange}
                sanitize={(v) => v.replace(/[^0-9]/g, "").slice(0, 4)}
                delay={DELAY}
                aria-label="qmax"
            />
        );
        const box = screen.getByLabelText("qmax");

        type(box, "12ab3");
        expect(box).toHaveValue("123");

        act(() => {
            vi.advanceTimersByTime(DELAY);
        });
        expect(onChange).toHaveBeenCalledWith("123");
    });
});
