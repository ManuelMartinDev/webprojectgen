/* eslint-disable no-undef */
// This script will be run within the webview itself

// It cannot access the main VS Code APIs directly.
(function () {
	const vscode = acquireVsCodeApi();
	let selected;
	let selectedProject = [];
	const createButton = document.getElementById('create');

	createButton.addEventListener('click', () => {
		const tsCheckbox = document.querySelector('.typescript-checkbox input');
		const versionSelect = document.getElementById('version');
		let includesTs =
			tsCheckbox && selectedProject.args.includes('typescript') && tsCheckbox.checked;
		const hasVersions = selectedProject.versions;

		const args = [];
		includesTs && args.push('--typescript');
		hasVersions && args.push(`--${versionSelect.value}`);

		const path = document.getElementById('project-path');

		vscode.postMessage({
			type: 'createProject',
			data: {
				selected,
				args,
			},
			path: path.value,
		});
	});

	function resetStyles(elements, property, value) {
		elements.forEach((el) => (el.style[property] = value));
	}

	function setClickedStyles(node) {
		node.style.backgroundColor = 'var(--vscode-button-background)';
	}

	function toggleSelectedNode(node) {
		//Prevent UL to get the styles when the entire LI is clicked
		const target = node.target.nodeName === 'LI' ? node.target : node.target.parentElement;
		//
		resetStyles(projects, 'backgroundColor', 'transparent');
		setClickedStyles(target);
		selected = target.innerText;
		vscode.postMessage({
			type: 'projectSelected',
			data: {
				selected,
			},
		});
	}

	const projects = document.querySelectorAll('.project-list li');

	projects.forEach((el) => el.addEventListener('click', toggleSelectedNode));

	/*  // Handle messages sent from the extension to the webview
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'addColor':
                {
                    addColor();
                    break;
                }
            case 'clearColors':
                {
                    colors = [];
                    updateColorList(colors);
                    break;
                }

        }
    });
 */
	window.addEventListener('message', (event) => {
		const message = event.data;
		switch (message.type) {
			case 'projectInfo': {
				const project = message.project;
				selectedProject = project;

				const ts_ck = document.getElementById('typescript-checkbox');
				const ts_included = project.args.includes('typescript');
				const versions = project.versions;
				const version_cont = document.getElementById('version');
				document.getElementById('version_select').style.display = 'none';
				if (versions && versions.length > 0) {
					document.getElementById('version_select').style.display = 'flex';
					version_cont.innerHTML = '';
					versions.forEach((version) => {
						version_cont.innerHTML += `
						<option value="${version}">${version}</option>
						`;
					});
				}
				ts_ck.style.display = ts_included ? 'flex' : 'none';
				break;
			}
		}
	});
})();
