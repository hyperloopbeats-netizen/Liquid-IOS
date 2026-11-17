import type { VFSFile, VFSFileKind } from '../types/os';

export type TokenType =
  | 'plain'
  | 'keyword'
  | 'type'
  | 'string'
  | 'comment'
  | 'number'
  | 'tag'
  | 'attr'
  | 'selector'
  | 'key'
  | 'heading'
  | 'operator';

export interface CodeToken {
  type: TokenType;
  text: string;
}

const JS_TS_KEYWORDS = new Set([
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'yield',
]);

const TS_TYPES = new Set([
  'Array',
  'Record',
  'Promise',
  'Partial',
  'Pick',
  'Omit',
  'Readonly',
  'Set',
  'Map',
  'HTMLElement',
  'HTMLCanvasElement',
  'Window',
  'Document',
  'string',
  'number',
  'boolean',
  'unknown',
  'any',
  'never',
  'object',
  'bigint',
  'symbol',
]);

export function tokenizeCodeLine(line: string, kind: VFSFileKind): CodeToken[] {
  if (!line) return [{ type: 'plain', text: '' }];

  if (kind === 'md') {
    if (/^#{1,6}\s/.test(line)) {
      return [{ type: 'heading', text: line }];
    }
    if (/^\s*```/.test(line)) {
      return [{ type: 'comment', text: line }];
    }
    const tokens: CodeToken[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) tokens.push({ type: 'plain', text: line.slice(last, m.index) });
      tokens.push({ type: m[0].startsWith('`') ? 'string' : 'keyword', text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: 'plain', text: line.slice(last) });
    return tokens;
  }

  if (kind === 'json') {
    const tokens: CodeToken[] = [];
    const regex = /("(?:\\.|[^"\\])*")(?=\s*:)|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) tokens.push({ type: 'plain', text: line.slice(last, m.index) });
      if (m[1]) tokens.push({ type: 'key', text: m[1] });
      else if (m[2]) tokens.push({ type: 'string', text: m[2] });
      else if (m[3]) tokens.push({ type: 'keyword', text: m[3] });
      else if (m[4]) tokens.push({ type: 'number', text: m[4] });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: 'plain', text: line.slice(last) });
    return tokens;
  }

  if (kind === 'html') {
    const tokens: CodeToken[] = [];
    const regex = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z0-9-]+)|(\/?>)|(\s+[a-zA-Z0-9:-]+(?==))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) tokens.push({ type: 'plain', text: line.slice(last, m.index) });
      if (m[1]) tokens.push({ type: 'comment', text: m[1] });
      else if (m[2] || m[3]) tokens.push({ type: 'tag', text: m[0] });
      else if (m[4]) tokens.push({ type: 'attr', text: m[4] });
      else if (m[5]) tokens.push({ type: 'string', text: m[5] });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: 'plain', text: line.slice(last) });
    return tokens;
  }

  if (kind === 'css') {
    const tokens: CodeToken[] = [];
    const regex = /(\/\*[\s\S]*?\*\/)|(@[a-zA-Z-]+)|([.#]?[a-zA-Z_-][a-zA-Z0-9_-]*(?=\s*[,{]))|([a-zA-Z-]+(?=\s*:))|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms|deg)?\b)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) tokens.push({ type: 'plain', text: line.slice(last, m.index) });
      if (m[1]) tokens.push({ type: 'comment', text: m[1] });
      else if (m[2]) tokens.push({ type: 'keyword', text: m[2] });
      else if (m[3]) tokens.push({ type: 'selector', text: m[3] });
      else if (m[4]) tokens.push({ type: 'attr', text: m[4] });
      else if (m[5]) tokens.push({ type: 'string', text: m[5] });
      else if (m[6]) tokens.push({ type: 'number', text: m[6] });
      last = m.index + m[0].length;
    }
    if (last < line.length) tokens.push({ type: 'plain', text: line.slice(last) });
    return tokens;
  }

  // JS / TS tokenizer
  const tokens: CodeToken[] = [];
  const regex =
    /(\/\/.*$|\/\*[\s\S]*?\*\/)|(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|\b(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|0x[0-9a-fA-F]+)\b|\b([A-Za-z_$][A-Za-z0-9_$]*)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(line)) !== null) {
    if (m.index > last) tokens.push({ type: 'plain', text: line.slice(last, m.index) });
    if (m[1]) {
      tokens.push({ type: 'comment', text: m[1] });
    } else if (m[2]) {
      tokens.push({ type: 'string', text: m[2] });
    } else if (m[3]) {
      tokens.push({ type: 'number', text: m[3] });
    } else if (m[4]) {
      const ident = m[4];
      if (JS_TS_KEYWORDS.has(ident)) tokens.push({ type: 'keyword', text: ident });
      else if (TS_TYPES.has(ident)) tokens.push({ type: 'type', text: ident });
      else tokens.push({ type: 'plain', text: ident });
    }
    last = m.index + m[0].length;
  }
  if (last < line.length) tokens.push({ type: 'plain', text: line.slice(last) });
  return tokens;
}

export const TOKEN_CLASS_MAP: Record<TokenType, string> = {
  plain: 'text-slate-100',
  keyword: 'text-sky-300 font-medium',
  type: 'text-teal-300',
  string: 'text-emerald-300',
  comment: 'text-slate-500 italic',
  number: 'text-amber-300',
  tag: 'text-cyan-300',
  attr: 'text-indigo-300',
  selector: 'text-amber-300',
  key: 'text-sky-300',
  heading: 'text-cyan-300 font-semibold',
  operator: 'text-slate-300',
};

/**
 * Lightweight, safe TypeScript-to-JS annotation stripper for live browser sandbox execution
 * and syntax validation. Preserves string literals & line structure where practical.
 */
export function transpileTypeScriptForPreview(source: string): string {
  // Preserve strings & comments while stripping top-level TS declarations and inline annotations
  let out = source;

  // Remove `import type ...` lines
  out = out.replace(/^\s*import\s+type\s+[^;]+;\s*$/gm, '');
  // Convert ES imports inside sandboxed new Function preview to harmless commented references or keep if needed
  out = out.replace(/^\s*import\s+[\s\S]*?\s+from\s+['"][^'"]+['"];?\s*$/gm, (m) => `/* ${m.trim()} */`);
  out = out.replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, (m) => `/* ${m.trim()} */`);

  // Strip interface & type alias blocks
  out = out.replace(/^\s*(?:export\s+)?interface\s+[A-Za-z_$][\w$]*(?:<[^>]*>)?(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?\n\}/gm, '');
  out = out.replace(/^\s*(?:export\s+)?type\s+[A-Za-z_$][\w$]*(?:<[^>]*>)?\s*=\s*[^;]+;\s*$/gm, '');

  // Strip `export default ` and `export ` keywords so new Function() can run module snippets
  out = out.replace(/^\s*export\s+default\s+/gm, '');
  out = out.replace(/^\s*export\s+(?=(?:async\s+)?function\b|const\b|let\b|var\b|class\b)/gm, '');

  // Strip `as Type` assertions (non-greedy simple types)
  out = out.replace(/\s+as\s+(?:const|[A-Z][\w$<>\[\]| &]*|string|number|boolean|unknown|any|never)/g, '');

  // Strip non-null assertions carefully (ident! or )!) before punctuation
  out = out.replace(/([A-Za-z0-9_$)\]])!(?=[.\[;,)\}\s])/g, '$1');

  // Strip parameter & variable type annotations: `: Type` before `=`, `,`, `)`, `{`
  // Only match outside quotes on single-line declarations
  out = out.replace(
    /(\b(?:const|let|var)\s+[A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$<>\[\]| &.?]*(?=\s*=)/g,
    '$1'
  );
  // Function parameter type annotations `(a: string, b?: number)`
  out = out.replace(
    /([,(]\s*(?:\.\.\.)?[A-Za-z_$][\w$]*)\??\s*:\s*[A-Za-z_$][\w$<>\[\]| &.'"?{}]*(?=\s*[,)=])/g,
    '$1'
  );
  // Function return type annotations `): ReturnType {` or `): ReturnType =>`
  out = out.replace(/\)\s*:\s*[A-Za-z_$][\w$<>\[\]| &.{}]*\s*(?=\{|=>)/g, ') ');
  // Access modifiers inside classes
  out = out.replace(/\b(?:public|private|protected|readonly)\s+(?=[A-Za-z_$])/g, '');

  return out;
}

export interface FileSymbolOutline {
  kind: 'function' | 'class' | 'interface' | 'import' | 'selector' | 'heading';
  name: string;
  line: number;
}

export function extractOutline(content: string, kind: VFSFileKind): FileSymbolOutline[] {
  const lines = content.split('\n');
  const items: FileSymbolOutline[] = [];

  lines.forEach((raw, idx) => {
    const lineNum = idx + 1;
    const trimmed = raw.trim();
    if (kind === 'md') {
      const h = trimmed.match(/^(#{1,3})\s+(.+)/);
      if (h) items.push({ kind: 'heading', name: h[2], line: lineNum });
      return;
    }
    if (kind === 'css') {
      const sel = trimmed.match(/^([.#@]?[a-zA-Z0-9_-][^{]*)\{/);
      if (sel) items.push({ kind: 'selector', name: sel[1].trim(), line: lineNum });
      return;
    }
    if (kind === 'js' || kind === 'ts' || kind === 'html') {
      const imp = trimmed.match(/^import\s+.*?from\s+['"]([^'"]+)['"]/);
      if (imp) {
        items.push({ kind: 'import', name: imp[1], line: lineNum });
        return;
      }
      const fn = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/);
      if (fn) {
        items.push({ kind: 'function', name: `${fn[1]}()`, line: lineNum });
        return;
      }
      const arrow = trimmed.match(/^(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/);
      if (arrow) {
        items.push({ kind: 'function', name: `${arrow[1]}()`, line: lineNum });
        return;
      }
      const cls = trimmed.match(/^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/);
      if (cls) {
        items.push({ kind: 'class', name: cls[1], line: lineNum });
        return;
      }
      const iface = trimmed.match(/^(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/);
      if (iface) {
        items.push({ kind: 'interface', name: iface[1], line: lineNum });
      }
    }
  });

  return items;
}

function escapeHtml(raw: string): string {
  return raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMarkdownToHtml(md: string): string {
  const escaped = escapeHtml(md);
  const html = escaped
    .replace(/```([a-z]*)\n([\s\S]*?)```/g, '<pre style="background:#020617;border:1px solid rgba(255,255,255,0.1);border-radius:8px;padding:12px;overflow:auto;color:#a7f3d0;margin:10px 0;"><code>$2</code></pre>')
    .replace(/^### (.+)$/gm, '<h3 style="color:#7dd3fc;margin:12px 0 6px;font-size:15px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:#38bdf8;margin:16px 0 8px;font-size:18px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:4px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:#e2e8f0;margin:0 0 12px;font-size:22px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(148,163,184,0.18);padding:2px 5px;border-radius:4px;font-family:monospace;color:#5eead4;">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0 4px 18px;">$1</li>')
    .replace(/\n\n/g, '<br/><br/>');

  return `<!doctype html><html><body style="background:#050914;color:#cbd5e1;font-family:system-ui,sans-serif;padding:24px;line-height:1.65;">${html}</body></html>`;
}

function resolveSiblingFile(refPath: string, baseFile: VFSFile, allFiles: VFSFile[]): VFSFile | undefined {
  const cleanRef = refPath.replace(/^\.\//, '').replace(/^\//, '').split('?')[0].split('#')[0];
  const baseDir = baseFile.path.includes('/') ? baseFile.path.slice(0, baseFile.path.lastIndexOf('/')) : '';
  const candidateFull = baseDir ? `${baseDir}/${cleanRef}` : `/${cleanRef}`;
  return (
    allFiles.find((f) => f.path.toLowerCase() === candidateFull.toLowerCase()) ||
    allFiles.find((f) => f.path.toLowerCase().endsWith('/' + cleanRef.toLowerCase())) ||
    allFiles.find((f) => f.name.toLowerCase() === cleanRef.toLowerCase())
  );
}

/**
 * Builds an isolated HTML document for `<iframe sandbox="allow-scripts">`
 * with automatic sibling `.css` / `.js` / `.ts` asset bundling from IndexedDB VFS
 * and postMessage console bridging back to CodeMesh IDE.
 */
export function buildSandboxedSrcDoc(file: VFSFile, allFiles: VFSFile[], runNonce: number): string {
  const bridgeScript = `
    <script>
      (function(){
        const send = (level, args) => {
          try {
            parent.postMessage({
              source: 'aether-sandbox',
              fileName: ${JSON.stringify(file.name)},
              nonce: ${runNonce},
              level,
              text: Array.from(args).map(a => {
                if (typeof a === 'object' && a !== null) {
                  try { return JSON.stringify(a); } catch { return String(a); }
                }
                return String(a);
              }).join(' ')
            }, '*');
          } catch {}
        };
        const origLog = console.log;
        const origWarn = console.warn;
        const origErr = console.error;
        const origInfo = console.info;
        console.log = function(){ send('log', arguments); origLog.apply(console, arguments); };
        console.info = function(){ send('log', arguments); origInfo.apply(console, arguments); };
        console.warn = function(){ send('warn', arguments); origWarn.apply(console, arguments); };
        console.error = function(){ send('error', arguments); origErr.apply(console, arguments); };
        window.onerror = function(msg, _url, line){
          send('error', ['Runtime Error (line ' + line + '): ' + msg]);
        };
        window.addEventListener('unhandledrejection', function(e){
          send('error', ['Unhandled Promise Rejection: ' + (e.reason && e.reason.message ? e.reason.message : String(e.reason))]);
        });
      })();
    </script>
  `;

  if (file.kind === 'html') {
    let bundled = file.content;

    // Inline relative <link rel="stylesheet" href="..."> from VFS
    bundled = bundled.replace(
      /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
      (full, href: string) => {
        if (/^https?:\/\//i.test(href)) return full;
        const asset = resolveSiblingFile(href, file, allFiles);
        if (!asset) return full;
        return `<style data-vfs-inlined="${escapeHtml(asset.name)}">\n${asset.content}\n</style>`;
      }
    );

    // Inline relative <script src="..."></script> from VFS (supporting both .js and .ts)
    bundled = bundled.replace(
      /<script\b([^>]*)src=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
      (full, _pre: string, src: string) => {
        if (/^https?:\/\//i.test(src)) return full;
        const asset = resolveSiblingFile(src, file, allFiles);
        if (!asset) return full;
        const js = asset.kind === 'ts' ? transpileTypeScriptForPreview(asset.content) : asset.content;
        return `<script data-vfs-inlined="${escapeHtml(asset.name)}">\n${js}\n</script>`;
      }
    );

    if (bundled.includes('<head>')) {
      return bundled.replace('<head>', `<head>${bridgeScript}`);
    }
    return `${bridgeScript}${bundled}`;
  }

  if (file.kind === 'md') {
    return `${bridgeScript}${renderMarkdownToHtml(file.content)}`;
  }

  if (file.kind === 'css') {
    return `<!doctype html>
    <html>
      <head>
        ${bridgeScript}
        <style>${file.content}</style>
      </head>
      <body style="background:#050914;color:#e2e8f0;font-family:system-ui,sans-serif;padding:24px;">
        <div class="card panel container" style="max-width:560px;padding:20px;border:1px solid rgba(255,255,255,0.12);border-radius:12px;">
          <h1 style="margin:0 0 8px;">CSS Stylesheet Specimen</h1>
          <p style="opacity:0.85;margin:0 0 12px;">Live style preview for <code>${escapeHtml(file.name)}</code></p>
          <button class="btn button" type="button" onclick="console.log('CSS preview button clicked')">Sample Button</button>
        </div>
      </body>
    </html>`;
  }

  if (file.kind === 'json') {
    let formatted = file.content;
    try {
      formatted = JSON.stringify(JSON.parse(file.content), null, 2);
    } catch {
      // show raw
    }
    return `<!doctype html><html>${bridgeScript}<body style="background:#040812;color:#93c5fd;font-family:monospace;padding:18px;white-space:pre-wrap;font-size:13px;">${escapeHtml(formatted)}</body></html>`;
  }

  // .js or .ts execution inside isolated sandboxed iframe
  const runnable = file.kind === 'ts' ? transpileTypeScriptForPreview(file.content) : file.content;
  const safeJsonCode = JSON.stringify(runnable);

  return `<!doctype html>
  <html>
    <head>${bridgeScript}</head>
    <body style="background:#040812;color:#e2e8f0;font-family:monospace;padding:18px;font-size:12px;">
      <div style="color:#38bdf8;margin-bottom:8px;">Executing ${escapeHtml(file.name)} (${file.kind.toUpperCase()}) inside isolated sandbox...</div>
      <pre id="out" style="color:#a7f3d0;white-space:pre-wrap;"></pre>
      <div id="root"></div>
      <div id="app"></div>
      <script>
        try {
          const fn = new Function(${safeJsonCode});
          const ret = fn();
          if (ret !== undefined) console.log('Return:', ret);
          document.getElementById('out').textContent = 'Execution completed cleanly.';
        } catch (err) {
          console.error(err && err.stack ? err.stack : String(err));
          document.getElementById('out').style.color = '#fda4af';
          document.getElementById('out').textContent = 'Execution halted: ' + (err && err.message ? err.message : String(err));
        }
      </script>
    </body>
  </html>`;
}
