/**
 * Muayene formları için ortak memo karşılaştırıcısı.
 *
 * Form bölümleri her tuş vuruşunda yeniden oluşturulan bir `value` nesnesi alır
 * (adapter.toNew(formData)). Referans değişse de alanlar aynıysa yeniden render
 * etmeye gerek yok; bu karşılaştırıcı `value`'yu sığ (shallow) olarak, diğer
 * propları referansla kıyaslar.
 *
 * `value` alanlarından bazıları düz nesnelerden oluşan dizilerdir — örneğin
 * DiagnosisData.diagnoses: { name, code }[] — ve adapter bunları her çağrıda
 * yeniden kurar. Salt referans kıyası bu formlarda memo'yu tamamen etkisiz
 * bırakıyordu, bu yüzden dizileri eleman eleman, elemanları da bir seviye
 * derinlikte karşılaştırıyoruz. Daha derin yapılar için bilinçli olarak
 * "eşit değil" deyip render'a düşüyoruz: yanlış pozitif (atlanan render)
 * üretmektense fazladan render etmek güvenli.
 */
function flatObjectsEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    return aKeys.every((k) => Object.is(a[k], b[k]));
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}

function valueFieldsEqual(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;

    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((item, i) => {
            const other = b[i];
            if (Object.is(item, other)) return true;
            if (isPlainObject(item) && isPlainObject(other)) {
                return flatObjectsEqual(item, other);
            }
            return false;
        });
    }

    return false;
}

export function propsEqualWithShallowValue<P extends { value?: Record<string, unknown> }>(
    prev: Readonly<P>,
    next: Readonly<P>
): boolean {
    const keys = Object.keys(prev) as (keyof P)[];
    const nextKeys = Object.keys(next) as (keyof P)[];
    if (keys.length !== nextKeys.length) return false;

    for (const key of keys) {
        if (key === "value") continue;
        if (!Object.is(prev[key], next[key])) return false;
    }

    const a = prev.value;
    const b = next.value;
    if (a === b) return true;
    if (!a || !b) return false;

    const aKeys = Object.keys(a);
    if (aKeys.length !== Object.keys(b).length) return false;
    return aKeys.every((k) => valueFieldsEqual(a[k], b[k]));
}
