"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// Route name mapping for Turkish labels
const routeLabels: Record<string, string> = {
    "dashboard": "Ana Sayfa",
    "patients": "Hastalar",
    "new": "Yeni",
    "edit": "Düzenle",
    "examination": "Muayene",
    "operation": "Operasyon",
    "followup": "Takip",
    "lab": "Laboratuvar",
    "imaging": "Görüntüleme",
    "documents": "Dökümanlar",
    "photos": "Fotoğraflar",
    "finance": "Finans",
    "income": "Gelir",
    "expense": "Gider",
    "accounts": "Kasalar",
    "reports": "Raporlar",
    "settings": "Ayarlar",
    "calendar": "Takvim",
    "operations": "Operasyonlar",
    "archive": "Arşiv",
};

// Detect if segment is a dynamic ID (UUID or numeric)
const isDynamicSegment = (segment: string): boolean => {
    // Check for UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
        return true;
    }
    // Check for numeric ID
    if (/^\d+$/.test(segment)) {
        return true;
    }
    return false;
};

interface BreadcrumbItem {
    label: string;
    href: string;
    isCurrentPage: boolean;
}

export function Breadcrumb() {
    const pathname = usePathname();

    // Don't show breadcrumb on dashboard
    if (pathname === "/dashboard") {
        return null;
    }

    const segments = pathname.split("/").filter(Boolean);

    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = "";

    segments.forEach((segment, index) => {
        currentPath += `/${segment}`;
        const isLast = index === segments.length - 1;

        let label = routeLabels[segment] || segment;

        // For dynamic segments, show a contextual label
        if (isDynamicSegment(segment)) {
            // Try to infer context from previous segment
            const prevSegment = segments[index - 1];
            if (prevSegment === "patients") {
                label = "Hasta Detay";
            } else if (prevSegment === "examination" || prevSegment === "muayene") {
                label = "Muayene Detay";
            } else if (prevSegment === "operation" || prevSegment === "operasyon") {
                label = "Operasyon Detay";
            } else {
                label = "Detay";
            }
        }

        breadcrumbs.push({
            label,
            href: currentPath,
            isCurrentPage: isLast,
        });
    });

    if (breadcrumbs.length === 0) {
        return null;
    }

    return (
        <nav aria-label="Breadcrumb" className="flex items-center space-x-1 text-sm">
            {/* Home Icon */}
            <Link
                href="/dashboard"
                className="flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Ana Sayfa"
            >
                <Home className="h-4 w-4" />
            </Link>

            {breadcrumbs.map((item, index) => (
                <React.Fragment key={item.href}>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-300 flex-shrink-0" />
                    {item.isCurrentPage ? (
                        <span
                            className="font-medium text-slate-700 truncate max-w-[200px]"
                            aria-current="page"
                        >
                            {item.label}
                        </span>
                    ) : (
                        <Link
                            href={item.href}
                            className={cn(
                                "text-slate-500 hover:text-slate-700 transition-colors truncate max-w-[150px]",
                                "hover:underline underline-offset-2"
                            )}
                        >
                            {item.label}
                        </Link>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
}
