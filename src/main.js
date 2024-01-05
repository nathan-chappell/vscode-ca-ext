const vscode = acquireVsCodeApi();
let running = false;
let requirementsDefined = true;

if (!(requirementsDefined &&= typeof parameters === 'object')) { console.error(`TypeError: parameters: ${typeof parameters}`); }
if (!(requirementsDefined &&= typeof initFunc === 'function')) { console.error(`TypeError: initFunc: ${typeof initFunc}`); }
if (!(requirementsDefined &&= typeof updateFunc === 'function')) { console.error(`TypeError: updateFunc: ${typeof updateFunc}`); }
if (!requirementsDefined) { throw new Error("requirements not met!"); }


const configureWorkers = () => {
    let missingWorkers = false;
    if (typeof domainWorker == 'undefined') { console.error('missing domainWorker!'); missingWorkers = true; }
    if (typeof drawingWorker == 'undefined') { console.error('missing drawingWorker!'); missingWorkers = true; }
    if (typeof gridStylerWorker == 'undefined') { console.error('missing gridStylerWorker!'); missingWorkers = true; }
    if (missingWorkers) { throw new Error("Missing Workers"); }

    domainWorker.onmessage = e => {
        const message = 'messageType' in e ? e : e.data;
        if (message.messageType == 'domain-grid-output') { gridStylerWorker.postMessage(message); }
    };

    gridStylerWorker.onmessage = e => {
        const message = 'messageType' in e ? e : e.data;
        if (message.messageType == 'grid-styler-output') { drawingWorker.postMessage(message); }
    };

    drawingWorker.onmessage = e => {
        const message = 'messageType' in e ? e : e.data;
        if (message.messageType == 'high-water-mark') { domainWorker.postMessage({ messageType: 'stop-domain-update' }); }
        if (message.messageType == 'low-water-mark') { if (running) { domainWorker.postMessage({ messageType: 'start-domain-update' }); } }
    };

    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#examples
    const offscreen = canvasCaCanvas.transferControlToOffscreen();
    drawingWorker.postMessage({ canvas: offscreen, messageType: 'set-canvas' }, [offscreen]);
    domainWorker.postMessage({ messageType: 'set-funcs', data: { initFunc: initFunc.toString(), updateFunc: updateFunc.toString(), } });
    domainWorker.postMessage({ messageType: 'set-parameters', data: Object.fromEntries(Object.entries(parameters).map(([k, v]) => ([k, v.value]))) });
    domainWorker.postMessage({ messageType: 'init-domain' });
};

const canvasCaCanvas = document.getElementById('ca-canvas');
canvasCaCanvas.onclick = () => {
    domainWorker.postMessage({ messageType: 'init-domain' });
    drawingWorker.postMessage({ messageType: 'flush' });
};

const messageHandlers = {
    'colors': message => {
        gridStylerWorker.postMessage({ messageType: 'set-colors', data: message.data });
        drawingWorker.postMessage({ messageType: 'flush' });
    },
    'parameters': message => {
        domainWorker.postMessage({ messageType: 'set-parameters', data: message.data });
        drawingWorker.postMessage({ messageType: 'flush' });
    },
    'get-parameters': message => {
        vscode.postMessage({ messageType: 'send-parameters-to-view', data: parameters });
    },
    'set-rate_tps': message => {
        drawingWorker.postMessage({ messageType: 'set-rate_tps', data: message.data });
        drawingWorker.postMessage({ messageType: 'flush' });
    },
    'init': () => {
        domainWorker.postMessage({ messageType: 'init-domain' });
    },
    'start': () => {
        domainWorker.postMessage({ messageType: 'start-domain-update' });
        running = true;
    },
    'stop': () => {
        domainWorker.postMessage({ messageType: 'stop-domain-update' });
        running = false;
    }
};

const listenerName = 'main';

window.addEventListener('message', e => {
    const message = 'messageType' in e ? e : e.data;
    console.log('main got from ext', message);
    const handler = messageHandlers[message.messageType];
    if (typeof handler === 'undefined') {
        console.error(`${listenerName}: no handler for ${message.messageType}`, message, messageHandlers);
    } else if (typeof handler !== 'function') {
        console.error(`${listenerName}: handler is not a function ${message.messageType} - ${handler}`, message, messageHandlers);
    } else {
        handler(message);
    }
});

configureWorkers();