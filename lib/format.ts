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

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Masks a stored contact number for display: first 5 chars + "xxxxx". */
export function maskContact(contact: string): string {
  return `${contact.slice(0, 5)}xxxxx`;
}

/** Formats a date as "MM/YYYY" for license expiry display. */
export function formatMonthYear(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}/${date.getFullYear()}`;
}
