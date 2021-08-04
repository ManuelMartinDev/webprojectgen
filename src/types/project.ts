import * as vscode from 'vscode';

export interface Project {
	name: string;
	icon?: vscode.Uri;
	repo: string;
	args?: string[];
	postInstall?: string[];
	isInstallable: boolean;
	versions?: string[];
}
