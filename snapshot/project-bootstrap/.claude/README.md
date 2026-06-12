# .claude — Harness de Agentes do Projeto

Harness portável de engenharia assistida por IA, instalado pelo `/init-project`. Inclui um pipeline completo de **Spec-Driven Development** (Discovery → PRD → FRD/NFRD → DDD → Modules → TRD → requirements/design/tasks por módulo), agentes de engenharia/revisão e rules obrigatórias.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `rules/` | Diretrizes obrigatórias (conventions, architecture, domain, frontend, testing). Catálogo em [`rules/README.md`](./rules/README.md). |
| `agents/` | Subagents especializados (specifications, architecture, engineering, review, coding, code-review). Catálogo em [`agents/README.md`](./agents/README.md). |
| `commands/` | Slash commands locais (`specs/`, `coding/`, `docs/`, `testing/`). Catálogo em [`commands/README.md`](./commands/README.md). |
| `hooks/` | Hooks de validação automática (language-policy, secrets-leak, naming, dockerfile-multiarch). |
| `skills/` | Skills do projeto (`using-git-worktrees`, `verify-build`, `verify-diff-claims`). |
| `scripts/` | Utilitários (`doctor.sh` — checa diagnóstico por stack). |

## Pipeline de Especificação

```
/run-spec-pipeline   → Discovery → PRD → FRD/NFRD → DDD → Modules → TRD → specs/módulo (para no gate HITL)
/specs:specs-loop    → loop por módulo com HITL no requirements antes do design
```

Saída canônica em `docs/product/`. Discovery em `docs/discovery-notes.md`. **Nunca** usar `.kiro/specs/` ou `docs/specs/`.

## Identidade do Projeto

Os agentes resolvem placeholders (`<project_name>`, `<repo_slug>`, `<JIRA_KEY>`, …) a partir do bloco YAML no topo do `AGENTS.md` raiz. Veja o protocolo de bootstrap em [`agents/README.md`](./agents/README.md) (seção *Bootstrap de identidade*).

> `settings.local.json` (allowlist de permissões com paths reais) **não** faz parte do template — é criado por projeto e ignorado pelo git.
