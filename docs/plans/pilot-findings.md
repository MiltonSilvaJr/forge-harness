# Achados dos pilotos (Fase 8)

Registro vivo dos achados dos pilotos greenfield (W8.1) e brownfield (W8.2). Cada achado é
triado como **change candidato**, **deferral** ou **won't-fix justificado** (gate W8.1/W8.2).

## Piloto greenfield W8.1 — cpf-cnpj-validator (2026-06-12)

Ciclo completo verde (init→…→archive); baseline ganhou `document-validation v0.1.0`; doctor limpo;
12 testes (8 tabela + 4 PBT). Relatório completo em `cpf-cnpj-validator/PILOT-REPORT.md`.

| ID | Severidade | Achado | Triagem |
|----|-----------|--------|---------|
| F1 | MEDIUM | `archive-spec` aceita `verification.yaml` com todos os checks `skipped` (runtime vazio) — não exige ≥1 check **executado**. Risco de arquivar sem verificação real em greenfield com `runtime` não preenchido. | **Change candidato** (pós-v0.1.0): exigir ≥1 check `passed` no pré-flight de `validate-archive`, OU `doctor`/`verify` alertar quando há stack detectada e `runtime.test` vazio. Anti-auto-mentira §17.6. |
| F2 | LOW | `install` greenfield deixa `FORGE.md > runtime` vazio; nada lembra de preencher após o 1º código. | **Backlog** (segue F1): `doctor` sugerir preencher `runtime` quando detecta stack e bloco vazio. |
| F3 | — | Scaffolding de teste TS (`@types/node`, `node --test <glob>`) — escolha do autor do change, não do harness. | **Won't-fix** (fora de escopo). |
| F4 | — | Editar `FORGE.md` exige `sync-adapters`. | **By design** (§15). |

## Piloto brownfield W8.2 — azim-crm (2026-06-12)

azim-crm revelou-se um **repositório de especificação de produto SEM código** (só `docs/product/`
com 144 arquivos: prd/frd-nfrd/ddd/trd/adr/glossary/**modules**/backlog/data-model). Logo, valida o
**caminho de ingestão brownfield**, não o de código (graph/impact/bugfix são N/A sem código).

**Feito (autônomo, branch `feature/forge-update-w8.2`):**
1. Atualização limpa do `.forge` de ~MVP4-quebrado → template atual (MVP5/W8.0); doctor limpo;
   3 adapters (claude/codex/qwen). Hand-edits do projeto já eram upstream. Snapshot recuperável.
2. `ingest-legacy.sh`: 57 arquivos → baseline (`product/current/`), **fidelidade byte-a-byte** e
   **`docs/product` original byte-idêntico** (perda zero — gate "baseline sem perda" ✓).

**N/A para este repo:** `discover/graph/baseline-extract/impact/bugfix` exigem código.

### Análise do estado (read-only, 2026-06-12) — NÃO mutado

Working tree do azim-crm está com uma migração de `.forge` **incompleta e não-commitada**:

- **Nível ~MVP4:** tem graph/discover/baseline/archive/schemas, mas **falta TODO o MVP5**
  (shard, waves, deferrals, eval, meta) e carrega o bug do `commands/coding/dev.md` duplicado.
- **doctor FALHA** (exit 1): "10 arquivos da fonte canônica com refs `.claude/`" — a migração
  parcial deixou a fonte canônica inconsistente (o guard pega, mas o estado está quebrado).
- **Baseline e specs UNTRACKED:** `.forge/product/` e `.forge/specs/` não-commitados;
  `capabilities/` vazio (onboarding incompleto).
- **Hand-edits de estado a preservar** (pequenos): `constitution.md` (+6), `context.md` (1),
  `forge.yaml` (+2), `rules/conventions/database-naming.md` (+5/-11), `FORGE.md` description.
  As "modificações" em `doctor.sh`/`sync-adapters.mjs`/`validate-frontmatter.sh` são diffs de
  versão de template (seriam superados por uma atualização limpa).

**Recomendação:** resetar a migração parcial (quebrada, 2 MVPs atrás) e refazer **atualização
limpa** para o template atual (MVP5/W8.0), re-aplicando os ~5 hand-edits de estado e re-extraindo
o baseline (que está vazio). Mais barato e seguro que completar um estado parcial que falha no doctor.

| ID | Severidade | Achado | Triagem |
|----|-----------|--------|---------|
| W2-A | HIGH | Não há `forge update` que preserve estado — só `install --force` (backup+overwrite total). Atualizar um projeto onboarded exige migração manual. | **Change candidato** (relevante para W8.3 rollout): script `forge update` que troca a maquinaria preservando FORGE.md/forge.yaml/product/specs/custom + re-sync. |
| W2-B | MEDIUM | Migração manual parcial deixou fonte canônica com refs `.claude/` → doctor pega, mas não há fluxo guiado de migração. | Coberto por W2-A (o `forge update` evita o estado parcial). |

| ID | Severidade | Achado | Triagem |
|----|-----------|--------|---------|
| W2-C | MEDIUM | `ingest-legacy` cobre só 6 categorias canônicas (prd/frd-nfrd/ddd/trd/adr/glossary). Conteúdo rico fora delas — `modules/`(66), `backlog/`(18), `data-model/`, spec top-level — **não é ingerido nem reportado** (silencioso). Viola "no silent caps" (§17.6). | **Change candidato:** `ingest-legacy` deve **avisar** quais dirs de `docs/product/` ficaram fora do baseline (e talvez um bucket `modules/` ou mapa para capabilities). |
| W2-D | LOW | `modules/` (requirements por módulo) vira baseline só via extração semântica de capabilities (change a change), inexistente para projetos sem código que entram via specs. | **Backlog:** caminho de extração de capabilities a partir de `docs/product/modules/` no onboard, não só via `/forge:archive`. |

## Piloto graph (brownfield com código) — collatra (2026-06-12)

Monorepo real polyglot: 8 microsserviços .NET + frontend backoffice. Forge instalado em branch
`feature/forge-graph-eval` (AGENTS.md/.claude antigos backupeados; install não-commitado — Milton revisa).

**Graph build:** 2137 nós, 26474 arestas, **7.5 MB**, **7s**, determinista, **zero tokens**.
- Polyglot OK: csharp 1414, ts 560, js 132, python 31 (4 linguagens).
- **99.8% das arestas resolvidas** — ótima integridade referencial.
- `validate` OK (1 warning: 294 órfãos). `query billing` → 302 nós com camada+loc (lookup barato útil).

**Veredito:** o engine **funciona e entrega valor** (rápido, determinista, zero-token, polyglot,
queries úteis para "consultar o grafo antes de ler arquivos"). 4 gaps de qualidade num monorepo .NET real:

| ID | Sev | Achado | Triagem |
|----|-----|--------|---------|
| G1 | MEDIUM | `.forge/graph/graph.json` **não era gitignored** → 7.5 MB de artefato de build seria commitado. | ✅ **CORRIGIDO**: `gitignore.patch` ignora `graph.json`/`report.md`/`fingerprints.json` (regeneráveis em ~1-7s); `summaries.json` (custa tokens) segue commitável. |
| G2 | MEDIUM | Engine ingeria dirs de **build/output** (`storybook-static/` com bundle de 76.750 LOC, `docs/_archive/`). Inflava nós/órfãos. | ✅ **CORRIGIDO**: `SKIP_DIRS` += storybook-static/wwwroot/_archive/TestResults/.vs/.idea/.venv/__pycache__/.turbo/.cache; `SKIP_FILE` exclui `*.min.js`/`*.bundle.js`. **120 nós de poluição removidos** (2137→2017); 0 restantes. |
| G3 | MEDIUM | Camada: **55% `unknown`** (1167/2137); 758 nós C# sem camada — heurística lia só pastas, não o sufixo de projeto .NET. | ✅ **CORRIGIDO**: `layerOf` lê o sufixo `.NET` (`Collatra.X.Domain/` → domain) + mais pastas. **unknown 55%→15%, C# unknown 758→0**. Camadas: api 162/app 423/domain 274/infra 255/contracts 45/test 556. |
| ~~G4~~ | — | ~~Arestas C# não capturam dependência real~~ | ❌ **RETRATADO (falso-positivo)**: billing **não** referencia shared (sem `ProjectReference`/`using`), logo o `NO PATH` estava correto. As arestas C# `using`→namespace funcionam (usings explícitos cobrem o grafo; o `path` BFS as percorre). Limitação menor remanescente: `ImplicitUsings`/global usings não viram aresta. |

> **Validação (2026-06-12):** correções implementadas no engine (`template/.forge/scripts/lib/graph-build.mjs` + `installer/gitignore.patch`), gates do grafo (w41/w42/w43) verdes, e re-testadas no collatra: unknown 55%→15%, C# unknown 758→0, 120 nós de build removidos, graph.json ignorado. Ainda **não commitado** (aguarda OK do Milton).

## Gap spec-vs-implementação — changelog no post-merge (§20.4)

**Reportado por Milton (2026-06-12):** a intenção de atualizar o changelog automaticamente "não
está funcionando". **Validado:** o plano MVP1 (§20.4) especifica que o hook `post-merge` faz
"progresso, **changelog**, remoção de worktree". O hook entregue só fazia o worktree prune — a etapa
de changelog **nunca foi implementada**. Único changelog automático que funcionava: baseline
`product/current/CHANGELOG.md` no `/forge:archive`.

✅ **CORRIGIDO:** `scripts/lib/changelog-from-merge.mjs` + wiring no hook `post-merge`. Após um merge,
acumula os commits convencionais do branch mergeado no **CHANGELOG.md raiz** (Keep a Changelog,
seção `[Unreleased]`): `feat→Added`, `fix→Fixed`, `perf/refactor/revert→Changed`; `chore/test/ci/
build/docs/style` ignorados. Determinista, **idempotente** (pula short-hash já registrado), **no-op**
sem CHANGELOG.md raiz ou quando HEAD não é merge. Gate: `tests/changelog-merge-gate.sh`.
