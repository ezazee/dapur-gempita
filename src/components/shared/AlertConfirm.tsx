'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, HelpCircle } from "lucide-react";

interface AlertConfirmProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    variant?: 'default' | 'destructive' | 'warning';
}

export function AlertConfirm({
    open,
    onOpenChange,
    title,
    description,
    confirmText = "Lanjutkan",
    cancelText = "Batal",
    onConfirm,
    variant = 'default'
}: AlertConfirmProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-w-[400px]">
                <AlertDialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full ${variant === 'destructive' ? 'bg-red-100 text-red-600' :
                                variant === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                    'bg-blue-100 text-blue-600'
                            }`}>
                            {variant === 'destructive' || variant === 'warning' ? (
                                <AlertCircle className="h-5 w-5" />
                            ) : (
                                <HelpCircle className="h-5 w-5" />
                            )}
                        </div>
                        <AlertDialogTitle className="text-xl font-bold">{title}</AlertDialogTitle>
                    </div>
                    <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel className="hover:bg-secondary border-none">{cancelText}</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                            onOpenChange(false);
                        }}
                        className={`${variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' :
                                variant === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                                    'bg-primary'
                            } text-white transition-all`}
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
