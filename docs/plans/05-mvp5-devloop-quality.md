# Plano MVP5 — Dev Loop & Quality

| | |
|---|---|
| **Versão** | 1.1 |
| **Data** | 2026-06-10 |
| **Status** | Aprovado para desenvolvimento |
| **Fases do doc** | Fase 7 (§22.8) + §17 (Camada 5) + itens v3 sem dono no backlog (resolução I4) |
| **MVP** | MVP5 (§23.5) |
| **Depende de** | MVP3 (W3.2); W5.2 depende também de W1.4 (adapters) e W3.1 (validadores); W5.3 depende de W2.1 (loops a medir) |
| **Backlog (§24)** | #16, #18, #19 + `/forge:wave`, `/forge:progress`, `/forge:defer`, `/forge:resolve-deferrals`, `/forge:dev` completo (I4) |

## Objetivo

Entregar a Camada 5: execução de longa duração (story sharding, waves, ledger de pendências, economia de contexto) e qualidade quantitativa (eval harness A/B opt-in, otimização de triggering, meta-avaliação do harness — o diferencial estratégico, §18).

## Escopo

**Inclui:** `/forge:shard` + template de story, orquestração por waves (waves/progress/deferrals.json + comandos), skills especialistas, gate-runner completo, `/forge:dev` completo, eval harness (`runners.yaml` real, agentes quality, grading schema, `/forge:skill create|eval|optimize`), meta-avaliação.

**Não inclui:** pilotos e consolidação de testes (Fase 8). Tudo da camada Quality é **opt-in** (`quality.enabled: false` por default — §17.9).

---

## Waves

### W5.0 — Story sharding (§17.1)

- **Objetivo:** implementações longas fatiadas em stories auto-contidas.
- **Entregáveis:**
  - `templates/story/STORY.md` — frontmatter (story_id, epic, depends_on, status) + Goal, **Embedded context** (trechos de requirements/design/contracts com refs), Acceptance criteria como checklist, Out of scope.
  - `/forge:shard` — lê `tasks.md` (+ design/requirements) e gera `stories/` no change ativo; marca `dev_loop.sharded: true`.
  - Sub-agente de **compilação de contexto de épico** (uma vez, no início; `epic_context_compiled: true` no manifest).
  - Integração com `/forge:implement`: execução story por story com checkpoint `/forge:verify` ao final de cada uma.
- **Depende de:** W3.2
- **Gate:** shard de um `tasks.md` da fixture gera stories com frontmatter válido (validate-frontmatter) e grafo de `depends_on` **acíclico** (script de verificação).

### W5.1 — Orquestração de waves e sessões longas (§17.2–17.7, §10.11)

- **Objetivo:** sessões de horas sem degradar (lições do Qwen v6.5, anti Classe G).
- **Entregáveis:**
  - Artefatos machine-readable no change ativo: `waves.json` (waves com `depends_on`, status, stories), `progress.json` (ponteiro + agregados), `deferrals.json` (ledger) — **atualizados por scripts deterministas, nunca pelo modelo relendo tudo** (§10.11).
  - `/forge:wave plan|open|close|status` — `plan` deriva waves de tasks/stories (Wave 0 sempre fundação: tipos compartilhados, contratos, dependências de uma vez); `open` recusa wave com dependência não-`done`; `close` exige stories done + gates verdes; última wave = Sprint Review Final (revisão categorizada, zero findings HIGH).
  - `/forge:progress` — mini-report curto (§17.3): % projeto, por módulo/área, infra, wave atual, pendências, próximo passo lógico; lê **apenas** progress.json + deferrals.json.
  - `/forge:defer` e `/forge:resolve-deferrals` (§17.4): pendência com raised_in/blocks/reason/depends_on/status; projeto **não** chega a DONE com deferral `open`; cada resolução é testada (`resolved` → `tested`); encerramento só com ledger 100% `tested`.
  - **Skills especialistas** (§17.7, entrada/saída estreitas, determinismo, progressive disclosure): `story-context` (contexto de uma story no range exato, proibido ler fora), `progress-report`, `wave-advance`, `gate-runner` **completo** (§17.5: parseabilidade, import-resolve, unused, grep+/− cross-file, consistency cross-file, smoke executado pelo workflow com timeout — anti auto-mentira), `impact-scan` (promovido do script da W4.2) — com `c4-render` (entregue na W4.3), fecha o catálogo inicial sugerido da §17.7.
  - Disciplina de autopilot (§17.6) codificada nas rules/commands: output mínimo entre features, sem resumo por wave, dumps em `/tmp` + `tail -20`, todo comando externo com `timeout`, orçamento de contexto.
  - `/forge:dev up|sync|smoke` completo (§20.3): compose canônico, reconciliação de migrations/seeds, smoke local pré-PR.
  - **Dogfooding:** migrar o tracking do change `create-forge-project-harness` para waves.json/progress.json/deferrals.json e tocar o restante do projeto por eles.
- **Depende de:** W5.0
- **Gates:** wave não abre com dependência não-`done`; status DONE recusado com deferral `open`; `/forge:progress` responde sem reler artefatos (verificável por instrumentação do script); gate-runner retorna exatamente uma linha.

### W5.2 — Eval harness opt-in (§17.8)

- **Objetivo:** avaliação quantitativa A/B de skills/commands/templates.
- **Entregáveis:**
  - `runners.yaml` real (§10.9): claude-code, codex, forge-cli; captura de tokens/duração/output; degradação graciosa para serial onde não há paralelismo.
  - Agentes `quality/{executor,grader,comparator,analyzer}.md` (§17.8.1) com outputs JSON schematizados.
  - `schemas/grading.schema.json` (§10.8): expectations com `text`/`passed`/`evidence` obrigatórios; restrições do spec Agent Skills (name ≤64, description ≤1024 sem XML).
  - `/forge:skill create` — entrevista de intenção + frontmatter validado.
  - `/forge:skill eval` — A/B with-skill vs baseline por caso de teste; grading; agregação `mean ± stddev` + deltas de pass-rate/tempo/tokens; estrutura `.forge/evals/skills/<skill>/{evals.json,workspace/iteration-N/eval-K/...}` (§17.8.4).
  - `/forge:skill optimize` — holdout train/test 60/40; seleção da melhor description **pela pontuação de teste** (anti-overfitting); respeita 1024 chars.
  - Eval-viewer HTML opcional + `feedback.json`.
  - `quality.enabled` e `evals_enabled` permanecem `false` por default (opt-in, §17.9).
- **Depende de:** W5.1 (nominal), W1.4 (runners precisam dos adapters), W3.1 (validadores)
- **Gate:** `grading.json` de um eval real valida contra o schema; `optimize` reporta train/test scores separados e seleciona pelo test; runner sem paralelismo executa serial sem erro.

### W5.3 — Meta-avaliação do harness (§18)

- **Objetivo:** evoluir o harness por evidência, não opinião (diferencial competitivo).
- **Entregáveis:**
  - `.forge/evals/meta/` como diretório de primeira classe.
  - `/forge:eval harness` — mede a qualidade de templates/commands do próprio Forge.
  - **Primeiro caso real:** rodar `/forge:requirements` com vs sem o template de requirements, contando `[MISS]`/`[CONFLICT]` emitidos pelo validador (caso de uso concreto da §18: provar com números que um template ajuda antes de propagá-lo ao time).
- **Depende de:** W5.2, W2.1
- **Gate:** relatório meta com delta quantitativo (pass-rate/MISS/CONFLICT, mean±stddev) produzido de ponta a ponta.

---

## Definition of Done do MVP5

1. `shard` gera stories válidas com dependências acíclicas; `implement` opera story a story.
2. waves/progress/deferrals operados exclusivamente por scripts deterministas; autopilot respeita gates e HITL.
3. Projeto não conclui com deferral aberto; resoluções testadas.
4. Eval A/B produz `grading.json` schemado + agregação mean±stddev + deltas.
5. `optimize` com holdout selecionando por test score.
6. Um caso de meta-avaliação completo e documentado.
7. Toda a camada Quality permanece opt-in.

## Verificação end-to-end

- **Sessão longa simulada** na fixture: `shard → wave plan → executar 2 waves com 1 deferral registrado → resolve-deferrals → DONE`, com `/forge:progress` consultado no meio (resposta curta, sem reler artefatos).
- **Eval real** de uma skill existente do template (candidata: `verify-build`) com relatório A/B completo.
- Meta-avaliação do template de requirements com delta numérico.

## Pendências/observações

- Custo de tokens do eval é real: rodar os casos de verificação com poucos test cases (2–3) — o objetivo é validar o mecanismo, não otimizar skills nesta fase.
- Se `runners.yaml` não conseguir manter ≥3 runners viáveis, reduzir escopo a claude-code (mitigação prevista na §25).

## Controle de versão do documento

- Milton Silva - 2026-06-10 - Versão 1.0: plano inicial do MVP5.
- Milton Silva - 2026-06-10 - Versão 1.1: review crítico — sem erros materiais; nota fechando o catálogo de skills especialistas da §17.7 (c4-render vem da W4.3). Aprovado para desenvolvimento.
