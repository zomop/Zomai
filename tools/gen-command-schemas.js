/**
 * Regenerate api/commands.js dari src/commands/*.js
 * Jalankan: node tools/gen-command-schemas.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'commands');
const out = [];

for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js') && f !== 'owner.js')) {
  const cmd = require(path.join(dir, file));
  if (!cmd.data) continue;
  const list = Array.isArray(cmd.data) ? cmd.data : [cmd.data];
  for (const builder of list) out.push(builder.toJSON());
}

out.sort((a, b) => a.name.localeCompare(b.name));

const target = path.join(__dirname, '..', 'api', 'commands.js');
fs.writeFileSync(
  target,
  "'use strict';\n// Daftar slash command Zomai (dipakai api/setup.js) — owner sengaja disembunyikan\nmodule.exports = " +
    JSON.stringify(out) +
    ';\n',
);
console.log(`✅ ${out.length} command → api/commands.js`);
