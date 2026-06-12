import { Money } from './money.js';

export interface LineItem {
  description: string;
  price: Money;
  quantity: number;
}

/** Soma os itens de uma fatura. */
export function subtotal(items: LineItem[]): Money {
  return items.reduce(
    (acc, it) => acc.add(it.price.percent(100 * it.quantity)),
    Money.fromCents(0),
  );
}

// BUG PROPOSITAL (candidato a bugfix flow §11.4):
// applyDiscount arredonda sobre REAIS fracionários com Math.round e reconstrói via
// fromReais — perde precisão e viola a invariante de centavos inteiros de Money e o
// billing.contract.md (desconto deve operar em centavos). Correto: total.percent(100 - pct).
export function applyDiscount(total: Money, pct: number): Money {
  const discountedReais = Math.round(total.toReais() * (1 - pct / 100));
  return Money.fromReais(discountedReais);
}
