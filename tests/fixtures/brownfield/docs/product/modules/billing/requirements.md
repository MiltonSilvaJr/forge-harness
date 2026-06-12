# BILL — Módulo de Billing (LEGADO)

> Documento **legado**, anterior à adoção do Forge. Serve para exercitar a ingestão do
> `docs/product/` no fluxo brownfield (§11.2) — deve ser ingerido **sem perda**.

| | |
|---|---|
| **Versão** | 0.3.0 |
| **Data** | 2025-11-02 |
| **Status** | Aprovado para desenvolvimento |

## Visão Geral

O módulo de billing calcula o total de uma fatura a partir de itens de linha e aplica
descontos promocionais. Todo valor monetário é representado em **centavos inteiros**.

## Requisitos Funcionais

### Req 1 — Subtotal da fatura

**Como** sistema de cobrança **quero** somar os itens de linha **para** apresentar o total
devido.

**Critérios de Aceite:**
- 1.1 O subtotal é a soma de `price × quantity` de cada item.
- 1.2 O resultado é sempre um valor monetário em centavos inteiros.

### Req 2 — Desconto promocional

**Como** operador **quero** aplicar um desconto percentual ao total **para** suportar
campanhas.

**Critérios de Aceite:**
- 2.1 O desconto recebe um percentual entre 0 e 100.
- 2.2 O cálculo opera em centavos inteiros, sem conversão para reais fracionários.
- 2.3 O resultado nunca é negativo.

## Fora do escopo do MVP

- Descontos por item (apenas no total).
- Múltiplos descontos cumulativos.
