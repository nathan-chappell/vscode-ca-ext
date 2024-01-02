const vscode = acquireVsCodeApi()
const parametersDiv = document.getElementById('parameters')

window.addEventListener('message', event => {
    console.log('parametersMain received', event)
    const parameters = event.data.parameters
    const parameterNames = []
    parametersDiv.innerHTML = parameters.map((p, i) => {
        const name = p.name || `parameter-${i}`
        parameterNames.push(name)
        return `\n<label for="${name}"><span>${name} </span><input id="input-${name}" ` + Object.entries({ type: 'number', name: name, ...p }).map(([k, v]) => `${k}="${v}"`).join(" ") + ` /></label>`
    }).join(``)
    for (let name of parameterNames) {
        document.getElementById(`input-${name}`).onchange = e => vscode.postMessage({ type: 'parameter-change', data: { [name]: e.target.type == 'number' ? e.target.valueAsNumber : e.target.value } })
    }
})