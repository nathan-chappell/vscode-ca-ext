const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)];

// const domainWorker = new Worker("./domain.js");
// const drawingWorker = new Worker("./drawing.js");
// const gridStylerWorker = new Worker("./grid-styler.js");
let domainWorker = null;
let drawingWorker = null;
let gridStylerWorker = null;


// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#examples
const offscreen = canvasCaCanvas.transferControlToOffscreen();
drawingWorker.postMessage({ canvas: offscreen, type: 'set-canvas' }, [offscreen]);

const state = {
    runState: 'none',
    reInitOnChange: false,
};

window.addEventListener('message', event => {
    if (event.data.type == 'init') {
        state.runState = 'initializing';
        drawingWorker.postMessage({ type: 'flush' });
        domainWorker.postMessage({ type: 'init', data: { uris } });
    };
    if (event.data.type == 'start') {
        state.runState = 'running'; drawingWorker.postMessage('flush'); domainWorker.postMessage('start');
    };
    if (event.data.type == 'stop') {
        state.runState = 'stopped'; drawingWorker.postMessage('flush'); domainWorker.postMessage('stop');
    };
    if (event.data.type == 'sync') {
        domainWorker.postMessage('sync');
    };

    if (e.data.type == "foobar") {
        // moo
    }
});

domainWorker.onmessage = e => {
    if (e.data.type == 'sync') {
    } else if (state.runState == 'running' || state.runState == 'initializing') {
        gridStylerWorker.postMessage(e.data);
    }
};

gridStylerWorker.onmessage = e => {
    if (state.runState == 'running' || state.runState == 'initializing') {
        drawingWorker.postMessage(e.data);
    }
};

drawingWorker.onmessage = e => {
    // console.log(e);
    if (e.data == 'high-water-mark') {
        domainWorker.postMessage('stop');
    } else if (e.data == 'low-water-mark' && state.runState == 'running') {
        domainWorker.postMessage('start');
    } else if (e.data == 'empty') {
        //
    }
};

const reInitOnChange = () => {
    if (state.reInitOnChange) {
        drawingWorker.postMessage('flush');
        domainWorker.postMessage('init');
        domainWorker.postMessage('start');
    }
};
