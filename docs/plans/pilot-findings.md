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

## Piloto brownfield W8.2 — azim-crm (.NET)

(em andamento)
