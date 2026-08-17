/**
 * calculations.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Pure, side-effect-free business calculation and validation functions.
 * Extracted from inline component logic so they can be unit-tested at 100%
 * coverage independently of the UI.
 *
 * RULES:
 *  - Every function must be deterministic (same inputs → same output).
 *  - No DB calls, no network calls, no React hooks.
 *  - All monetary values are in INR (₹), stored as numbers.
 * ──────────────────────────────────────────────────────────────────────────────
 */

// ─── IPO Application Calculations ───────────────────────────────────────────

/**
 * Calculate the total amount blocked for an IPO application.
 * Formula: lots × lotSize × pricePerShare
 */
export function calculateApplicationAmount(
  lots: number,
  lotSize: number,
  pricePerShare: number
): number {
  if (lots <= 0 || lotSize <= 0 || pricePerShare <= 0) return 0;
  return lots * lotSize * pricePerShare;
}

// ─── Allotment Result ────────────────────────────────────────────────────────

export type AllotmentStatusResult = 'FULL' | 'PARTIAL' | 'NIL';

export interface AllotmentResult {
  investmentAmount: number;
  refundAmount: number;
  allotmentStatus: AllotmentStatusResult;
  allottedShares: number;
}

/**
 * Calculate the result of an allotment decision.
 * Invariant: allottedLots <= appliedLots (enforced by validation before calling).
 */
export function calculateAllotmentResult(
  appliedLots: number,
  allottedLots: number,
  ipoPrice: number,
  lotSize: number
): AllotmentResult {
  const blockedAmount = calculateApplicationAmount(appliedLots, lotSize, ipoPrice);
  const investmentAmount = calculateApplicationAmount(allottedLots, lotSize, ipoPrice);
  const refundAmount = blockedAmount - investmentAmount;
  const allottedShares = allottedLots * lotSize;

  let allotmentStatus: AllotmentStatusResult;
  if (allottedLots === 0) {
    allotmentStatus = 'NIL';
  } else if (allottedLots === appliedLots) {
    allotmentStatus = 'FULL';
  } else {
    allotmentStatus = 'PARTIAL';
  }

  return { investmentAmount, refundAmount, allotmentStatus, allottedShares };
}

// ─── Release / Refund Calculations ──────────────────────────────────────────

/**
 * Calculate the amount to be released/refunded.
 * Formula: blockedAmount - investmentAmount
 * Invariant: result >= 0 (release cannot be negative).
 */
export function calculateReleaseAmount(
  blockedAmount: number,
  investmentAmount: number
): number {
  const release = blockedAmount - investmentAmount;
  return release < 0 ? 0 : release;
}

// ─── Portfolio Calculations ──────────────────────────────────────────────────

/**
 * Calculate the total invested value of a holding.
 * Formula: shares × averageCost
 */
export function calculateInvestedValue(shares: number, averageCost: number): number {
  if (shares <= 0 || averageCost <= 0) return 0;
  return shares * averageCost;
}

/**
 * Calculate the current market value of a holding.
 * Formula: shares × currentPrice
 */
export function calculateCurrentValue(shares: number, currentPrice: number): number {
  if (shares <= 0 || currentPrice <= 0) return 0;
  return shares * currentPrice;
}

/**
 * Calculate unrealized profit/loss.
 * Formula: currentValue - investedValue
 * Can be negative (loss).
 */
export function calculateUnrealizedPnL(currentValue: number, investedValue: number): number {
  return currentValue - investedValue;
}

/**
 * Calculate unrealized ROI as a percentage.
 * Formula: (unrealizedPnL / investedValue) × 100
 */
export function calculateUnrealizedROI(currentValue: number, investedValue: number): number {
  if (investedValue === 0) return 0;
  return ((currentValue - investedValue) / investedValue) * 100;
}

// ─── Selling Calculations ────────────────────────────────────────────────────

export interface RealizedPnLInput {
  quantity: number;
  buyPrice: number;
  sellPrice: number;
  charges?: number;
}

/**
 * Calculate realized profit/loss from a sell order.
 * Formula: (sellPrice × quantity) - (buyPrice × quantity) - charges
 * Can be negative (realized loss).
 */
export function calculateRealizedPnL(input: RealizedPnLInput): number {
  const { quantity, buyPrice, sellPrice, charges = 0 } = input;
  const revenue = sellPrice * quantity;
  const cost = buyPrice * quantity;
  return revenue - cost - charges;
}

/**
 * Calculate the sell order value (gross revenue before charges).
 * Formula: quantity × sellPrice
 */
export function calculateSellOrderValue(quantity: number, sellPrice: number): number {
  if (quantity <= 0 || sellPrice <= 0) return 0;
  return quantity * sellPrice;
}

/**
 * Calculate remaining shares after a sell.
 * Invariant: soldQuantity <= availableQuantity
 */
export function calculateRemainingShares(
  availableQuantity: number,
  soldQuantity: number
): number {
  if (soldQuantity > availableQuantity) {
    throw new Error('INSUFFICIENT_HOLDINGS: Cannot sell more shares than held');
  }
  return availableQuantity - soldQuantity;
}

// ─── Portfolio Aggregation ───────────────────────────────────────────────────

export interface HoldingSummary {
  shares: number;
  averageCost: number;
  currentPrice: number;
}

/**
 * Calculate total portfolio metrics from an array of holdings.
 */
export function calculatePortfolioTotals(holdings: HoldingSummary[]): {
  totalInvested: number;
  totalCurrentValue: number;
  totalUnrealizedPnL: number;
  totalROI: number;
} {
  const totalInvested = holdings.reduce(
    (sum, h) => sum + calculateInvestedValue(h.shares, h.averageCost),
    0
  );
  const totalCurrentValue = holdings.reduce(
    (sum, h) => sum + calculateCurrentValue(h.shares, h.currentPrice),
    0
  );
  const totalUnrealizedPnL = calculateUnrealizedPnL(totalCurrentValue, totalInvested);
  const totalROI = calculateUnrealizedROI(totalCurrentValue, totalInvested);

  return { totalInvested, totalCurrentValue, totalUnrealizedPnL, totalROI };
}

// ─── Validation Functions ────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate sell quantity against available holding.
 * Rules:
 *  - quantity must be > 0
 *  - quantity must not exceed available
 */
export function validateSellQuantity(
  sellQty: number,
  availableQty: number
): ValidationResult {
  if (!sellQty || sellQty <= 0) {
    return { valid: false, error: 'Quantity must be greater than zero' };
  }
  if (sellQty < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }
  if (sellQty > availableQty) {
    return {
      valid: false,
      error: `INSUFFICIENT_HOLDINGS: Cannot sell ${sellQty} shares (only ${availableQty} available)`,
    };
  }
  return { valid: true };
}

/**
 * Validate IPO application lot quantity.
 */
export function validateApplicationQuantity(
  lots: number,
  minLots: number,
  maxLots: number
): ValidationResult {
  if (!lots || lots <= 0) {
    return { valid: false, error: 'Quantity (lots) must be greater than zero' };
  }
  if (lots < 0) {
    return { valid: false, error: 'Quantity cannot be negative' };
  }
  if (lots < minLots) {
    return { valid: false, error: `Minimum ${minLots} lot(s) required` };
  }
  if (lots > maxLots) {
    return { valid: false, error: `Maximum ${maxLots} lot(s) allowed` };
  }
  return { valid: true };
}

/**
 * Validate price within the IPO price band.
 */
export function validateIPOPrice(
  price: number,
  minPrice: number,
  maxPrice: number
): ValidationResult {
  if (!price || price <= 0) {
    return { valid: false, error: 'Price is required' };
  }
  if (price < minPrice) {
    return { valid: false, error: `Price cannot be below minimum price band ₹${minPrice}` };
  }
  if (price > maxPrice) {
    return { valid: false, error: `Price cannot exceed maximum price band ₹${maxPrice}` };
  }
  return { valid: true };
}

/**
 * Validate UPI ID format.
 * Standard UPI format: username@bankhandle
 * E.g. kirti@oksbi, 9876543210@paytm
 */
export function validateUpiId(upi: string): ValidationResult {
  if (!upi || upi.trim() === '') {
    return { valid: false, error: 'UPI ID is required' };
  }
  // Standard UPI regex: alphanumeric/dots/hyphens @ alphanumeric
  const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
  if (!UPI_REGEX.test(upi.trim())) {
    return { valid: false, error: 'Invalid UPI ID format (e.g. name@bankhandle)' };
  }
  return { valid: true };
}

/**
 * Validate PAN number.
 * PAN format: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F)
 */
export function validatePAN(pan: string): ValidationResult {
  if (!pan || pan.trim() === '') {
    return { valid: false, error: 'PAN is required' };
  }
  const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  if (!PAN_REGEX.test(pan.trim().toUpperCase())) {
    return { valid: false, error: 'Invalid PAN format (e.g. ABCDE1234F)' };
  }
  return { valid: true };
}

/**
 * Validate Demat Account ID.
 * Format: numeric string, typically 8-16 digits
 */
export function validateDematId(id: string): ValidationResult {
  if (!id || id.trim() === '') {
    return { valid: false, error: 'Demat ID is required' };
  }
  const DEMAT_REGEX = /^[0-9]{8,16}$/;
  if (!DEMAT_REGEX.test(id.trim())) {
    return { valid: false, error: 'Invalid Demat ID (8-16 digits required)' };
  }
  return { valid: true };
}

/**
 * Validate allotment quantity.
 * Invariant: allottedLots must be <= appliedLots and >= 0.
 */
export function validateAllotmentQuantity(
  allottedLots: number,
  appliedLots: number
): ValidationResult {
  if (allottedLots < 0) {
    return { valid: false, error: 'Allotted quantity cannot be negative' };
  }
  if (allottedLots > appliedLots) {
    return {
      valid: false,
      error: `Allotted quantity (${allottedLots}) cannot exceed applied quantity (${appliedLots})`,
    };
  }
  return { valid: true };
}

// ─── Formatting Utilities ────────────────────────────────────────────────────

/**
 * Format a number as Indian Rupee currency.
 * E.g. 1500000 → "₹15,00,000"
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a percentage value.
 * E.g. 12.5 → "12.50%"
 */
export function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

// ─── Business Invariant Checks ───────────────────────────────────────────────

/**
 * Invariant 2: Invested + Released = Originally Blocked
 */
export function checkMoneyConservation(
  blocked: number,
  invested: number,
  released: number
): boolean {
  return Math.abs(blocked - invested - released) < 0.01;
}

/**
 * Invariant 3: Remaining Holdings = Previous Holdings - Sold Quantity
 */
export function checkHoldingConsistency(
  previousHoldings: number,
  soldQuantity: number,
  remainingHoldings: number
): boolean {
  return previousHoldings - soldQuantity === remainingHoldings;
}
