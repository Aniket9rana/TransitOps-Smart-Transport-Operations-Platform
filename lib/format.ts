const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatINR(amount: number): string {
  return inrFormatter.format(amount);
}

export function formatKg(kg: number): string {
  if (kg >= 1000) {
    const tons = kg / 1000;
    const rounded = Number.isInteger(tons) ? tons : Number(tons.toFixed(1));
    return `${rounded} Ton`;
  }
  return `${kg} kg`;
}
