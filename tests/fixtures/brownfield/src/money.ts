// Money — value object em centavos inteiros. Nunca representar dinheiro como float.
// Invariante: o valor interno `cents` é sempre um inteiro (Number.isInteger).

export class Money {
  private constructor(public readonly cents: number) {
    if (!Number.isInteger(cents)) {
      throw new Error(`Money exige centavos inteiros, recebeu ${cents}`);
    }
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  /** Constrói a partir de reais; 19.90 -> 1990 centavos. Arredonda na fronteira de entrada. */
  static fromReais(reais: number): Money {
    return new Money(Math.round(reais * 100));
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  /** Aplica um percentual (0..100) mantendo centavos inteiros. */
  percent(p: number): Money {
    return new Money(Math.round((this.cents * p) / 100));
  }

  toReais(): number {
    return this.cents / 100;
  }
}
