// Testo document formatter.
//
// This is a 1:1 port of the formatter that used to live in `src/formatting.js`
// (VS Code), with the `vscode` command wiring removed so it can run inside the
// language server. `formatTestoDocument` now takes the document text directly
// and returns the formatted text.

// Effective indentation level of a line (a tab counts as `indentSize` spaces).
function getIndentLevel(line, indentSize) {
  let spaces = 0;
  for (const ch of line) {
    if (ch === '\t') spaces += indentSize;
    else if (ch === ' ') spaces += 1;
    else break;
  }
  return Math.round(spaces / indentSize);
}

// Indentation unit for a line: tab if it starts with a tab, otherwise spaces.
function lineIndentUnit(line, indentSize) {
  return line[0] === '\t' ? '\t' : ' '.repeat(indentSize);
}

// Keeps the original indentation when the level already matches, otherwise
// regenerates it using the line's own style (tab vs spaces).
function resolveIndent(line, expectedLevel, indentSize) {
  if (getIndentLevel(line, indentSize) === expectedLevel) {
    return line.match(/^(\s*)/)[1];
  }
  return lineIndentUnit(line, indentSize).repeat(expectedLevel);
}

function formatTestoDocument(text) {
  const lines = text.split('\n');
  const formattedLines = [];
  let indentLevel = 0; // Nesting level.
  const indentSize = 4; // 4 spaces per level.
  let emptyLineCount = 0; // Consecutive empty line counter.
  let isExecBlock = false; // Multi-line exec block flag.
  let execIndentLevel = 0; // Nesting level of the open exec block.
  let isTypeBlock = false; // type block flag.
  let isHeredocBlock = false; // heredoc block flag (<<EOF ... EOF).

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let trimmedLine = line.trim();
    let indent = resolveIndent(line, indentLevel, indentSize);

    // Comments are kept as-is (trimmed) at the current indent.
    if (trimmedLine.startsWith('#')) {
      formattedLines.push(indent + trimmedLine);
      emptyLineCount = 0;
      continue;
    }

    // type block handling.
    if (isTypeBlock) {
      if (trimmedLine.includes('"""')) {
        formattedLines.push(line);
        isTypeBlock = false;
        emptyLineCount = 0;
      } else {
        formattedLines.push(line);
        emptyLineCount = 0;
      }
      continue;
    }

    const typeMatch = trimmedLine.match(/^type\s*"""/);
    if (typeMatch) {
      const prefix = typeMatch[0];
      const content = trimmedLine.slice(prefix.length);
      const formattedLine = `${prefix}${content}`;
      formattedLines.push(indent + formattedLine);
      if (!content.includes('"""')) {
        isTypeBlock = true;
      }
      emptyLineCount = 0;
      continue;
    }

    // Multi-line exec block handling.
    if (isExecBlock) {
      if (/<<\s*EOF/.test(trimmedLine) && !isHeredocBlock) {
        isHeredocBlock = true;
        formattedLines.push(resolveIndent(line, execIndentLevel + 1, indentSize) + trimmedLine);
        emptyLineCount = 0;
        continue;
      }

      if (isHeredocBlock) {
        formattedLines.push(line);
        emptyLineCount = 0;
        if (trimmedLine === 'EOF') {
          isHeredocBlock = false;
        }
        continue;
      }

      if (trimmedLine.endsWith('"""')) {
        const content = trimmedLine.slice(0, -3).trim();
        if (content) {
          formattedLines.push(
            lineIndentUnit(line, indentSize).repeat(execIndentLevel + 1) + content
          );
        }
        formattedLines.push(lineIndentUnit(line, indentSize).repeat(execIndentLevel) + '"""');
        isExecBlock = false;
        emptyLineCount = 0;
      } else if (trimmedLine) {
        formattedLines.push(resolveIndent(line, execIndentLevel + 1, indentSize) + trimmedLine);
        emptyLineCount = 0;
      } else if (
        emptyLineCount < 1 &&
        formattedLines.length > 0 &&
        formattedLines[formattedLines.length - 1] !== ''
      ) {
        formattedLines.push('');
        emptyLineCount++;
      }
      continue;
    }

    const execMatch = trimmedLine.match(/^exec\s+\w+\s*"""/);
    if (execMatch) {
      const prefix = execMatch[0];
      const content = trimmedLine.slice(prefix.length).trim();

      if (content.endsWith('"""')) {
        const innerContent = content.slice(0, -3).trim();
        const formattedLine = `${prefix}${innerContent ? innerContent : ''}"""`;
        formattedLines.push(indent + formattedLine);
        emptyLineCount = 0;
      } else {
        formattedLines.push(indent + prefix);
        if (content) {
          formattedLines.push(
            lineIndentUnit(line, indentSize).repeat(execIndentLevel + 1) + content
          );
          emptyLineCount = 0;
        }
        isExecBlock = true;
        execIndentLevel = indentLevel;
      }
      continue;
    }

    // Closing brace outdents this line.
    if (trimmedLine.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
      indent = resolveIndent(line, indentLevel, indentSize);
    }

    if (trimmedLine.length === 0) {
      emptyLineCount++;
      if (
        emptyLineCount <= 1 &&
        formattedLines.length > 0 &&
        formattedLines[formattedLines.length - 1] !== ''
      ) {
        formattedLines.push('');
      }
    } else {
      emptyLineCount = 0;
      // Drop a trailing `;`.
      if (trimmedLine.endsWith(';')) {
        trimmedLine = trimmedLine.slice(0, -1).trimEnd();
      }
      formattedLines.push(indent + trimmedLine);
    }

    // An opening brace increases the indent for following lines.
    if (trimmedLine.endsWith('{')) {
      indentLevel++;
    }
  }

  // Drop trailing empty lines.
  while (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] === '') {
    formattedLines.pop();
  }

  return formattedLines.join('\n');
}

module.exports = { formatTestoDocument };
