---
# Metadata canônica do projeto — fonte única de verdade para agentes.
# Agentes em .claude/agents/ leem este bloco para resolver placeholders
# como <project_name>, <project_display>, <repo_slug>, <JIRA_KEY>.
#
# Em projeto novo:
#   - `project_name` e `project_display` são preenchidos pelo /init-project
#     (a partir dos placeholders <PROJECT_SLUG>/<PROJECT_NAME>).
#   - os demais campos ficam vazios; o primeiro agente que precisar de um
#     deles faz bootstrap automático (gh repo view / MCP atlassian) ou
#     pergunta ao usuário via AskUserQuestion, e persiste o valor aqui.
project_name: <PROJECT_SLUG>          # slug kebab-case (namespaces, pacotes, imagens)
project_display: <PROJECT_NAME>       # nome para humanos (títulos, headers)
repo_slug:                            # owner/repo no GitHub — `gh repo view --json nameWithOwner -q .nameWithOwner`
default_branch:                       # branch principal — `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`
jira_key:                             # project key do Jira — `mcp__atlassian__getVisibleJiraProjects`
jira_site:                            # subdomínio Atlassian — `mcp__atlassian__getAccessibleAtlassianResources`
issuer:                               # issuer JWT do projeto (exemplo/exibição), se aplicável
---

# <PROJECT_NAME> — Guia para Agentes de IA

> <PROJECT_DESCRIPTION>
>
> Este documento orienta agentes de IA (Claude Code, Codex e similares) sobre como contribuir com este repositório.

## 0. Metadata do Projeto (fonte única)

O bloco YAML no topo deste arquivo é a **fonte canônica de identidade do projeto** consumida pelos agentes em `.claude/agents/`. Sempre que um agente precisar do nome do projeto, slug do repo no GitHub, branch padrão, project key do Jira ou subdomínio Atlassian, ele deve **ler daqui** — nunca hardcodar.

| Campo | Significado | Como derivar |
|---|---|---|
| `project_name` | Slug kebab-case do projeto | nome do diretório raiz / `/init-project` |
| `project_display` | Nome para humanos (títulos, headers) | versão "bonita" do `project_name` |
| `repo_slug` | `owner/repo` no GitHub | `gh repo view --json nameWithOwner -q .nameWithOwner` |
| `default_branch` | Branch principal do repo | `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` |
| `jira_key` | Project key do Jira | `mcp__atlassian__getVisibleJiraProjects` |
| `jira_site` | Subdomínio Atlassian | `mcp__atlassian__getAccessibleAtlassianResources` |
| `issuer` | Issuer JWT (exemplo/exibição) | definido pelo time de plataforma |

**Protocolo de bootstrap de identidade:** antes de usar qualquer placeholder, o agente lê este YAML; para cada campo necessário ausente, tenta derivar via shell/MCP, valida por teste de conectividade (`gh repo view`, JQL `project = <jira_key>`), persiste o valor aqui via `Edit` e só então prossegue. Idempotente — campos já preenchidos não são re-perguntados. Detalhes em [`.claude/agents/README.md`](./.claude/agents/README.md) (seção *Bootstrap de identidade*).

## Convenções compartilhadas

Este projeto segue as diretrizes em `.claude/rules/`. Antes de qualquer mudança, consulte os arquivos da categoria aplicável:

- `conventions/` — sempre, independente do tipo de mudança
- `architecture/` — para mudanças de código
- `domain/` — para regras de domínio (financeiro/auditoria, quando aplicável)
- `testing/` — antes de escrever testes
- `frontend/` — para mudanças de UI (quando aplicável)

Catálogo completo em [`.claude/rules/README.md`](./.claude/rules/README.md).

## Stack primária

> _A preencher pelo `/init-project` (ex.: .NET 10 LTS, Node 22, Go 1.22, Kotlin/JVM 21)._

## Como rodar

> _A preencher pelo `/init-project` após escanear o repositório._

## Como testar

> _A preencher pelo `/init-project`._

## Estrutura

> _A preencher pelo `/init-project`._

## Pipeline de Especificação (SDD)

Este harness inclui um pipeline de **Spec-Driven Development** pronto, com agentes especializados em `.claude/agents/` e comandos orquestradores em `.claude/commands/specs/`:

```
Discovery → PRD → FRD/NFRD → DDD → Modules → TRD → requirements/design/tasks por módulo
```

- **Orquestrador:** `/run-spec-pipeline` (autônomo até o gate HITL — validação humana dos `tasks.md`; não toca Jira sem aprovação).
- **Loop por módulo:** `/specs:specs-loop`.
- **Agentes geradores e validadores:** `discovery-agent`, `prd-generator`/`prd-validator`, `frd-generator`/`nfrd-generator`/`frd-nfrd-validator`, `ddd-architect`/`ddd-validator`, `module-generator`/`module-validator`, `trd-generator`/`trd-validator`, `requirements-writer`/`design-writer`/`tasks-writer` (+ validadores), `product-backlog`.
- **Caminho canônico de saída:** `docs/product/` (`prd/`, `frd-nfrd/`, `ddd/`, `modules/`, `trd/`, `adr/`, `glossary/`, `backlog/`). Discovery em `docs/discovery-notes.md`.
- **Nunca** usar `.kiro/specs/` ou `docs/specs/` como saída.

## Princípios Não-Negociáveis

- **Idioma:** identificadores e código em **inglês**; documentação, comentários e mensagens de commit em **português brasileiro** (`conventions/language-policy.md`).
- **Clean Architecture + DDD** em serviços backend, quando o projeto adota o estilo (`architecture/clean-architecture.md`, `architecture/ddd.md`).
- **TDD** (Red-Green-Refactor) para lógica de domínio e aplicação; **PBT** onde há propriedades matemáticas (`testing/tdd.md`).
- **Money sempre em centavos** (`long`/`BIGINT`, sufixo `InCents`/`_cents`); nunca `decimal`/`float` em domínio financeiro; arredondamento conforme `domain/nbr-5891-rounding.md` (quando aplicável).
- **Sem prefixo de tecnologia** em identificadores de domínio (`SqlFooRepository`, `KafkaPublisher`).
- **Auditoria/ledger append-only** quando aplicável (`domain/audit-immutability.md`).
- **Secrets nunca commitados** (`architecture/security-and-secrets.md`); hooks em `.claude/hooks/` bloqueiam, mas não confie só neles.
- **Mudanças arquiteturais exigem ADR** (`/docs:new-adr` → `docs/product/adr/`).
- **Sem rodapé de co-autoria de IA** em commits/PRs (`conventions/conventional-commits.md`).

## Antes de Qualquer Mudança

1. Ler os documentos de produto aplicáveis em `docs/product/` (PRD, FRD/NFRD, TRD, DDD, ADRs) e a trinca do módulo em `docs/product/modules/<slug>/`, quando existirem.
2. Ler os `.claude/rules/` das categorias aplicáveis à tarefa.
3. Confirmar a fronteira do bounded context e os contratos publicados antes de tocar código.

## Workflow Esperado

1. Entender o contexto (READMEs, ADRs, specs em `docs/product/`).
2. Aplicar **TDD** (teste primeiro); usar **PBT** onde houver invariantes.
3. Trabalhar em **git worktree** dedicado (`conventions/git-worktree.md`) — nunca direto em `main`.
4. Atualizar `CHANGELOG.md` e o `README.md` do módulo quando aplicável.
5. Criar/atualizar **ADR** se houver decisão arquitetural nova.
6. Commits em **Conventional Commits** (pt-BR, imperativo), **sem co-autoria de IA**.

## O que NUNCA Fazer

- Prefixo de tecnologia em identificadores de domínio (`SqlFooRepository`, `KafkaPublisher`).
- Identificadores em pt-BR no código (`ProcessarPagamento`, `Cancelar`).
- `decimal`/`float` para dinheiro; abreviar "objeto de valor" como "VO".
- Commitar secrets.
- Quebrar contratos publicados (OpenAPI/AsyncAPI/Protobuf) sem ADR.
- Trabalhar diretamente no branch `main`.
- Usar `.kiro/specs/` ou `docs/specs/` como caminho de especificação.
- Criar arquivos de resumo/status ad-hoc (`*-summary.md`, `*-report.md`) — `conventions/no-summary-files.md`.

---

_Documento sincronizado com `CLAUDE.md` via symlink. Edite apenas este arquivo._
