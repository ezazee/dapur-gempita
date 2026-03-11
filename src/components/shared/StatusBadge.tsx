'use client';

import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatusBadgeProps {
    status: string;
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    switch (status) {
        case 'waiting':
        case 'requested':
        case 'pending':
            // Using brand accent (Yellow) for pending/waiting
            return <Badge variant="outline" className={cn("bg-accent/10 text-accent-foreground border-accent/20", className)}><Clock className="w-3 h-3 mr-1" /> Menunggu</Badge>;
        case 'approved':
        case 'completed':
        case 'evaluated':
        case 'PAS':
        case 'ready':
            // Using success green for positive states
            return <Badge variant="default" className={cn("bg-success hover:bg-success/90", className)}><CheckCircle className="w-3 h-3 mr-1" /> {status === 'PAS' ? 'Pas' : 'Selesai'}</Badge>;
        case 'rejected':
        case 'bermasalah':
        case 'problem':
            // Using destructive red for negative/error states
            return <Badge variant="destructive" className={cn("bg-destructive hover:bg-destructive/90", className)}><XCircle className="w-3 h-3 mr-1" /> {status === 'rejected' ? 'Ditolak' : 'Bermasalah'}</Badge>;
        case 'incomplete':
            // Using primary maroon or blue for processing
            return <Badge variant="outline" className={cn("text-primary border-primary/20 bg-primary/5", className)}><AlertCircle className="w-3 h-3 mr-1" /> Sedang Diproses</Badge>;
        default:
            return <Badge variant="outline" className={className}>{status}</Badge>;
    }
}
