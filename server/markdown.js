// Markdown renderers for hover content.
//
// The rendered strings are returned to Zed as `MarkdownString` hover contents.

const builtinDocs = require('./builtinDocs');
const keysReference = require('./keysReference');

// Renders a macro's comment block ("шапка") as markdown. Markers of the form
// [_Заголовок_] become bold headings and the body of the [_Пример_] section is
// rendered as a fenced `testo` code block.
function renderMacroComment(comment, macroName) {
  const out = [`**macro** \`${macroName}\``];

  const cleaned = comment
    .split('\n')
    .map(l => l.replace(/^\s*#\s?/, '').replace(/\s+$/, ''));

  // Only these sections are shown in hovers.
  const allowedSections = [/условия/i, /параметры/i, /результат/i];
  let showSection = false;
  let inExample = false;
  let exampleLines = [];

  const flushExample = () => {
    while (exampleLines.length && exampleLines[0].trim() === '') exampleLines.shift();
    while (exampleLines.length && exampleLines[exampleLines.length - 1].trim() === '') {
      exampleLines.pop();
    }
    if (exampleLines.length) {
      // Remove the common indent while keeping relative code indentation.
      const indents = exampleLines
        .filter(l => l.trim() !== '')
        .map(l => l.match(/^\s*/)[0].length);
      const minIndent = indents.length ? Math.min(...indents) : 0;
      const dedented = exampleLines.map(l => l.slice(minIndent));
      out.push('```testo\n' + dedented.join('\n') + '\n```');
    }
    exampleLines = [];
  };

  for (const line of cleaned) {
    const headerMatch = line.match(/^\[_(.+?)_\]$/);
    if (headerMatch) {
      flushExample();
      const title = headerMatch[1];
      showSection = allowedSections.some(re => re.test(title));
      inExample = showSection && /пример/i.test(title);
      if (showSection) {
        out.push(`**${title}**`);
      }
      continue;
    }

    if (!showSection) continue;

    if (inExample) {
      exampleLines.push(line);
    } else if (line.trim() !== '') {
      out.push(`${line.trim()}  `);
    }
  }
  flushExample();

  return out.join('\n\n');
}

// Renders a built in function's documentation (see builtinDocs.js) as markdown.
function renderBuiltinDoc(word) {
  const doc = builtinDocs[word];
  if (!doc) return null;

  const out = [];
  out.push('```testo\n' + doc.syntax + '\n```');
  out.push(doc.description);

  if (doc.params && doc.params.length > 0) {
    out.push('**Параметры:**');
    out.push(doc.params.map(p => `- ${p}`).join('\n'));
  }

  out.push('**Пример:**');
  out.push('```testo\n' + doc.example + '\n```');

  return out.join('\n\n');
}

// Renders the full key reference (grouped) as markdown. Used in the `press`
// hover so the whole list is available where it matters.
function renderKeysReference() {
  const out = ['### Клавиши для `press`', '_Регистр не важен._'];
  for (const [group, keys] of Object.entries(keysReference)) {
    out.push(`**${group}**`);
    out.push(keys.map(k => `- \`${k.key}\` — ${k.desc}`).join('\n'));
  }
  return out.join('\n\n');
}

module.exports = {
  renderMacroComment,
  renderBuiltinDoc,
  renderKeysReference,
};
