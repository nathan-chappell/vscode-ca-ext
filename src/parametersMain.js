const vscode = acquireVsCodeApi();
const parametersDiv = document.getElementById('parameters');

const colorNames = ['c1', 'c2', 'c3', 'c4'];
const colorInputs = colorNames.map(c => document.getElementById(`input-${c}`));

const sendColors = () => {
    console.log('sending colors');
    vscode.postMessage({
        messageType: 'send-colors', data: colorInputs.map(element => {
            return [document.getElementById(`${element.id}-val`).valueAsNumber, element.value];
        })
    });
};

for (let colorInput of colorInputs) {
    colorInput.oninput = e => sendColors();
};

vscode.postMessage({ messageType: 'send-parameters' });

window.addEventListener('message', e => {
    const message = 'messageType' in e ? e : e.data;
    console.log('parametersMain received', message);

    if (message.messageType === 'set-params') {
        const parameters = Object.entries(message);
        const parameterNames = [];
        parametersDiv.innerHTML = parameters.map((p, i) => {
            const name = p[0] || `parameter-${i}`;
            parameterNames.push(name);
            return `\n<label for="${name}"><span>${name}</span></label><br /><input id="input-${name}" ` + Object.entries({ type: 'number', name: name, ...p[1] }).map(([k, v]) => `${k}="${v}"`).join(" ") + ` /><hr>`;
        }).join(``);
        for (let name of parameterNames) {
            document.getElementById(`input-${name}`).onchange = e => vscode.postMessage({ messageType: 'parameter-change', data: { [name]: e.target.type == 'number' ? e.target.valueAsNumber : e.target.value } });
        }
    } else if (message.messageType === 'send-colors') {
        sendColors();
    }



});