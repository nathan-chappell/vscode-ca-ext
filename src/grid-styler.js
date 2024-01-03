const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)];
const colorArray2style = a => '#' + a.map(x => x.toString(16)).join('');
const val2colorArray = val => val <= parameters.min ? parameters.minColor : val >= parameters.max ? parameters.maxColor
    : [1, 2, 3].map(i => parameters.minColor[i] + (parameters.maxColor[i] - parameters.minColor[i]) * val / (parameters.max - parameters.min));

let colorSpecs = [
    [0, [0x1f, 0x10, 0xde]],
    [1, [0xcc, 0x11, 0x00]],
    [2, [0x00, 0x00, 0x00]],
    [3, [0xff, 0xff, 0xff]],
];

const makeColorSpec = ([val, c]) => [val, color2array(c)];

const interpolateVal = (val, min, max, l, r) => Math.floor(l + (r - l) * (val - min) / (Math.max(1, max - min)));
const interpolateValArray = (val, min, max, ls, rs) => ls.map((l, i) => interpolateVal(val, min, max, l, rs[i]));
const interpolate = val => {
    // console.log('interpolate:', val, colorSpecs);
    if (colorSpecs.length === 0) { return [0, 0, 0]; }
    if (val <= colorSpecs[0][0]) { return colorSpecs[0][1]; }
    for (let i = 0; i < colorSpecs.length - 1; ++i) {
        if (colorSpecs[i][0] <= val && val <= colorSpecs[i + 1][0]) {
            const result = interpolateValArray(val, colorSpecs[i][0], colorSpecs[i + 1][0], colorSpecs[i][1], colorSpecs[i + 1][1]);
            // console.log('interpolated:', result);
            return result;
        }
    }
    return colorSpecs[colorSpecs.length - 1][1];
};

onmessage = e => {
    const message = 'messageType' in e ? e : e.data;
    // console.log('gridstyler got message', message)
    if (message.messageType === 'grid') {
        const result = [];
        const grid = message.data;
        for (let i = 0; i < grid.length; ++i) {
            const row = [];
            for (let j = 0; j < grid[0].length; ++j) {
                row.push(colorArray2style(interpolate(grid[i][j])));
            }
            result.push(row);
        }
        postMessage({ messageType: 'style-grid', data: result });
    } else if (message.messageType === 'send-colors') {
        console.log('grid-styler: colors', message);
        colorSpecs = message.data.map(makeColorSpec);
        colorSpecs.sort((l, r) => l[0] - r[0]);
    }
};