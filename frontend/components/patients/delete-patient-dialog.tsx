'use client';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { AlertTriangle } from "lucide-react"

interface DeletePatientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

export function DeletePatientDialog({ open, onOpenChange, onConfirm, isDeleting }: DeletePatientDialogProps) {
    const [confirmText, setConfirmText] = useState("")

    const handleConfirm = () => {
        if (confirmText === "DELETE") {
            onConfirm()
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600 font-bold">
                        <AlertTriangle className="h-5 w-5" />
                        HASTA SİLME İŞLEMİ
                    </DialogTitle>
                    <DialogDescription className="pt-4 space-y-3" asChild>
                        <div>
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-800 text-sm font-medium">
                                Bu işlem geri alınamaz! Hastaya ait tüm randevular, muayeneler ve diğer kayıtlar silinecektir.
                            </div>
                            <p className="text-slate-600">
                                Silme işlemini onaylamak için lütfen aşağıdaki kutuya <span className="font-bold text-slate-900">DELETE</span> yazın.
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <Input
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="border-red-200 focus-visible:ring-red-500 font-mono tracking-wider"
                    />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
                        Vazgeç
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={confirmText !== "DELETE" || isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? "Siliniyor..." : "KALICI OLARAK SİL!"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
