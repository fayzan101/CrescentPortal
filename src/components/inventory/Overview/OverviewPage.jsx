"use client";

import React from 'react';
import {
    Package,
    Store,
    FileText,
    ShoppingCart,
    ClipboardCheck,
    ArrowUpFromLine,
    RotateCcw,
    ArrowLeftRight,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/inventory/dashboard/useDashboardStats';

const STAT_CONFIG = [
    { key: 'items', label: 'Items', icon: Package, accent: 'bg-blue-500', light: 'bg-blue-50 text-blue-700' },
    { key: 'stores', label: 'Stores', icon: Store, accent: 'bg-violet-500', light: 'bg-violet-50 text-violet-700' },
    { key: 'purchaseRequests', label: 'Purchase Requests', icon: FileText, accent: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
    { key: 'purchaseOrders', label: 'Purchase Orders', icon: ShoppingCart, accent: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
    { key: 'grn', label: 'GRN', icon: ClipboardCheck, accent: 'bg-cyan-500', light: 'bg-cyan-50 text-cyan-700' },
    { key: 'issuance', label: 'Issuance', icon: ArrowUpFromLine, accent: 'bg-indigo-500', light: 'bg-indigo-50 text-indigo-700' },
    { key: 'returns', label: 'Returns', icon: RotateCcw, accent: 'bg-rose-500', light: 'bg-rose-50 text-rose-700' },
    { key: 'transfers', label: 'Transfers', icon: ArrowLeftRight, accent: 'bg-slate-500', light: 'bg-slate-50 text-slate-700' },
];

const OverviewPage = () => {
    const { data: dashboardStats, isLoading } = useDashboardStats();
    const statsPayload = dashboardStats?.data || dashboardStats || {};

    const resolveValue = (key) => {
        if (key === 'items') {
            return Number(statsPayload.items ?? statsPayload.totalItems ?? 0);
        }
        return Number(statsPayload[key] ?? 0);
    };

    return (
        <div className="bg-white m-5 rounded-2xl min-h-[calc(100vh-8rem)] p-6 md:p-8 shadow-sm border border-gray-100">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Inventory Overview</h1>
                <p className="text-sm text-gray-500 mt-1">
                    Snapshot of your inventory activity and document counts.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {STAT_CONFIG.map(({ key, label, icon: Icon, accent, light }) => (
                    <div
                        key={key}
                        className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md hover:border-gray-200"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-500">{label}</p>
                                <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 tabular-nums">
                                    {isLoading ? '—' : resolveValue(key).toLocaleString()}
                                </p>
                            </div>
                            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${light}`}>
                                <Icon size={22} strokeWidth={2} />
                            </div>
                        </div>
                        <div className={`absolute bottom-0 left-0 h-1 w-full ${accent} opacity-80`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OverviewPage;
