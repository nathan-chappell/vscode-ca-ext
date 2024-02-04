export function* leb128EncodeUnsigned(n: number): Generator<number> {
    while (n) {
        let byte = n % (1 << 7);
        if (n >>= 7) {
            byte |= (1 << 7);
        }
        yield byte;
    }
}

export function leb128DecodeUnsigned(a: Array<number>): number {
    let result = 0;
    for (let i = 0; i < a.length - 1; ++i) {
        result += (a[i] & 0x7f) << (7 * i)
    }
    result += a[a.length - 1] << (7 * (a.length - 1))
    return result;
}