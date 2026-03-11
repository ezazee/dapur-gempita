/**
 * Utility functions for data mapping and cleaning
 */

/**
 * Removes the [REQ:UUID] pattern from a string (memo/note).
 */
export function cleanMemo(text: string | null | undefined): string {
    if (!text) return '';
    return text.replace(/\[REQ:[0-9a-fA-F-]+\]/g, '').trim();
}

/**
 * Normalizes values like strings, dates, etc.
 */
export function normalizeString(text: string | null | undefined): string {
    return (text || '').trim();
}

/**
 * Format currency to IDR
 */
export function formatIDR(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}
