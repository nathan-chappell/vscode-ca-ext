let parameters = {
    rate: 30,
};
let offscreen = null;
let ctx = null;
let styleGrids = [];

const highWaterMark = 200;
const lowWaterMark = 100;

const delay = t => new Promise(res => setTimeout(res, t));

onmessage = e => {
    // console.log('drawing message', e.data);
    if (e.data == 'flush') {
        styleGrids = [];
        return;
    } else if (e.data.type == 'set-canvas') {
        offscreen = e.data.canvas;
        ctx = offscreen.getContext('2d');
    } else if (e.data.type == 'style-grid') {
        styleGrids.push(e.data.value);
        if (styleGrids.length > highWaterMark) {
            postMessage('high-water-mark');
        }
    }
    if ('parameters' in e.data) {
        parameters = { ...parameters, ...e.data.parameters };
    }
};


async function* gridStream() {
    while (true) {
        const start = Date.now();
        while (styleGrids.length == 0) {
            await delay(4);
        }
        await delay(Math.max(0, parameters.rate - (Date.now() - start)));
        yield styleGrids.shift();
        if (styleGrids.length == 0) {
            postMessage('empty');
        } else if (styleGrids.length < lowWaterMark) {
            postMessage('low-water-mark');
        }
    }
}

const drawGrid = (grid) => {
    if (!grid) {
        return;
    }
    const n = grid.length;
    const cw = offscreen.width / n;
    const ch = offscreen.height / n;
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < n; ++j) {
            ctx.fillStyle = grid[i][j];
            ctx.fillRect(cw * i, ch * j, cw, ch);
        }
    }
};

(async () => {
    while (ctx === null) {
        await delay(50);
    }
    for await (let grid of gridStream()) {
        drawGrid(grid);
    }
})();