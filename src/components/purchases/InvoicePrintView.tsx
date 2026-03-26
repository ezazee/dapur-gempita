'use client';

import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Image from 'next/image';
import { cn, formatRecipeQty } from '@/lib/utils';
import { Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface InvoicePrintViewProps {
    invoice: any;
    onClose: () => void;
    autoAction?: 'PRINT' | 'EXCEL' | 'NONE';
}

export function InvoicePrintView({ invoice, onClose, autoAction = 'NONE' }: InvoicePrintViewProps) {
    useEffect(() => {
        if (invoice) {
            if (autoAction === 'PRINT') {
                const handleAfterPrint = () => {
                    onClose();
                    window.removeEventListener('afterprint', handleAfterPrint);
                };
                window.addEventListener('afterprint', handleAfterPrint);

                const timer = setTimeout(() => {
                    window.print();
                }, 500);
                return () => {
                    clearTimeout(timer);
                    window.removeEventListener('afterprint', handleAfterPrint);
                };
            } else if (autoAction === 'EXCEL') {
                downloadExcel();
                onClose();
            }
        }
    }, [invoice, autoAction]);

    if (!invoice || !invoice.receipt) return null;

    const printInvoice = () => {
        window.print();
    };

    const downloadExcel = () => {
        const wb = XLSX.utils.book_new();
        const isPlan = invoice.status !== 'approved';
        const title = isPlan ? 'RENCANA BELANJA' : 'INVOICE & TANDA TERIMA';
        const rows = [
            [title],
            ['No. Inv', `INV-${invoice.id.substring(0, 8).toUpperCase()}`],
            ['Tgl Beli', invoice.purchaseDate ? format(new Date(invoice.purchaseDate), 'dd MMMM yyyy') : '-'],
            ['Tgl Terima', invoice.receipt.receiveDate ? format(new Date(invoice.receipt.receiveDate), 'dd MMMM yyyy HH:mm') : 'MENUNGGU'],
            ['Pembuat', invoice.creatorName],
            ['Penerima (ASLAP)', invoice.receipt.receiverName || 'MENUNGGU'],
            ['Tipe', invoice.purchaseType],
            [''],
            ['No', 'Kategori', 'Nama Barang', 'Est./Tgt', 'B. Kotor', 'B. Bersih', 'Catatan ASLAP']
        ];

        let no = 1;
        const types = ['MASAK', 'KERING', 'OPERASIONAL'];
        types.forEach((type) => {
            const items = invoice.receipt.items.filter((i: any) => i.category === type);
            if (items.length > 0) {
                const typeName = type === 'MASAK' ? 'Menu Masak' : type === 'KERING' ? 'Menu Kering/Snack' : 'Barang Operasional';
                items.forEach((item: any) => {
                    const target = item.targetQty || item.estimatedQty;
                    const targetFmt = formatRecipeQty(target, item.unit);
                    const kotorFmt = formatRecipeQty(item.grossWeight, item.unit);
                    const bersihFmt = formatRecipeQty(item.netWeight, item.unit);
                    rows.push([
                        no.toString(),
                        typeName,
                        item.ingredientName,
                        target > 0 ? `${targetFmt.stringValue} ${targetFmt.unit}` : '-',
                        `${kotorFmt.stringValue} ${kotorFmt.unit}`,
                        `${bersihFmt.stringValue} ${bersihFmt.unit}`,
                        item.note || '-'
                    ]);
                    no++;
                });
            }
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Invoice');
        XLSX.writeFile(wb, `Invoice_${invoice.id.substring(0, 8)}.xlsx`);
    };

    const isAutoPrint = autoAction === 'PRINT';

    return (
        <div className={cn(
            "fixed inset-0 z-50 bg-white sm:p-8 flex flex-col w-full h-full overflow-y-auto print:static print:h-auto print:overflow-visible print:bg-white print:opacity-100 print:visible",
            isAutoPrint && "opacity-0 pointer-events-none" // Hide from screen but keep in DOM for print
        )}>
            {/* Action Bar (Hidden in Print) */}
            <div className="flex items-center justify-end gap-3 p-4 mb-4 border-b print:hidden bg-slate-50 sticky top-0">
                <p className="text-sm text-gray-500 mr-auto italic tracking-wide">
                    Tekan <b>Ctrl+P</b> atau tombol cetak jika dialog print otomatis tidak muncul. (Anda bisa menggunakan fitur <b>Save as PDF</b> pada layar Print).
                </p>
                <button onClick={downloadExcel} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                    Unduh Excel
                </button>
                <button onClick={printInvoice} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90">
                    <Printer className="w-4 h-4" /> Cetak / Unduh PDF
                </button>
                <button onClick={onClose} className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-100">
                    Tutup
                </button>
            </div>

            {/* Printable Area */}
            <div className="max-w-4xl mx-auto w-full text-black print:text-black p-4 bg-white" id="invoice-print-area">
                <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-6">
                    <div className="flex items-center gap-6 flex-1">
                        <div className="relative h-12 w-auto min-w-[140px]">
                            <Image src="/Logo_Yayasan_GEMPITA_black.png" alt="Logo Gempita" width={180} height={48} className="h-12 w-auto object-contain" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold uppercase tracking-widest text-black">
                                {invoice.status === 'approved' ? 'INVOICE & TANDA TERIMA' : 'RENCANA BELANJA'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1 font-medium italic">Dapur Gempita</p>
                        </div>
                    </div>
                    <div className="text-right text-sm space-y-1">
                        <p><span className="font-semibold w-24 inline-block">No. Inv:</span> INV-{invoice.id.substring(0, 8).toUpperCase()}</p>
                        <p><span className="font-semibold w-24 inline-block">Tgl Beli:</span> {invoice.purchaseDate ? format(new Date(invoice.purchaseDate), 'dd MMMM yyyy', { locale: id }) : '-'}</p>
                        <p><span className="font-semibold w-24 inline-block">Tgl Terima:</span> {invoice.receipt.receiveDate ? format(new Date(invoice.receipt.receiveDate), 'dd MMMM yyyy HH:mm', { locale: id }) : 'MENUNGGU'}</p>
                    </div>
                </div>

                    <div className="w-1/2">
                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-2">Informasi Pembelian</h3>
                        <p className="text-sm"><span className="font-semibold">Pembuat:</span> {invoice.creatorName}</p>
                        <p className="text-sm"><span className="font-semibold">Tipe:</span> {invoice.purchaseType}</p>
                        {invoice.note && <p className="text-sm text-gray-600 italic mt-1">"{invoice.note}"</p>}
                    </div>
                    <div className="w-1/2">
                        <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-2">
                            {invoice.status === 'approved' ? 'Informasi Penerimaan' : 'Status Penerimaan'}
                        </h3>
                        {invoice.status === 'approved' ? (
                            <>
                                <p className="text-sm"><span className="font-semibold">Penerima (ASLAP):</span> {invoice.receipt.receiverName}</p>
                                {invoice.receipt.note && <p className="text-sm text-gray-600 italic mt-1">Catatan Global: "{invoice.receipt.note}"</p>}
                            </>
                        ) : (
                            <p className="text-sm italic text-gray-500">Menunggu penerimaan barang oleh ASLAP di sistem.</p>
                        )}
                    </div>

                <table className="w-full text-sm border-collapse mb-8 text-black">
                    <thead>
                        <tr className="border-y-2 border-black">
                            <th className="py-2 px-2 text-left w-10">No</th>
                            <th className="py-2 px-2 text-left">Nama Barang</th>
                            <th className="py-2 px-2 text-center w-24">Est./Tgt</th>
                            <th className="py-2 px-2 text-center w-24">B. Kotor</th>
                            <th className="py-2 px-2 text-center w-24 bg-gray-50 print:bg-transparent">B. Bersih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {['MASAK', 'KERING', 'OPERASIONAL'].map((type) => {
                            const items = invoice.receipt.items.filter((i: any) => i.category === type);
                            if (items.length === 0) return null;

                            const typeName = type === 'MASAK' ? 'Menu Masak' : type === 'KERING' ? 'Menu Kering/Snack' : 'Barang Operasional';
                            
                            return (
                                <React.Fragment key={type}>
                                    <tr className="bg-gray-50/50 print:bg-white border-t border-gray-200">
                                        <td colSpan={5} className="py-2 px-2 font-bold text-xs uppercase text-primary print:text-black">
                                            {typeName}
                                        </td>
                                    </tr>
                                    {items.map((item: any, idx: number) => {
                                        const target = item.targetQty || item.estimatedQty;
                                        const targetFmt = formatRecipeQty(target, item.unit);
                                        const kotorFmt = formatRecipeQty(item.grossWeight, item.unit);
                                        const bersihFmt = formatRecipeQty(item.netWeight, item.unit);

                                        return (
                                            <tr key={item.ingredientId} className="group">
                                                <td className="py-2 px-2 align-top text-xs text-center text-gray-500">—</td>
                                                <td className="py-2 px-2 align-top">
                                                    <p className="font-semibold">{item.ingredientName}</p>
                                                    {item.note && (
                                                        <p className="text-[10px] text-gray-500 italic mt-0.5 before:content-['└_']">Catatan: {item.note}</p>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2 align-top text-center text-gray-600">{target > 0 ? `${targetFmt.stringValue} ${targetFmt.unit}` : '-'}</td>
                                                <td className="py-2 px-2 align-top text-center">{kotorFmt.stringValue} <span className="text-[10px] text-gray-500 uppercase">{kotorFmt.unit}</span></td>
                                                <td className="py-2 px-2 align-top text-center font-bold">{bersihFmt.stringValue} <span className="text-[10px] text-gray-500 uppercase">{bersihFmt.unit}</span></td>
                                            </tr>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>

                <div className="flex justify-between items-end pt-8 mt-auto">
                    <div className="flex-1">
                        {/* Empty space for balance */}
                    </div>
                    
                    <div className="text-center w-64 pb-2">
                        <p className="text-sm mb-16">Disetujui Oleh,</p>
                        <p className="font-semibold text-sm underline">{invoice.receipt.receiverName || 'ASLAP'}</p>
                        <p className="text-xs text-gray-500">ASLAP</p>
                    </div>

                    <div className="flex-1 flex justify-end">
                        <div className="relative h-12 w-auto min-w-[200px]">
                            <Image src="/Logo SPPG Bengkulu.png" alt="Logo BGN" width={220} height={48} className="h-12 w-auto object-contain" />
                        </div>
                    </div>
                </div>
                
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        @page {
                            margin: 15mm;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #invoice-print-area, #invoice-print-area * {
                            visibility: visible;
                        }
                        #invoice-print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .print\\:hidden, .print\\:hidden * { 
                            display: none !important; 
                            visibility: hidden !important;
                        }
                    }
                `}} />
            </div>
        </div>
    );
}
