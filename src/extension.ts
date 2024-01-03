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

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken
	): void | Thenable<void> {
		console.log('resolving webview view');
		if (this.extensionUri == null) {
			throw new Error("extensionUri was null");
		}
		this.webviewView = webviewView;
		this.webviewView.webview.options = {
			enableScripts: true,
		};

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
				<div id="colors">
					<label for="c1"><span>c1</span></label><br /><input id="input-c1" type="color" name="c1" value="#1f10de" /><input id="input-c1-val" type="number" name="c1-val" value="0" /></br>
					<label for="c2"><span>c2</span></label><br /><input id="input-c2" type="color" name="c2" value="#cc1100" /><input id="input-c2-val" type="number" name="c2-val" value="1" /></br>
					<label for="c3"><span>c3</span></label><br /><input id="input-c3" type="color" name="c3" value="#000000" /><input id="input-c3-val" type="number" name="c3-val" value="2" /></br>
					<label for="c4"><span>c4</span></label><br /><input id="input-c4" type="color" name="c4" value="#ffffff" /><input id="input-c4-val" type="number" name="c4-val" value="3" /></br>
				</div>
				<hr />
				<div id="parameters"></div>
			</body>
			</html>`;

		this.webviewView.webview.onDidReceiveMessage(e => {
			const message = 'messageType' in e ? e : e.data;
			console.log('webview view received', message);
			if (message.messageType === 'send-parameters') {
				this.webviewPanel?.webview.postMessage(message);
			} else if (message.messageType === 'send-colors') {
				this.webviewPanel?.webview.postMessage(message)
			}
		});
		this.webviewView.webview.postMessage({ messageType: 'send-colors' });
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
			console.log('webviewPanel.webview sent', message);
			switch (message.messageType) {
				case 'send-parameters': {
					if (this.webviewView !== null) {
						this.webviewView.webview.postMessage(message);
					}
				}
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
		'quadrant-modulater': { min: 1, max: 4, value: 2, step: 1 }
	},

	initFunc: (
		g: SpaceTimeInfo,
		parameters: any,
	) => {
		// console.log(g);
		return Math.random() < .32 ? (g.quadrant % 2) : (g.quadrant + 1) % 2;
		// if ((i + j) % 2 == 0) { return Math.random() < .5 ? 0 : 1; }
		// return 0;
		// if (parity) {
		// 	return Math.random() < parameters.p ? quadrant % parameters['quadrant-modulater'] : 0;
		// } else {
		// 	return Math.random() < Math.pow(parameters.p, i / 50) ? 1 : 0;
		// }
	},

	updateFunc: (
		{ n, ne, e, se, s, sw, w, nw, c }: Neighborhood,
		{ top, right, bottom, left, X, O, sum, corners, cardinals }: Features,
		{ t, i, j, t_150, r, quadrant, x, y }: SpaceTimeInfo,
		paramters: any,
	) => {
		if (r < 20 * (1 + t_150 / 150)) { return (quadrant + 1) % 2; }
		if (t_150 == 0 && quadrant === 1) { return Math.random() < .5 ** (r / 50); }
		if (t_150 == 0 && quadrant == 2 && (i + j) < 230) { return Math.random() < .5; }
		// if (t_150 == 0 && quadrant === 0 && (i < 40 && j > 110)) { return (Math.random() < .3 ? 1 : 0); }
		// if (((t % 4) == 0) && ((Math.abs(i - j) < 8) || (Math.abs((150 - i) - j) < 3 + quadrant))) { return (c ? 0 : 1) * ((i + j) % 2); }
		if (((t % 3) == 0) && ((Math.abs(i - j) < 8) || (Math.abs((150 - i) - j) < 16 + quadrant))) { return (1 - c) * (quadrant % 3 ? left : top) * ((i + 2 * j) % 2); }
		// if ((t_150 == 0 || t_150 == 75) && ((Math.abs(i - j) < 2) || (150 - Math.abs(i - j) < 2))) { return c ? 0 : 1; }

		const _q = quadrant === 3 ? 0 : quadrant;

		if (c == 1 && sum < 2 + (_q % 2)) {
			return (0 + _q) % 2;
		} else if (c == 1 && 2 <= sum && sum <= (3 + _q)) {
			return (1 + _q) % 2;
		} else if (c == 1 && 4 <= sum) {
			return (0 + _q) % 2;
		} else if (c == 0 && sum == 3 || sw * s * w * n || e * n * s * ne) {
			// return (1 + _q) % 2;
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

	// context.subscriptions.push(
	// 	vscode.workspace.onDidSaveTextDocument(e => {
	// 		if (e.fileName.endsWith('.ca.js')) {
	// 			const caDeclarationsText = e.getText();
	// 			webviewManager.updateWebviewPanelHtml(caDeclarationsText);
	// 		}
	// 	})
	// );
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