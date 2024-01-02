const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)]

const requirementsDefined = false
if (!(requirementsDefined &&= typeof parameters === 'object')) { console.error(`TypeError: parameters: ${typeof parameters}`) }
if (!(requirementsDefined &&= typeof initFunc === 'function')) { console.error(`TypeError: initFunc: ${typeof initFunc}`) }
if (!(requirementsDefined &&= typeof updateFunc === 'function')) { console.error(`TypeError: updateFunc: ${typeof updateFunc}`) }
if (!requirementsDefined) { throw new Error("requirements not met!") }

// const domainWorker = new Worker("./domain.js");
// const drawingWorker = new Worker("./drawing.js");
// const gridStylerWorker = new Worker("./grid-styler.js");
let domainWorker = null
let drawingWorker = null
let gridStylerWorker = null


// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#examples
const offscreen = canvasCaCanvas.transferControlToOffscreen()
drawingWorker.postMessage({ canvas: offscreen, type: 'set-canvas' }, [offscreen])

const state = {
    runState: 'none',
    reInitOnChange: false,
}

window.addEventListener('message', event => {
    console.log('main received: ', event)
    if (event.data.type == 'init-app') {
        domainWorker = new Worker(event.data.uris.domainWorkerUri)
        drawingWorker = new Worker(event.data.uris.drawingWorkerUri)
        gridStylerWorker = new Worker(event.data.uris.gridStylerWorkerUri)

        domainWorker.postMessage({
            type: 'config',
            parameters: {
                parameters: parameters,
                initFunc: initFunc.toString(),
                updateFunc: updateFunc.toString(),
            }
        })
    } else if (event.data.type == 'init') {
        state.runState = 'initializing'

        drawingWorker.postMessage({ type: 'flush' })
        domainWorker.postMessage({ type: 'init' })
    };
    if (event.data.type == 'start') {
        state.runState = 'running'; drawingWorker.postMessage({ type: 'flush' }); domainWorker.postMessage({ type: 'start' })
    };
    if (event.data.type == 'stop') {
        state.runState = 'stopped'; drawingWorker.postMessage({ type: 'flush' }); domainWorker.postMessage({ type: 'stop' })
    };
    if (event.data.type == 'sync') {
        domainWorker.postMessage({ type: 'sync' })
    };
})

domainWorker.onmessage = e => {
    if (e.data.type == 'sync') {
    } else if (state.runState == 'running' || state.runState == 'initializing') {
        gridStylerWorker.postMessage(e.data)
    }
}

gridStylerWorker.onmessage = e => {
    if (state.runState == 'running' || state.runState == 'initializing') {
        drawingWorker.postMessage(e.data)
    }
}

drawingWorker.onmessage = e => {
    // console.log(e);
    if (e.data.type == 'high-water-mark') {
        domainWorker.postMessage({ type: 'stop' })
    } else if (e.data.type == 'low-water-mark' && state.runState == 'running') {
        domainWorker.postMessage({ type: 'start' })
    } else if (e.data.type == 'empty') {
        //
    }
}

const reInitOnChange = () => {
    if (state.reInitOnChange) {
        drawingWorker.postMessage({ type: 'flush' })
        domainWorker.postMessage({ type: 'init' })
        domainWorker.postMessage({ type: 'start' })
    }
}
