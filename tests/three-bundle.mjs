import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const docker = read('../Dockerfile');
const pkg = JSON.parse(read('../package.json'));
const viewer = read('../www/collector-three-v12.js');

// Three.js 0.187.0 has a two-file ESM build. Both must ship together at the
// exact relative paths expected by imports inside three.module.js.
assert.match(docker, /cp\s+node_modules\/three\/build\/three\.module\.js\s+www\/vendor\/three\.module\.js/);
assert.match(docker, /cp\s+node_modules\/three\/build\/three\.core\.js\s+www\/vendor\/three\.core\.js/);
assert.match(docker, /test -s www\/vendor\/three\.core\.js/);
assert.match(docker, /node --check www\/vendor\/three\.core\.js/);
assert.match(viewer, /import\(['"]\/vendor\/three\.module\.js/);
assert.equal(pkg.dependencies.three, '0.187.0');
console.log('Three.js Docker bundle contract passed: module and core files are copied and checked.');
