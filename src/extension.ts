// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { timingSafeEqual } from 'crypto';
import * as vscode from 'vscode';

let webviewPanel: vscode.WebviewPanel | null = null;
let webviewView: vscode.WebviewView | null = null;

class WebviewManager implements vscode.WebviewViewProvider {
	webviewPanel: vscode.WebviewPanel | null = null;
	extensionUri: vscode.Uri | null = null;
	webviewView: vscode.WebviewView | null = null;

	domainWorkerSrc: string | null = null;
	drawingWorkerSrc: string | null = null;
	gridStylerWorkerSrc: string | null = null;

	parameters: any = null;

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
					<label for="c1"><span>rate tps</span></label><br /><input id="input-rate_tps" class="control-input" type="number" name="rate_tps" min="1" value="30" step="5" /></br>
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
			} else if (message.messageType === 'set-rate_tps') {
				this.webviewPanel?.webview.postMessage({ messageType: 'set-rate_tps', data: message.data });
			}
		});

		this.webviewView.onDidChangeVisibility(e => {
			if (this.parameters !== null && this.webviewView !== null) {
				this.webviewView.webview.postMessage({ messageType: 'set-parameters', data: this.parameters });
			} else {
				console.warn('did not set parameters in view', this.parameters, this.webviewView);
			}
		});
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
				this.parameters = message.data;
				console.log('init panel', message);
				this.webviewView?.webview.postMessage({ messageType: 'set-parameters', data: message.data });
			}
		});
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
}


const defaultCaDeclarations = {
	parameters: {
		p: { min: 0, max: 1, step: .01, value: .23 },
		'beam-width': { min: 0, max: 50, value: 20, step: 10 },
		'spawn-count': { min: 0, max: 9, value: 3, step: 1 },
		'crowding-count': { min: 0, max: 9, value: 4, step: 1 },
		'flow': { min: -1, max: 1, value: 0, step: 1 },
	},

	initFunc: (
		{ i, j }: SpaceTimeInfo,
		parameters: any,
	) => {
		return (i < 10) || (j < 10) || (i > 140) || (j > 140) || Math.random() < parameters.p ? 1 : 0;
	},

	updateFunc: (
		{ n, ne, e, se, s, sw, w, nw, c }: Neighborhood,
		{ top, right, bottom, left, X, O, sum, corners, cardinals }: Features,
		{ t, i, j, t_150, r, quadrant, x, y }: SpaceTimeInfo,
		parameters: any,
	) => {
		const beamWidth = parameters['beam-width'] ?? 1;
		const p = parameters['p'] ?? .5;
		const spawnCount = parameters['spawn-count'] ?? 3;
		const crowdingCount = parameters['crowding-count'] ?? 4;
		const flow = parameters['flow'] ?? 0;

		if ((t_150 % 25) == 0 && Math.abs(i - j) < beamWidth) { return (Math.random() < p ? 1 : (quadrant % 3) % 2); }

		// if (sum == 7) { return quadrant % 2 || t % 2; }

		if (flow < 0 && r > 50) {
			return (left > 0 || bottom > 0) && X > 2 ? 1 : c;
		} else if (flow > 0 && r > 50) {
			return (left > 1 || bottom > 1) && X > 2 ? 0 : 1;
		} else if (c == 1 && sum < spawnCount) {
			return 0;
		} else if (c == 1 && spawnCount <= sum && sum <= crowdingCount) {
			return 1;
		} else if (c == 1 && crowdingCount < sum) {
			return 0;
		} else if (c == 0 && (sum == spawnCount || (X == 3 && O == 0))) {
			return 1;
		} else {
			return 0;
		}
	}
};

const defaultCaDeclarationsText = `
var parameters = ${JSON.stringify(defaultCaDeclarations.parameters)};
var initFunc = ${defaultCaDeclarations.initFunc.toString()};
var updateFunc = ${defaultCaDeclarations.updateFunc.toString()};
`;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand(
		'cellularautomata-js.run',
		() => {
			console.log('run');
			// const currentFileText = vscode.window.activeTextEditor?.document.getText();
			// webviewManager.updateWebviewPanelHtml(currentFileText);
		})
	);

	context.subscriptions.push(vscode.commands.registerCommand(
		'cellularautomata-js.copy-decls',
		() => {
			console.log("copy-decls")
			vscode.env.clipboard.writeText(defaultCaDeclarationsText)
			vscode.window.showInformationMessage('Default CA Declarations copied to clipboard.');
			// webviewManager.updateWebviewPanelHtml(currentFileText);
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