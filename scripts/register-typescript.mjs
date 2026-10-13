import { registerHooks } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
registerHooks({
  resolve(specifier, context, nextResolve) {
    let candidate;
    if (specifier.startsWith('@/')) candidate = path.join(root, specifier.slice(2));
    else if (specifier.startsWith('.') && context.parentURL?.match(/\.tsx?$/)) candidate = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    if (candidate) {
      const found = [candidate, candidate + '.ts', candidate + '.tsx', candidate + '.js', path.join(candidate, 'index.ts')].find(f => fs.existsSync(f) && fs.statSync(f).isFile());
      if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (/\.tsx?$/.test(url)) {
      return { format: 'module', source: ts.transpileModule(fs.readFileSync(fileURLToPath(url), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX }, fileName: fileURLToPath(url) }).outputText, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
