let parameters = {
    min: 0,
    max: 1,
    minColor: [0, 0, 0],
    maxColor: [0xff, 0xff, 0xff],
}

// const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)];
const colorArray2style = a => '#' + a.map(x => x.toString(16)).join('')
const val2colorArray = val => val <= parameters.min ? parameters.minColor : val >= parameters.max ? parameters.maxColor
    : [1, 2, 3].map(i => parameters.minColor[i] + (parameters.maxColor[i] - parameters.minColor[i]) * val / (parameters.max - parameters.min))

onmessage = e => {
    // console.log('gridstyler got message', e.data)
    const message = 'messageType' in e ? e : e.data
    if (message.messageType == 'grid') {
        const result = []
        const grid = message.data
        for (let i = 0; i < grid.length; ++i) {
            const row = []
            for (let j = 0; j < grid[0].length; ++j) {
                // row.push(colorArray2style(val2colorArray(grid[i][j])))
                row.push(grid[i][j] < .5 ? '#cccccc' : '#333333')
            }
            result.push(row)
        }
        postMessage({ messageType: 'style-grid', data: result })
    }
    if ('parameters' in message) {
        // console.log(e)
        parameters = { ...parameters, ...message.parameters }
    }
}