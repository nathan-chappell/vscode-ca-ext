let wasmb64 = '';
async function main() {
    await Promise.resolve();
    const sourceB64 = atob(wasmb64);
    const sourceBytes = new Uint8Array([...sourceB64].map(c => c.charCodeAt(0)));
    const memory = new WebAssembly.Memory({ initial: 1 });
    const { module, instance } = await WebAssembly.instantiate(sourceBytes, { js: { memory } });
    console.log(instance)
    console.log(instance.exports.foo(10))
    console.log(new Uint32Array(memory.buffer).subarray(0,10))
    return { module, instance };
}

main().then(console.log)
wasmb64 = "AGFzbQEAAAABBgFgAX8BfwIOAQJqcwZtZW1vcnkCAAEDAgEABwcBA2ZvbwAACicBJQEBf0EAIQED QEEBIAFqIQFBBEEBaiABbCABNgIAIAAgAWsNAAsgAQs="
wasmb64 = "AGFzbQEAAAABBgFgAX8BfwIOAQJqcwZtZW1vcnkCAAEDAgEABwcBA2ZvbwAACicBJQEBf0EAIQED QEEBIAFqIQFBBCABbCABNgIAIAAgAWsNAAsgAQs="
wasmb64 = "AGFzbQEAAAABBgFgAX8BfwIOAQJqcwZtZW1vcnkCAAEDAgEABwcBA2ZvbwAACioBJQEBf0EAIQED QEEBQQFqIAFqIQFBBCABbCABNgIAIAAgAWsNAAsgAQs="
wasmb64 = "AGFzbQEAAAABBgFgAX8BfwIOAQJqcwZtZW1vcnkCAAEDAgEABwcBA2ZvbwAACicBJQEBf0EAIQED QEEBIAFqIQFBBCABbCABNgIAIAAgAWsNAAsgAQs="
wasmb64 = "AGFzbQEAAAABBgFgAX8BfwIOAQJqcwZtZW1vcnkCAAEDAgEABwcBA2ZvbwAACioBKAEBf0EAIQED QEEBQQFqIAFqIQFBBCABbCABNgIAIAAgAWsNAAsgAQs="
