---
description: Instala o Forge Project Harness (.forge/) num projeto - novo ou existente - com adapters gerados, symlinks, gitignore e hooks git. Sucessor do /init-project. Use em repo vazio (greenfield) ou em codebase existente (brownfield).
---

# /forge:init

Bootstrap do Forge Project Harness. Flags: `--mode greenfield|brownfield` (default: detectar),
`--force` (sobrescreve com backup), `--no-symlink` (cópias materializadas em vez de symlinks).

> A parte mecânica é o script determinista `installer/install.sh` — não reimplemente cópia,
> placeholders, gitignore ou sync manualmente.

## Etapas

1. **Inspeção.** Verifique: `.forge/` já existe? É repo git? Existe `AGENTS.md`/`CLAUDE.md`/`.claude/` legado? Detecte o modo: diretório vazio → greenfield; código existente → brownfield.
2. **Guarda contra sobrescrita.** Se `.forge/` existe e o usuário não passou `--force`, apresente as opções (AskUserQuestion): **Manter** (abortar), **Sobrescrever com backup** (`--force`; o anterior vira `.forge.bak-N`). Nunca sobrescreva silenciosamente. Harness legado `.claude/` nunca é apagado pelo init — ele será regenerado como adapter pelo sync (teste manual do contrato C10 antes de remover qualquer fonte legada).
3. **Metadados.** Colete `PROJECT_SLUG` (kebab-case; default: nome do diretório), `PROJECT_NAME` (display) e `PROJECT_DESCRIPTION` (uma linha). Em modo não-interativo, use os defaults.
4. **Instalação mecânica.** Rode `installer/install.sh --target <raiz> --slug <slug> --name <nome> --desc <descricao>` (+ `--force`/`--no-symlink` conforme decidido). O script: instala `.forge/`, substitui apenas placeholders MAIÚSCULOS, aplica o bloco gerenciado no `.gitignore`, configura `core.hooksPath` (se repo git), instala `staging.yml` e gera o adapter Claude + `AGENTS.md` + symlinks.
5. **Escaneio de stack (brownfield).** Detecte como rodar/testar/typecheck/lint (package.json, sln, Makefile, compose) e **preencha o bloco `runtime:`** do frontmatter de `.forge/FORGE.md`; complete a seção "Project" de `.forge/context.md` (stack primária, estrutura `tree -L 2` resumida). Re-rode o sync (`bash .forge/scripts/sync-adapters.sh`) para refletir no `AGENTS.md`.
6. **Verificação.** `bash .forge/scripts/doctor.sh --report` → exit 0 obrigatório. Se houver `✗`, corrija antes de concluir.
7. **Relatório.** Em poucas linhas: o que foi instalado, modo, adapters gerados, e próximos passos (`/forge:status`, `/forge:spec new` quando disponível). **Não commite** — o usuário decide.
