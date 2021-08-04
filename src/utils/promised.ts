import * as cp from 'child_process';
export async function asyncExec(cmd: string, cwd: string) {
	return new Promise<cp.ExecException | string>((resolve, reject) => {
		cp.exec(cmd, { cwd }, (err, out) => {
			if (err) {
				reject(err);
			}
			resolve(out);
		});
	});
}
