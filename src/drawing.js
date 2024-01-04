let offscreen = null;
let ctx = null;
let styleGrids = [];
let rate_tps = 30; // transitions per second

const highWaterMark = 20;
const lowWaterMark = 5;

const checkWaterLevel = () => {
    if (styleGrids.length == 0) { console.warn('styleGrids is empty!'); }
    if (styleGrids.length < lowWaterMark) { postMessage({ messageType: 'low-water-mark' }); }
    if (styleGrids.length > highWaterMark) { postMessage({ messageType: 'high-water-mark' }); }
};

const delay = t => new Promise(res => setTimeout(res, t));

async function* gridStream() {
    while (true) {
        const start = Date.now();
        while (styleGrids.length == 0) { await delay(4); }
        await delay(Math.max(0, (1000 / rate_tps) - (Date.now() - start)));
        yield styleGrids.shift();
    }
}

const drawGrid = (grid) => {
    if (!grid) {
        return;
    }
    // console.log('drawing grid')
    const n = grid.length;
    const cw = offscreen.width / n;
    const ch = offscreen.height / n;
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < n; ++j) {
            ctx.fillStyle = grid[i][j];
            ctx.fillRect(ch * j, cw * i, cw, ch);
        }
    }
};

const messageHandlers = {
    'flush': () => { styleGrids = []; },
    'set-canvas': message => { offscreen = message.canvas; ctx = offscreen.getContext('2d'); },
    'grid-styler-output': message => { styleGrids.push(message.data); checkWaterLevel(); },
    'set-rate_tps': message => { rate_tps = message.data; }
};

const listenerName = 'drawing';

onmessage = e => {
    const message = 'messageType' in e ? e : e.data;
    const handler = messageHandlers[message.messageType];
    if (typeof handler === 'undefined') {
        console.error(`${listenerName}: no handler for ${message.messageType}`, message, messageHandlers);
    } else if (typeof handler !== 'function') {
        console.error(`${listenerName}: handler is not a function ${message.messageType} - ${handler}`, message, messageHandlers);
    } else {
        handler(message);
    }
};

(async () => {
    while (ctx === null) { await delay(50); }
    for await (let grid of gridStream()) { drawGrid(grid); checkWaterLevel(); }
})();