/** Currency utilities for multi-currency support */

export type CurrencyCode = string;

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  name: string;
}

// Common currencies with their symbols
export const CURRENCIES: Record<string, CurrencyInfo> = {
  USD: { code: "USD", symbol: "$", name: "US Dollar" },
  EUR: { code: "EUR", symbol: "€", name: "Euro" },
  GBP: { code: "GBP", symbol: "£", name: "British Pound" },
  INR: { code: "INR", symbol: "₹", name: "Indian Rupee" },
  JPY: { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  AUD: { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  CAD: { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  CHF: { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
  CNY: { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  SGD: { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  AED: { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
  SAR: { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
  BRL: { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  ZAR: { code: "ZAR", symbol: "R", name: "South African Rand" },
  MXN: { code: "MXN", symbol: "MX$", name: "Mexican Peso" },
  KRW: { code: "KRW", symbol: "₩", name: "South Korean Won" },
  THB: { code: "THB", symbol: "฿", name: "Thai Baht" },
  MYR: { code: "MYR", symbol: "RM", name: "Malaysian Ringgit" },
  PHP: { code: "PHP", symbol: "₱", name: "Philippine Peso" },
  IDR: { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah" },
  NGN: { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
  EGP: { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
  PKR: { code: "PKR", symbol: "₨", name: "Pakistani Rupee" },
  BDT: { code: "BDT", symbol: "৳", name: "Bangladeshi Taka" },
  LKR: { code: "LKR", symbol: "Rs", name: "Sri Lankan Rupee" },
  NZD: { code: "NZD", symbol: "NZ$", name: "New Zealand Dollar" },
  SEK: { code: "SEK", symbol: "kr", name: "Swedish Krona" },
  NOK: { code: "NOK", symbol: "kr", name: "Norwegian Krone" },
  DKK: { code: "DKK", symbol: "kr", name: "Danish Krone" },
  PLN: { code: "PLN", symbol: "zł", name: "Polish Zloty" },
  TRY: { code: "TRY", symbol: "₺", name: "Turkish Lira" },
  RUB: { code: "RUB", symbol: "₽", name: "Russian Ruble" },
  ILS: { code: "ILS", symbol: "₪", name: "Israeli Shekel" },
  COP: { code: "COP", symbol: "COL$", name: "Colombian Peso" },
  ARS: { code: "ARS", symbol: "AR$", name: "Argentine Peso" },
  CLP: { code: "CLP", symbol: "CL$", name: "Chilean Peso" },
  PEN: { code: "PEN", symbol: "S/", name: "Peruvian Sol" },
  KES: { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  GHS: { code: "GHS", symbol: "GH₵", name: "Ghanaian Cedi" },
};

// Approximate exchange rates relative to USD (static fallback)
// In production, you'd fetch these from an API
const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.5,
  JPY: 149.5,
  AUD: 1.53,
  CAD: 1.36,
  CHF: 0.88,
  CNY: 7.24,
  SGD: 1.34,
  AED: 3.67,
  SAR: 3.75,
  BRL: 4.97,
  ZAR: 18.6,
  MXN: 17.1,
  KRW: 1320,
  THB: 35.5,
  MYR: 4.72,
  PHP: 55.8,
  IDR: 15600,
  NGN: 1550,
  EGP: 30.9,
  PKR: 278,
  BDT: 110,
  LKR: 323,
  NZD: 1.63,
  SEK: 10.4,
  NOK: 10.5,
  DKK: 6.87,
  PLN: 3.98,
  TRY: 30.2,
  RUB: 92,
  ILS: 3.65,
  COP: 3950,
  ARS: 830,
  CLP: 935,
  PEN: 3.72,
  KES: 155,
  GHS: 12.5,
};

// Country code → currency code mapping
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", IN: "INR", JP: "JPY", AU: "AUD",
  CA: "CAD", CH: "CHF", CN: "CNY", SG: "SGD", AE: "AED",
  SA: "SAR", BR: "BRL", ZA: "ZAR", MX: "MXN", KR: "KRW",
  TH: "THB", MY: "MYR", PH: "PHP", ID: "IDR", NG: "NGN",
  EG: "EGP", PK: "PKR", BD: "BDT", LK: "LKR", NZ: "NZD",
  SE: "SEK", NO: "NOK", DK: "DKK", PL: "PLN", TR: "TRY",
  RU: "RUB", IL: "ILS", CO: "COP", AR: "ARS", CL: "CLP",
  PE: "PEN", KE: "KES", GH: "GHS",
  // Eurozone
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", MT: "EUR", CY: "EUR", SK: "EUR",
  SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", HR: "EUR",
};

/**
 * Convert amount from one currency to another using static rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): number {
  if (fromCurrency === toCurrency) return amount;

  const fromRate = EXCHANGE_RATES_TO_USD[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES_TO_USD[toCurrency] || 1;

  // Convert: from → USD → to
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
}

/**
 * Format a price with the correct currency symbol
 */
export function formatPrice(
  amount: number,
  currencyCode: string,
  options?: { showCode?: boolean; decimals?: number }
): string {
  const info = CURRENCIES[currencyCode] || { symbol: currencyCode, code: currencyCode };
  const decimals = options?.decimals ?? (amount >= 100 ? 0 : 2);
  const formatted = amount.toFixed(decimals);

  if (options?.showCode) {
    return `${info.symbol}${formatted} ${info.code}`;
  }
  return `${info.symbol}${formatted}`;
}

/**
 * Convert and format a price from provider's currency to user's currency
 */
export function convertAndFormat(
  amount: number,
  providerCurrency: string,
  userCurrency: string,
  options?: { showCode?: boolean; showOriginal?: boolean }
): string {
  if (!amount || amount === 0) return "Free";
  
  if (providerCurrency === userCurrency) {
    return formatPrice(amount, providerCurrency, options);
  }

  const converted = convertCurrency(amount, providerCurrency, userCurrency);
  const formatted = formatPrice(converted, userCurrency, options);

  if (options?.showOriginal) {
    return `${formatted} (${formatPrice(amount, providerCurrency)})`;
  }
  return formatted;
}

/**
 * Get currency code for a country code
 */
export function getCurrencyForCountry(countryCode: string): string {
  return COUNTRY_TO_CURRENCY[countryCode?.toUpperCase()] || "USD";
}

/**
 * Get all supported currencies as array for select dropdowns
 */
export function getCurrencyList(): CurrencyInfo[] {
  return Object.values(CURRENCIES).sort((a, b) => a.code.localeCompare(b.code));
}
