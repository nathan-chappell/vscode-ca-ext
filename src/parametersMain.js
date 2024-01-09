const vscode = acquireVsCodeApi();

const colorInputs = ['c1', 'c2', 'c3', 'c4'].map(c => document.getElementById(`input-${c}`));
document.getElementById('input-rate_bpm').onclick = e => { vscode.postMessage({ messageType: 'set-rate_bpm', data: e.target.valueAsNumber }); };
document.getElementById('control-init').onclick = e => { vscode.postMessage({ messageType: 'init' }); };
document.getElementById('control-start').onclick = e => { vscode.postMessage({ messageType: 'start' }); };
document.getElementById('control-stop').onclick = e => { vscode.postMessage({ messageType: 'stop' }); };

const sendColorsToPanel = () => {
    const colors = [...document.querySelectorAll(".color-input")].map(input => [document.getElementById(`${input.id}-val`).valueAsNumber, input.value]);
    vscode.postMessage({ messageType: 'send-colors-to-panel', data: colors });
};

const sendParametersToPanel = () => {
    const parameters = Object.fromEntries(
        [
            ...[...document.querySelectorAll("#parameters input")].map(input => [input.name, input.type == 'number' ? input.valueAsNumber : input.value]),
            ...[...document.querySelectorAll("#parameters select")].map(select => [select.name, select.options.item(Math.max(0, select.selectedIndex)).value]),
        ]
    );
    vscode.postMessage({ messageType: 'send-parameters-to-panel', data: parameters });
};

for (let colorInput of document.querySelectorAll('.color-input')) { colorInput.oninput = e => { sendColorsToPanel(); }; }
for (let colorInputVal of document.querySelectorAll('.color-input-val')) { colorInputVal.oninput = e => { sendColorsToPanel(); }; };

const messageHandlers = {
    'set-parameters': (message) => {
        console.log('set-parameters', message.data);
        const parameters = Object.entries(message.data);
        const parameterNames = [];

        document.getElementById('parameters').innerHTML = parameters.map((p, i) => {
            const name = p[0] || `parameter-${i}`;
            console.log(name, p);
            parameterNames.push(name);
            if (p[1].type == 'select') {
                // const _multiple = p[1]._multiple ? 'multiple="true"' : '';
                return [
                    `\n`,
                    `<label for="${name}"><span>${name}</span></label>`,
                    `<br />`,
                    `<select id="parameter-control-${name}" name="${name}" onchange="() => { sendParametersToPanel(); }">`,
                    ...(p[1].options.map(o => `  <option value="${o}">${o}</option>`)),
                    `</select>`,
                    `<hr />`,
                ].join("\n");
            } else {
                const attributes = Object.entries({ type: 'number', name: name, ...p[1] }).map(([k, v]) => `${k}="${v}"`).join(" ");
                return [
                    `\n`,
                    `<label for="${name}"><span>${name}</span></label>`,
                    `<br />`,
                    `<input id="parameter-control-${name}" ${attributes} />`,
                    `<hr />`,
                ].join("\n");
            }
        }).join(``);

        const zoomHandler = (e) => {
            console.log('zoomHandler', e);
            if (e.altKey && e.key === 'ArrowUp') {
                e.target.step /= 2;
            } else if (e.altKey && e.key === 'ArrowDown') {
                e.target.step *= 2;
            }
            // document.addEventListener('keyup', () => { document.removeEventListener('keydown', zoomHandler); }, { once: true });
        };

        for (let name of parameterNames) {
            document.getElementById(`parameter-control-${name}`).onchange = e => { sendParametersToPanel(); };
            document.getElementById(`parameter-control-${name}`).oninput = e => { sendParametersToPanel(); };
            [...document.querySelectorAll(`input[type="number"]`)].forEach(el => el.addEventListener('focus', e => { e.preventDefault(); document.addEventListener('keydown', zoomHandler); }));
            [...document.querySelectorAll(`input[type="number"]`)].forEach(el => el.addEventListener('blur', e => { e.preventDefault(); document.removeEventListener('keydown', zoomHandler, { once: true }); }));
        };
    }
};

const listenerName = 'parametersMain';

window.addEventListener('message', e => {
    const message = 'messageType' in e ? e : e.data;
    const handler = messageHandlers[message.messageType];
    if (typeof handler === 'undefined') {
        console.error(`${listenerName}: no handler for ${message.messageType}`, message, messageHandlers);
    } else if (typeof handler !== 'function') {
        console.error(`${listenerName}: handler is not a function ${message.messageType} - ${handler}`, message, messageHandlers);
    } else {
        handler(message);
    }
});