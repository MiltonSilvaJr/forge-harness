#!/usr/bin/env node
// forge validate spec — minimal version (W2.0; full version arrives in W3.1).
// Zero-dependency (Node >= 20). Validates ONE active change folder:
//   1. manifest.yaml parses (supported subset) and conforms to the rules of
//      spec-manifest.schema.json, re-implemented deterministically here
//      (required fields, enums, ranges, quick_plan conditional).
//   2. artifacts required by type/scale/status exist (doc §10.3 + §12).
// Output: single line "OK <id>" (exit 0) or "FAIL (<reasons>)" (exit 1). Usage:
//   node validate-spec.mjs <path-to-change-dir>
//
// YAML subset accepted (the format emitted by spec-new.sh): 2-space indentation,
// `key: value` scalars, nested maps (one level), `key: []` inline empty lists,
// `- item` scalar list entries. No inline maps, no multiline strings, no anchors.
import { readFileSync, existsSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.log('FAIL (usage: validate-spec.mjs <change-dir>)'); process.exit(1); }
const root = resolve(dir);
const errors = [];

// ── tiny YAML subset parser ──────────────────────────────────────────────────
function parseScalar(raw) {
  const s = raw.trim();
  if (s === '' || s === 'null' || s === '~') return null;
  if (s === '[]') return [];
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?[0-9]+$/.test(s)) return parseInt(s, 10);
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
  return s;
}

function parseYamlSubset(text) {
  const lines = text.split('\n').map((l) => l.replace(/\t/g, '  '))
    .filter((l) => l.trim() && !l.trim().startsWith('#'));
  const doc = {};
  const frames = [{ indent: -1, obj: doc }];
  let lastKey = null, lastKeyOwner = null, lastKeyIndent = -1;

  for (const rawLine of lines) {
    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trim();

    if (line === '-' || line.startsWith('- ')) {
      if (lastKey === null || indent <= lastKeyIndent) throw new Error(`stray list item: "${line}"`);
      if (!Array.isArray(lastKeyOwner[lastKey])) lastKeyOwner[lastKey] = [];
      lastKeyOwner[lastKey].push(parseScalar(line === '-' ? '' : line.slice(2)));
      continue;
    }

    while (frames.length > 1 && indent <= frames[frames.length - 1].indent) frames.pop();
    const container = frames[frames.length - 1].obj;

    const m = line.match(/^([A-Za-z0-9_]+):(.*)$/);
    if (!m) throw new Error(`unparseable line: "${line}"`);
    const [, key, rest] = m;

    if (rest.trim() === '') {
      container[key] = {}; // provisional: becomes [] if "- " items follow
      frames.push({ indent, obj: container[key] });
    } else {
      container[key] = parseScalar(rest);
    }
    lastKey = key; lastKeyOwner = container; lastKeyIndent = indent;
  }
  return doc;
}

// ── load manifest ────────────────────────────────────────────────────────────
const manifestPath = join(root, 'manifest.yaml');
if (!existsSync(manifestPath)) { console.log('FAIL (manifest.yaml missing)'); process.exit(1); }
let man;
try { man = parseYamlSubset(readFileSync(manifestPath, 'utf8')); }
catch (e) { console.log(`FAIL (manifest.yaml: ${e.message})`); process.exit(1); }

// ── schema rules (mirror of spec-manifest.schema.json) ──────────────────────
const TYPES = ['feature', 'bugfix', 'refactor', 'greenfield', 'brownfield'];
const MODES = ['greenfield', 'brownfield', 'feature-only'];
const RIGORS = ['spec-anchored', 'spec-first', 'spec-as-source'];
const STATUSES = ['idea', 'proposed', 'requirements-ready', 'design-ready', 'tasks-ready',
  'implementing', 'implemented', 'verified', 'archived',
  'blocked', 'abandoned', 'rejected', 'superseded', 'reopened', 'rolled-back'];
const GATE_KEYS = ['requirements_reviewed', 'design_reviewed', 'tasks_reviewed',
  'implementation_verified', 'human_archive_approval'];
const DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;

for (const k of ['id', 'type', 'mode', 'rigor', 'scale', 'status', 'created_at', 'updated_at', 'owner', 'gates'])
  if (man[k] === undefined || man[k] === null) errors.push(`missing required field: ${k}`);

if (man.id && !/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(String(man.id))) errors.push(`id not kebab-case: ${man.id}`);
if (man.id && basename(root) !== String(man.id)) errors.push(`id "${man.id}" != folder name "${basename(root)}"`);
if (man.type && !TYPES.includes(man.type)) errors.push(`type invalid: ${man.type} (allowed: ${TYPES.join('|')})`);
if (man.mode && !MODES.includes(man.mode)) errors.push(`mode invalid: ${man.mode} (allowed: ${MODES.join('|')})`);
if (man.rigor && !RIGORS.includes(man.rigor)) errors.push(`rigor invalid: ${man.rigor} (allowed: ${RIGORS.join('|')})`);
if (man.scale !== undefined && man.scale !== null && (!Number.isInteger(man.scale) || man.scale < 0 || man.scale > 4))
  errors.push(`scale must be integer 0..4: ${man.scale}`);
if (man.status && !STATUSES.includes(man.status)) errors.push(`status invalid: ${man.status}`);
for (const k of ['created_at', 'updated_at'])
  if (man[k] && !DATE_RE.test(String(man[k]))) errors.push(`${k} not YYYY-MM-DD: ${man[k]}`);
if (man.gates && typeof man.gates === 'object' && !Array.isArray(man.gates))
  for (const g of GATE_KEYS)
    if (typeof man.gates[g] !== 'boolean') errors.push(`gates.${g} must be boolean`);

if (man.quick_plan && man.quick_plan.enabled === true) {
  const sp = man.quick_plan.skipped_phases;
  if (!Array.isArray(sp) || sp.length === 0) errors.push('quick_plan.enabled requires non-empty skipped_phases');
  const just = man.quick_plan.justification;
  if (typeof just !== 'string' || just.trim().length < 8) errors.push('quick_plan.enabled requires justification (>= 8 chars)');
}

// ── artifact rules: type/scale/status (doc §10.3 + §12) ─────────────────────
const REQ_ARTIFACT = { bugfix: 'bugfix.md', refactor: 'refactor.md' };
const reqArtifact = REQ_ARTIFACT[man.type] || 'requirements.md';
const has = (f) => existsSync(join(root, f));

const STATUS_ORDER = ['idea', 'proposed', 'requirements-ready', 'design-ready', 'tasks-ready',
  'implementing', 'implemented', 'verified', 'archived'];
const onMainPath = STATUS_ORDER.includes(man.status);
const reached = (s) => onMainPath && STATUS_ORDER.indexOf(man.status) >= STATUS_ORDER.indexOf(s);
const scale = Number.isInteger(man.scale) ? man.scale : 2;

if (onMainPath && man.status !== 'idea' && !has('proposal.md'))
  errors.push('proposal.md missing (required from status=proposed onward)');
if (reached('requirements-ready') && scale >= 1 && !has(reqArtifact))
  errors.push(`${reqArtifact} missing (required from requirements-ready onward at scale ${scale})`);
if (man.status === 'design-ready' && !has('design.md'))
  errors.push('design.md missing (status design-ready requires it)');
if (reached('tasks-ready')) {
  if (!has('tasks.md')) errors.push('tasks.md missing (required from tasks-ready onward)');
  if (scale >= 2 && man.type !== 'bugfix' && !has('design.md'))
    errors.push(`design.md missing (scale ${scale} requires the design phase from tasks-ready onward)`);
  if (scale >= 1 && !has(reqArtifact))
    errors.push(`${reqArtifact} missing (scale ${scale} requires the requirements phase from tasks-ready onward)`);
}

// ── verdict ──────────────────────────────────────────────────────────────────
if (errors.length) { console.log(`FAIL (${errors.join('; ')})`); process.exit(1); }
console.log(`OK ${man.id}`);
