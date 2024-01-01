const color2array = c => [parseInt(c.substring(1, 3), 16), parseInt(c.substring(3, 5), 16), parseInt(c.substring(5, 7), 16)];

const domainWorker = new Worker("./domain.js");
const drawingWorker = new Worker("./drawing.js");
const gridStylerWorker = new Worker("./grid-styler.js");

// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen#examples
const offscreen = canvasCaCanvas.transferControlToOffscreen();
drawingWorker.postMessage({ canvas: offscreen, type: 'set-canvas' }, [offscreen]);

const state = {
    runState: 'none',
    reInitOnChange: false,
};

window.addEventListener('message', event => {
    if (event.data == 'init') {
        state.runState = 'initializing';
        drawingWorker.postMessage('flush');
        domainWorker.postMessage('init');
        if (continueCheckbox.checked) {
            domainWorker.postMessage('start');
        }
    };
    if (event.data == 'start') {
        state.runState = 'running'; drawingWorker.postMessage('flush'); domainWorker.postMessage('start');
    };
    if (event.data == 'stop') {
        state.runState = 'stopped'; drawingWorker.postMessage('flush'); domainWorker.postMessage('stop');
    };
    if (event.data == 'sync') {
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

const displayValue = e => { e.target.nextSibling.innerText = e.target.value; };




textareaInitFuncText.onchange = e => { setInitFunc(e.target.value); reInitOnChange(); };
textareaUpdateFuncText.onchange = e => { setUpdateFunc(e.target.value); reInitOnChange(); };
// INIT
domainWorker.postMessage({ type: 'init-func-text', value: textareaInitFuncText.value });
domainWorker.postMessage({ type: 'update-func-text', value: textareaUpdateFuncText.value });

colorStylerMinC.oninput = e => { gridStylerWorker.postMessage({ type: 'config', parameters: { minColor: color2array(e.target.value) } }); displayValue(e); reInitOnChange(); };
colorStylerMaxC.oninput = e => { gridStylerWorker.postMessage({ type: 'config', parameters: { maxColor: color2array(e.target.value) } }); displayValue(e); reInitOnChange(); };
rangeStylerMin.onchange = e => { gridStylerWorker.postMessage({ type: 'config', parameters: { min: e.target.valueAsNumber } }); displayValue(e); reInitOnChange(); };
rangeStylerMax.onchange = e => { gridStylerWorker.postMessage({ type: 'config', parameters: { max: e.target.valueAsNumber } }); displayValue(e); reInitOnChange(); };

rangeInitP.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { initFunc: { p: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeInitA.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { initFunc: { a: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeInitB.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { initFunc: { b: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeUpdateA.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { updateFunc: { a_: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeUpdateB.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { updateFunc: { b_: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeUpdateC.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { updateFunc: { c_: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeUpdateR1.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { updateFunc: { r1: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };
rangeUpdateR2.onchange = e => { domainWorker.postMessage({ type: 'config', parameters: { updateFunc: { r2: e.target.valueAsNumber } } }); displayValue(e); reInitOnChange(); };

const rateMap = [1, 10, 30, 50, 75, 100, 150, 200, 500, 1000];

rangeDrawingRate.onchange = e => { drawingWorker.postMessage({ type: 'config', parameters: { rate: rateMap[e.target.valueAsNumber] } }); displayValue(e); reInitOnChange(); };

const syncStyle = colors => {
    const { min, max, minColor, maxColor } = colors;

    gridStylerWorker.postMessage({ type: 'config', parameters: { min, max, minColor: color2array(minColor), maxColor: color2array(maxColor) } });

    rangeStylerMin.value = min;
    colorStylerMinC.value = minColor;
    rangeStylerMax.value = max;
    colorStylerMaxC.value = maxColor;

    rangeStylerMin.dispatchEvent(new Event('change'));
    rangeStylerMax.dispatchEvent(new Event('change'));
    colorStylerMinC.dispatchEvent(new Event('input'));
    colorStylerMaxC.dispatchEvent(new Event('input'));
};

selectPreset.onchange = e => {
    // console.log('select', e.target.value, presetList[e.target.value]);
    const preset = presets[presetList[e.target.value]];
    setInitFunc(preset.initFunc.toString());
    setUpdateFunc(preset.updateFunc.toString());
    syncStyle(preset.colors);

    domainWorker.postMessage({ type: 'config', parameters: preset.parameters });
    domainWorker.postMessage('sync');
};

(async () => {
    await new Promise(res => setTimeout(res, 10));
    selectPreset.value = 0;
    selectPreset.dispatchEvent(new Event('change'));
    await new Promise(res => setTimeout(res, 200));
    buttonRunInit.onclick();
})();