export function formatPKR(amount: number | undefined | null): string {
  const safeAmount = typeof amount === 'number' && !Number.isNaN(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    // Fallback
    return `PKR ${safeAmount.toFixed(2)}`;
  }
}

