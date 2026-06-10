# Plano Fase 8 — Qualidade, Pilotos e Rollout (release v0.1.0)

| | |
|---|---|
| **Versão** | 1.1 |
| **Data** | 2026-06-10 |
| **Status** | Aprovado para desenvolvimento |
| **Fases do doc** | Fase 8 (§22.9) + itens #20, #21, #22 do backlog (§24) |
| **Depende de** | MVP5 (W5.3) — mas os testes de cada MVP são entregues junto com o MVP (shift-left) |

## Objetivo

Consolidar a suíte de testes do harness, validar o Forge em dois pilotos reais (greenfield e brownfield) e cortar o release v0.1.0 com a delegação do template global `/init-project` ao Forge.

> **Decisão de sequenciamento (shift-left).** Os testes da §22.9 **não** ficam todos para o fim: cada MVP entrega seus bats junto (já refletido nos gates das waves W0–W5). Esta fase consolida, cobre integração entre MVPs e roda os pilotos com humano no loop.

---

## Waves

### W8.0 — Fixtures finais e suíte consolidada

- **Objetivo:** cobertura completa da §22.9 em uma execução única.
- **Entregáveis:**
  - Fixtures finais em `tests/fixtures/` (consolidação das mínimas criadas na W1.3 — greenfield — e no MVP2 — feature-only/brownfield):
    - `greenfield/` — diretório vazio (sem git).
    - `brownfield/` — mini-repo TypeScript (ou .NET) com código pequeno real + `docs/product/` legado + contratos, para exercitar discover/graph/baseline extract/ingestão.
    - `feature-only/` — repo já inicializado com `.forge/` e baseline mínimo.
  - `tests/run-all.sh` — roda toda a suíte bats em ordem; saída agregada com contagem.
  - Casos obrigatórios (§22.9 + #20): init sem repo git; init em repo existente sem sobrescrever; symlink e fallback copy; archive com tasks incompletas (recusa); archive aplicando deltas ao baseline; sync-adapters + drift detection; close (abandoned/rejected/superseded); shard; eval smoke (estrutural); smoke de **todos** os adapters.
- **Depende de:** W5.3
- **Gate:** `tests/run-all.sh` → 100% verde.

### W8.1 — Piloto greenfield (#21a)

- **Objetivo:** validação real do fluxo §11.1 com humano no loop.
- **Entregáveis:**
  - `/forge:init --mode greenfield` num repo pequeno **real** (ex.: um utilitário novo de Milton).
  - Executar um change completo: `spec new → clarify → requirements → design → tasks → implement → verify → archive`.
  - Issues encontradas registradas como **specs/changes no próprio workspace** do Forge (dogfooding do bugfix flow §11.4).
  - Feedback incorporado (ajustes em templates/commands antes do piloto brownfield).
- **Depende de:** W8.0
- **Gate:** change real arquivado no repo piloto; `doctor` limpo; lista de issues triada (cada uma virou change, deferral ou won't-fix justificado).

### W8.2 — Piloto brownfield (#21b)

- **Objetivo:** validação no caso mais difícil — repo legado real.
- **Entregáveis:**
  - Rodar em brownfield real (candidato: repo de um dos produtos Axis/Pitflow — escolher com HITL pelo menor risco), fluxo §11.2: `init --mode brownfield → discover → graph build → onboard → baseline extract → spec new (bugfix) → impact → tasks → implement → verify → archive`.
  - Ingestão do `docs/product/` legado sem perda (verificada por diff).
  - Avaliar tamanho/tempo do graph build e ajustar (Git LFS para `graph.json` grande, §20).
- **Depende de:** W8.1
- **Gate:** bugfix arquivado com impact analysis no pré-flight; baseline extraído sem perda de `docs/product/`; tempos/custos do graph registrados no report.

### W8.3 — Corte de release e delegação do template global (#22)

- **Objetivo:** o Forge vira o caminho oficial; fim das duas fontes de verdade.
- **Entregáveis:**
  - Tag `v0.1.0` no workspace (template congelado).
  - Atualizar `~/.claude/commands/init-project.md` para **delegar** ao `/forge:init` (instalando a partir deste repo/tag), mantendo a UX atual como fachada.
  - Remoção dos wrappers deprecados de comandos antigos (prevista desde W1.2) — só agora, após os pilotos.
  - Política documentada de sync workspace → template global (quando/como propagar atualizações; `verify-manifest.sh` como guarda).
  - Atualizar `~/.claude/CLAUDE.md`/memória com o novo fluxo, se aplicável.
- **Depende de:** W8.2
- **Gate:** **HITL explícito antes de tocar `~/.claude/`** (esta wave altera o ambiente global — delegação do `/init-project` e remoção dos wrappers; nada é alterado sem aprovação humana registrada); instalação via comando global produz resultado **idêntico** ao `template/` taggeado (diff de hashes vazio); `claude-contract.bats` final verde.

---

## Definition of Done da Fase 8 (= release v0.1.0)

1. `tests/run-all.sh` 100% verde, cobrindo todos os casos da §22.9.
2. Piloto greenfield e piloto brownfield concluídos, cada um com um change arquivado de verdade.
3. `/init-project` global delegando ao Forge; wrappers removidos.
4. Tag `v0.1.0` cortada; diff de hashes init-global vs template taggeado = vazio.
5. Change `create-forge-project-harness` do dogfooding **arquivado** (`/forge:archive`) com ledger de deferrals 100% `tested` — o projeto termina pelo seu próprio mecanismo.

## Critérios de aceitação finais do projeto

- Regra de ouro preservada: rigor mínimo necessário; Quick Plan (scale 0–1) funcional; eval opt-in.
- Compatibilidade Claude provada do início (snapshot) ao fim (contrato verde no release).
- Nenhuma pendência `open` no ledger; nenhum risco Alto do master plan sem mitigação acionada.

## Controle de versão do documento

- Milton Silva - 2026-06-10 - Versão 1.0: plano inicial da Fase 8.
- Milton Silva - 2026-06-10 - Versão 1.1: review crítico — gate HITL explícito na W8.3 (alteração do ambiente global `~/.claude/`); fixtures da W8.0 marcadas como consolidação das mínimas criadas em W1.3/MVP2. Aprovado para desenvolvimento.
