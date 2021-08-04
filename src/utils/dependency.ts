import { asyncExec } from './promised';
import * as vscode from 'vscode';

export async function checkDependency(
	dependency: {
		check: string;
		install?: string;
		name: string;
	},
	cwd: string
) {
	let out;
	try {
		out = await asyncExec(dependency.check, cwd);
	} catch (error) {
		!dependency.install
			? vscode.window.showErrorMessage(`You need ${dependency.name} to use this extension`)
			: await asyncExec(dependency.install, cwd);
	}
}
