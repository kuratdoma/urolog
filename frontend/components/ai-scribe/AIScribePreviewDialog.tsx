import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AIScribeResponse } from "@/lib/api";

interface AIScribePreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: AIScribeResponse | null;
    onApply: () => void;
    onCancel: () => void;
}

export function AIScribePreviewDialog({
    open,
    onOpenChange,
    data,
    onApply,
    onCancel
}: AIScribePreviewDialogProps) {
    if (!data) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Değişiklikleri Onayla</DialogTitle>
                    <DialogDescription>
                        AI asistanı tarafından üretilen klinik notlar. Uygulamak istediğinize emin misiniz?
                    </DialogDescription>
                </DialogHeader>
                
                <ScrollArea className="flex-1 border rounded-md p-4 bg-slate-50 mt-2">
                    <pre className="text-sm whitespace-pre-wrap font-mono text-slate-800">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </ScrollArea>

                <DialogFooter className="mt-4 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onCancel}>İptal</Button>
                    <Button onClick={onApply} className="bg-yellow-500 hover:bg-yellow-600">
                        Tümünü Uygula
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
