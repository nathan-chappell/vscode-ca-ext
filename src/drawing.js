let parameters = {
    rate: 30,
}
let offscreen = null
let ctx = null
let styleGrids = []

const highWaterMark = 200
const lowWaterMark = 100

const delay = t => new Promise(res => setTimeout(res, t))

onmessage = e => {
    const message = 'messageType' in e ? e : e.data
    // console.log('drawing got message', message)

    if (message.messageType == 'flush') {
        styleGrids = []
        return
    } else if (message.messageType == 'set-canvas') {
        offscreen = message.canvas
        ctx = offscreen.getContext('2d')
    } else if (message.messageType == 'style-grid') {
        styleGrids.push(message.data)
        if (styleGrids.length > highWaterMark) {
            postMessage({ messageType: 'high-water-mark' })
        }
    }
    if ('parameters' in message) {
        parameters = { ...parameters, ...message.parameters }
    }
}


async function* gridStream() {
    while (true) {
        const start = Date.now()
        while (styleGrids.length == 0) {
            await delay(4)
        }
        await delay(Math.max(0, parameters.rate - (Date.now() - start)))
        yield styleGrids.shift()
        if (styleGrids.length == 0) {
            postMessage({ messageType: 'empty' })
        } else if (styleGrids.length < lowWaterMark) {
            postMessage({ messageType: 'low-water-mark' })
        }
    }
}

const drawGrid = (grid) => {
    if (!grid) {
        return
    }
    // console.log('drawing grid')
    const n = grid.length
    const cw = offscreen.width / n
    const ch = offscreen.height / n
    ctx.clearRect(0, 0, offscreen.width, offscreen.height)
    for (let i = 0; i < n; ++i) {
        for (let j = 0; j < n; ++j) {
            ctx.fillStyle = grid[i][j]
            ctx.fillRect(ch * j, cw * i, cw, ch)
        }
    }
};

(async () => {
    while (ctx === null) {
        await delay(50)
    }
    for await (let grid of gridStream()) {
        drawGrid(grid)
    }
})()