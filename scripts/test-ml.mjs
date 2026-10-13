import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const local = process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python';
const python = process.env.PYTHON || (existsSync(path.join(root, local)) ? path.join(root, local) : 'python');
const result = spawnSync(python, ['-m', 'pytest', 'ml-service/tests', '-q'], { cwd: root, stdio: 'inherit', windowsHide: true });
process.exit(result.status ?? 1);
