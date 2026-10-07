#!/usr/bin/env node
// Testo Helper language server.
//
// A dependency free LSP server that replaces the VS Code extension's
// providers:
//   * hover            -> built in docs, macro docs, image previews
//   * definition       -> include / macro / image targets
//   * formatting       -> the Testo formatter
//   * inlay hints      -> the `step` counter
//   * code actions     -> open the test case in Jira
//
// It is launched by the Zed extension with Zed's bundled Node runtime
// (see `src/lib.rs`), with the extension directory as the working directory.

const fs = require('fs');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');

const { Connection } = require('./lsp');
const builtinDocs = require('./builtinDocs');
const { formatTestoDocument } = require('./formatting');
const { renderBuiltinDoc, renderMacroComment, renderKeysReference } = require('./markdown');
const {
  BINARY_EXTENSIONS,
  findMacroInFile,
  findImagePathInFile,
  unescapePath,
} = require('./resolver');

const connection = new Connection(process.stdin, process.stdout);

// Open documents (uri -> text), maintained from didOpen/didChange/didClose.
const documents = new Map();

// Settings coming from Zed (`lsp.testo-helper-lsp.settings`).
let settings = {
  jiraBaseUrl: '',
  enableImageHover: true,
  enableDocsHover: true,
  enableMacroHover: true,
};

const RESERVED_KEYWORDS = ['if', 'for', 'while', 'switch', 'do', 'else'];
const IMG_MAX_BYTES = 70 * 1024;

const INCLUDE_RE = /include\s+"((?:[^"\\]|\\.)+)"/;
const IMG_RE = /(?:img\s*"\${([^}]+)}"|find_img\s*\("\${([^}]+)}"\))/;
const IMG_RANGE_RE = /(?:img\s*"\${[^}]*}"|find_img\s*\("\${[^}]*}"\))/;
const MACRO_RANGE_RE = /[a-zA-Z_][a-zA-Z0-9_]*(?:\s*\()/;

// --- helpers ---------------------------------------------------------------

function uriToPath(uri) {
  try {
    return url.fileURLToPath(uri);
  } catch (err) {
    return null;
  }
}

function pathToUri(p) {
  return url.pathToFileURL(p).toString();
}

function getText(uri) {
  if (documents.has(uri)) return documents.get(uri);
  const fsPath = uriToPath(uri);
  if (!fsPath) return '';
  try {
    return fs.readFileSync(fsPath, 'utf8');
  } catch (err) {
    return '';
  }
}

function lineAt(text, line) {
  return text.split('\n')[line] || '';
}

// Returns the match of `regex` on `lineText` that contains `character`.
function matchAt(lineText, character, regex) {
  const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
  const re = new RegExp(regex.source, flags);
  let m;
  while ((m = re.exec(lineText)) !== null) {
    if (character >= m.index && character <= m.index + m[0].length) {
      return { start: m.index, end: m.index + m[0].length, text: m[0], match: m };
    }
    if (m.index > character) break;
    if (m[0].length === 0) re.lastIndex++;
  }
  return null;
}

function range(line, start, end) {
  return { start: { line, character: start }, end: { line, character: end } };
}

function fullRange(text) {
  const lines = text.split('\n');
  const last = lines.length - 1;
  return { start: { line: 0, character: 0 }, end: { line: last, character: lines[last].length } };
}

function markdownHover(value, rng) {
  return { contents: { kind: 'markdown', value }, range: rng };
}

// Opens a URL in the user's default browser. The language server runs on the
// user's machine, so this mirrors what `vscode.env.openExternal` used to do.
function openExternal(target) {
  const platform = process.platform;
  let command;
  let args;
  if (platform === 'darwin') {
    command = 'open';
    args = [target];
  } else if (platform === 'win32') {
    command = 'cmd';
    args = ['/c', 'start', '', target];
  } else {
    command = 'xdg-open';
    args = [target];
  }
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore' });
    child.unref();
  } catch (err) {
    // Ignore: nothing sensible to do here.
  }
}

// --- lifecycle -------------------------------------------------------------

connection.onRequest('initialize', params => {
  if (params && params.initializationOptions && typeof params.initializationOptions === 'object') {
    settings = { ...settings, ...params.initializationOptions };
  }
  return {
    capabilities: {
      textDocumentSync: 1, // full
      hoverProvider: true,
      definitionProvider: true,
      documentFormattingProvider: true,
      inlayHintProvider: true,
      codeActionProvider: true,
      workspace: { configuration: true },
    },
    serverInfo: { name: 'testo-helper-lsp', version: '1.0.0' },
  };
});

connection.on('initialized', async () => {
  try {
    const result = await connection.request('workspace/configuration', { items: [{}] });
    if (Array.isArray(result) && result[0] && typeof result[0] === 'object') {
      settings = { ...settings, ...result[0] };
    }
  } catch (err) {
    // Configuration is optional.
  }
});

connection.on('workspace/didChangeConfiguration', params => {
  const next = params && params.settings;
  if (next && typeof next === 'object') {
    settings = { ...settings, ...next };
  }
});

connection.onRequest('shutdown', () => null);
connection.on('exit', () => process.exit(0));

// --- document sync ---------------------------------------------------------

connection.on('textDocument/didOpen', params => {
  const doc = params.textDocument;
  documents.set(doc.uri, doc.text);
});

connection.on('textDocument/didChange', params => {
  const doc = params.textDocument;
  const changes = params.contentChanges || [];
  if (changes.length && changes[changes.length - 1].text !== undefined) {
    documents.set(doc.uri, changes[changes.length - 1].text);
  }
});

connection.on('textDocument/didClose', params => {
  documents.delete(params.textDocument.uri);
});

// --- hover -----------------------------------------------------------------

connection.onRequest('textDocument/hover', async params => {
  const uri = params.textDocument.uri;
  const text = getText(uri);
  const line = lineAt(text, params.position.line);
  const character = params.position.character;

  // Built in function documentation.
  if (settings.enableDocsHover !== false) {
    const wordRange = matchAt(line, character, /[A-Za-z_]+/);
    if (wordRange) {
      const word = wordRange.text;
      const doc = builtinDocs[word];
      if (doc) {
        let value = renderBuiltinDoc(word);
        if (word === 'press') {
          value += '\n\n---\n\n' + renderKeysReference();
        }
        return markdownHover(value, range(params.position.line, wordRange.start, wordRange.end));
      }
    }
  }

  // Macro documentation (comment block above the definition).
  if (settings.enableMacroHover !== false) {
    const macroRange = matchAt(line, character, MACRO_RANGE_RE);
    if (macroRange) {
      const macroName = macroRange.text.replace(/\s*\($/, '');
      if (macroName && !RESERVED_KEYWORDS.includes(macroName) && !builtinDocs[macroName]) {
        const fsPath = uriToPath(uri);
        if (fsPath) {
          const result = await findMacroInFile(fsPath, macroName, new Set());
          if (result && result.comment) {
            return markdownHover(
              renderMacroComment(result.comment, macroName),
              range(params.position.line, macroRange.start, macroRange.end)
            );
          }
        }
      }
    }
  }

  // Image preview.
  if (settings.enableImageHover === false) return null;
  const imgRange = matchAt(line, character, IMG_RANGE_RE);
  if (!imgRange) return null;

  const matches = imgRange.text.match(IMG_RE);
  if (!matches) return null;
  const imageName = matches[1] || matches[2];

  const fsPath = uriToPath(uri);
  if (!fsPath) return null;
  const imagePath = await findImagePathInFile(fsPath, imageName, new Set());
  const hoverRange = range(params.position.line, imgRange.start, imgRange.end);

  if (!imagePath) {
    return markdownHover(`❓ Изображение "${imageName}" не найдено`, hoverRange);
  }

  const ext = path.extname(imagePath).toLowerCase();
  if (!BINARY_EXTENSIONS.includes(ext)) {
    const display = path.isAbsolute(imagePath)
      ? imagePath
      : path.resolve(path.dirname(fsPath), imagePath);
    return markdownHover(`📄 Файл: ${imageName}\n\nПуть: ${display}`, hoverRange);
  }

  try {
    const stats = fs.statSync(imagePath);
    if (stats.size > IMG_MAX_BYTES) {
      return markdownHover(
        'Превью для img размером больше 70КБ не поддерживается. Используйте **Ctrl + Click**, чтобы посмотреть img.',
        hoverRange
      );
    }
    const buffer = fs.readFileSync(imagePath);
    const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mime};base64,${buffer.toString('base64')}`;
    return markdownHover(`![Preview](${dataUri})`, hoverRange);
  } catch (err) {
    return markdownHover(`❌ Ошибка загрузки изображения: ${imagePath}`, hoverRange);
  }
});

// --- definition ------------------------------------------------------------

connection.onRequest('textDocument/definition', async params => {
  const uri = params.textDocument.uri;
  const text = getText(uri);
  const line = lineAt(text, params.position.line);
  const character = params.position.character;
  const fsPath = uriToPath(uri);
  if (!fsPath) return null;

  // include "path"
  const includeMatch = line.match(INCLUDE_RE);
  if (includeMatch) {
    const includePath = unescapePath(includeMatch[1]);
    const absolutePath = path.resolve(path.dirname(fsPath), includePath);
    if (fs.existsSync(absolutePath)) {
      return [{ uri: pathToUri(absolutePath), range: range(0, 0, 0) }];
    }
    return null;
  }

  // Do not treat macro definition lines as references.
  if (line.trim().startsWith('macro')) return null;

  // img "${...}" / find_img("${...}")
  const imgRange = matchAt(line, character, IMG_RANGE_RE);
  if (imgRange) {
    const matches = imgRange.text.match(IMG_RE);
    if (matches) {
      const imageName = matches[1] || matches[2];
      const imagePath = await findImagePathInFile(fsPath, imageName, new Set());
      if (imagePath && fs.existsSync(imagePath)) {
        return [{ uri: pathToUri(imagePath), range: range(0, 0, 0) }];
      }
    }
    return null;
  }

  // macro call
  const macroRange = matchAt(line, character, MACRO_RANGE_RE);
  if (macroRange) {
    const macroName = macroRange.text.replace(/\s*\($/, '');
    if (!macroName || RESERVED_KEYWORDS.includes(macroName)) return null;
    const result = await findMacroInFile(fsPath, macroName, new Set());
    if (result) {
      return [{ uri: pathToUri(result.filePath), range: range(result.line, 0, 0) }];
    }
  }

  return null;
});

// --- formatting ------------------------------------------------------------

connection.onRequest('textDocument/formatting', params => {
  const uri = params.textDocument.uri;
  const text = getText(uri);
  const formatted = formatTestoDocument(text);
  if (formatted === text) return [];
  return [{ range: fullRange(text), newText: formatted }];
});

// --- inlay hints (step counter) -------------------------------------------

connection.onRequest('textDocument/inlayHint', params => {
  const uri = params.textDocument.uri;
  const text = getText(uri);
  const lines = text.split('\n');
  const hints = [];
  let stepNumber = 1;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim().startsWith('#')) continue;
    if (/^\s*step\b/.test(raw)) {
      hints.push({
        position: { line: i, character: raw.length },
        label: `// Шаг ${stepNumber}`,
        kind: 2, // Parameter
        paddingLeft: true,
      });
      stepNumber++;
    }
  }

  return hints;
});

// --- code actions ----------------------------------------------------------

function jiraUrlFor(uri) {
  const fsPath = uriToPath(uri);
  if (!fsPath) return null;
  const fileName = path.basename(fsPath);
  if (!/T\d+\.testo$/i.test(fileName)) return null;
  if (!settings.jiraBaseUrl) return null;
  const testCaseId = path.basename(fileName, '.testo');
  return `${settings.jiraBaseUrl}${testCaseId}`;
}

connection.onRequest('textDocument/codeAction', params => {
  const uri = params.textDocument.uri;
  const actions = [];
  if (jiraUrlFor(uri)) {
    actions.push({
      title: 'Testo Helper: открыть тест-кейс в Jira',
      kind: 'quickfix',
      command: {
        title: 'Открыть в Jira',
        command: 'testo-helper.openInJira',
        arguments: [uri],
      },
    });
  }
  return actions;
});

connection.onRequest('workspace/executeCommand', params => {
  if (params && params.command === 'testo-helper.openInJira') {
    const uri = (params.arguments && params.arguments[0]) || '';
    const target = jiraUrlFor(uri);
    if (target) openExternal(target);
  }
  return null;
});

process.on('uncaughtException', err => {
  // Never crash the server on a bad request.
  process.stderr.write(`testo-helper-lsp: ${err && err.stack ? err.stack : err}\n`);
});
