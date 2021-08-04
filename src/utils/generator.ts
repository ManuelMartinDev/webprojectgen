import { asyncExec } from './promised';
import * as vscode from 'vscode';
import { checkDependency } from './dependency';
export async function generateProject(
	cmd: string,
	cwd: string,
	args: string[],
	isInstallable: boolean
) {
	const terminal = vscode.window.createTerminal({
		name: `running installer `,
		cwd,
		hideFromUser: false,
	});
	terminal.show();

	/* 	cmd.includes('git')
		? terminal.sendText(`${cmd}${args.join(' ')}`)
		: terminal.sendText(`${cmd} ${args.join(' ')}`); */

	const finalRepoUrl = `${cmd}${args.join(' ')}`;

	try {
		checkDependency({ check: 'npm --version', name: 'npm' }, cwd);
		checkDependency({ check: 'git --version', name: 'git' }, cwd);
		checkDependency(
			{ check: 'yarn --version', install: 'npm i -g yarn', name: 'npm' },
			cwd
		);
	} catch (error) {
		console.error(error);
	}

	try {
		await asyncExec('git init', cwd);
		await asyncExec(`git remote add origin ${finalRepoUrl}`, cwd);
		await asyncExec('git fetch', cwd);
		await asyncExec('git checkout -t origin/main', cwd);
	} catch (error) {
		const remoteExists = error.toString().includes('remote origin already exists');
		remoteExists &&
			vscode.window.showErrorMessage(
				'this folder already contain a git repo, remove it before generate a project'
			);
		return;
	}
	//Nextjs can give some errors installing with yarn
	const isNextjs = cmd.includes('nextjs');

	isInstallable && terminal.sendText(`${isNextjs ? 'npm install' : 'yarn install'}`);
}
