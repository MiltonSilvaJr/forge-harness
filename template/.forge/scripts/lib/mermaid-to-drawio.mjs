#!/usr/bin/env node
// forge mermaid→drawio — converte um diagrama Mermaid (flowchart) em .drawio (mxGraph XML)
// EDITÁVEL visualmente no draw.io/diagrams.net. Fecha o handoff: o Mermaid é a fonte de
// verdade (texto, versionável) e o .drawio é a edição visual com shapes manipuláveis.
//
// Suporta o subconjunto usado pelos diagramas do Forge:
//   nós:   id["..."]  id(["..."])  id[("...")]  id{{"..."}}  id{"..."}  (e id solto)
//   grupos: subgraph ID["título"] ... end  (aninhados)
//   edges:  -->  -->|lbl|  -.->  -. lbl .->  ==>  ==>|lbl|  com `&` em ambos os lados e cadeias
//   estilo: classDef nome fill:#..,stroke:#..  ·  class a,b nome  ·  linkStyle i,j stroke:#..
// Zero-dep. Uso: mermaid-to-drawio.mjs <arquivo.md|.mmd> [--out <arquivo.drawio>]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const inFile = process.argv[2];
if (!inFile || !existsSync(inFile)) { console.error('Uso: mermaid-to-drawio.mjs <arquivo.md|.mmd> [--out <drawio>]'); process.exit(1); }
const outArg = process.argv.indexOf('--out');
const outFile = outArg >= 0 ? process.argv[outArg + 1] : inFile.replace(/\.(md|mmd)$/, '.drawio');

// 1. extrair o bloco mermaid (ou usar o arquivo inteiro se .mmd)
let raw = readFileSync(inFile, 'utf8');
const fence = raw.match(/```mermaid\n([\s\S]*?)```/);
const src = fence ? fence[1] : raw;

// 2. parse ------------------------------------------------------------------
const lines = src.split('\n').map((l) => l.replace(/%%.*$/, '').trimEnd()).filter((l) => l.trim());
let direction = 'LR';
const nodes = new Map();        // id -> {id, label, shape, container}
const order = [];               // ordem de declaração de nós/containers no nível
const containers = new Map();   // id -> {id, title, parent, children:[], fill, stroke}
const edges = [];               // {from, to, kind, label}
const classDef = new Map();     // name -> {fill, stroke, dash}
const nodeClass = new Map();    // nodeId -> className
const linkStyles = [];          // {idx, color, width}
const stack = [];               // pilha de containers abertos

const NODE_RE = /^([A-Za-z0-9_]+)\s*(\[\(("?)([\s\S]*?)\3\)\]|\(\[("?)([\s\S]*?)\5\]\)|\{\{("?)([\s\S]*?)\7\}\}|\[("?)([\s\S]*?)\9\]|\{("?)([\s\S]*?)\11\})?\s*$/;
function shapeOf(decl) {
  if (!decl) return ['rect', null];
  if (decl.startsWith('[(')) return ['cylinder', decl.slice(2, -2).replace(/^"|"$/g, '')];
  if (decl.startsWith('([')) return ['stadium', decl.slice(2, -2).replace(/^"|"$/g, '')];
  if (decl.startsWith('{{')) return ['hexagon', decl.slice(2, -2).replace(/^"|"$/g, '')];
  if (decl.startsWith('{')) return ['rhombus', decl.slice(1, -1).replace(/^"|"$/g, '')];
  if (decl.startsWith('[')) return ['rect', decl.slice(1, -1).replace(/^"|"$/g, '')];
  return ['rect', null];
}
function ensureNode(id, decl, container) {
  if (!nodes.has(id)) { nodes.set(id, { id, label: id, shape: 'rect', container: container ?? null }); order.push({ kind: 'node', id }); }
  const n = nodes.get(id);
  if (decl) { const [shape, label] = shapeOf(decl); n.shape = shape; if (label != null) n.label = label; }
  if (container !== undefined && n.container == null && container != null) n.container = container;
  return n;
}

// operadores de edge (ordem: mais específico primeiro)
const OP = /(==>\|[^|]*\||==>|-->\|[^|]*\||-->|-\.\s*[^.|]*?\s*\.->|-\.->|--[xo]|---)/;
function opInfo(op) {
  let kind = 'arrow', label = '';
  if (op.startsWith('==>')) kind = 'thick';
  else if (op.startsWith('-.')) kind = 'dotted';
  const lbar = op.match(/\|([^|]*)\|/); if (lbar) label = lbar[1].trim();
  const ldot = op.match(/-\.\s*([^.|]+?)\s*\.->/); if (ldot) label = ldot[1].trim();
  return { kind, label };
}
const splitAmp = (s) => s.split('&').map((x) => x.trim()).filter(Boolean);
// extrai id de um operando que pode trazer decl de shape (ex.: fw{{"..."}})
function operandIds(token, container) {
  return splitAmp(token).map((t) => {
    const m = t.match(NODE_RE);
    if (m) { ensureNode(m[1], m[2], container); return m[1]; }
    const id = t.replace(/[^A-Za-z0-9_].*$/, '');
    if (id) ensureNode(id, null, container);
    return id;
  }).filter(Boolean);
}

for (const ln of lines) {
  const t = ln.trim();
  let m;
  if ((m = t.match(/^flowchart\s+(TB|TD|LR|RL|BT)/i))) { direction = m[1].toUpperCase().replace('TD', 'TB'); continue; }
  if (/^graph\s+/i.test(t)) { const d = t.match(/^graph\s+(TB|TD|LR|RL|BT)/i); if (d) direction = d[1].toUpperCase().replace('TD', 'TB'); continue; }
  if ((m = t.match(/^subgraph\s+([A-Za-z0-9_]+)\s*\[("?)([\s\S]*?)\2\]\s*$/)) || (m = t.match(/^subgraph\s+([A-Za-z0-9_]+)\s*$/))) {
    const id = m[1], title = m[3] || m[1];
    const parent = stack.length ? stack[stack.length - 1] : null;
    containers.set(id, { id, title, parent, children: [], fill: '#f5f5f5', stroke: '#9e9e9e' });
    if (parent) containers.get(parent).children.push({ kind: 'container', id });
    else order.push({ kind: 'container', id });
    stack.push(id);
    continue;
  }
  if (/^end$/.test(t)) { stack.pop(); continue; }
  if ((m = t.match(/^classDef\s+(\w+)\s+(.+);?$/))) {
    const style = m[2]; const fill = (style.match(/fill:\s*(#[0-9a-fA-F]+)/) || [])[1];
    const stroke = (style.match(/stroke:\s*(#[0-9a-fA-F]+)/) || [])[1];
    const dash = /stroke-dasharray/.test(style);
    classDef.set(m[1], { fill, stroke, dash }); continue;
  }
  if ((m = t.match(/^class\s+([A-Za-z0-9_,\s]+)\s+(\w+)\s*;?$/))) {
    for (const id of m[1].split(',').map((x) => x.trim()).filter(Boolean)) nodeClass.set(id, m[2]); continue;
  }
  if ((m = t.match(/^linkStyle\s+([\d,\s]+)\s+(.+);?$/))) {
    const idxs = m[1].split(',').map((x) => parseInt(x.trim(), 10)).filter((x) => !isNaN(x));
    const color = (m[2].match(/stroke:\s*(#[0-9a-fA-F]+)/) || [])[1];
    const width = (m[2].match(/stroke-width:\s*(\d+)/) || [])[1];
    for (const i of idxs) linkStyles[i] = { color, width }; continue;
  }
  // linha de edge? (contém um operador)
  if (OP.test(t)) {
    const cont = stack.length ? stack[stack.length - 1] : null;
    const parts = t.split(OP);                       // [op0, sep, op1, sep, op2, ...]
    const operands = []; const ops = [];
    for (let i = 0; i < parts.length; i++) { if (i % 2 === 0) operands.push(parts[i].trim()); else ops.push(parts[i]); }
    for (let i = 0; i < ops.length; i++) {
      const froms = operandIds(operands[i], cont);
      const tos = operandIds(operands[i + 1], cont);
      const { kind, label } = opInfo(ops[i]);
      for (const f of froms) for (const to of tos) edges.push({ from: f, to, kind, label });
    }
    continue;
  }
  // senão, declaração de nó dentro (ou fora) de um subgraph
  if ((m = t.match(NODE_RE)) && m[1]) {
    ensureNode(m[1], m[2], stack.length ? stack[stack.length - 1] : null);
    continue;
  }
}

// aplica classes -> fill/stroke por nó
for (const n of nodes.values()) {
  const c = nodeClass.get(n.id); if (c && classDef.has(c)) { const s = classDef.get(c); n.fill = s.fill; n.stroke = s.stroke; n.dash = s.dash; }
}

// 3. layout (recursivo, geometria relativa em containers) -------------------
const NW = 200, NH = 56, GAP = 16, HEADER = 34, PAD = 18;
function sizeOfNode() { return { w: NW, h: NH }; }
function layoutContainer(cid) {
  const c = containers.get(cid);
  // filhos diretos: nós cujo container === cid (na ordem de `order`/declaração) + containers filhos
  const childNodes = [...nodes.values()].filter((n) => n.container === cid);
  const childConts = c.children.filter((ch) => ch.kind === 'container').map((ch) => ch.id);
  let y = HEADER, maxw = NW;
  const placed = [];
  for (const n of childNodes) { const s = sizeOfNode(); placed.push({ type: 'node', id: n.id, x: PAD, y, w: s.w, h: s.h }); y += s.h + GAP; maxw = Math.max(maxw, s.w); }
  for (const cc of childConts) { const s = layoutContainer(cc); placed.push({ type: 'container', id: cc, x: PAD, y, w: s.w, h: s.h }); y += s.h + GAP; maxw = Math.max(maxw, s.w); }
  c._placed = placed; c._w = maxw + 2 * PAD; c._h = y + PAD - GAP;
  return { w: c._w, h: c._h };
}
// nível topo: containers + nós sem container, em linha (LR) ou coluna (TB)
const topItems = order.filter((o) => (o.kind === 'container') || (o.kind === 'node' && nodes.get(o.id) && nodes.get(o.id).container == null));
for (const it of topItems) if (it.kind === 'container') layoutContainer(it.id);
const horiz = direction === 'LR' || direction === 'RL';
let cx = 40, cy = 40; const topPos = new Map();
for (const it of topItems) {
  const w = it.kind === 'container' ? containers.get(it.id)._w : NW;
  const h = it.kind === 'container' ? containers.get(it.id)._h : NH;
  topPos.set(it.id, { x: cx, y: cy, w, h });
  if (horiz) { cx += w + 60; } else { cy += h + 50; }
}

// 4. emit mxGraph XML -------------------------------------------------------
const esc = (s) => { let r = String(s).split(/<br\s*\/?>/i).join('@@BR@@'); r = r.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\x22/g, '&quot;'); return r.split('@@BR@@').join('&lt;br&gt;'); };
const nodeStyle = (n) => {
  const fill = n.fill || '#ffffff', stroke = n.stroke || '#333333';
  const base = `whiteSpace=wrap;html=1;fillColor=${fill};strokeColor=${stroke};`;
  if (n.shape === 'cylinder') return `shape=cylinder3;backgroundOutline=1;${base}verticalAlign=middle;`;
  if (n.shape === 'stadium') return `rounded=1;arcSize=50;${base}`;
  if (n.shape === 'hexagon') return `shape=hexagon;perimeter=hexagonPerimeter2;${base}`;
  if (n.shape === 'rhombus') return `rhombus;${base}`;
  return `rounded=1;arcSize=8;${base}`;
};
const cells = ['<mxCell id="0"/>', '<mxCell id="1" parent="0"/>'];
function emitContainer(cid, parent) {
  const c = containers.get(cid); const pos = parent ? null : topPos.get(cid);
  const geo = parent ? c._relGeo : { x: pos.x, y: pos.y, w: c._w, h: c._h };
  const style = `rounded=1;arcSize=4;whiteSpace=wrap;html=1;fillColor=#fbfbfb;strokeColor=${c.stroke};verticalAlign=top;fontStyle=1;container=1;collapsible=0;`;
  cells.push(`<mxCell id="c_${c.id}" value="${esc(c.title)}" style="${style}" vertex="1" parent="${parent ? `c_${parent}` : '1'}"><mxGeometry x="${geo.x}" y="${geo.y}" width="${geo.w}" height="${geo.h}" as="geometry"/></mxCell>`);
  for (const ch of c._placed) {
    if (ch.type === 'node') {
      const n = nodes.get(ch.id);
      cells.push(`<mxCell id="n_${n.id}" value="${esc(n.label)}" style="${nodeStyle(n)}" vertex="1" parent="c_${c.id}"><mxGeometry x="${ch.x}" y="${ch.y}" width="${ch.w}" height="${ch.h}" as="geometry"/></mxCell>`);
    } else {
      containers.get(ch.id)._relGeo = { x: ch.x, y: ch.y, w: ch.w, h: ch.h };
      emitContainer(ch.id, c.id);
    }
  }
}
for (const it of topItems) {
  if (it.kind === 'container') emitContainer(it.id, null);
  else { const n = nodes.get(it.id); const p = topPos.get(it.id); cells.push(`<mxCell id="n_${n.id}" value="${esc(n.label)}" style="${nodeStyle(n)}" vertex="1" parent="1"><mxGeometry x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" as="geometry"/></mxCell>`); }
}
edges.forEach((e, i) => {
  if (!nodes.has(e.from) || !nodes.has(e.to)) return;
  const ls = linkStyles[i] || {};
  let st = 'edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;';
  if (e.kind === 'dotted') st += 'dashed=1;';
  if (e.kind === 'thick') st += 'strokeWidth=3;';
  if (ls.color) st += `strokeColor=${ls.color};`;
  if (ls.width) st += `strokeWidth=${ls.width};`;
  cells.push(`<mxCell id="e${i}" value="${esc(e.label || '')}" style="${st}" edge="1" parent="1" source="n_${e.from}" target="n_${e.to}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
});

const xml = `<mxfile host="forge" type="device"><diagram id="forge-diagram" name="Diagram"><mxGraphModel dx="1200" dy="800" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" math="0" shadow="0"><root>
${cells.join('\n')}
</root></mxGraphModel></diagram></mxfile>\n`;
writeFileSync(resolve(outFile), xml);
console.log(`OK ${outFile} (${nodes.size} nós, ${containers.size} grupos, ${edges.length} arestas)`);
