// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface Neighborhood {
	n: number;
	ne: number;
	e: number;
	se: number;
	s: number;
	sw: number;
	w: number;
	nw: number;
	c: number;
}

interface Features {
	top: number;
	right: number;
	bottom: number;
	left: number;
	X: number;
	O: number;
	corners: number;
	cardinals: number;
	sum: number;
}

interface SpaceTimeInfo {
	t: number;
	t_150: number;
	r: number;
	quadrant: 0 | 1 | 2 | 3;
	x: number;
	y: number;
	i: number;
	j: number;
	parity: 1 | 0;
	size: number;
}

interface NumberInputDecl {
	type?: 'number';
	min?: number;
	max?: number;
	step?: number;
	value?: number;
}

interface SelectOptionDecl {
	type: 'select';
	options: string[];
}

interface ParameterDeclarations {
	// general
	probability: NumberInputDecl;
	quadrantModifier: SelectOptionDecl;
	initType: SelectOptionDecl;
	// dynamics
	dynamicType: SelectOptionDecl;
	numberOfStates: NumberInputDecl;
	code: NumberInputDecl;
	// impulse
	shape: SelectOptionDecl;
}

type Parameters = { [k in keyof ParameterDeclarations]: ParameterDeclarations[k] extends NumberInputDecl ? number : string };

interface CaDeclarations {
	parameters: ParameterDeclarations;
	initFunc: (s: SpaceTimeInfo, p: Parameters) => number | boolean;
	updateFunc: (n: Neighborhood, f: Features, s: SpaceTimeInfo, p: Parameters) => number | boolean;
}

class WebviewManager implements vscode.WebviewViewProvider {
	webviewPanel: vscode.WebviewPanel | null = null;
	extensionUri: vscode.Uri | null = null;
	webviewView: vscode.WebviewView | null = null;

	domainWorkerSrc: string | null = null;
	drawingWorkerSrc: string | null = null;
	gridStylerWorkerSrc: string | null = null;

	parameters: Parameters | null = null;

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken
	): void | Thenable<void> {
		console.log('resolving webview view');
		if (this.extensionUri == null) { throw new Error("extensionUri was null"); }
		this.webviewView = webviewView;
		this.webviewView.webview.options = { enableScripts: true };

		const scriptUri = this.webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'parametersMain.js'));
		this.webviewView.webview.html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>CA Parameters</title>
				<script defer src="${scriptUri}"></script>
			</head>
			<body>
				<div id="controls">
					<label for="c1"><span>rate bpm</span></label><br /><input id="input-rate_bpm" class="control-input" type="number" name="rate_bpm" min="1" value="130" step="1" /></br>
					<input type="button" value="init" id="control-init" />
					<input type="button" value="start" id="control-start" />
					<input type="button" value="stop" id="control-stop" />
					</br>
				</div>
				<div id="colors">
					<label for="c1"><span>c1</span></label><br /><input id="input-c1" class="color-input" type="color" name="c1" value="#6ec56e" /><input id="input-c1-val" class="color-input-val" type="number" name="c1-val" value="0" /></br>
					<label for="c2"><span>c2</span></label><br /><input id="input-c2" class="color-input" type="color" name="c2" value="#554bec" /><input id="input-c2-val" class="color-input-val" type="number" name="c2-val" value="1" /></br>
					<label for="c3"><span>c3</span></label><br /><input id="input-c3" class="color-input" type="color" name="c3" value="#000000" /><input id="input-c3-val" class="color-input-val" type="number" name="c3-val" value="2" /></br>
					<label for="c4"><span>c4</span></label><br /><input id="input-c4" class="color-input" type="color" name="c4" value="#ffffff" /><input id="input-c4-val" class="color-input-val" type="number" name="c4-val" value="3" /></br>
				</div>
				<hr />
				<div id="parameters"></div>
			</body>
			</html>`;

		this.webviewView.webview.onDidReceiveMessage(e => {
			const message = 'messageType' in e ? e : e.data;
			console.log('webview view posted', message);
			if (message.messageType === 'send-parameters-to-panel') {
				this.parameters = message.data;
				this.webviewPanel?.webview.postMessage({ messageType: 'parameters', data: message.data });
			} else if (message.messageType === 'send-colors-to-panel') {
				this.webviewPanel?.webview.postMessage({ messageType: 'colors', data: message.data });
			} else if (message.messageType === 'set-rate_bpm') {
				this.webviewPanel?.webview.postMessage({ messageType: 'set-rate_bpm', data: message.data });
			} else if (message.messageType === 'init') {
				this.webviewPanel?.webview.postMessage({ messageType: 'init' });
			} else if (message.messageType === 'start') {
				this.webviewPanel?.webview.postMessage({ messageType: 'start' });
			} else if (message.messageType === 'stop') {
				this.webviewPanel?.webview.postMessage({ messageType: 'stop' });
			}
		});

		this.webviewView.onDidChangeVisibility(e => {
			this.webviewPanel?.webview.postMessage({ messageType: 'get-parameters' });
		});

		this.webviewPanel?.webview.postMessage({ messageType: 'get-parameters' });
	}

	get panel(): vscode.WebviewPanel {
		if (this.webviewPanel === null) {
			throw new Error("webviewPanel === null");
		} else {
			return this.webviewPanel;
		}
	}

	async initializeWebviewPanelFromContext(context: vscode.ExtensionContext): Promise<void> {
		this.webviewPanel = vscode.window.createWebviewPanel(
			'cellularAutomata',
			'Cellular Automata',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
			}
		);
		this.extensionUri = context.extensionUri;
		this.domainWorkerSrc = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, 'src', 'domain.js')));
		this.drawingWorkerSrc = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, 'src', 'drawing.js')));
		this.gridStylerWorkerSrc = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extensionUri, 'src', 'grid-styler.js')));

		this.updateWebviewPanelHtml();
		const disposeWebviewPanel = () => { this.webviewPanel = null; };
		context.subscriptions.push({ dispose() { disposeWebviewPanel(); } });

		this.webviewPanel.webview.onDidReceiveMessage(e => {
			const message = 'messageType' in e ? e : e.data;
			if (message.messageType === 'send-parameters-to-view') {
				this.parameters = Object.fromEntries(Object.entries(message.data).map(([k, v]: any) => ([k, v.value])));
				console.log('init panel', message);
				this.webviewView?.webview.postMessage({ messageType: 'set-parameters', data: message.data });
			}
		});
		this.webviewPanel.webview.postMessage({ messageType: 'get-parameters' });
	}

	updateWebviewPanelHtml(caDeclarationsText: string = defaultCaDeclarationsText) {
		if (this.webviewPanel === null) { console.warn('webviewPanel is null, cant set html'); return; }
		if (this.extensionUri === null) { console.warn('extensionUri is null, cant set html'); return; }

		this.webviewPanel.webview.html = `<!DOCTYPE html>
		<html>
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Cellular Automata</title>
			<script>
			var domainWorkerSrcBase64Blob = new Blob([atob('${btoa(this.domainWorkerSrc!)}')], { messageType: 'application/javascript' });
			var domainWorkerSrcURL = URL.createObjectURL(domainWorkerSrcBase64Blob)
			var domainWorker = new Worker(domainWorkerSrcURL);

			var drawingWorkerSrcBase64Blob = new Blob([atob('${btoa(this.drawingWorkerSrc!)}')], { messageType: 'application/javascript' });
			var drawingWorkerSrcURL = URL.createObjectURL(drawingWorkerSrcBase64Blob)
			var drawingWorker = new Worker(drawingWorkerSrcURL);

			var gridStylerWorkerSrcBase64Blob = new Blob([atob('${btoa(this.gridStylerWorkerSrc!)}')], { messageType: 'application/javascript' });
			var gridStylerWorkerSrcURL = URL.createObjectURL(gridStylerWorkerSrcBase64Blob)
			var gridStylerWorker = new Worker(gridStylerWorkerSrcURL);

			${caDeclarationsText}
			</script>
			<script src="${this.webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'main.js'))}" defer></script>
		</head>
		<body>
			<canvas id="ca-canvas" width="600" height="600" />
		</body>
		</html>`;
	}
}

const webviewManager = new WebviewManager();

const defaultCaDeclarations: CaDeclarations = {
	parameters: {
		// general
		probability: { min: 0, max: 1, step: .1, value: 0, },
		quadrantModifier: { type: 'select', options: ['q1', 'q13', 'q1234'] },
		initType: { type: 'select', options: ['uniform', 'radial', 'square', 'checkerboard'] },
		// dynamics
		dynamicType: { type: 'select', options: ['outer-total-code', 'outer-moore-code'] },
		numberOfStates: { min: 2, max: 4, step: 1, value: 2, },
		code: { min: 0, step: 1, value: 224 },
		// impulse
		shape: { type: 'select', options: ['none', 'ball', 'cross', 'heart', 'beam'] },
	},

	initFunc: (
		{ t, i, j, t_150, r, quadrant, x, y, size }: SpaceTimeInfo,
		{ probability, quadrantModifier, initType }: Parameters,
	) => {
		switch (initType) {
			case 'radial': {
				return Math.random() < probability ** r / (size / 4);
			}
			case 'checkerboard': {
				return (Math.floor(i / probability) | Math.floor(j / probability)) % 2;
			}
			case 'square': {
				return Math.max(Math.abs(size / 2 - i), Math.abs(size / 2 - j)) < 1 / probability;
			}
			case 'uniform':
			default: {
				return Math.random() < probability;
			}
		}
	},
	// 1010201000002
	// 777205

	updateFunc: (
		{ n, ne, e, se, s, sw, w, nw, c }: Neighborhood,
		{ top, right, bottom, left, X, O, sum, corners, cardinals }: Features,
		{ t, i, j, t_150, r, quadrant, x, y, size }: SpaceTimeInfo,
		{ probability, quadrantModifier, initType, dynamicType, numberOfStates, code, shape }: Parameters,
	) => {

		// const impulse_success = Math.random() < probability;
		const impulse_success = 1;
		const theta = t * 2 * Math.PI / size;

		switch (shape) {
			case 'none': {
				break;
			}
			case 'ball': {
				const R = size / 2;
				const r = size / 16;
				const ball_x = R * Math.cos(theta);
				const ball_y = R * Math.sin(theta);
				if (Math.hypot(ball_x - x, ball_y - y) <= r) { return impulse_success; }
				break;
			}
			case 'cross': {
				if (Math.abs(x) <= 3 || Math.abs(y) <= 3) { return impulse_success; }
				break;
			}
			case 'heart': {
				if (x < 0 && y - x <= 60 && y + x <= 10 && y + x >= -50
					|| x >= 0 && y + x <= 60 && y - x <= 10 && y - x >= -50) { return impulse_success; }
				break;
			}
			case 'beam': {
				const size_ratio = 8;
				const beam_j = t % size;
				const beam_y = size / size_ratio * Math.sin(x + t);
				if (j == beam_j && Math.abs(y - beam_y) <= size / (size_ratio * 4)) { return impulse_success; }
				break;
			}
		}

		const NUM_STATES_X = 5; // sum of corners can have values 0-5
		const NUM_STATES_O = 5; // sum of cardinals can have values 0-5

		switch (dynamicType) {
			case 'diffusion': {
				// const annealing = asymmetry / (1 + probability * Math.random())
				return O / (1 + X * O * Math.sin(theta));
			}
			case 'outer-moore-code': { return Math.floor(code / Math.pow(numberOfStates, c + numberOfStates * O)) % numberOfStates; }
			case 'outer-total-code':
			default: { return Math.floor(code / Math.pow(numberOfStates, c + numberOfStates * O)) % numberOfStates; }
		}
	}
};

const defaultCaDeclarationsText = `
var parameters = ${JSON.stringify(defaultCaDeclarations.parameters)};
var initFunc = ${defaultCaDeclarations.initFunc.toString()};
var updateFunc = ${defaultCaDeclarations.updateFunc.toString()};
`;

export const decompileCode = (code: number, numberOfStates: number) => {
	code = Math.floor(code);
	const lines = [];
	let power = 1;
	const rules: Record<number, Record<number, number>> = [...Array(10)].reduce((acc, v, i) => ({ ...acc, [i]: {} }), {});
	const N_SUM_VALS = 9;

	while (code) {
		const coefficient = code % numberOfStates;
		if (coefficient !== 0) {
			const state = power % numberOfStates;
			const sum = Math.floor(power / numberOfStates);
			rules[state][sum] = coefficient;
		}
		code = Math.floor(code / numberOfStates);
		power += 1;
	}
	for (let state = 0; state < numberOfStates; ++state) {
		if (!(state in rules)) {
			continue;
		}
		lines.push(`if (c === ${state}) {`);
		for (let sum = 0; sum < N_SUM_VALS; ++sum) {
			if (!(sum in rules[state])) {
				continue;
			}
			lines.push(`  if (sum === ${sum}) { return ${rules[state][sum]}; }`);
		}
		lines.push(`}`);
	}
	lines.push(`return 0;`);
	return lines.join('\n');
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand(
		'cellularautomata-js.run',
		() => {
			console.log(decompileCode(234, 2));
			// const currentFileText = vscode.window.activeTextEditor?.document.getText();
			// webviewManager.updateWebviewPanelHtml(currentFileText);
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand(
		'cellularautomata-js.show-source',
		() => {
			vscode.workspace.openTextDocument({ language: 'js', content: defaultCaDeclarationsText });
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand(
		'cellularautomata-js.decompile-code',
		() => {
			if (webviewManager.parameters) {
				vscode.workspace.openTextDocument({ language: 'js', content: decompileCode(webviewManager.parameters.code, webviewManager.parameters.numberOfStates) });
			}
		})
	);

	context.subscriptions.push(
		vscode.workspace.onDidSaveTextDocument(e => {
			if (e.fileName.endsWith('.ca.js')) {
				const caDeclarationsText = e.getText();
				webviewManager.updateWebviewPanelHtml(caDeclarationsText);
			}
		})
	);
	// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-view-sample/src/extension.ts
	context.subscriptions.push(vscode.window.registerWebviewViewProvider('cellularautomata-js.params', webviewManager));
	await webviewManager.initializeWebviewPanelFromContext(context);

	// console.log('Congratulations, your extension "cellularautomata-js" is now active!');
	// context.subscriptions.push(vscode.commands.registerCommand('cellularautomata-js.helloWorld', () => {
	// 	vscode.window.showInformationMessage('Hello World from CellularAutomata.js!');
	// }));
}

// This method is called when your extension is deactivated
export function deactivate() { }