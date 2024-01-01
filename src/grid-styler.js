let parameters = {
    min: 0,
    max: 1,
    minColor: [0, 0, 0],
    maxColor: [0xff, 0xff, 0xff],
};

// const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)];
const colorArray2style = a => '#' + a.map(x => x.toString(16)).join('');
const val2colorArray = val => val <= parameters.min ? parameters.minColor : val >= parameters.max ? parameters.maxColor
    : [1, 2, 3].map(i => parameters.minColor[i] + (parameters.maxColor[i] - parameters.minColor[i]) * val / (parameters.max - parameters.min));

onmessage = e => {
    if (e.data.type == 'grid') {
        const result = [];
        const grid = e.data.value;
        for (let i = 0; i < grid.length; ++i) {
            const row = [];
            for (let j = 0; j < grid[0].length; ++j) {
                row.push(colorArray2style(val2colorArray(grid[i][j])));
            }
            result.push(row);
        }
        postMessage({ type: 'style-grid', value: result });
    }
    if ('parameters' in e.data) {
        // console.log(e)
        parameters = { ...parameters, ...e.data.parameters };
    }
};