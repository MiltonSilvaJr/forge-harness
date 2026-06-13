#!/usr/bin/env bash
# Gate — mermaid→drawio: converte Mermaid flowchart em .drawio (mxGraph) editável.
#   [1] converte nós/shapes/subgraphs/edges; XML bem-formado
#   [2] containers (subgraph) viram container=1 com nós aninhados (parent c_*)
#   [3] edges referenciam source/target existentes; `&` e cadeias expandem
#   [4] infra-scan emite infra.drawio além de .py/.md
set -euo pipefail

WS="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIB="$WS/template/.forge/scripts/lib/mermaid-to-drawio.mjs"
[ -f "$LIB" ]
T="$(mktemp -d /tmp/forge-m2d.XXXXXX)"
trap 'rm -rf "$T"' EXIT

cat > "$T/diag.md" <<'EOF'
# teste
```mermaid
flowchart LR
  u(["User"])
  subgraph EDGE["Edge"]
    kong["Kong"]
  end
  subgraph DATA["Dados"]
    pg[("PostgreSQL")]
    redis[("Redis")]
  end
  u -->|HTTPS| kong
  kong --> a & b
  a & b -.-> pg
  a --> redis
  classDef d fill:#e0f7fa,stroke:#00838f;
  class pg,redis d;
```
EOF

echo "[1] converte + XML bem-formado"
node "$LIB" "$T/diag.md" --out "$T/diag.drawio" >/dev/null
[ -f "$T/diag.drawio" ]
python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('$T/diag.drawio')"
echo "OK [1]"

echo "[2] containers + nós aninhados"
grep -q 'container=1' "$T/diag.drawio"
grep -q 'value="Edge"' "$T/diag.drawio"
grep -q 'parent="c_EDGE"' "$T/diag.drawio"
grep -q 'parent="c_DATA"' "$T/diag.drawio"
grep -q 'shape=cylinder' "$T/diag.drawio"           # pg/redis viram cilindro
echo "OK [2]"

echo "[3] edges com source/target válidos + expansão & / nós soltos"
python3 - "$T/diag.drawio" <<'PY'
import sys, xml.dom.minidom as m
d = m.parse(sys.argv[1]); cells = d.getElementsByTagName('mxCell')
ids = {c.getAttribute('id') for c in cells}
edges = [c for c in cells if c.getAttribute('edge')=='1']
assert edges, "sem arestas"
for e in edges:
    assert e.getAttribute('source') in ids and e.getAttribute('target') in ids, "aresta órfã"
# kong --> a & b  => 2 arestas; a & b -.-> pg => 2; a --> redis => 1; u-->kong =>1 : total 6
assert len(edges) == 6, f"esperado 6 arestas, veio {len(edges)}"
# nós soltos a,b criados
assert 'n_a' in ids and 'n_b' in ids, "nós soltos não criados"
print("  edges=", len(edges), "ok")
PY
echo "OK [3]"

echo "[4] infra-scan emite infra.drawio"
mkdir -p "$T/repo/docker"
cat > "$T/repo/docker/docker-compose.yml" <<'EOF'
services:
  kong: { image: kong:3.6 }
  postgresql: { image: postgres:16 }
  api: { image: acme/api:dev }
EOF
node "$WS/template/.forge/scripts/lib/infra-scan.mjs" "$T/repo" --out "$T/repo/out" >/dev/null
[ -f "$T/repo/out/infra.drawio" ]
python3 -c "import xml.dom.minidom; xml.dom.minidom.parse('$T/repo/out/infra.drawio')"
echo "OK [4]"

echo "OK"
