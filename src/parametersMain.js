const vscode = acquireVsCodeApi()
const parametersDiv = document.getElementById('parameters')

vscode.postMessage({ messageType: 'send-params' })

window.addEventListener('message', e => {
    console.log('parametersMain received', e)
    const message = 'messageType' in e ? e : e.data

    const parameters = Object.entries(message)
    const parameterNames = []
    parametersDiv.innerHTML = parameters.map((p, i) => {
        const name = p[0] || `parameter-${i}`
        parameterNames.push(name)
        return `\n<label for="${name}"><span>${name} </span><input id="input-${name}" ` + Object.entries({ messageType: 'number', name: name, ...p[1] }).map(([k, v]) => `${k}="${v}"`).join(" ") + ` /></label>`
    }).join(``)
    for (let name of parameterNames) {
        document.getElementById(`input-${name}`).onchange = e => vscode.postMessage({ messageType: 'parameter-change', data: { [name]: e.target.type == 'number' ? e.target.valueAsNumber : e.target.value } })
    }
})