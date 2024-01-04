const vscode = acquireVsCodeApi();

const colorInputs = ['c1', 'c2', 'c3', 'c4'].map(c => document.getElementById(`input-${c}`));
const rateInput = document.getElementById('input-rate_tps');
rateInput.onclick = e => {
    // const message = 'messageType' in e ? e : e.data;
    vscode.postMessage({ messageType: 'set-rate_tps', data: e.target.valueAsNumber });
};

const sendColorsToPanel = () => {
    const colors = [...document.querySelectorAll(".color-input")].map(input => [document.getElementById(`${input.id}-val`).valueAsNumber, input.value]);
    vscode.postMessage({ messageType: 'send-colors-to-panel', data: colors });
};

for (let colorInput of document.querySelectorAll('.color-input')) { colorInput.oninput = e => { sendColorsToPanel(); }; }
for (let colorInputVal of document.querySelectorAll('.color-input-val')) { colorInputVal.oninput = e => { sendColorsToPanel(); }; };

const messageHandlers = {
    'set-parameters': (message) => {
        const parameters = Object.entries(message.data);
        const parameterNames = [];

        document.getElementById('parameters').innerHTML = parameters.map((p, i) => {
            const name = p[0] || `parameter-${i}`;
            parameterNames.push(name);
            const attributes = Object.entries({ type: 'number', name: name, ...p[1] }).map(([k, v]) => `${k}="${v}"`).join(" ");
            return `\n<label for="${name}"><span>${name}</span></label><br /><input id="input-${name}" ${attributes} /><hr />`;
        }).join(``);

        for (let name of parameterNames) {
            document.getElementById(`input-${name}`).onchange = e => {
                const parameters = Object.fromEntries([...document.querySelectorAll("#parameters input")].map(input => [input.name, input.type == 'number' ? input.valueAsNumber : input.value]));
                console.log('parametersMain params:', parameters);
                vscode.postMessage({ messageType: 'send-parameters-to-panel', data: parameters });
            };
        }
    },
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