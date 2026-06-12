# Fixture: brownfield

Mini-repo **TypeScript real** (código pequeno + `docs/product/` legado + contrato) para
exercitar o fluxo §11.2 e o piloto W8.2: `init --mode brownfield → discover → graph build →
onboard → baseline extract → spec new (bugfix) → impact → ...`.

## Conteúdo

```text
package.json            # projeto Node-TS reconhecível pela detecção de stack do doctor
tsconfig.json
src/money.ts            # Value object Money em centavos inteiros (regra de domínio real)
src/billing.ts          # usa Money; tem um bug proposital (ver bugfix candidato)
docs/product/modules/billing/requirements.md   # requirements LEGADO (pré-Forge), para ingestão
contracts/billing.contract.md                  # contrato de comportamento
```

## Bug proposital (candidato a bugfix flow §11.4)

`src/billing.ts::applyDiscount` arredonda com `Math.round` sobre reais fracionários em vez de
operar em centavos inteiros — viola a invariante de `Money` e o `billing.contract.md`. Serve
de caso real para `spec new --type bugfix` no piloto brownfield.

## Como usar em testes

```bash
T="$(mktemp -d)"; cp -R tests/fixtures/brownfield/* "$T/"
(cd "$T" && git init -q && git add -A && git commit -qm "baseline brownfield")
installer/install.sh --target "$T" --slug billing-fix --name "Billing" --desc "..."
# discover/graph/baseline a partir daqui
```

Ingestão do `docs/product/` legado deve ocorrer **sem perda** (verificável por diff) — gate
do piloto W8.2.
