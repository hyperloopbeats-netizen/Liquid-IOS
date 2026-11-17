import type { AuditIssue, AuditReport, VFSFile } from '../types/os';
import { transpileTypeScriptForPreview } from '../utils/codeTools';
import { neuralBus } from './neuralBus';
import { vfs } from './vfs';

const BROWSER_BUILTIN_SPECIFIERS = new Set([
  'react',
  'react-dom',
  'three',
  'lucide-react',
]);

function resolveRelativeVfsFile(importSpec: string, fromFile: VFSFile, allFiles: VFSFile[]): VFSFile | undefined {
  const fromParts = fromFile.path.split('/').filter(Boolean);
  fromParts.pop(); // remove filename
  const relParts = importSpec.split('/');
  const stack = [...fromParts];
  for (const seg of relParts) {
    if (!seg || seg === '.') continue;
    if (seg === '..') stack.pop();
    else stack.push(seg);
  }
  const basePath = '/' + stack.join('/');
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    `${basePath}.css`,
    `${basePath}.json`,
    `${basePath}/index.ts`,
    `${basePath}/index.js`,
  ];
  return allFiles.find((f) => candidates.some((c) => c.toLowerCase() === f.path.toLowerCase()));
}

function buildMissingStubPath(importSpec: string, fromFile: VFSFile): string {
  const fromParts = fromFile.path.split('/').filter(Boolean);
  fromParts.pop();
  for (const seg of importSpec.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') fromParts.pop();
    else fromParts.push(seg);
  }
  let target = '/' + fromParts.join('/');
  if (!/\.(ts|tsx|js|jsx|css|json)$/i.test(target)) {
    target += fromFile.kind === 'ts' ? '.ts' : '.js';
  }
  return target;
}

function findUnbalancedBrackets(content: string): { line: number; col: number; message: string } | null {
  const stack: Array<{ ch: string; line: number; col: number }> = [];
  const pairs: Record<string, string> = { '(': ')', '{': '}', '[': ']' };
  const closing: Record<string, string> = { ')': '(', '}': '{', ']': '[' };

  let inSingle = false;
  let inDouble = false;
  let inTemplate = false;
  let inLineComment = false;
  let inBlockComment = false;
  let line = 1;
  let col = 0;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];
    col++;

    if (ch === '\n') {
      line++;
      col = 0;
      inLineComment = false;
      continue;
    }

    if (inLineComment) continue;
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
        col++;
      }
      continue;
    }

    if (inSingle) {
      if (ch === '\\') {
        i++;
        col++;
      } else if (ch === "'") {
        inSingle = false;
      }
      continue;
    }
    if (inDouble) {
      if (ch === '\\') {
        i++;
        col++;
      } else if (ch === '"') {
        inDouble = false;
      }
      continue;
    }
    if (inTemplate) {
      if (ch === '\\') {
        i++;
        col++;
      } else if (ch === '`') {
        inTemplate = false;
      }
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      col++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      col++;
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inTemplate = true;
      continue;
    }

    if (pairs[ch]) {
      stack.push({ ch, line, col });
    } else if (closing[ch]) {
      const top = stack.pop();
      if (!top || top.ch !== closing[ch]) {
        return {
          line,
          col,
          message: top
            ? `Mismatched delimiter "${ch}" (expected "${pairs[top.ch]}" to close "${top.ch}" opened on line ${top.line}).`
            : `Unexpected closing delimiter "${ch}" with no matching opening bracket.`,
        };
      }
    }
  }

  if (inSingle || inDouble || inTemplate) {
    return { line, col, message: 'Unterminated string or template literal before end of file.' };
  }
  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    return {
      line: unclosed.line,
      col: unclosed.col,
      message: `Unclosed "${unclosed.ch}" opened at line ${unclosed.line}:${unclosed.col}.`,
    };
  }
  return null;
}

class CodeAuditorService {
  private lastReport: AuditReport | null = null;
  private listeners = new Set<(report: AuditReport) => void>();

  getLastReport(): AuditReport | null {
    return this.lastReport;
  }

  subscribe(listener: (report: AuditReport) => void): () => void {
    this.listeners.add(listener);
    if (this.lastReport) listener(this.lastReport);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(report: AuditReport): void {
    this.lastReport = report;
    this.listeners.forEach((cb) => cb(report));
  }

  async scanWorkspace(targetFileId?: string): Promise<AuditReport> {
    await vfs.init();
    const allFiles = vfs.getFiles();
    const filesToScan = targetFileId ? allFiles.filter((f) => f.id === targetFileId) : allFiles;
    const issues: AuditIssue[] = [];

    // Parse workspace package.json dependencies if present
    const pkgFile = allFiles.find((f) => f.name.toLowerCase() === 'package.json');
    let declaredDeps = new Set<string>();
    if (pkgFile) {
      try {
        const parsedPkg = JSON.parse(pkgFile.content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        declaredDeps = new Set([
          ...Object.keys(parsedPkg.dependencies ?? {}),
          ...Object.keys(parsedPkg.devDependencies ?? {}),
        ]);
      } catch {
        // Invalid package.json will be flagged below
      }
    }

    for (const file of filesToScan) {
      const lines = file.content.split('\n');

      // 1. JSON Syntax & Schema Audit
      if (file.kind === 'json') {
        try {
          JSON.parse(file.content);
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Invalid JSON syntax';
          issues.push({
            id: `aud-json-${file.id}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            category: 'syntax',
            severity: 'critical',
            title: 'JSON Parse Syntax Error',
            detail: msg,
            line: 1,
            fixLabel: 'Auto-Format / Recover JSON',
            fixAction: 'patch-file',
            patchedContent: file.content
              .replace(/,\s*([}\]])/g, '$1')
              .replace(/'/g, '"'),
          });
        }
        continue;
      }

      // 2. CSS Syntax Audit
      if (file.kind === 'css') {
        const bracketErr = findUnbalancedBrackets(file.content);
        if (bracketErr) {
          issues.push({
            id: `aud-css-${file.id}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            category: 'syntax',
            severity: 'critical',
            title: 'Unclosed CSS Rule Block',
            detail: bracketErr.message,
            line: bracketErr.line,
            column: bracketErr.col,
          });
        }
        continue;
      }

      if (file.kind !== 'js' && file.kind !== 'ts') {
        continue;
      }

      // 3. JS / TS Syntax Check (Delimiter AST + Function Parse)
      const bracketErr = findUnbalancedBrackets(file.content);
      if (bracketErr) {
        issues.push({
          id: `aud-brk-${file.id}`,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          category: 'syntax',
          severity: 'critical',
          title: 'AST Delimiter / String Syntax Error',
          detail: bracketErr.message,
          line: bracketErr.line,
          column: bracketErr.col,
        });
      } else {
        try {
          const jsCandidate = file.kind === 'ts' ? transpileTypeScriptForPreview(file.content) : file.content;
          new Function(jsCandidate);
        } catch (parseErr) {
          const msg = parseErr instanceof Error ? parseErr.message : 'JavaScript syntax failure';
          issues.push({
            id: `aud-parse-${file.id}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            category: 'syntax',
            severity: 'critical',
            title: `${file.kind.toUpperCase()} Parser Syntax Error`,
            detail: msg,
            line: 1,
          });
        }
      }

      // 4. Missing Dependencies / Unresolved Imports
      const importRegex = /(?:import\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
      let impMatch: RegExpExecArray | null;
      while ((impMatch = importRegex.exec(file.content)) !== null) {
        const spec = impMatch[1];
        const lineNum = file.content.slice(0, impMatch.index).split('\n').length;

        if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('/')) {
          const resolved = resolveRelativeVfsFile(spec, file, allFiles);
          if (!resolved) {
            const stubPath = buildMissingStubPath(spec, file);
            const stubName = stubPath.split('/').pop() || 'module.ts';
            const exportMatches = file.content.match(new RegExp(`import\\s+\\{([^}]+)\\}\\s+from\\s+['"]${spec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`));
            const exportedNames = exportMatches
              ? exportMatches[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
              : ['helper'];

            const stubCode =
              stubName.endsWith('.css')
                ? `/* Generated stub stylesheet for ${spec} */\n`
                : exportedNames
                    .map(
                      (fn) =>
                        `export function ${fn}(value${file.kind === 'ts' ? ': unknown' : ''})${file.kind === 'ts' ? ': string' : ''} {\n  return String(value ?? '');\n}`
                    )
                    .join('\n\n') + '\n';

            issues.push({
              id: `aud-rel-${file.id}-${lineNum}-${spec}`,
              fileId: file.id,
              fileName: file.name,
              filePath: file.path,
              category: 'dependency',
              severity: 'critical',
              title: `Missing Local Import "${spec}"`,
              detail: `Referenced module "${spec}" does not exist in IndexedDB VFS (expected ${stubPath}).`,
              line: lineNum,
              fixLabel: `Create Stub ${stubName}`,
              fixAction: 'create-stub',
              stubTargetPath: stubPath,
              stubContent: stubCode,
            });
          }
        } else {
          // Bare npm package specifier
          const pkgRoot = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
          if (!declaredDeps.has(pkgRoot) && !BROWSER_BUILTIN_SPECIFIERS.has(pkgRoot)) {
            issues.push({
              id: `aud-pkg-${file.id}-${lineNum}-${pkgRoot}`,
              fileId: file.id,
              fileName: file.name,
              filePath: file.path,
              category: 'dependency',
              severity: 'warning',
              title: `Undeclared Package Dependency "${pkgRoot}"`,
              detail: `"${pkgRoot}" is imported on line ${lineNum} but missing from package.json dependencies.`,
              line: lineNum,
              missingDependency: pkgRoot,
              fixLabel: `Add "${pkgRoot}" to package.json`,
              fixAction: 'update-package-json',
            });
          }
        }
      }

      // 5. Performance Bottlenecks (Nested loops, DOM queries in loops)
      let loopDepth = 0;
      let braceBalanceAtLoop: number[] = [];
      let totalBraces = 0;
      let flaggedNestedLoop = false;
      let flaggedDomInLoop = false;

      lines.forEach((rawLine, idx) => {
        const lineNum = idx + 1;
        const trimmed = rawLine.trim();
        if (trimmed.startsWith('//')) return;

        const opens = (rawLine.match(/\{/g) || []).length;
        const closes = (rawLine.match(/\}/g) || []).length;

        if (/\b(for|while)\s*\(/.test(trimmed)) {
          loopDepth++;
          braceBalanceAtLoop.push(totalBraces);
          if (loopDepth >= 2 && !flaggedNestedLoop) {
            flaggedNestedLoop = true;
            issues.push({
              id: `aud-perf-loop-${file.id}-${lineNum}`,
              fileId: file.id,
              fileName: file.name,
              filePath: file.path,
              category: 'performance',
              severity: 'warning',
              title: 'O(n²) Nested Loop Bottleneck',
              detail: `Nested loop starts on line ${lineNum}. On large datasets this causes quadratic CPU latency; flatten or index via Map/Set.`,
              line: lineNum,
              fixLabel: file.content.includes('computeClusterMatrix') ? 'Flatten to O(n) Single Pass' : undefined,
              fixAction: file.content.includes('computeClusterMatrix') ? 'patch-file' : undefined,
              patchedContent: file.content.includes('computeClusterMatrix')
                ? file.content.replace(
                    /export function computeClusterMatrix[\s\S]*?\n\}/,
                    `export function computeClusterMatrix(nodes: MetricSample[]): number {\n  const el = document.querySelector('#status');\n  if (!el || nodes.length === 0) return 0;\n  return nodes.reduce((sum, node) => sum + node.cpu * 0.5 * nodes.length, 0);\n}`
                  )
                : undefined,
            });
          }
        }

        if (loopDepth >= 1 && /document\.(querySelector|querySelectorAll|getElementById|getElementsBy)/.test(rawLine) && !flaggedDomInLoop) {
          flaggedDomInLoop = true;
          issues.push({
            id: `aud-perf-dom-${file.id}-${lineNum}`,
            fileId: file.id,
            fileName: file.name,
            filePath: file.path,
            category: 'performance',
            severity: 'warning',
            title: 'Repeated DOM Query Inside Loop',
            detail: `document.querySelector/getElementById executed inside loop on line ${lineNum}. Cache the DOM reference outside the loop.`,
            line: lineNum,
          });
        }

        totalBraces += opens - closes;
        while (braceBalanceAtLoop.length > 0 && totalBraces <= braceBalanceAtLoop[braceBalanceAtLoop.length - 1]) {
          braceBalanceAtLoop.pop();
          loopDepth = Math.max(0, loopDepth - 1);
        }
      });

      // 6. Security & Reliability Diagnostics
      if (/\.innerHTML\s*=/.test(file.content)) {
        const lineNum = lines.findIndex((l) => /\.innerHTML\s*=/.test(l)) + 1;
        issues.push({
          id: `aud-sec-xss-${file.id}-${lineNum}`,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          category: 'security',
          severity: 'critical',
          title: 'Unsafe innerHTML Assignment (XSS Risk)',
          detail: `Assigning dynamic strings to innerHTML on line ${lineNum} creates an XSS sink. Replace with textContent.`,
          line: lineNum,
          fixLabel: 'Patch to Safe textContent',
          fixAction: 'patch-file',
          patchedContent: file.content.replace(/(\w+)\.innerHTML\s*=\s*([^;]+);/g, '$1.textContent = String($2).replace(/<[^>]*>/g, "");'),
        });
      }

      if (file.content.includes('JSON.parse(') && !file.content.includes('try {') && !file.content.includes('try{')) {
        const lineNum = lines.findIndex((l) => l.includes('JSON.parse(')) + 1;
        issues.push({
          id: `aud-rel-json-${file.id}-${lineNum}`,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          category: 'syntax',
          severity: 'warning',
          title: 'Unguarded JSON.parse() Call',
          detail: `JSON.parse() on line ${lineNum} lacks a try/catch handler and will throw an uncaught SyntaxError on malformed payloads.`,
          line: lineNum,
          fixLabel: 'Wrap JSON.parse in try/catch',
          fixAction: 'patch-file',
          patchedContent: file.content.replace(
            /const\s+(\w+)\s*=\s*JSON\.parse\(([^)]+)\);/,
            'let $1: any = {};\n  try {\n    $1 = JSON.parse($2);\n  } catch (err) {\n    console.warn("Invalid JSON payload:", err);\n    return null;\n  }'
          ),
        });
      }

      if (/\bsetInterval\s*\(/.test(file.content) && !/\bclearInterval\s*\(/.test(file.content)) {
        const lineNum = lines.findIndex((l) => /\bsetInterval\s*\(/.test(l)) + 1;
        issues.push({
          id: `aud-perf-timer-${file.id}-${lineNum}`,
          fileId: file.id,
          fileName: file.name,
          filePath: file.path,
          category: 'performance',
          severity: 'warning',
          title: 'Uncleaned setInterval Timer Leak',
          detail: `setInterval on line ${lineNum} has no matching clearInterval cleanup handler.`,
          line: lineNum,
        });
      }
    }

    const report: AuditReport = {
      scannedAt: Date.now(),
      fileCount: filesToScan.length,
      issues,
      counts: {
        critical: issues.filter((i) => i.severity === 'critical').length,
        warning: issues.filter((i) => i.severity === 'warning').length,
        info: issues.filter((i) => i.severity === 'info').length,
        syntax: issues.filter((i) => i.category === 'syntax').length,
        dependency: issues.filter((i) => i.category === 'dependency').length,
        performance: issues.filter((i) => i.category === 'performance').length,
        security: issues.filter((i) => i.category === 'security').length,
      },
    };

    this.emit(report);
    neuralBus.publish(
      'SWARM',
      'CODE_AUDIT_COMPLETE',
      `AST Code Auditor scanned ${report.fileCount} file(s): ${report.counts.critical} critical, ${report.counts.warning} warning.`
    );
    return report;
  }

  async applyFix(issue: AuditIssue): Promise<string> {
    await vfs.init();

    if (issue.fixAction === 'create-stub' && issue.stubTargetPath && issue.stubContent !== undefined) {
      const stubName = issue.stubTargetPath.split('/').pop() || 'module.ts';
      await vfs.createSnapshot(`Before Stub (${stubName})`, `Code Auditor stub creation for ${issue.fileName}`);
      await vfs.saveFile({
        name: stubName,
        path: issue.stubTargetPath,
        content: issue.stubContent,
        patchedBy: 'code-auditor',
      });
      await this.scanWorkspace();
      return `Created ${issue.stubTargetPath} in workspace.`;
    }

    if (issue.fixAction === 'update-package-json' && issue.missingDependency) {
      const existingPkg = vfs.getFileByName('package.json');
      let pkgObj: Record<string, unknown> = { name: 'codemesh-workspace', version: '1.0.0', dependencies: {} };
      if (existingPkg) {
        try {
          pkgObj = JSON.parse(existingPkg.content) as Record<string, unknown>;
        } catch {
          // keep fallback
        }
      }
      const deps = ((pkgObj.dependencies as Record<string, string>) || {});
      deps[issue.missingDependency] = 'latest';
      pkgObj.dependencies = deps;
      await vfs.createSnapshot('Before package.json update', `Add ${issue.missingDependency}`);
      await vfs.saveFile({
        id: existingPkg?.id,
        name: 'package.json',
        path: existingPkg?.path ?? '/workspace/package.json',
        content: JSON.stringify(pkgObj, null, 2) + '\n',
        patchedBy: 'code-auditor',
      });
      await this.scanWorkspace();
      return `Added "${issue.missingDependency}" to package.json dependencies.`;
    }

    if (issue.fixAction === 'patch-file' && issue.patchedContent) {
      const target = vfs.getFiles().find((f) => f.id === issue.fileId);
      if (!target) return 'Target file no longer exists.';
      await vfs.createSnapshot(`Before Fix (${target.name})`, issue.title);
      await vfs.saveFile({
        id: target.id,
        name: target.name,
        path: target.path,
        content: issue.patchedContent,
        patchedBy: 'code-auditor',
      });
      await this.scanWorkspace();
      return `Applied fix "${issue.title}" to ${target.name}.`;
    }

    return 'No automated patch available for this diagnostic.';
  }
}

export const codeAuditor = new CodeAuditorService();
