# Contrato — Billing

Comportamento observável esperado do módulo de billing. Usado pelo fluxo brownfield para
detectar regressões e ancorar o bugfix candidato.

## C1 — Money é centavos inteiros

Para todo `Money`, `cents` é inteiro (`Number.isInteger(cents) === true`). Nenhuma operação
(`add`, `percent`, desconto) pode produzir centavos fracionários.

## C2 — Desconto opera em centavos

`applyDiscount(total, pct)` equivale a `total.percent(100 - pct)`:

- Para `total = R$ 19,90` (1990 centavos) e `pct = 10`, o resultado é **1791 centavos**
  (R$ 17,91), não R$ 18,00.
- O resultado nunca é negativo e nunca excede `total`.

## C3 — Subtotal é associativo

`subtotal([a, b, c])` é independente da ordem dos itens.

> Nota: a implementação atual de `applyDiscount` viola **C2** (arredonda sobre reais) — bug
> proposital para o piloto W8.2.
