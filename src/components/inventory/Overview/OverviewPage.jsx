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
    {
        key: 'items',
        label: 'Items',
        description: 'Active inventory SKUs',
        icon: Package,
        gradient: 'from-blue-500/10 via-blue-50 to-white',
        iconBg: 'bg-blue-500',
        iconRing: 'ring-blue-100',
        valueColor: 'text-blue-700',
        bar: 'bg-blue-500',
    },
    {
        key: 'stores',
        label: 'Stores',
        description: 'Warehouse locations',
        icon: Store,
        gradient: 'from-violet-500/10 via-violet-50 to-white',
        iconBg: 'bg-violet-500',
        iconRing: 'ring-violet-100',
        valueColor: 'text-violet-700',
        bar: 'bg-violet-500',
    },
    {
        key: 'purchaseRequests',
        label: 'Purchase Requests',
        description: 'Open & approved PRs',
        icon: FileText,
        gradient: 'from-amber-500/10 via-amber-50 to-white',
        iconBg: 'bg-amber-500',
        iconRing: 'ring-amber-100',
        valueColor: 'text-amber-700',
        bar: 'bg-amber-500',
    },
    {
        key: 'purchaseOrders',
        label: 'Purchase Orders',
        description: 'Orders placed to vendors',
        icon: ShoppingCart,
        gradient: 'from-emerald-500/10 via-emerald-50 to-white',
        iconBg: 'bg-emerald-500',
        iconRing: 'ring-emerald-100',
        valueColor: 'text-emerald-700',
        bar: 'bg-emerald-500',
    },
    {
        key: 'grn',
        label: 'GRN',
        description: 'Goods received notes',
        icon: ClipboardCheck,
        gradient: 'from-cyan-500/10 via-cyan-50 to-white',
        iconBg: 'bg-cyan-500',
        iconRing: 'ring-cyan-100',
        valueColor: 'text-cyan-700',
        bar: 'bg-cyan-500',
    },
    {
        key: 'issuance',
        label: 'Issuance',
        description: 'Stock issued out',
        icon: ArrowUpFromLine,
        gradient: 'from-indigo-500/10 via-indigo-50 to-white',
        iconBg: 'bg-indigo-500',
        iconRing: 'ring-indigo-100',
        valueColor: 'text-indigo-700',
        bar: 'bg-indigo-500',
    },
    {
        key: 'returns',
        label: 'Returns',
        description: 'Returned to store',
        icon: RotateCcw,
        gradient: 'from-rose-500/10 via-rose-50 to-white',
        iconBg: 'bg-rose-500',
        iconRing: 'ring-rose-100',
        valueColor: 'text-rose-700',
        bar: 'bg-rose-500',
    },
    {
        key: 'transfers',
        label: 'Transfers',
        description: 'Inter-store movements',
        icon: ArrowLeftRight,
        gradient: 'from-slate-500/10 via-slate-50 to-white',
        iconBg: 'bg-slate-600',
        iconRing: 'ring-slate-100',
        valueColor: 'text-slate-700',
        bar: 'bg-slate-600',
    },
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
            <div className="mb-8 md:mb-10">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Inventory Overview</h1>
                <p className="text-sm md:text-base text-gray-500 mt-2 max-w-2xl">
                    A live snapshot of your stock, locations, and procurement activity.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 md:gap-6">
                {STAT_CONFIG.map(({ key, label, description, icon: Icon, gradient, iconBg, iconRing, valueColor, bar }) => (
                    <div
                        key={key}
                        className={`group relative overflow-hidden rounded-2xl border border-gray-100/80 bg-gradient-to-br ${gradient} min-h-[168px] md:min-h-[180px] p-6 md:p-7 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-200`}
                    >
                        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/40 blur-2xl transition group-hover:scale-110" />

                        <div className="relative flex h-full flex-col justify-between gap-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-gray-600">{label}</p>
                                    <p className="mt-1 text-xs text-gray-400 leading-snug">{description}</p>
                                </div>
                                <div
                                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconBg} text-white shadow-md ring-4 ${iconRing} transition-transform duration-300 group-hover:scale-105`}
                                >
                                    <Icon size={26} strokeWidth={2} />
                                </div>
                            </div>

                            <div>
                                {isLoading ? (
                                    <div className="h-10 w-24 animate-pulse rounded-lg bg-gray-200/80" />
                                ) : (
                                    <p className={`text-4xl md:text-[2.75rem] font-bold leading-none tracking-tight tabular-nums ${valueColor}`}>
                                        {resolveValue(key).toLocaleString()}
                                    </p>
                                )}
                                <p className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-400">
                                    Total count
                                </p>
                            </div>
                        </div>

                        <div className={`absolute bottom-0 left-0 h-1.5 w-full ${bar} opacity-90 transition-all duration-300 group-hover:h-2`} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OverviewPage;
