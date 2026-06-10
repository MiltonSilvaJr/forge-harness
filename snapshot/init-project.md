---
description: Bootstrap de novo projeto — copia template de ~/.claude/templates/project-bootstrap/ para o cwd (harness completo de agents/commands/rules/hooks/skills + pipeline SDD), cria symlink CLAUDE.md → AGENTS.md, preenche placeholders e escaneia o repo.
argument-hint: "[--force] [--no-symlink]"
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
---

# /init-project — Bootstrap de novo projeto

Inicializa a estrutura padrão (`AGENTS.md`, `CLAUDE.md` symlink, `.claude/`) no diretório de trabalho atual a partir de `~/.claude/templates/project-bootstrap/`. Depois escaneia o repo e popula as seções "Como rodar", "Como testar" e "Estrutura" do `AGENTS.md`.

O template carrega um **harness portável** completo:

- **`.claude/agents/`** — subagents de `specifications/` (discovery, prd, frd, nfrd, trd, requirements/design/tasks + validadores, product-backlog), `architecture/` (ddd-architect/validator, module-generator/validator, adr-writer, clean-architecture-reviewer), `engineering/`, `review/`, `coding/`, `code-review/`.
- **`.claude/commands/`** — orquestradores `specs/run-spec-pipeline`, `specs/specs-loop`, `coding/*`, `docs/new-adr`, `docs/update-changelog`, `testing/scaffold-tdd`.
- **`.claude/rules/`** — conventions, architecture, domain, frontend, testing.
- **`.claude/hooks/`** — validação automática (language-policy, secrets-leak, naming, dockerfile-multiarch) + **`enforce-worktree-location`** (hook `PreToolUse`/Bash, wired em `.claude/settings.json`, que **bloqueia** `git worktree add` fora de `.claude/worktrees/` — falha-aberto; ver `conventions/git-worktree.md`).
- **`.claude/settings.json`** — wiring dos hooks `PreToolUse` (commitável; usa `$CLAUDE_PROJECT_DIR`). Não confundir com `.claude/settings.local.json` (gitignored, allowlist de permissões com paths reais).
- **`.claude/skills/`** — using-git-worktrees, verify-build, verify-diff-claims, **design-system-creator** (gera um design system completo — packages/design-tokens, packages/icons, packages/ui-components + Storybook + `docs/product/design-system/*` — a partir de um link de handoff do Claude Design).

Os agentes resolvem a identidade do projeto (`<project_name>`, `<repo_slug>`, `<JIRA_KEY>`, …) a partir do **bloco YAML no topo do `AGENTS.md`** — ver step 6.5.

## Flags

- `--force` — sobrescreve `AGENTS.md` e `.claude/` existentes (com backup `.bak.<timestamp>`)
- `--no-symlink` — cria `CLAUDE.md` como arquivo idêntico ao `AGENTS.md` em vez de symlink

## Fluxo

### 1. Inspeção

Rodar em paralelo:

```bash
test -d "$PWD/.git" && echo "git: yes" || echo "git: no"
test -e "$PWD/AGENTS.md" && echo "AGENTS.md: exists" || echo "AGENTS.md: missing"
test -e "$PWD/CLAUDE.md" && echo "CLAUDE.md: exists ($(readlink CLAUDE.md 2>/dev/null || echo 'file'))" || echo "CLAUDE.md: missing"
test -e "$PWD/.claude" && echo ".claude/: exists" || echo ".claude/: missing"
test -d "$HOME/.claude/templates/project-bootstrap" && echo "template: ok" || echo "template: MISSING"
```

Se `template: MISSING` → abortar com instrução de criar `~/.claude/templates/project-bootstrap/` primeiro (ver seção "Bootstrap" no `~/.claude/AGENTS.md`).

### 2. Guarda contra sobrescrita

Se `AGENTS.md` ou `.claude/` já existem **e** `--force` não foi passado, perguntar ao usuário: (a) abortar, (b) mesclar copiando só o que falta, (c) sobrescrever com backup. Não prosseguir sem resposta.

#### 2b. Procedimento de merge (opção "b")

Quando o alvo já está inicializado (caso comum: `.claude/` portado de outro projeto), **mesclar é mais seguro que sobrescrever**. Regras:

1. **Copiar apenas o que falta.** Comparar a árvore do template contra o `.claude/` existente; copiar somente arquivos/diretórios **ausentes**. Nunca sobrescrever um arquivo já presente.
2. **Não injetar o `.claude/README.md` genérico** sobre uma estrutura mais rica. Se o alvo já tem `agents/`, `commands/`, `hooks/` ou `skills/` populados, o README "estrutura mínima" do template é enganoso — pular (ou oferecer gerar um README preciso sob medida).
3. **Ao adicionar uma rule, atualizar o catálogo** `.claude/rules/README.md` (contagem da seção + nova linha) para manter o índice consistente.
4. **Substituir `<PROJECT_SLUG>`/`<PROJECT_NAME>`** apenas nos arquivos recém-copiados (não reprocessar os existentes, que já têm os valores corretos).
5. **Nomes de projeto-fonte hardcoded** (de um port anterior) não são tratados pelo merge — se o usuário pedir, fazer uma passada de limpeza separada, substituindo o slug antigo. Atenção: o prefixo de marca (ex.: `@scope`, métricas) pode ser legítimo; confirmar antes de trocar em massa.

### 3. Backup (apenas se `--force`)

```bash
TS=$(date +%Y%m%d-%H%M%S)
[ -e AGENTS.md ] && mv AGENTS.md "AGENTS.md.bak.$TS"
[ -e CLAUDE.md ] && mv CLAUDE.md "CLAUDE.md.bak.$TS"
[ -e .claude   ] && mv .claude   ".claude.bak.$TS"
```

### 4. Cópia do template

```bash
TEMPLATE=~/.claude/templates/project-bootstrap
cp -a "$TEMPLATE/AGENTS.md" "$PWD/AGENTS.md"
cp -a "$TEMPLATE/.claude"   "$PWD/.claude"
[ -f "$TEMPLATE/.gitignore" ] && cat "$TEMPLATE/.gitignore" >> "$PWD/.gitignore"
```

### 5. Symlink CLAUDE.md → AGENTS.md

Default:
```bash
ln -sf AGENTS.md "$PWD/CLAUDE.md"
```

Com `--no-symlink`:
```bash
cp -a "$PWD/AGENTS.md" "$PWD/CLAUDE.md"
```

### 6. Coleta de metadados

Perguntar ao usuário:

1. **Nome do projeto** (`<PROJECT_NAME>`, display) — default: `basename "$PWD"`
2. **Slug do projeto** (`<PROJECT_SLUG>`, kebab-case) — usado em namespaces, pacotes npm (`@<slug>/...`), tópicos de mensageria, packages gRPC, nomes de imagem/rede Docker. Default: `basename "$PWD" | tr '[:upper:] ' '[:lower:]-'`. **Deve ser um slug válido** (lowercase, kebab-case, sem espaços).
3. **Descrição em 1 linha** (`<PROJECT_DESCRIPTION>`, sem default)
4. **Stack primária** — sugerir com base no que existir no repo:
   - `package.json` → Node/TypeScript
   - `*.csproj` / `*.sln` → .NET
   - `go.mod` → Go
   - `build.gradle*` → Kotlin/JVM
   - `pyproject.toml` / `requirements.txt` → Python

Não inventar. Se o usuário não responder, deixar placeholder e avisar.

Esses três alimentam o **bloco YAML de identidade** no topo do `AGENTS.md`:
`<PROJECT_SLUG>` → `project_name`, `<PROJECT_NAME>` → `project_display`, `<PROJECT_DESCRIPTION>` → subtítulo. Os demais campos do YAML (`repo_slug`, `default_branch`, `jira_key`, `jira_site`, `issuer`) **ficam vazios** — são preenchidos sob demanda pelo primeiro agente que precisar (bootstrap de identidade, step 6.5).

### 6.5. Identidade resolvida em runtime (não preencher no bootstrap)

O `AGENTS.md` tem dois namespaces de placeholder, **distintos de propósito**:

| Namespace | Exemplo | Quando é resolvido |
|---|---|---|
| MAIÚSCULAS | `<PROJECT_NAME>`, `<PROJECT_SLUG>`, `<PROJECT_DESCRIPTION>` | **Agora**, no bootstrap (step 7) |
| minúsculas/campos | `<project_name>`, `<project_display>`, `<repo_slug>`, `<JIRA_KEY>`, `<jira_site>`, `<issuer>` | **Em runtime**, pelos agents, a partir do bloco YAML |

Os agentes em `.claude/agents/` leem o bloco YAML do `AGENTS.md`; para cada campo necessário ausente, derivam via `gh repo view` / MCP atlassian (ou perguntam ao usuário), validam por teste de conectividade e **persistem o valor no YAML**. Isso é idempotente e roda na primeira invocação de um agente que consuma o campo — **não** é trabalho do `/init-project`.

### 7. Substituição de placeholders

A substituição roda em **`AGENTS.md` E em todo o `.claude/`** — as rules do template contêm `<PROJECT_SLUG>` (em namespaces gRPC, escopo npm, tópicos de mensageria). Substituir só o `AGENTS.md` deixa placeholders órfãos nas rules.

> **Shell zsh:** o shell padrão do usuário é zsh, que **não** faz word-splitting de variável não-quotada (`for f in $VAR` roda uma vez só com o blob inteiro). Itere com `find ... -print0 | while IFS= read -r -d ''` ou liste os arquivos explicitamente — nunca `for f in $LISTA`.

```bash
# Substitui em AGENTS.md + todos os .md/.sh sob .claude/ (iteração null-safe, zsh-proof)
find "$PWD/AGENTS.md" "$PWD/.claude" -type f \( -name '*.md' -o -name '*.sh' \) -print0 \
  | while IFS= read -r -d '' f; do
      sed -i.tmp \
        -e "s|<PROJECT_NAME>|$PROJECT_NAME|g" \
        -e "s|<PROJECT_SLUG>|$PROJECT_SLUG|g" \
        -e "s|<PROJECT_DESCRIPTION>|$PROJECT_DESCRIPTION|g" \
        "$f" && rm "$f.tmp"
    done
```

(`.tmp` evita divergência GNU/BSD do `sed -i`. **Não** substituir dentro de `.claude/settings.local.json` — ver Proibições.)

> ⚠️ O sed acima só toca os placeholders **MAIÚSCULOS**. Os placeholders **minúsculos** (`<project_name>`, `<project_display>`, `<repo_slug>`, `<JIRA_KEY>`, `<jira_site>`, `<issuer>`) que aparecem em `agents/` e `rules/` são **runtime placeholders** resolvidos pelos agents (step 6.5) — **não** substituir no bootstrap.

### 7.5. Verificação de placeholders órfãos

Após a substituição, garantir que não sobrou nenhum token:

```bash
grep -rnE '<PROJECT_(NAME|SLUG|DESCRIPTION)>|\bmyproject\b' "$PWD/AGENTS.md" "$PWD/.claude" \
  && echo "AVISO: placeholders órfãos acima — preencher manualmente" \
  || echo "OK — nenhum placeholder órfão"
```

O grep só procura os tokens **MAIÚSCULOS**. Os placeholders minúsculos (`<project_name>`, `<repo_slug>`, `<JIRA_KEY>`, …) em `agents/`/`rules/` **não** são órfãos — são resolvidos em runtime (step 6.5). Não os trate como pendência.

### 8. Escaneio do repo

Usar `Glob` e `Grep` para preencher seções do `AGENTS.md`:

- **Como rodar**: `package.json scripts.dev`, `Makefile` targets, `dotnet run --project ...`, `docker compose up`
- **Como testar**: `package.json scripts.test`, `dotnet test`, presença de `tests/` / `__tests__/`
- **Estrutura**: `find . -maxdepth 2 -type d -not -path '*/node_modules*' -not -path '*/.git*' -not -path '*/bin*' -not -path '*/obj*' -not -path '*/dist*' | sort`

Seções sem dados → `_(repositório vazio — preencher após primeiros arquivos)_`.

### 8.5. Verificação de tooling de diagnóstico (opcional)

O template inclui `.claude/scripts/doctor.sh`, que detecta as stacks do repo
(.NET / Node-TS / Python / Kotlin) e verifica se o **diagnóstico** de cada uma
(compilador / typechecker / linter — load-bearing para a rule de análise de
impacto/LSP) está instalado. Sugerir ao usuário rodá-lo:

```bash
bash .claude/scripts/doctor.sh            # só reporta o que falta
bash .claude/scripts/doctor.sh --install  # instala os faltantes (opt-in)
```

Não rodar `--install` automaticamente no bootstrap — apenas mencionar.

### 9. Relatório no chat

```
✔ AGENTS.md   criado (com bloco YAML de identidade)
✔ CLAUDE.md   → AGENTS.md (symlink)
✔ .claude/    criado (N arquivos: agents, commands, rules, hooks, skills, scripts)
✔ .gitignore  patches aplicados
i  Pipeline SDD disponível: /run-spec-pipeline (Discovery → PRD → FRD/NFRD → DDD → Modules → TRD → specs)
i  Design system: /design-system-creator <link do Claude Design> gera tokens+icons+ui-components+Storybook+docs
i  Identidade: repo_slug/jira_key/etc. serão resolvidos pelo 1º agente que precisar (ou preencha o YAML do AGENTS.md)
i  Tooling: rode `bash .claude/scripts/doctor.sh` para checar diagnósticos por stack
i  Próximos passos: revise AGENTS.md, commit com `feat(baseline): bootstrap inicial via /init-project`
```

### 10. NÃO commitar

Apenas `git status --short` (se for repo git) e deixar commit pro usuário.

## Proibições

- Sobrescrever sem `--force`
- Inventar nome/descrição/stack
- Criar arquivos de resumo (`*-summary.md`, etc.)
- Adicionar co-author de IA em commits sugeridos
- **Substituir os placeholders minúsculos** (`<project_name>`, `<project_display>`, `<repo_slug>`, `<JIRA_KEY>`, `<jira_site>`, `<issuer>`) no bootstrap — são resolvidos em runtime pelos agents a partir do YAML (step 6.5). O sed do bootstrap só toca os MAIÚSCULOS.
- **Hardcodar identidade de um projeto-fonte nas rules/agents do template** — usar sempre placeholders. Um template com slug/nome/jira-key de origem embutido contamina todo projeto novo que o adotar. (As `domain/` rules genéricas — money-as-cents, nbr-5891, audit-immutability — são parametrizáveis e podem ficar; o que não pode é nome de produto/marca real.)
- **Substituir placeholder/slug dentro de `.claude/settings.local.json`** — esse arquivo guarda allowlist de permissões com **caminhos de filesystem reais**, que podem apontar para outros projetos. Trocar o slug ali aponta para paths inexistentes e quebra o grant. Tratar entradas obsoletas removendo a linha inteira (JSON válido), nunca via substituição cega.
- **Substituir só o `AGENTS.md`** e esquecer `.claude/**` — deixa placeholders órfãos nas rules.

## Erros comuns

| Erro | Causa | Tratamento |
|---|---|---|
| `template: MISSING` | `~/.claude/templates/project-bootstrap/` não existe | Abortar com instrução de criar |
| `ln: Operation not supported` | FS sem symlink | Sugerir `--no-symlink` |
| `CLAUDE.md` já criado por `/init` builtin | Conflito | Em `--force`: backup. Senão: perguntar |
| Loop `for f in $VAR` não itera (roda 1× com blob) | Shell **zsh** não faz word-splitting de variável não-quotada | Usar `find ... -print0 \| while IFS= read -r -d ''` ou listar arquivos explicitamente |
| Placeholders órfãos (`<PROJECT_SLUG>`) sobrando | Substituição rodou só no `AGENTS.md` | Rodar step 7 sobre `.claude/**` e validar com step 7.5 |
| `.gitignore` não ignora `settings.local.json` | Patch do template não aplicado | Garantir que o `.gitignore` do template (que inclui `.claude/settings.local.json`) foi concatenado |
