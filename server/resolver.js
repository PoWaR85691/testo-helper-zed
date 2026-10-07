// File resolution helpers for the Testo language server.
//
// These are plain Node ports of the helpers that used to live in
// `src/definitionProvider.js` (VS Code), with the `vscode` API removed:
// includes are resolved recursively and macros / images are looked up in the
// resulting file graph.

const fs = require('fs');
const path = require('path');
const os = require('os');

// File extensions treated as binary images (used for hover previews only).
const BINARY_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.bmp'];

const INCLUDE_RE = /include\s+"((?:[^"\\]|\\.)+)"/g;

function readFileSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function unescapePath(p) {
  return p.replace(/\\(.)/g, '$1');
}

function collectIncludes(fileContent) {
  const includes = [];
  let match;
  INCLUDE_RE.lastIndex = 0;
  while ((match = INCLUDE_RE.exec(fileContent)) !== null) {
    includes.push(unescapePath(match[1]));
  }
  return includes;
}

// Collects a "#"-comment block directly above a macro definition, skipping
// blank lines / `param` declarations that sit flush against `macro`.
function extractMacroComment(lines, defLineIndex) {
  const block = [];
  for (let i = defLineIndex - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#')) {
      block.unshift(lines[i]);
    } else if (block.length === 0 && (trimmed === '' || /^param\b/.test(trimmed))) {
      continue;
    } else {
      break;
    }
  }
  return block.join('\n');
}

// Recursively searches `filePath` and every file it includes for
// `macro <name>(...) {`.
async function findMacroInFile(filePath, macroName, visitedFiles = new Set()) {
  if (visitedFiles.has(filePath)) return null;
  visitedFiles.add(filePath);

  const fileContent = readFileSafe(filePath);
  if (fileContent === null) return null;

  const macroRegex = new RegExp(`macro\\s+${macroName}\\s*\\([^)]*\\)\\s*{`, 'm');
  const match = fileContent.match(macroRegex);
  if (match) {
    const lines = fileContent.split('\n');
    const line = fileContent.substring(0, match.index).split('\n').length - 1;
    const comment = extractMacroComment(lines, line);
    return { filePath, line, comment };
  }

  for (const includePath of collectIncludes(fileContent)) {
    const absolutePath = path.resolve(path.dirname(filePath), includePath);
    const result = await findMacroInFile(absolutePath, macroName, visitedFiles);
    if (result) return result;
  }

  return null;
}

// Recursively searches `filePath` and every included file for an image
// declaration (`param <name> "path"` or `image <name> "path"`) inside a
// file named `images.testo`. `${WHO}` is replaced by the current username.
async function findImagePathInFile(filePath, imageName, visitedFiles = new Set()) {
  if (visitedFiles.has(filePath)) return null;
  visitedFiles.add(filePath);

  const fileContent = readFileSafe(filePath);
  if (fileContent === null) return null;

  if (path.basename(filePath) === 'images.testo') {
    const escaped = imageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const declarationRegex = new RegExp(`(?:param|image)\\s+${escaped}\\s+"([^"]+)"`, 'i');
    const match = fileContent.match(declarationRegex);
    if (match) {
      let imagePath = match[1];
      try {
        const who = os.userInfo().username;
        if (who) imagePath = imagePath.replace('${WHO}', who);
      } catch (err) {
        // Ignore: keep the unresolved path.
      }
      return imagePath;
    }
  }

  for (const includePath of collectIncludes(fileContent)) {
    const absolutePath = path.resolve(path.dirname(filePath), includePath);
    const result = await findImagePathInFile(absolutePath, imageName, visitedFiles);
    if (result) return result;
  }

  return null;
}

module.exports = {
  BINARY_EXTENSIONS,
  readFileSafe,
  unescapePath,
  collectIncludes,
  extractMacroComment,
  findMacroInFile,
  findImagePathInFile,
};
