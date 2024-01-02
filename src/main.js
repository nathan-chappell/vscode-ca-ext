const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)]

let requirementsDefined = true
// if (!(requirementsDefined &&= typeof uris === 'object')) { console.error(`TypeError: uris: ${typeof uris}`) }
if (!(requirementsDefined &&= typeof parameters === 'object')) { console.error(`TypeError: parameters: ${typeof parameters}`) }
if (!(requirementsDefined &&= typeof initFunc === 'function')) { console.error(`TypeError: initFunc: ${typeof initFunc}`) }
if (!(requirementsDefined &&= typeof updateFunc === 'function')) { console.error(`TypeError: updateFunc: ${typeof updateFunc}`) }
if (!requirementsDefined) { throw new Error("requirements not met!") }

const configureWorkers = () => {
    let missingWorkers = false
    if (typeof domainWorker == 'undefined') { console.error('missing domainWorker!'); missingWorkers = true }
    if (typeof drawingWorker == 'undefined') { console.error('missing drawingWorker!'); missingWorkers = true }
    if (typeof gridStylerWorker == 'undefined') { console.error('missing gridStylerWorker!'); missingWorkers = true }
    if (missingWorkers) {
        throw new Error("Missing Workers")
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#examples
    const offscreen = canvasCaCanvas.transferControlToOffscreen()
    drawingWorker.postMessage({ canvas: offscreen, messageType: 'set-canvas' }, [offscreen])

    domainWorker.postMessage({
        messageType: 'config',
        data: {
            parameters: parameters,
            initFunc: initFunc.toString(),
            updateFunc: updateFunc.toString(),
        }
    })

    domainWorker.onmessage = e => {
        // console.log('got message from domain: ', e)
        const message = 'messageType' in e ? e : e.data

        if (message.messageType == 'sync') {
        } else if (state.runState == 'running' || state.runState == 'initializing') {
            gridStylerWorker.postMessage(message)
        }
    }

    gridStylerWorker.onmessage = e => {
        // console.log('got message from gridStyler: ', e)
        const message = 'messageType' in e ? e : e.data

        drawingWorker.postMessage(message)
        // if (state.runState == 'running' || state.runState == 'initializing') {
        // }
    }

    drawingWorker.onmessage = e => {
        // console.log('got message from drawer: ', e)
        const message = 'messageType' in e ? e : e.data
        // console.log(e);
        if (message.messageType == 'high-water-mark') {
            domainWorker.postMessage({ messageType: 'stop' })
        } else if (message.messageType == 'low-water-mark' && state.runState == 'running') {
            domainWorker.postMessage({ messageType: 'start' })
        } else if (message.messageType == 'empty') {
            //
        }
    }

    domainWorker.postMessage({ messageType: 'start' })
}

const canvasCaCanvas = document.getElementById('ca-canvas')

const state = {
    runState: 'running',
    reInitOnChange: false,
}

window.addEventListener('message', event => {
    console.log('main received: ', event)
    const message = 'messageType' in e ? e : e.data
    if (message.messageType == 'init') {
        state.runState = 'initializing'
        drawingWorker.postMessage({ messageType: 'flush' })
        domainWorker.postMessage({ messageType: 'init' })
    };
    if (message.messageType == 'start') {
        state.runState = 'running'
        drawingWorker.postMessage({ messageType: 'flush' })
        domainWorker.postMessage({ messageType: 'start' })
    };
    if (message.messageType == 'stop') {
        state.runState = 'stopped'
        drawingWorker.postMessage({ messageType: 'flush' })
        domainWorker.postMessage({ messageType: 'stop' })
    };
    if (message.messageType == 'sync') {
        domainWorker.postMessage({ messageType: 'sync' })
    };
})

const reInitOnChange = () => {
    if (state.reInitOnChange) {
        drawingWorker.postMessage({ messageType: 'flush' })
        domainWorker.postMessage({ messageType: 'init' })
        domainWorker.postMessage({ messageType: 'start' })
    }
}

configureWorkers()
