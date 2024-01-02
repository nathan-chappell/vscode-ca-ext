// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let webviewPanel: vscode.WebviewPanel | null = null;
let webviewView: vscode.WebviewView | null = null;

class WebviewManager implements vscode.WebviewViewProvider {
	webviewPanel: vscode.WebviewPanel | null = null;
	extensionUri: vscode.Uri | null = null;
	webviewView: vscode.WebviewView | null = null;

	constructor() { }

	resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext<unknown>,
		token: vscode.CancellationToken
	): void | Thenable<void> {
		if (this.extensionUri == null) {
			throw new Error("extensionUri was null");
		}
		this.webviewView = webviewView;
		this.webviewView.webview.options = {
			enableScripts: true,
		};

		const scriptUri = this.webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'parameterMain.js'));
		this.webviewView.webview.html = `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>CA Parameters</title>
			</head>
			<body>
				<div id="parameters"></div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}

	get panel(): vscode.WebviewPanel {
		if (this.webviewPanel === null) {
			throw new Error("webviewPanel === null");
		} else {
			return this.webviewPanel;
		}
	}

	initializeWebviewPanelFromContext(context: vscode.ExtensionContext) {
		this.webviewPanel = vscode.window.createWebviewPanel(
			'cellularAutomata',
			'Cellular Automata',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
			}
		);
		this.extensionUri = context.extensionUri;
		this.updateWebviewPanelHtml();
		const disposeWebviewPanel = () => { this.webviewPanel = null; };
		context.subscriptions.push({ dispose() { disposeWebviewPanel(); } });

		this.webviewPanel.webview.onDidReceiveMessage(e => {
			console.log('webviewPanel.webview received', e);
			switch (e.data.type) {
				case 'parameters': {
					if (this.webviewView !== null) {
						this.webviewView.webview.postMessage(e.data);
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
			var uris = {
				domainWorkerUri : "${this.webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'domain.js'))}",
				drawingWorkerUri : "${this.webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'drawing.js'))}",
				gridStylerWorkerUri : "${this.webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'grid-styler.js'))}",
				commonUri : "${this.webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'src', 'common.js'))}",
			}
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

interface Globals {
	t: number;
	i: number;
	j: number;
	t_150: number;
	parity: 1 | 0;
	r: number;
	quadrant: 0 | 1 | 2 | 3;
	x: number;
	y: number;
}


const defaultCaDeclarations = {
	parameters: {
		p: { min: 0, max: 1, step: .01, value: .23 },
		'quadrant-modulater': { min: 1, max: 4, value: 2, step: 1 }
	},

	initFunc: (
		{ t, i, j, t_150, parity, quadrant, x, y, r }: Globals,
		parameters: any,
	) => {
		if (parity) {
			return Math.random() < parameters.p ? quadrant % parameters['quadrant-modulater'] : 0;
		} else {
			return Math.random() < Math.pow(parameters.p, i / 50) ? 1 : 0;
		}
	},

	updateFunc: (
		{ n, ne, e, se, s, sw, w, nw, c }: Neighborhood,
		{ top, right, bottom, left, X, O, sum, corners, cardinals }: Features,
		{ t, i, j, t_150, r, quadrant, x, y }: Globals,
		paramters: any,
	) => {
		if (c == 1 && sum < 2) {
			return (0 + quadrant) % paramters['quadrant-modulator'];
		} else if (c == 1 && 2 <= sum && sum <= 3) {
			return (1 + quadrant) % paramters['quadrant-modulator'];
		} else if (c == 1 && 4 <= sum) {
			return (0 + quadrant) % paramters['quadrant-modulator'];
		} else if (c == 0 && sum == 3) {
			return (1 + quadrant) % paramters['quadrant-modulator'];
		} else {
			return (0 + quadrant) % paramters['quadrant-modulator'];
		}
	}
};

const defaultCaDeclarationsText = `
let parameters = ${JSON.stringify(defaultCaDeclarations.parameters)};
let initFunc = ${defaultCaDeclarations.initFunc.toString()};
let updateFunc = ${defaultCaDeclarations.updateFunc.toString()};
`;


// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	webviewManager.initializeWebviewPanelFromContext(context);
	const commandDisposer: vscode.Disposable = vscode.commands.registerCommand('cellularautomata-js.run', async () => {
		const currentFileText = vscode.window.activeTextEditor?.document.getText();
		webviewManager.updateWebviewPanelHtml(currentFileText);
	});
	// context.subscriptions.push(
	// 	vscode.workspace.onDidSaveTextDocument(e => {
	// 		if (e.fileName.endsWith('.ca.js')) {
	// 			const caDeclarationsText = e.getText();
	// 			webviewManager.updateWebviewPanelHtml(caDeclarationsText);
	// 		}
	// 	})
	// );
	// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-view-sample/src/extension.ts
	const provider = new ParametersViewProvider(context.extensionUri);
	context.subscriptions.push(vscode.window.registerWebviewViewProvider('cellularautomata-js.params', provider));

	// console.log('Congratulations, your extension "cellularautomata-js" is now active!');
	// context.subscriptions.push(vscode.commands.registerCommand('cellularautomata-js.helloWorld', () => {
	// 	vscode.window.showInformationMessage('Hello World from CellularAutomata.js!');
	// }));
}

// This method is called when your extension is deactivated
export function deactivate() { }

class ParametersViewProvider implements vscode.WebviewViewProvider {

	private _view?: vscode.WebviewView;

	constructor(
		private readonly _extensionUri: vscode.Uri,
	) { }

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken,
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [
				this._extensionUri
			]
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'colorSelected':
					{
						vscode.window.activeTextEditor?.insertSnippet(new vscode.SnippetString(`#${data.value}`));
						break;
					}
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.

	}
}