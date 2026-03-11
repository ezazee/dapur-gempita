'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Calendar, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateFilterProps {
    onFilter: (startDate: string, endDate: string) => void;
    isLoading?: boolean;
    className?: string;
    defaultPreset?: string;
    minimal?: boolean;
}

export function DateFilter({
    onFilter,
    isLoading,
    className,
    defaultPreset = 'today',
    minimal = false
}: DateFilterProps) {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);
    const [datePreset, setDatePreset] = useState<string>(defaultPreset);

    const handlePresetChange = (preset: string) => {
        setDatePreset(preset);
        const todayD = new Date();
        const tStr = format(todayD, 'yyyy-MM-dd');

        if (preset === 'today') {
            setStartDate(tStr);
            setEndDate(tStr);
        } else if (preset === 'week') {
            const wD = new Date();
            wD.setDate(todayD.getDate() - 7);
            const sStr = format(wD, 'yyyy-MM-dd');
            setStartDate(sStr);
            setEndDate(tStr);
        } else if (preset === 'month') {
            const mD = new Date();
            mD.setMonth(todayD.getMonth() - 1);
            const sStr = format(mD, 'yyyy-MM-dd');
            setStartDate(sStr);
            setEndDate(tStr);
        }
    };

    const handleSearch = () => {
        onFilter(startDate, endDate);
    };

    const content = (
        <div className={cn("flex flex-col lg:flex-row gap-4 items-stretch lg:items-end min-w-0", !minimal && "mt-1")}>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:flex-row gap-2 flex-1 min-w-0">
                {[
                    { label: 'Hari Ini', value: 'today' },
                    { label: '1 Minggu', value: 'week' },
                    { label: '1 Bulan', value: 'month' },
                    { label: 'Kustom', value: 'custom' },
                ].map((p) => (
                    <Button
                        key={p.value}
                        variant={datePreset === p.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handlePresetChange(p.value)}
                        className={cn(
                            "rounded-full h-8 text-xs px-2 transition-all duration-200 w-full lg:w-auto",
                            datePreset === p.value ? "shadow-md scale-105" : "hover:border-primary/50"
                        )}
                    >
                        {p.label}
                    </Button>
                ))}
            </div>

            {datePreset === 'custom' && (
                <div className="grid grid-cols-[1fr,auto,1fr] items-end gap-2 animate-in fade-in slide-in-from-left-2 duration-300 w-full lg:w-auto overflow-hidden pb-1">
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Mulai</Label>
                        <Input
                            type="date"
                            className="h-9 w-full lg:w-36 text-xs bg-white border-slate-200 focus:border-primary px-2"
                            value={startDate}
                            onChange={(e) => {
                                setStartDate(e.target.value);
                                setDatePreset('custom');
                            }}
                        />
                    </div>
                    <div className="h-9 flex items-center justify-center">
                        <div className="w-2 h-px bg-slate-400 mt-5"></div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Sampai</Label>
                        <Input
                            type="date"
                            className="h-9 w-full lg:w-36 text-xs bg-white border-slate-200 focus:border-primary px-2"
                            value={endDate}
                            onChange={(e) => {
                                setEndDate(e.target.value);
                                setDatePreset('custom');
                            }}
                        />
                    </div>
                </div>
            )}

            <Button
                onClick={handleSearch}
                className="h-9 px-6 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-sm w-full md:w-auto"
                disabled={isLoading}
            >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Tampilkan
            </Button>
        </div>
    );

    if (minimal) {
        return <div className={className}>{content}</div>;
    }

    return (
        <Card className={cn("border-primary/20 shadow-sm overflow-hidden border-t-4 border-t-primary", className)}>
            <CardHeader className="bg-primary/5 py-3">
                <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
                    <Calendar className="h-4 w-4" /> Filter Periode
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
                {content}
            </CardContent>
        </Card>
    );
}
