# Fixture: greenfield

Alvo **vazio** para exercitar o fluxo §11.1 (`/forge:init --mode greenfield`) e o piloto
W8.1. Representa um diretório novo, **sem git** e sem `.forge/`.

## Como usar em testes

Não copie este diretório (ele é intencionalmente vazio, à parte deste README). Em vez
disso, materialize um alvo limpo e rode o installer:

```bash
T="$(mktemp -d)"
installer/install.sh --target "$T" --slug meu-app --name "Meu App" --desc "..."
# T agora tem .forge/ + adapters; sem git até `git init`
```

Casos cobertos a partir daqui (§22.9 / #20): init sem repo git; symlink CLAUDE.md→AGENTS.md
(ou fallback copy com `--copy-links`); doctor avisa que hooks não foram configurados até
`git init`. Ver `tests/w13-init-gate.sh`.
