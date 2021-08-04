import * as vscode from 'vscode';
import { Project } from './types/project';
import { checkDependency } from './utils/dependency';
import * as cp from 'child_process';
import { generateProject } from './utils/generator';

interface Message {
	type: string;
	data: Record<string, unknown>;
	path: string;
}

export function activate(context: vscode.ExtensionContext) {
	const provider = new WebProjectGenProvider(context.extensionUri);

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(WebProjectGenProvider.viewType, provider)
	);
}

class WebProjectGenProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = 'WebProjectGen.projectsView';

	public currentPath =
		vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0].uri.fsPath;

	private _view?: vscode.WebviewView;

	public selected?: Project;

	public projects: Project[] = [
		{
			name: 'Angular',
			repo: 'https://github.com/ManuelMartinDev/angular-default',
			args: [],
			versions: ['css', 'scss'],
			isInstallable: true,
		},
		{
			name: 'React',
			repo: 'https://github.com/ManuelMartinDev/react-default',
			args: ['typescript'],
			isInstallable: true,
		},
		{
			name: 'Vue',
			repo: 'https://github.com/ManuelMartinDev/vue-default',
			args: ['v2'],
			versions: ['2', '3'],
			isInstallable: true,
		},
		{
			name: 'Express',
			repo: 'https://github.com/ManuelMartinDev/express-default',
			args: ['typescript'],
			postInstall: ['yarn install', 'cd express-default', 'npm run dev'],
			isInstallable: true,
		},
		{
			name: 'Vanilla',
			repo: 'https://github.com/ManuelMartinDev/default-vanilla',
			args: [''],
			isInstallable: false,
		},
		{
			name: 'Nextjs',
			repo: 'https://github.com/ManuelMartinDev/nextjs-default',
			args: [''],
			isInstallable: true,
		},
	];

	constructor(private readonly _extensionUri: vscode.Uri) {}

	public resolveWebviewView(
		webviewView: vscode.WebviewView,
		context: vscode.WebviewViewResolveContext,
		_token: vscode.CancellationToken
	) {
		this._view = webviewView;

		webviewView.webview.options = {
			// Allow scripts in the webview
			enableScripts: true,

			localResourceRoots: [this._extensionUri],
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage((event: Message) => {
			switch (event.type) {
				case 'projectSelected': {
					const parsedData = event.data as unknown as { selected: string };
					const target = this.projects.filter(
						(project) =>
							project.name.toLocaleLowerCase() === parsedData.selected.toLocaleLowerCase()
					)[0];
					this.selected = target;
					this._view?.webview.postMessage({
						type: 'projectInfo',
						project: target,
					});
					break;
				}
				case 'createProject': {
					const path = event.path;
					const parsedData = event.data as unknown as {
						selected: string;
						args: string[];
					};
					if (!parsedData.selected) {
						return vscode.window.showErrorMessage('select a project first');
					}

					const target = this.projects.filter(
						(project) =>
							project.name.toLocaleLowerCase() === parsedData.selected.toLocaleLowerCase()
					)[0];
					this.selected = target;

					generateProject(target.repo, path, parsedData.args, target.isInstallable);
					break;
				}
			}
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {
		// Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.

		const scriptUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js')
		);

		// Do the same for the stylesheet.
		const styleResetUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css')
		);
		const styleVSCodeUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css')
		);
		const styleMainUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css')
		);

		// Use a nonce to only allow a specific script to be run.
		const nonce = getNonce();

		this.projects.forEach((project) => {
			project.icon = webview.asWebviewUri(
				vscode.Uri.joinPath(
					this._extensionUri,
					'media',
					'icons',
					`${project.name.toLocaleLowerCase()}-icon.svg`
				)
			);
		});

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="style-src ${
					webview.cspSource
				}; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">

				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>WebProjectGen</title>
			</head>
			<body>
				<main>
					<section class="left-panel">
						<ul class="project-list">
							${this.projects
								.map((project) => {
									return `
									<li><img src="${project.icon}"/><p>${project.name}</p></li>
									`;
								})
								.join('')}
						</ul>
					</section>
					<section class="main-panel">
						<p>New project</p>
						<div class="row">
							<label class="location" for="project_path">Location</label>
							<input value=${this.currentPath} id="project-path" class="project-path"> </input>
						</div>
						<div class="typescript-checkbox row" id="typescript-checkbox">
							<p>Typescript </p>
							<input type="checkbox"/>
						</div>
						<div id="version_select" class="version-select row">
							<p> Select version </p>
							<select id="version" name="version">
								
							</select>
						</div>
						<button id="create">Create</button>
					</section>
				</main>
				
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
