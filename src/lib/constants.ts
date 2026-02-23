import { AppRole } from '@/hooks/useAuth';

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  AHLI_GIZI: 'Ahli Gizi',
  KEUANGAN: 'Keuangan',
  ASLAP: 'Aslap (Asisten Lapangan)',
  CHEF: 'Chef',
  KEPALA_DAPUR: 'Kepala Dapur',
};

export const ROLE_COLORS: Record<AppRole, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  ADMIN: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  AHLI_GIZI: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  KEUANGAN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ASLAP: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  CHEF: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  KEPALA_DAPUR: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};

export const UNITS = [
  'kg',
  'gram',
  'liter',
  'ml',
  'butir',
  'buah',
  'ikat',
  'bungkus',
  'potong',
  'lembar',
  'ekor',
  'kaleng',
  'botol',
  'kardus',
];

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  waiting: 'Menunggu Persetujuan',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

export const PURCHASE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  waiting: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const RECEIPT_STATUS_LABELS: Record<string, string> = {
  accepted: 'Diterima',
  rejected: 'Ditolak',
};

export const STOCK_MOVEMENT_LABELS: Record<string, string> = {
  IN: 'Masuk',
  OUT: 'Keluar',
  ADJUST: 'Penyesuaian',
};
