// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

let panel: vscode.WebviewPanel | null = null;

interface Neighborhood {
	n: number
	ne: number
	e: number
	se: number
	s: number
	sw: number
	w: number
	nw: number
	c: number
}

interface Features {
	top: number
	right: number
	bottom: number
	left: number
	X: number
	O: number
	corners: number
	cardinals: number
	sum: number
}

interface Globals {
	t: number
	i: number
	j: number
	t_150: number
	parity: 1 | 0
	r: number
	quadrant: 0 | 1 | 2 | 3
	x: number
	y: number
}



// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const mainScriptUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'main.js');
	const domainWorkerUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'domain.js');
	const drawingWorkerUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'drawing.js');
	const gridStylerWorkerUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'gridStyler.js');
	const commonUri = vscode.Uri.joinPath(context.extensionUri, 'src', 'common.js');

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
				return Math.random() < parameters.p ? quadrant % parameters['quadrant-modulater'] : 0
			} else {
				return Math.random() < Math.pow(parameters.p, i / 50) ? 1 : 0
			}
		},

		updateFunc: (
			{ n, ne, e, se, s, sw, w, nw, c }: Neighborhood,
			{ top, right, bottom, left, X, O, sum, corners, cardinals }: Features,
			{ t, i, j, t_150, r, quadrant, x, y }: Globals,
			paramters: any,
		) => {
			if (c == 1 && sum < 2) {
				return (0 + quadrant) % paramters['quadrant-modulator']
			} else if (c == 1 && 2 <= sum && sum <= 3) {
				return (1 + quadrant) % paramters['quadrant-modulator']
			} else if (c == 1 && 4 <= sum) {
				return (0 + quadrant) % paramters['quadrant-modulator']
			} else if (c == 0 && sum == 3) {
				return (1 + quadrant) % paramters['quadrant-modulator']
			} else {
				return (0 + quadrant) % paramters['quadrant-modulator']
			}
		}
	}

	const defaultCaDeclarationsText = `
	let parameters = ${JSON.stringify(defaultCaDeclarations.parameters)};
	let initFunc = ${defaultCaDeclarations.initFunc.toString()};
	let updateFunc = ${defaultCaDeclarations.updateFunc.toString()};
	`;

	const getHtml = (panel: vscode.WebviewPanel, caDeclarations: string) => `<!DOCTYPE html>
	<html>
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>Cellular Automata</title>
		<script>
		var uris = {
			domainWorkerUri : "${panel.webview.asWebviewUri(domainWorkerUri)}",
			drawingWorkerUri : "${panel.webview.asWebviewUri(drawingWorkerUri)}",
			gridStylerWorkerUri : "${panel.webview.asWebviewUri(gridStylerWorkerUri)}",
			commonUri : "${panel.webview.asWebviewUri(commonUri)}",
		}
		${caDeclarations}
		</script>
		<script src="${panel.webview.asWebviewUri(mainScriptUri)}" defer></script>
	</head>
	<body>
		<canvas id="ca-canvas" width="600" height="600" />
	</body>
	</html>`

	// #region My Code
	// Get path to resource on disk

	// https://code.visualstudio.com/api/extension-guides/webview#webviews-api-basics
	context.subscriptions.push((() => {
		const commandDisposer: vscode.Disposable = vscode.commands.registerCommand('cellularautomata-js.run', async () => {
			// Create and show a new webview
			panel = vscode.window.createWebviewPanel(
				'cellularAutomata', // Identifies the type of the webview. Used internally
				'Cellular Automata', // Title of the panel displayed to the user
				vscode.ViewColumn.One, // Editor column to show the new webview panel in.
				{} // Webview options. More on these later.
			);

			const currentFileText = vscode.window.activeTextEditor?.document.getText()
			vscode.workspace.onDidSaveTextDocument(e => {
				if (e.fileName.endsWith('.ca.js')) {
					const caDeclarationsText = e.getText();
					if (panel !== null) {
						panel.webview.html = getHtml(panel, caDeclarationsText)
					}
				}
			})
			panel.webview.html = getHtml(panel, defaultCaDeclarationsText);
		});

		return {
			dispose() {
				commandDisposer.dispose();
				panel = null;
			}
		}
	})());

	// https://github.com/microsoft/vscode-extension-samples/blob/main/webview-view-sample/src/extension.ts
	const provider = new ParametersViewProvider(context.extensionUri);
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(ParametersViewProvider.viewType, provider));

	// #endregion

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "cellularautomata-js" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand('cellularautomata-js.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from CellularAutomata.js!');
	}));
}

// This method is called when your extension is deactivated
export function deactivate() { }

class ParametersViewProvider implements vscode.WebviewViewProvider {

	public static readonly viewType = 'calicoColors.colorsView';

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
		const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'src', 'parameterMain.js'));
		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>CA Parameters</title>
			</head>
			<body>
				<div id="paramters"></div>
				<script src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}