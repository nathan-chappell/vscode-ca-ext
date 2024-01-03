const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)]
const colorArray2style = a => '#' + a.map(x => x.toString(16)).join('')
const val2colorArray = val => val <= parameters.min ? parameters.minColor : val >= parameters.max ? parameters.maxColor
    : [1, 2, 3].map(i => parameters.minColor[i] + (parameters.maxColor[i] - parameters.minColor[i]) * val / (parameters.max - parameters.min))

let colorSpecs = [
    [0, [110, 197, 110]],
    [1, [85, 75, 236]],
    [2, [0x00, 0x00, 0xcc]],
    [3, [0xcc, 0x00, 0xff]],
]

const makeColorSpec = ([val, c]) => [val, color2array(c)]

const interpolateVal = (val, min, max, l, r) => Math.floor(l + (r - l) * (val - min) / (Math.max(1, max - min)))
const interpolateValArray = (val, min, max, ls, rs) => ls.map((l, i) => interpolateVal(val, min, max, l, rs[i]))
const interpolate = val => {
    if (colorSpecs.length === 0) { return [0, 0, 0] }
    if (val <= colorSpecs[0][0]) { return colorSpecs[0][1] }
    for (let i = 0; i < colorSpecs.length - 1; ++i) {
        if (colorSpecs[i][0] <= val && val <= colorSpecs[i + 1][0]) {
            const result = interpolateValArray(val, colorSpecs[i][0], colorSpecs[i + 1][0], colorSpecs[i][1], colorSpecs[i + 1][1])
            return result
        }
    }
    return colorSpecs[colorSpecs.length - 1][1]
}

const messageHandlers = {
    'set-colors': message => {
        console.log('grid-styler: colors', message)
        colorSpecs = message.data.map(makeColorSpec)
        colorSpecs.sort((l, r) => l[0] - r[0])
    },
    'domain-grid-output': message => {
        const result = []
        const grid = message.data
        for (let i = 0; i < grid.length; ++i) {
            const row = []
            for (let j = 0; j < grid[0].length; ++j) {
                row.push(colorArray2style(interpolate(grid[i][j])))
            }
            result.push(row)
        }
        postMessage({ messageType: 'grid-styler-output', data: result })
    }
}

const listenerName = 'grid-styler'

onmessage = e => {
    const message = 'messageType' in e ? e : e.data
    const handler = messageHandlers[message.messageType]
    if (typeof handler === 'undefined') {
        console.error(`${listenerName}: no handler for ${message.messageType}`, message, messageHandlers)
    } else if (typeof handler !== 'function') {
        console.error(`${listenerName}: handler is not a function ${message.messageType} - ${handler}`, message, messageHandlers)
    } else {
        handler(message)
    }
}
