// Extract text from a PDF without external dependencies.
// Handles FlateDecode content streams and common Tj/TJ operators.
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2];
if (!file) {
  console.error('usage: node extract-pdf.js <file.pdf>');
  process.exit(1);
}

const buf = fs.readFileSync(file);
const raw = buf.toString('latin1');

const out = [];
let index = 0;

while (index < raw.length) {
  const streamStart = raw.indexOf('stream', index);
  if (streamStart === -1) break;
  let dataStart = streamStart + 6;
  if (raw[dataStart] === '\r') dataStart++;
  if (raw[dataStart] === '\n') dataStart++;

  const endIdx = raw.indexOf('endstream', dataStart);
  if (endIdx === -1) break;

  const dictStart = raw.lastIndexOf('<<', streamStart);
  const dict = dictStart === -1 ? '' : raw.slice(dictStart, streamStart);

  let content = Buffer.from(raw.slice(dataStart, endIdx), 'latin1');

  if (/FlateDecode/.test(dict)) {
    try {
      content = zlib.inflateSync(content);
    } catch {
      try {
        content = zlib.inflateRawSync(content);
      } catch {
        index = endIdx + 9;
        continue;
      }
    }
  }

  const text = content.toString('latin1');

  // Extract strings from text-showing operators.
  const patterns = [
    /\(((?:\\.|[^\\()])*)\)\s*Tj/g,
    /\[((?:\((?:\\.|[^\\()])*\)|[^\]])*)\]\s*TJ/g,
  ];

  let found = false;
  for (const re of patterns) {
    let m;
    while ((m = re.exec(text)) !== null) {
      found = true;
      let s = m[1];
      if (s.includes('(') && s.includes(')')) {
        s = s.replace(/^\(|\)$/g, '')
          .split(/\)\s*-?\d*\.?\d*\s*\(/).join('');
      }
      s = s.replace(/\\([()\\])/g, '$1')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
      out.push(s);
    }
  }

  if (!found && /(Tj|TJ)/.test(text)) {
    out.push(text.replace(/[^\x20-\x7E\n]/g, ' ').slice(0, 4000));
  }

  index = endIdx + 9;
}

const result = out.join('\n');
console.log(result);
console.log('\n--- extracted characters: ' + result.length + ' ---');
