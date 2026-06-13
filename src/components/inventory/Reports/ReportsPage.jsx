'use client';
import React, { useState, useMemo } from 'react';
import { Filter, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import DataTable from '@/components/components/DataTable';
import FieldWrapper from '@/components/ui/FieldWrapper';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useDropdownItems } from '@/hooks/inventory/utility/useDropdownItems';
import { useDropdownStores } from '@/hooks/inventory/utility/useDropdownStores';
import {
    getInventoryCardReport,
    getIssuanceReport,
    getPurchaseReport,
    getPurchaseRequestsReport,
    getReturnsReport,
    getStockReport,
    getTransfersReport,
} from '@/services/inventory-reports.service';

const REPORT_TYPE_OPTIONS = [
    { value: 'inventory-card', label: 'Inventory Card' },
    { value: 'stock', label: 'Stock Report' },
    { value: 'issuance', label: 'Issuance Report' },
    { value: 'returns', label: 'Returns Report' },
    { value: 'transfers', label: 'Transfers Report' },
    { value: 'purchase', label: 'Purchase Order Report' },
    { value: 'purchase-requests', label: 'Purchase Request Report' },
];

const REPORT_FETCHERS = {
    'inventory-card': getInventoryCardReport,
    stock: getStockReport,
    issuance: getIssuanceReport,
    returns: getReturnsReport,
    transfers: getTransfersReport,
    purchase: getPurchaseReport,
    'purchase-requests': getPurchaseRequestsReport,
};

const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const preferredKeys = ['data', 'items', 'results', 'list', 'rows', 'content'];
    for (const key of preferredKeys) {
        if (Array.isArray(data[key])) return data[key];
    }

    for (const value of Object.values(data)) {
        if (Array.isArray(value)) return value;
        if (value && typeof value === 'object') {
            const nested = normalizeList(value);
            if (nested.length > 0) return nested;
        }
    }

    return [];
};

const formatDate = (value) => {
    if (!value) return 'N/A';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString();
};

const statusBadgeClass = (status) => {
    const normalized = String(status || '').toUpperCase();
    if (['APPROVED', 'ISSUED', 'CONFIRMED', 'NEW'].includes(normalized)) {
        return 'bg-green-100 text-green-700';
    }
    if (['PARTIAL_RETURN', 'DRAFT', 'PENDING', 'SUBMITTED'].includes(normalized)) {
        return 'bg-yellow-100 text-yellow-700';
    }
    if (['FULL_RETURN'].includes(normalized)) {
        return 'bg-blue-100 text-blue-700';
    }
    if (['REJECTED'].includes(normalized)) {
        return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
};

const statusColumn = (key = 'status', label = 'Status') => ({
    key,
    label,
    width: '12%',
    render: (item) => (
        <span className={`px-3 py-1 rounded text-xs font-semibold ${statusBadgeClass(item[key])}`}>
            {item[key] || 'N/A'}
        </span>
    ),
});

const extractReportRows = (reportType, reportData) => {
    if (reportType === 'inventory-card' && reportData && !Array.isArray(reportData)) {
        return Array.isArray(reportData.rows) ? reportData.rows : [];
    }
    if (Array.isArray(reportData)) return reportData;
    if (Array.isArray(reportData?.data)) return reportData.data;
    if (Array.isArray(reportData?.rows)) return reportData.rows;
    return [];
};

const normalizePurchaseRequestReportRows = (rows) => {
    return rows.flatMap((pr) => {
        const lines = Array.isArray(pr.lines) ? pr.lines : [];
        const base = {
            store: pr.store?.storeName || 'N/A',
            office: pr.office?.officeName || 'N/A',
            requestNo: pr.requestNo || (pr.purchaseRequestId ? `PR-${String(pr.purchaseRequestId).padStart(6, '0')}` : 'N/A'),
            status: pr.status || 'N/A',
            createdAt: formatDate(pr.createdAt),
        };
        if (!lines.length) {
            return [{
                id: `pr-${pr.purchaseRequestId ?? 'header'}`,
                ...base,
                itemSKU: 'N/A',
                displayName: 'N/A',
                itemGroup: 'N/A',
                category: 'N/A',
                qty: 'N/A',
            }];
        }
        return lines.map((line, idx) => ({
            id: `${pr.purchaseRequestId}-${line.purchaseRequestLineId ?? idx}`,
            ...base,
            itemSKU: line.item?.sku || 'N/A',
            displayName: line.item?.itemName || `Item #${line.itemId ?? 'N/A'}`,
            itemGroup: line.item?.group?.groupName || 'N/A',
            category: line.item?.category?.categoryName || 'N/A',
            qty: line.qty ?? 'N/A',
        }));
    });
};

const normalizePurchaseOrderReportRows = (rows) => {
    return rows.flatMap((po) => {
        const lines = Array.isArray(po.lines) ? po.lines : [];
        const base = {
            store: po.store?.storeName || po.shipToStore?.storeName || 'N/A',
            office: po.shipToOffice?.officeName || 'N/A',
            poNo: po.poNo || (po.purchaseOrderId ? `PO-${String(po.purchaseOrderId).padStart(6, '0')}` : 'N/A'),
            prNo: po.purchaseRequest?.requestNo || (po.purchaseRequestId ? `PR-${po.purchaseRequestId}` : 'N/A'),
            vendor: po.vendor?.vendorName || 'N/A',
            status: po.status || 'N/A',
            createdAt: formatDate(po.createdAt),
        };
        if (!lines.length) {
            return [{
                id: `po-${po.purchaseOrderId ?? 'header'}`,
                ...base,
                itemSKU: 'N/A',
                displayName: 'N/A',
                itemGroup: 'N/A',
                category: 'N/A',
                qty: 'N/A',
            }];
        }
        return lines.map((line, idx) => ({
            id: `${po.purchaseOrderId}-${line.purchaseOrderLineId ?? idx}`,
            ...base,
            itemSKU: line.item?.sku || 'N/A',
            displayName: line.item?.itemName || `Item #${line.itemId ?? 'N/A'}`,
            itemGroup: line.item?.group?.groupName || 'N/A',
            category: line.item?.category?.categoryName || 'N/A',
            qty: line.qty ?? 'N/A',
        }));
    });
};

const normalizeIssuanceReportRows = (rows) =>
    rows.flatMap((row) => {
        const lines = Array.isArray(row.lines) ? row.lines : [];
        const base = {
            store: row.store?.storeName || 'N/A',
            issueNo: row.issuanceNo || row.issueNo || 'N/A',
            serviceNo: row.sourceReference || row.serviceNo || 'N/A',
            status: row.status || 'ISSUED',
            createdAt: formatDate(row.createdAt),
        };
        if (!lines.length) {
            return [{ id: `issuance-${row.issuanceId ?? 'header'}`, ...base, displayName: 'N/A', itemSKU: 'N/A', itemGroup: 'N/A', category: 'N/A', qty: 'N/A' }];
        }
        return lines.map((line, idx) => ({
            id: `${row.issuanceId}-${line.issuanceLineId ?? idx}`,
            ...base,
            displayName: line.item?.itemName || `Item #${line.itemId ?? 'N/A'}`,
            itemSKU: line.item?.sku || 'N/A',
            itemGroup: line.item?.group?.groupName || 'N/A',
            category: line.item?.category?.categoryName || 'N/A',
            qty: line.qty ?? 'N/A',
        }));
    });

const normalizeStockReportRows = (rows) =>
    rows.map((row, idx) => ({
        id: `${row.itemId ?? idx}-${row.storeId ?? idx}`,
        store: row.store?.storeName || 'N/A',
        displayName: row.item?.itemName || 'N/A',
        itemSKU: row.item?.sku || 'N/A',
        itemGroup: row.item?.group?.groupName || 'N/A',
        category: row.item?.category?.categoryName || 'N/A',
        balance: row.balance ?? 'N/A',
        totalIn: row.totalIn ?? 'N/A',
        totalOut: row.totalOut ?? 'N/A',
    }));

const normalizeInventoryCardRows = (rows) =>
    rows.map((row, idx) => ({
        id: row.stockLedgerId ?? row.id ?? idx + 1,
        store: row.store?.storeName || 'N/A',
        issueNo: row.referenceNo || row.reference || 'N/A',
        serviceNo: row.movementType || 'N/A',
        displayName: row.item?.itemName || 'N/A',
        itemSKU: row.item?.sku || 'N/A',
        itemGroup: row.item?.group?.groupName || 'N/A',
        category: row.item?.category?.categoryName || row.movementType || 'N/A',
        status: row.movementType || 'N/A',
        qtyIn: row.qtyIn ?? 0,
        qtyOut: row.qtyOut ?? 0,
        movementDate: formatDate(row.movementDate || row.createdAt),
    }));

const normalizeGenericLineReportRows = (rows, refKey, refLabel) =>
    rows.flatMap((row) => {
        const lines = Array.isArray(row.lines) ? row.lines : [];
        const refNo = row[`${refKey}No`] || row[refKey] || 'N/A';
        const base = {
            store: row.store?.storeName || row.fromStore?.storeName || 'N/A',
            issueNo: refNo,
            serviceNo: row.toStore?.storeName || row.remarks || 'N/A',
            status: row.status || 'N/A',
            createdAt: formatDate(row.createdAt),
        };
        if (!lines.length) {
            return [{ id: `${refKey}-${row.id ?? refNo}`, ...base, displayName: 'N/A', itemSKU: 'N/A', itemGroup: 'N/A', category: 'N/A', qty: 'N/A' }];
        }
        return lines.map((line, idx) => ({
            id: `${refKey}-${row.id ?? refNo}-${idx}`,
            ...base,
            displayName: line.item?.itemName || `Item #${line.itemId ?? 'N/A'}`,
            itemSKU: line.item?.sku || 'N/A',
            itemGroup: line.item?.group?.groupName || 'N/A',
            category: line.item?.category?.categoryName || 'N/A',
            qty: line.qty ?? line.qtyReceived ?? line.qtyReturned ?? 'N/A',
        }));
    });

const normalizeReportRows = (reportType, rawRows) => {
    switch (reportType) {
        case 'purchase-requests':
            return normalizePurchaseRequestReportRows(rawRows);
        case 'purchase':
            return normalizePurchaseOrderReportRows(rawRows);
        case 'issuance':
            return normalizeIssuanceReportRows(rawRows);
        case 'stock':
            return normalizeStockReportRows(rawRows);
        case 'inventory-card':
            return normalizeInventoryCardRows(rawRows);
        case 'returns':
            return normalizeGenericLineReportRows(rawRows, 'return', 'Return');
        case 'transfers':
            return normalizeGenericLineReportRows(rawRows, 'transfer', 'Transfer');
        default:
            return rawRows.map((item, idx) => ({
                id: item.id ?? idx + 1,
                store: item.store?.storeName || item.store || 'N/A',
                issueNo: item.issueNo || item.issuanceNo || 'N/A',
                serviceNo: item.serviceNo || 'N/A',
                displayName: item.name || item.item?.itemName || 'N/A',
                itemSKU: item.item?.sku || item.sku || 'N/A',
                itemGroup: item.item?.group?.groupName || 'N/A',
                category: item.item?.category?.categoryName || 'N/A',
                status: item.status || 'N/A',
            }));
    }
};

const getReportColumns = (reportType) => {
    switch (reportType) {
        case 'purchase-requests':
            return [
                { key: 'requestNo', label: 'PR #', width: '10%' },
                { key: 'store', label: 'Store', width: '14%' },
                { key: 'office', label: 'Office', width: '12%' },
                { key: 'displayName', label: 'Item Name', width: '16%' },
                { key: 'itemSKU', label: 'Item SKU', width: '14%' },
                { key: 'itemGroup', label: 'Item Group', width: '12%' },
                { key: 'category', label: 'Category', width: '12%' },
                { key: 'qty', label: 'Qty', width: '6%' },
                statusColumn('status', 'Status'),
                { key: 'createdAt', label: 'Created At', width: '14%' },
            ];
        case 'purchase':
            return [
                { key: 'poNo', label: 'PO #', width: '10%' },
                { key: 'prNo', label: 'PR #', width: '10%' },
                { key: 'store', label: 'Store', width: '12%' },
                { key: 'office', label: 'Office', width: '10%' },
                { key: 'vendor', label: 'Vendor', width: '12%' },
                { key: 'displayName', label: 'Item Name', width: '14%' },
                { key: 'itemSKU', label: 'Item SKU', width: '12%' },
                { key: 'itemGroup', label: 'Item Group', width: '10%' },
                { key: 'category', label: 'Category', width: '10%' },
                { key: 'qty', label: 'Qty', width: '6%' },
                statusColumn('status', 'Status'),
                { key: 'createdAt', label: 'Created At', width: '12%' },
            ];
        case 'stock':
            return [
                { key: 'store', label: 'Store', width: '16%' },
                { key: 'displayName', label: 'Item Name', width: '18%' },
                { key: 'itemSKU', label: 'Item SKU', width: '14%' },
                { key: 'itemGroup', label: 'Item Group', width: '14%' },
                { key: 'category', label: 'Category', width: '12%' },
                { key: 'balance', label: 'Balance', width: '10%' },
                { key: 'totalIn', label: 'Total In', width: '8%' },
                { key: 'totalOut', label: 'Total Out', width: '8%' },
            ];
        case 'inventory-card':
            return [
                { key: 'store', label: 'Store', width: '14%' },
                { key: 'movementDate', label: 'Date', width: '14%' },
                { key: 'displayName', label: 'Item Name', width: '16%' },
                { key: 'itemSKU', label: 'Item SKU', width: '14%' },
                { key: 'itemGroup', label: 'Item Group', width: '12%' },
                { key: 'category', label: 'Category', width: '12%' },
                { key: 'qtyIn', label: 'Qty In', width: '8%' },
                { key: 'qtyOut', label: 'Qty Out', width: '8%' },
                statusColumn('status', 'Movement'),
            ];
        default:
            return [
                { key: 'store', label: 'Store / Office', width: '16%' },
                { key: 'issueNo', label: 'Reference No.', width: '12%' },
                { key: 'serviceNo', label: 'Detail', width: '12%' },
                { key: 'displayName', label: 'Name', width: '16%' },
                { key: 'itemSKU', label: 'Item SKU', width: '14%' },
                { key: 'itemGroup', label: 'Item Group', width: '12%' },
                { key: 'category', label: 'Category', width: '10%' },
                { key: 'qty', label: 'Qty', width: '8%' },
                statusColumn('status', 'Status'),
                { key: 'createdAt', label: 'Created At', width: '14%' },
            ];
    }
};

const ReportsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [reportType, setReportType] = useState('inventory-card');
    const [filters, setFilters] = useState({
        itemId: '',
        storeId: '',
        dateFrom: '',
        dateTo: '',
    });
    const [activeParams, setActiveParams] = useState(null);
    const itemsQuery = useDropdownItems();
    const storesQuery = useDropdownStores();

    const itemOptions = useMemo(
        () =>
            normalizeList(itemsQuery.data).map((item) => ({
                value: String(item.id ?? item.itemId ?? item._id ?? item.value ?? ''),
                label: item.sku && item.name ? `${item.sku} - ${item.name}` : item.name || item.itemName || item.label || 'Unnamed Item',
            })),
        [itemsQuery.data]
    );

    const storeOptions = useMemo(
        () =>
            normalizeList(storesQuery.data).map((store) => ({
                value: String(store.id ?? store.storeId ?? store._id ?? store.value ?? ''),
                label: store.branchName || store.storeName || store.name || store.label || 'Unnamed Store',
            })),
        [storesQuery.data]
    );

    const { data: reportData, error: reportError, isLoading, isFetching } = useQuery({
        queryKey: ['inventory-report', reportType, activeParams],
        enabled: Boolean(activeParams),
        queryFn: () => {
            const fetcher = REPORT_FETCHERS[reportType] || getInventoryCardReport;
            return fetcher(activeParams || {});
        },
    });

    const data = useMemo(() => {
        const rawRows = extractReportRows(reportType, reportData);
        const normalized = normalizeReportRows(reportType, rawRows);
        return normalized.map((item) => ({
            ...item,
            name: [
                item.store,
                item.requestNo || item.poNo || item.issueNo,
                item.displayName,
                item.itemSKU,
                item.itemGroup,
                item.category,
            ].filter(Boolean).join(' '),
        }));
    }, [reportData, reportType]);

    const reportSummary = useMemo(() => ({
        balance: reportData?.balance ?? null,
        totalIn: reportData?.totalIn ?? null,
        totalOut: reportData?.totalOut ?? null,
    }), [reportData]);

    const handleGenerateReport = () => {
        const builtParams = {};
        if (filters.itemId) builtParams.item_id = Number(filters.itemId);
        if (filters.storeId) builtParams.store_id = Number(filters.storeId);
        if (filters.dateFrom) builtParams.date_from = filters.dateFrom;
        if (filters.dateTo) builtParams.date_to = filters.dateTo;

        if (builtParams.item_id && builtParams.item_id < 1) {
            toast.error('Item ID must be greater than 0');
            return;
        }
        if (builtParams.store_id && builtParams.store_id < 1) {
            toast.error('Store ID must be greater than 0');
            return;
        }
        if (builtParams.date_from && builtParams.date_to && builtParams.date_from > builtParams.date_to) {
            toast.error('Date From cannot be after Date To');
            return;
        }

        setActiveParams(builtParams);
    };

    const handleResetFilters = () => {
        setFilters({ itemId: '', storeId: '', dateFrom: '', dateTo: '' });
        setActiveParams({});
        setSearchTerm('');
    };

    const handleChangeFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const activeReportLabel = useMemo(() => {
        return REPORT_TYPE_OPTIONS.find((opt) => opt.value === reportType)?.label || 'Inventory Card';
    }, [reportType]);

    const handleExport = () => {
        toast.success('Export will be added in next update.');
    };

    const reportColumns = useMemo(() => getReportColumns(reportType), [reportType]);

    return (
        <div className="bg-white min-h-screen p-6">
            {isLoading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-4">
                        <Loader size={48} className="animate-spin text-blue-600" />
                        <p className="text-gray-600 font-medium">Loading reports...</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="mb-3 p-4 border border-gray-200 rounded-lg bg-gray-50 ">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 items-end ">
                            <FieldWrapper label="Report Type" className="text-sm">
                                <Select
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    options={REPORT_TYPE_OPTIONS}
                                    className="text-sm"
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Item" className="text-sm">
                                <Select
                                    value={filters.itemId}
                                    onChange={(e) => handleChangeFilter('itemId', e.target.value)}
                                    options={itemOptions}
                                    placeholder={itemsQuery.isLoading ? 'Loading items...' : 'Select Item'}
                                    className="text-sm"
                                    disabled={itemsQuery.isLoading}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Store" className="text-sm">
                                <Select
                                    value={filters.storeId}
                                    onChange={(e) => handleChangeFilter('storeId', e.target.value)}
                                    options={storeOptions}
                                    placeholder={storesQuery.isLoading ? 'Loading stores...' : 'Select Store'}
                                    className="text-sm"
                                    disabled={storesQuery.isLoading}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Date From" className="text-sm">
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => handleChangeFilter('dateFrom', e.target.value)}
                                    className="text-sm py-2 cursor-pointer"
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Date To" className="text-sm">
                                <Input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => handleChangeFilter('dateTo', e.target.value)}
                                    className="text-sm py-2 cursor-pointer"
                                />
                            </FieldWrapper>
                        </div>
                    </div>
                    <div className="flex gap-2 justify-end mb-6">
                        <button
                            onClick={handleGenerateReport}
                            className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-customBlue text-white font-semibold rounded-lg hover:bg-customBlue/90"
                        >
                            Generate
                        </button>
                        <button
                            onClick={handleResetFilters}
                            className="cursor-pointer flex items-center gap-2 px-6 py-2.5 text-gray-700 border border-gray-700 font-semibold rounded-lg hover:bg-gray-100"
                        >
                            Reset
                        </button>
                    </div>

                    {/* <div className="flex justify-between items-center mb-6 gap-4">
                        <button onClick={handleExport} className="border border-gray-300 p-2.5 rounded-lg hover:bg-gray-100 transition">
                            <Filter size={18} className="text-gray-600" />
                        </button>
                    </div> */}

                    {reportError ? (
                        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {reportError.message || 'Failed to load report data.'}
                        </div>
                    ) : null}

                    <div className="space-y-4">
                        <div className="px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 flex justify-between items-center">
                            <p className="text-sm font-semibold text-gray-700">{activeReportLabel}</p>
                            {isFetching && (
                                <div className="text-xs text-blue-600 flex items-center gap-2">
                                    <Loader size={14} className="animate-spin" />
                                    Refreshing report...
                                </div>
                            )}
                        </div>

                        {(reportSummary.balance !== null || reportSummary.totalIn !== null || reportSummary.totalOut !== null) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="border border-gray-200 rounded-lg px-3 py-2 bg-white">
                                    <p className="text-xs text-gray-500">Balance</p>
                                    <p className="text-base font-semibold text-gray-900">{reportSummary.balance ?? 'N/A'}</p>
                                </div>
                                <div className="border border-gray-200 rounded-lg px-3 py-2 bg-white">
                                    <p className="text-xs text-gray-500">Total In</p>
                                    <p className="text-base font-semibold text-green-700">{reportSummary.totalIn ?? 'N/A'}</p>
                                </div>
                                <div className="border border-gray-200 rounded-lg px-3 py-2 bg-white">
                                    <p className="text-xs text-gray-500">Total Out</p>
                                    <p className="text-base font-semibold text-red-700">{reportSummary.totalOut ?? 'N/A'}</p>
                                </div>
                            </div>
                        )}

                        {!activeParams ? (
                            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-gray-600">
                                Generate a report to view data.
                            </div>
                        ) : (
                            <DataTable
                                isLoading={false}
                                error={null}
                                items={data}
                                columns={reportColumns}
                                showView={false}
                                showEdit={false}
                                showDelete={false}
                                showToggle={false}
                                searchQuery={searchTerm}
                                onSearchChange={setSearchTerm}
                                tabName={activeReportLabel}
                                itemsPerPage={itemsPerPage}
                            />
                        )}
                    </div>

                </>
            )}
        </div>
    );
};

export default ReportsPage;
