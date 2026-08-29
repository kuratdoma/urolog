import { Brain, Zap, Activity, Bone, Stethoscope, Users, Pill } from "lucide-react";
import React from "react";

export const ED_DRUG_DATABASE = [
    {
        category: "Antidepresan & Anksiyolitik",
        icon: Brain,
        color: "text-purple-600",
        bg: "bg-purple-50",
        drugs: [
            { generic: "Fluoksetin", brands: "Prozac, Zedprex, Fulsac, Depreks" },
            { generic: "Sertralin", brands: "Lustral, Selectra, Misol, Seralin" },
            { generic: "Sitalopram", brands: "Cipram, Citol, Vodalex" },
            { generic: "Amitriptilin", brands: "Laroxyl" },
            { generic: "Diazepam", brands: "Diazem, Nervium" },
            { generic: "Lorazepam", brands: "Ativan" },
            { generic: "Alprazolam", brands: "Xanax" },
            { generic: "Haloperidol", brands: "Haldol, Norodol" },
            { generic: "Klorpromazin", brands: "Largactil" },
            { generic: "Klomipramin", brands: "Anafranil" },
            { generic: "İmipramin", brands: "Tofranil" },
            { generic: "Buspiron", brands: "Buspon" }
        ]
    },
    {
        category: "Tansiyon & Diüretik",
        icon: Zap,
        color: "text-blue-600",
        bg: "bg-blue-50",
        drugs: [
            { generic: "Atenolol", brands: "Tensinor, Nortan" },
            { generic: "Propranolol", brands: "Dideral" },
            { generic: "Metoprolol", brands: "Beloc, Saneloc, Mecorad" },
            { generic: "Hidroklorotiyazid", brands: "Aldactazide" },
            { generic: "Furosemid", brands: "Lasix, Desal, Furomid" },
            { generic: "Spironolakton", brands: "Aldactone" },
            { generic: "Kaptopril", brands: "Kapril, Kaptoril" },
            { generic: "Enalapril", brands: "Enapril, Konveril" },
            { generic: "Nifedipin", brands: "Nidilat, Adalat Crono" },
            { generic: "Verapamil", brands: "Isoptin" },
            { generic: "Metildopa", brands: "Alfamet" }
        ]
    },
    {
        category: "Antiepileptik",
        icon: Activity,
        color: "text-amber-600",
        bg: "bg-amber-50",
        drugs: [
            { generic: "Valproik Asit", brands: "Depakin, Convulex" },
            { generic: "Levetirasetam", brands: "Keppra, Epixx, Levemax" },
            { generic: "Karbamazepin", brands: "Tegretol, Karazepin" }
        ]
    },
    {
        category: "Ağrı Kesici (Opioid/NSAİİ)",
        icon: Bone,
        color: "text-red-500",
        bg: "bg-red-50",
        drugs: [
            { generic: "İbuprofen", brands: "Advil, Dolorex, Arfen, Nurofen, Brufen" },
            { generic: "Naproksen", brands: "Apranax, Apraljin, Synax, Naprosyn" },
            { generic: "İndometazin", brands: "Endol" },
            { generic: "Kodein", brands: "Contramal" },
            { generic: "Buprenorfin", brands: "Suboxone" }
        ]
    },
    {
        category: "Mide & H2 Bloker",
        icon: Activity,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        drugs: [
            { generic: "Famotidin", brands: "Famodin, Famoser, Nevofam" },
            { generic: "Metoklopramid", brands: "Metpamid, Anti-Em" }
        ]
    },
    {
        category: "Hormon & Prostat",
        icon: Stethoscope,
        color: "text-indigo-600",
        bg: "bg-indigo-50",
        drugs: [
            { generic: "Finasterid", brands: "Proscar, Propecia, Dilaprost" },
            { generic: "Dutasterid", brands: "Avodart" },
            { generic: "Siproteron", brands: "Androcur" },
            { generic: "Bikalutamid", brands: "Casodex, Bicalu" },
            { generic: "Löprolid", brands: "Lucrin, Eligard" },
            { generic: "Goserelin", brands: "Zoladex" }
        ]
    },
    {
        category: "Parkinson",
        icon: Users,
        color: "text-slate-600",
        bg: "bg-slate-100",
        drugs: [
            { generic: "Levodopa", brands: "Madopar, Domir" },
            { generic: "Biperiden", brands: "Akineton" },
            { generic: "Bromokriptin", brands: "Parlodel" }
        ]
    },
    {
        category: "Diğer İlaçlar",
        icon: Pill,
        color: "text-teal-600",
        bg: "bg-teal-50",
        drugs: [
            { generic: "Ketokonazol", brands: "Nizoral, Konazol, Ketoral" },
            { generic: "Psödoefedrin", brands: "Sudafed, Katarin, A-ferin" },
            { generic: "Sumatriptan", brands: "Imigran" },
            { generic: "Atropin", brands: "Atropin Sülfat" }
        ]
    }
];
