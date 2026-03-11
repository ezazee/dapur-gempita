'use client';

import { Utensils } from 'lucide-react';

interface CookingStepsProps {
    description: string;
    compact?: boolean; // true = only show step count summary for tables
}

/**
 * Parses a CARA MEMASAK text block into sections + steps,
 * then renders it with formatted headers and numbered badges.
 */
export function parseCookingSteps(description: string) {
    const lines = description.split('\n');
    const sections: { title: string | null; steps: string[] }[] = [];
    let current: { title: string | null; steps: string[] } = { title: null, steps: [] };

    for (const raw of lines) {
        const line = raw.trimEnd();
        if (line.trim() === '') continue;
        const isHeader = /^[^0-9•\-\s].*:\s*$/.test(line.trim());
        const isStep = /^\d+\./.test(line.trim());

        if (isHeader) {
            if (current.steps.length > 0 || current.title) sections.push(current);
            current = { title: line.trim().replace(/:$/, ''), steps: [] };
        } else if (isStep) {
            current.steps.push(line.trim());
        } else {
            current.steps.push(line.trim());
        }
    }
    if (current.steps.length > 0 || current.title) sections.push(current);
    return sections;
}

export function cookingStepsSummary(description: string): string {
    if (!description) return '-';
    const sections = parseCookingSteps(description);
    const totalSteps = sections.reduce((acc, s) => acc + s.steps.length, 0);
    const namedSections = sections.filter(s => s.title).length;
    // Always show tahap count: named sections, or 1 if there are steps but no names
    const totalTahap = namedSections > 0 ? namedSections : (totalSteps > 0 ? 1 : 0);
    return `${totalTahap} tahap, ${totalSteps} langkah`;
}

export function CookingSteps({ description, compact = false }: CookingStepsProps) {
    if (!description) return null;

    if (compact) {
        return (
            <span className="text-xs text-muted-foreground italic">
                {cookingStepsSummary(description)}
            </span>
        );
    }

    const sections = parseCookingSteps(description);

    return (
        <div className="mt-2 border rounded-xl overflow-hidden bg-card shadow-sm">
            <div className="bg-primary/5 px-4 py-2.5 border-b flex items-center gap-2">
                <Utensils className="h-4 w-4 text-primary" />
                <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Cara Memasak</h4>
            </div>
            <div className="px-5 py-4 space-y-4">
                {sections.map((section, si) => (
                    <div key={si} className="space-y-1.5">
                        {section.title && (
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-1.5 h-5 rounded-full bg-primary/60" />
                                <span className="font-bold text-sm text-foreground">{section.title}</span>
                            </div>
                        )}
                        <ol className="space-y-1.5 ml-4">
                            {section.steps.map((step, idx) => {
                                const text = step.replace(/^\d+\.\s*/, '');
                                const num = step.match(/^(\d+)\./)?.[1];
                                return (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                                        {num && (
                                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-black flex items-center justify-center mt-0.5">
                                                {num}
                                            </span>
                                        )}
                                        <span className={num ? '' : 'ml-8'}>{text}</span>
                                    </li>
                                );
                            })}
                        </ol>
                    </div>
                ))}
            </div>
        </div>
    );
}
