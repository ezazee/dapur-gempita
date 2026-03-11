import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Units allowed in the system (no sdm/sdt)
export const METRIC_UNITS = ['gram', 'g', 'kg', 'ml', 'liter'] as const;
export const COUNT_UNITS = ['butir', 'bungkus', 'lembar', 'ikat', 'porsi', 'siung', 'ruas', 'batang', 'buah', 'pcs'] as const;
export const SPECIAL_UNITS = ['secukupnya'] as const;
export const ALL_ALLOWED_UNITS = [...METRIC_UNITS, ...COUNT_UNITS, ...SPECIAL_UNITS] as const;

/**
 * Standardizes units to a base lowercase form for comparison.
 * sdm/sdt are NOT valid outputs — they are converted to ml.
 */
export function getStandardUnit(unit: string): string {
  if (!unit) return '';
  const u = unit.toLowerCase().trim();
  if (u === 'kg' || u === 'kilogram' || u === 'kg.') return 'kg';
  if (u === 'gr' || u === 'gram' || u === 'g' || u === 'g.') return 'gram';
  if (u === 'l' || u === 'liter' || u === 'ltr' || u === 'litre') return 'liter';
  if (u === 'ml' || u === 'milliliter') return 'ml';
  // sdm/sdt are NORMALIZED to ml — never kept as-is
  if (u === 'sdm' || u === 'sendok makan') return 'ml';
  if (u === 'sdt' || u === 'sendok teh') return 'ml';
  if (u === 'ons') return 'gram';
  // siung and ruas normalize to gram
  if (u === 'siung') return 'gram';
  if (u === 'ruas') return 'gram';
  if (u === 'secukupnya') return 'secukupnya';
  return u;
}

/**
 * Returns a factor to convert a given unit to its "base" unit (Gram or ML or Piece).
 * This is CRITICAL for cross-unit math (e.g. 15 Liter + 4 SDM).
 */
export function getConversionFactor(unit: string): number {
  if (!unit) return 1;
  const u = unit.toLowerCase().trim();

  // Weights (Base: Gram)
  if (u === 'kg' || u === 'kilogram') return 1000;
  if (u === 'gram' || u === 'gr' || u === 'g' || u === 'g.') return 1;
  if (u === 'ons') return 100;

  // Volumes (Base: ML)
  if (u === 'liter' || u === 'l' || u === 'ltr' || u === 'litre') return 1000;
  if (u === 'ml' || u === 'milliliter') return 1;
  if (u === 'sdm' || u === 'sendok makan') return 15;   // 1 sdm = 15 ml
  if (u === 'sdt' || u === 'sendok teh') return 5;       // 1 sdt = 5 ml
  if (u === 'gelas') return 240;                          // 1 gelas = 240 ml

  // Counts (approximate gram conversions — stored as gram)
  if (u === 'siung') return 5;    // 1 siung bawang putih ≈ 5 gram
  if (u === 'ruas') return 10;    // 1 ruas jahe/kunyit ≈ 10 gram
  if (u === 'batang') return 15;  // kept as-is display, rough gram approx
  if (u === 'lembar') return 1;

  return 1;
}

/**
 * Normalizes a quantity to its base unit (Gram/ML) for accurate summation.
 */
export function normalizeQty(qty: number, unit: string): number {
  if (!unit) return qty;
  return qty * getConversionFactor(unit);
}

/**
 * Converts an ingredient from any unit (including sdm/sdt) to its metric base form.
 * sdm → ml, sdt → ml, ons → gram, gelas → ml.
 * Returns { qty, unit } in metric.
 */
export function normalizeToMetric(qty: number, unit: string): { qty: number; unit: string } {
  if (!unit) return { qty, unit: '' };
  const u = unit.toLowerCase().trim();

  if (u === 'secukupnya') return { qty: 0, unit: 'secukupnya' };

  const factor = getConversionFactor(u);
  const baseQty = qty * factor;

  // Determine if volume or weight
  const isVolume = ['liter', 'ml', 'sdm', 'sdt', 'gelas', 'sendok makan', 'sendok teh'].includes(u);
  const isWeight = ['kg', 'gram', 'gr', 'g', 'g.', 'gram', 'ons', 'kilogram'].includes(u);

  if (isVolume) {
    // Store in ml (display as liter if large)
    return { qty: baseQty, unit: 'ml' };
  } else if (isWeight) {
    // Store in gram (display as kg if large)
    return { qty: baseQty, unit: 'gram' };
  }

  // Count units (butir, bungkus, etc.) — keep as-is
  return { qty, unit: u };
}

/**
 * Converts a quantity from its current unit back to a target unit.
 * Useful for de-scaling (e.g. 1.5 Liter -> 100 SDM).
 */
export function denormalizeQty(qty: number, currentUnit: string, targetUnit: string): number {
  const baseValue = normalizeQty(qty, currentUnit);
  const targetFactor = getConversionFactor(targetUnit);
  return baseValue / targetFactor;
}

export function formatRecipeQty(qty: number, unit: string = '') {
  const safeUnit = (unit || '').toLowerCase().trim();

  // Special case: secukupnya is not a measurable quantity
  if (safeUnit === 'secukupnya') {
    return { value: 0, stringValue: '—', unit: 'secukupnya' };
  }

  let currentUnit = getStandardUnit(safeUnit);
  let currentQty = qty;

  // 1. & 2. AUTO-SCALING for large quantities
  const u = currentUnit;
  const baseValue = normalizeQty(qty, safeUnit);

  const isVolume = ['liter', 'ml'].includes(u) ||
    ['sdm', 'sdt', 'gelas', 'sendok makan', 'sendok teh'].includes(safeUnit);
  const isWeight = ['kg', 'gram', 'ons'].includes(u) ||
    ['gr', 'g', 'g.', 'ons', 'kilogram', 'siung', 'ruas'].includes(safeUnit);

  if (isVolume && baseValue >= 1000) {
    currentQty = baseValue / 1000;
    currentUnit = 'liter';
  } else if (isVolume && baseValue < 1000 && baseValue >= 1) {
    currentQty = baseValue;
    currentUnit = 'ml';
  } else if (isVolume && baseValue > 0 && baseValue < 1) {
    currentQty = baseValue;
    currentUnit = 'ml';
  } else if (isWeight && baseValue >= 1000) {
    currentQty = baseValue / 1000;
    currentUnit = 'kg';
  } else if (isWeight && baseValue < 1000 && baseValue >= 1) {
    currentQty = baseValue;
    currentUnit = 'gram';
  } else if (isWeight && baseValue > 0 && baseValue < 1) {
    // Very small amounts — keep in gram for clarity
    currentQty = baseValue;
    currentUnit = 'gram';
  }

  // 3. FRACTION FORMATTING
  const integerPart = Math.floor(currentQty);
  let decimalPart = Math.round((currentQty - integerPart) * 1000) / 1000;

  let fractionStr = '';
  const noFractionUnits = ['kg', 'liter', 'ons'];

  if (decimalPart > 0 && !noFractionUnits.includes(currentUnit)) {
    if (currentQty < 50) {
      if (Math.abs(decimalPart - 0.5) < 0.02) fractionStr = '1/2';
      else if (Math.abs(decimalPart - 0.25) < 0.02) fractionStr = '1/4';
      else if (Math.abs(decimalPart - 0.75) < 0.02) fractionStr = '3/4';
      else if (Math.abs(decimalPart - 0.2) <= 0.02) fractionStr = '1/5';
      else if (Math.abs(decimalPart - 0.1) <= 0.02) fractionStr = '1/10';
    }

    if (!fractionStr) {
      fractionStr = decimalPart.toString().replace('0.', '.');
    }
  }

  let stringValue = String(currentQty);
  let numericalValue = Math.round(currentQty * 1000) / 1000;

  if (integerPart > 0 && fractionStr && !fractionStr.startsWith('.')) {
    stringValue = `${integerPart} ${fractionStr}`;
  } else if (integerPart === 0 && fractionStr && !fractionStr.startsWith('.')) {
    stringValue = fractionStr;
  } else if (fractionStr && fractionStr.startsWith('.')) {
    stringValue = String(Math.round(currentQty * 100) / 100);
    numericalValue = Math.round(currentQty * 100) / 100;
  } else if (!fractionStr && currentQty % 1 !== 0) {
    stringValue = String(Math.round(currentQty * 100) / 100);
    numericalValue = Math.round(currentQty * 100) / 100;
  }

  let finalUnit = unit || '';
  if (currentUnit !== safeUnit) {
    finalUnit = currentUnit;
  }

  return {
    value: numericalValue,
    stringValue: stringValue,
    unit: finalUnit
  };
}

/**
 * Strips technical metadata from memo strings (e.g. [REQ:uuid]).
 */
export function formatMemo(memo: string): string {
  if (!memo) return '';
  // Removes "[REQ:uuid] " prefix or similar patterns
  return memo.replace(/^\[REQ:[^\]]+\]\s*/i, '').trim() || 'Lainnya';
}

/**
 * Parses memo to extract Request ID and clean Store Name.
 * Format expected: "[REQ:uuid] Store Name" or just "Store Name"
 */
export function parseMemo(memo: string): { requestId: string | null; storeName: string } {
  if (!memo) return { requestId: null, storeName: 'Lainnya' };

  const match = memo.match(/^\[REQ:([^\]]+)\]\s*(.*)$/i);
  if (match) {
    return {
      requestId: match[1],
      storeName: match[2].trim() || 'Lainnya'
    };
  }

  return { requestId: null, storeName: memo.trim() || 'Lainnya' };
}
