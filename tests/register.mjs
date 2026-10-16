import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'next/image') return { url: 'namiya-test:next-image', shortCircuit: true };
    if (specifier.startsWith('@/')) {
      const base = new URL(`../${specifier.slice(2)}`, import.meta.url);
      const resolved = ['', '.ts', '.tsx'].map(extension => new URL(`${base.href}${extension}`)).find(url => existsSync(fileURLToPath(url)));
      return next((resolved ?? base).href, context);
    }
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !context.parentURL.includes('/node_modules/')) {
      const base = new URL(specifier, context.parentURL);
      const resolved = ['.ts', '.tsx'].map(extension => new URL(`${base.href}${extension}`)).find(url => existsSync(fileURLToPath(url)));
      if (resolved) return next(resolved.href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url === 'namiya-test:next-image') return { format: 'module', shortCircuit: true, source: `import Image from '${new URL('../node_modules/next/image.js', import.meta.url).href}'; export default Image.default ?? Image;` };
    if (url.endsWith('.css')) return { format: 'module', shortCircuit: true, source: 'export default {};' };
    if (url.endsWith('.json') && !url.includes('/node_modules/')) return { format: 'module', shortCircuit: true, source: `export default ${readFileSync(fileURLToPath(url), 'utf8')};` };
    if (url.endsWith('.ts') || url.endsWith('.tsx')) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(
        readFileSync(fileURLToPath(url), 'utf8'),
        { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
      ).outputText };
    }
    return next(url, context);
  },
});
