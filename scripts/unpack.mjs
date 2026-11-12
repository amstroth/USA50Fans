// Expand the versioned USA50 source bundle, including demo preview graphics.
// Run: node scripts/unpack.mjs
import fs from 'node:fs';
import zlib from 'node:zlib';
import cp from 'node:child_process';
const encoded = fs.readFileSync('source_payload.b64', 'utf8').replace(/\s/g, '');
if (!encoded || encoded.length < 1000) throw new Error('Missing USA50 source payload');
const tar = zlib.brotliDecompressSync(Buffer.from(encoded, 'base64'));
const tmp = 'usa50-source.tar';
fs.writeFileSync(tmp, tar);
try { cp.execFileSync('tar', ['-xf', tmp], { stdio: 'inherit' }); }
finally { fs.rmSync(tmp, { force: true }); }
console.log('Expanded USA50 app source and preview assets.');
