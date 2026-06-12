# Fixture: feature-only

Repo **já inicializado** com `.forge/` e um baseline mínimo — alvo para changes do tipo
`feature` sem passar por discover/baseline-extract (fluxo §11.3). Equivale a um projeto que
já adotou o Forge e abre um novo change.

## Como usar em testes

O `.forge/` completo **não é commitado aqui** (seria uma cópia do template que entraria em
drift a cada mudança da fonte canônica). Materialize via installer e abra um change:

```bash
T="$(mktemp -d)"
installer/install.sh --target "$T" --slug app --name "App" --desc "..."
(cd "$T" && git init -q && bash .forge/scripts/spec-new.sh minha-feature --type feature --scale 2)
# T tem .forge/specs/active/minha-feature pronto para /forge:requirements
```

Casos cobertos (§22.9): init em repo existente sem sobrescrever; spec new (feature);
sync-adapters + drift detection; close (abandoned/rejected/superseded). Ver
`tests/w13-init-gate.sh`, `tests/w14-adapters-gate.sh`, `tests/w20-spec-gate.sh`,
`tests/w22-close-gate.sh`.
