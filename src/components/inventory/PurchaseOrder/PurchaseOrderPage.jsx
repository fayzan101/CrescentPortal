"use client";

import React, { useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader, Download } from 'lucide-react';
import DataTable from '../../components/DataTable';
import FieldWrapper from '../../ui/FieldWrapper';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { useOffices } from '@/hooks/office/useOffices';
import { useCities } from '@/hooks/city/useCities';
import { useDropdownItems } from '@/hooks/inventory/utility/useDropdownItems';
import { useItems } from '@/hooks/inventory/items/useItems';
import { useDropdownVendors } from '@/hooks/inventory/utility/useDropdownVendors';
import { usePurchaseOrders } from '@/hooks/inventory/purchase orders/usePurchaseOrders';
import { useCreatePurchaseOrder } from '@/hooks/inventory/purchase orders/useCreatePurchaseOrder';
import { useDeletePurchaseOrder } from '@/hooks/inventory/purchase orders/useDeletePurchaseOrder';
import { useApprovePurchaseOrder } from '@/hooks/inventory/purchase orders/useApprovePurchaseOrder';
import { useRejectPurchaseOrder } from '@/hooks/inventory/purchase orders/useRejectPurchaseOrder';
import { useDownloadPurchaseOrderPdf } from '@/hooks/inventory/purchase orders/useDownloadPurchaseOrderPdf';
import { useApprovePurchaseRequest } from '@/hooks/inventory/purchase request/useApprovePurchaseRequest';
import { useRejectPurchaseRequest } from '@/hooks/inventory/purchase request/useRejectPurchaseRequest';
import { usePurchaseRequests } from '@/hooks/inventory/purchase request/usePurchaseRequests';
import { getPurchaseRequestById } from '@/services/inventory.pr.service';
import {
    resolveItemRecordId,
    resolveItemUnitOfMeasurement,
    purchaseRequestLineList,
} from '@/lib/inventoryItemMeta';

function formatMoney(value) {
    if (value === undefined || value === null || value === '') return 'N/A';
    const asNumber = Number(value);
    if (!Number.isFinite(asNumber)) return String(value);
    return asNumber.toFixed(2);
}

function extractItemRecord(payload) {
    if (Array.isArray(payload)) return payload[0] || null;
    if (!payload || typeof payload !== 'object') return null;
    const preferredKeys = ['data', 'item', 'result', 'details'];
    for (const key of preferredKeys) {
        const candidate = payload[key];
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
    }
    return payload;
}

function extractPurchaseRequestRecord(payload) {
    if (Array.isArray(payload)) return payload[0] || null;
    if (!payload || typeof payload !== 'object') return null;
    const preferredKeys = ['data', 'purchaseRequest', 'item', 'result', 'details'];
    for (const key of preferredKeys) {
        const candidate = payload[key];
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
    }
    return payload;
}

function toDatetimeLocalValue(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toOptionalAmount(value) {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const PurchaseOrderPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [previewPO, setPreviewPO] = useState(null);
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, poId: null });
    const [submitError, setSubmitError] = useState('');
    const [poActionPendingId, setPoActionPendingId] = useState(null);
    const [poRejectReason, setPoRejectReason] = useState('');
    const [purchaseRequestActionPendingId, setPurchaseRequestActionPendingId] = useState(null);
    const [purchaseRequestRejectReason, setPurchaseRequestRejectReason] = useState('');

    const [formData, setFormData] = useState({
        officeId: '',
        office: '',
        vendorId: '',
        vendorName: '',
        user: '1 - Admin User',
        date: '',
        expectedDeliveryDate: '',
        taxAmount: '',
        shippingCost: '',
        discountAmount: '',
        notes: '',
        poItems: [],
        currentItem: {
            itemId: '',
            itemName: '',
            unitOfMeasurement: '',
            quantityOrdered: 1,
            unitPrice: '',
            totalPrice: ''
        }
    });

    const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];

        const preferredKeys = ['data', 'items', 'results', 'list', 'rows', 'purchaseOrders', 'orders', 'content'];
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

    const purchaseOrdersQuery = usePurchaseOrders();
    const purchaseRequestsQuery = usePurchaseRequests();
    const officesQuery = useOffices(undefined, { enabled: true });
    const citiesQuery = useCities();
    const itemsQuery = useDropdownItems();
    const inventoryItemsQuery = useItems();

    const cities = useMemo(() => {
        return normalizeList(citiesQuery.data).map((city) => ({
            ...city,
            cityId: city.cityId ?? city.id,
            cityName: city.cityName || city.name || '',
        }));
    }, [citiesQuery.data]);

    const resolveCityIdFromName = (name) => {
        if (!name) return null;
        const normalized = String(name).trim().toLowerCase();
        const city = cities.find((c) => String(c.cityName).trim().toLowerCase() === normalized);
        return city?.cityId ?? null;
    };

    const offices = useMemo(() => {
        return normalizeList(officesQuery.data).map((office) => {
            const branchName = office.branchName || office.officeName || office.name || '';
            const cityId =
                office.cityId ??
                office.city?.cityId ??
                resolveCityIdFromName(branchName) ??
                resolveCityIdFromName(office.officeName);
            return {
                ...office,
                id: office.id ?? office.officeId ?? office._id,
                branchName,
                cityId,
            };
        });
    }, [officesQuery.data, cities]);

    const officeOptions = useMemo(
        () => offices.map((office) => ({ value: String(office.id), label: office.branchName })),
        [offices]
    );

    const selectedOfficeCityId = useMemo(() => {
        if (!formData.officeId) return null;
        const office = offices.find((o) => String(o.id) === String(formData.officeId));
        return office?.cityId ?? null;
    }, [offices, formData.officeId]);

    const vendorsQuery = useDropdownVendors(selectedOfficeCityId ?? undefined, {
        enabled: !!formData.officeId,
    });

    const normalizedItems = useMemo(() => {
        return normalizeList(itemsQuery.data).map((item) => ({
            ...item,
            id: resolveItemRecordId(item) || (item.id ?? item.itemId ?? item._id ?? item.value),
            name: item.name || item.itemName || item.label || '',
            unitOfMeasurement: resolveItemUnitOfMeasurement(item),
            price: item.amount ?? item.totalAmount ?? item.unitPrice ?? item.price ?? item.rate ?? 0,
        }));
    }, [itemsQuery.data]);

    const inventoryItems = useMemo(() => {
        return normalizeList(inventoryItemsQuery.data).map((item) => {
            const details = extractItemRecord(item) || item;
            return {
                ...details,
                id: resolveItemRecordId(details) || resolveItemRecordId(item),
                name: details.name || details.itemName || details.label || '',
                sku: details.sku || details.itemSku || '',
                unitOfMeasurement: resolveItemUnitOfMeasurement(details) || resolveItemUnitOfMeasurement(item),
                unitPrice: details.amount ?? details.unitPrice ?? details.price ?? 0,
                taxAmount: details.taxAmount ?? 0,
                totalAmount: details.totalAmount ?? null,
                categoryName:
                    details?.category?.categoryName ||
                    details?.category?.name ||
                    details?.categoryName ||
                    '',
                subCategoryName:
                    details?.subCategory?.subCategoryName ||
                    details?.subCategory?.name ||
                    details?.subCategoryName ||
                    '',
            };
        });
    }, [inventoryItemsQuery.data]);

    const inventoryItemLookup = useMemo(() => {
        const map = new Map();
        inventoryItems.forEach((item) => map.set(String(item.id), item));
        return map;
    }, [inventoryItems]);

    const itemOptions = useMemo(
        () => normalizedItems.map((item) => ({ value: String(item.id), label: item.sku ? `${item.sku} - ${item.name}` : item.name })),
        [normalizedItems]
    );

    const normalizedVendors = useMemo(() => {
        return normalizeList(vendorsQuery.data).map((vendor) => ({
            ...vendor,
            id: vendor.id ?? vendor.vendorId ?? vendor._id,
            name: vendor.name || vendor.vendorName || vendor.label || '',
            cityId: vendor.cityId ?? vendor.city?.cityId ?? null,
            address: vendor.address || '',
        }));
    }, [vendorsQuery.data]);

    const resolveVendorCityId = (vendor) => {
        if (vendor.cityId) return vendor.cityId;
        const address = String(vendor.address || '').toLowerCase();
        if (!address) return null;
        for (const city of cities) {
            const cityName = String(city.cityName || '').trim().toLowerCase();
            if (cityName && address.includes(cityName)) return city.cityId;
        }
        return null;
    };

    const filteredVendors = useMemo(() => {
        if (!formData.officeId) return [];
        if (!selectedOfficeCityId) return normalizedVendors;
        return normalizedVendors.filter(
            (vendor) => String(resolveVendorCityId(vendor) ?? '') === String(selectedOfficeCityId)
        );
    }, [normalizedVendors, selectedOfficeCityId, formData.officeId, cities]);

    const vendorOptions = useMemo(
        () => filteredVendors.map((vendor) => ({ value: String(vendor.id), label: vendor.name })),
        [filteredVendors]
    );

    const rawPurchaseOrders = useMemo(
        () => normalizeList(purchaseOrdersQuery.data),
        [purchaseOrdersQuery.data]
    );

    const purchaseRequestIdsForOrders = useMemo(() => {
        const ids = new Set();
        rawPurchaseOrders.forEach((order) => {
            const prId = order.purchaseRequestId ?? order.purchaseRequest?.id ?? order.prId ?? null;
            if (prId !== null && prId !== undefined && prId !== '') {
                ids.add(String(prId));
            }
        });
        return Array.from(ids);
    }, [rawPurchaseOrders]);

    const purchaseRequestDetailsQueries = useQueries({
        queries: purchaseRequestIdsForOrders.map((id) => ({
            queryKey: ['purchase-request', id],
            queryFn: () => getPurchaseRequestById(id),
            enabled: !!id,
        })),
    });

    const purchaseRequestOfficeById = useMemo(() => {
        const map = new Map();
        purchaseRequestDetailsQueries.forEach((queryResult, index) => {
            if (!queryResult?.data) return;
            const prId = purchaseRequestIdsForOrders[index];
            const request = extractPurchaseRequestRecord(queryResult.data);
            if (!request) return;
            map.set(String(prId), {
                officeId: request.officeId ?? request.office?.id ?? request.office?.officeId ?? '',
                officeName: request.officeName || request.office?.branchName || request.branchName || '',
            });
        });
        return map;
    }, [purchaseRequestDetailsQueries, purchaseRequestIdsForOrders]);

    const normalizedOrders = useMemo(() => {
        return rawPurchaseOrders.map((order) => {
            const purchaseRequestId = order.purchaseRequestId ?? order.purchaseRequest?.id ?? order.prId ?? null;
            const prOffice = purchaseRequestOfficeById.get(String(purchaseRequestId ?? ''));
            const resolvedOfficeId = prOffice?.officeId ?? '';
            const vendorId = order.vendorId ?? order.vendor?.vendorId ?? order.vendor?.id ?? '';
            const vendorFromList = normalizedVendors.find((vendor) => String(vendor.id) === String(vendorId));
            return ({
            ...order,
            id: order.purchaseOrderId ?? order.id ?? order._id,
            officeId: resolvedOfficeId,
            officeName:
                prOffice?.officeName ||
                offices.find((office) => String(office.id) === String(resolvedOfficeId))?.branchName ||
                'N/A',
            storeId: order.storeId ?? order.store?.storeId ?? order.store?.id ?? '',
            storeName: order.storeName || order.store?.storeName || order.store?.name || '',
            vendorId,
            vendorName:
                order.vendorName ||
                order.vendor?.vendorName ||
                order.vendor?.name ||
                vendorFromList?.name ||
                '',
            userId: order.userId || order.createdBy || order.userEmail || '',
            lines: Array.isArray(order.lines) ? order.lines : Array.isArray(order.items) ? order.items : [],
            lineCount: Array.isArray(order.lines) ? order.lines.length : Array.isArray(order.items) ? order.items.length : 0,
            purchasedRequestNo:
                order.purchasedRequestNo ||
                order.purchaseRequestNo ||
                order.prNo ||
                order.purchaseRequest?.requestNo ||
                (order.purchaseRequestId ? `PR-${String(order.purchaseRequestId).padStart(6, '0')}` : ''),
            purchaseOrderNo:
                order.purchaseOrderNo ||
                order.poNo ||
                order.code ||
                (order.purchaseOrderId ? `PO-${String(order.purchaseOrderId).padStart(6, '0')}` : ''),
            createdOn: order.createdOn || order.createdAt || order.date || '',
            approvalStatus: String(order.approvalStatus || order.status || 'DRAFT').toUpperCase(),
            deliveryStatus: String(order.deliveryStatus || order.delivery_state || 'PENDING').toUpperCase(),
            });
        });
    }, [normalizedVendors, offices, purchaseRequestOfficeById, rawPurchaseOrders]);

    const normalizedPurchaseRequests = useMemo(() => {
        return normalizeList(purchaseRequestsQuery.data).map((request) => {
            const id = request.id ?? request.requestId ?? request.purchaseRequestId ?? request._id;
            const lines = purchaseRequestLineList(request);
            const status = String(request.status || request.approvalStatus || 'DRAFT').toUpperCase();
            return {
                ...request,
                id,
                status,
                requestNo:
                    request.purchaseRequestNo ||
                    request.requestNo ||
                    request.name ||
                    (id != null ? `PR-${id}` : ''),
                items: lines,
                lineCount: lines.length,
                officeId: request.officeId ?? request.office?.id ?? '',
                officeName: request.officeName || request.office?.branchName || request.branchName || '',
                storeId: request.storeId ?? request.store?.id ?? '',
                storeName: request.storeName || request.store?.name || '',
            };
        });
    }, [purchaseRequestsQuery.data]);

    const purchaseRequestOptions = useMemo(
        () =>
            normalizedPurchaseRequests
                .filter((request) => request.id && !['APPROVED', 'REJECTED'].includes(request.status))
                .map((request) => ({
                    value: String(request.id),
                    label: String(request.requestNo || `PR-${request.id}`),
                })),
        [normalizedPurchaseRequests]
    );

    const selectedPurchaseRequest = useMemo(
        () => normalizedPurchaseRequests.find((request) => String(request.id) === String(formData.purchaseRequestId || '')) || null,
        [normalizedPurchaseRequests, formData.purchaseRequestId]
    );

    const isSelectedPurchaseRequestActionPending =
        purchaseRequestActionPendingId != null && String(purchaseRequestActionPendingId) === String(selectedPurchaseRequest?.id);
    const canActOnSelectedPurchaseRequest = Boolean(selectedPurchaseRequest && !['APPROVED', 'REJECTED'].includes(selectedPurchaseRequest.status));

    const resetForm = () => ({
        purchaseRequestId: '',
        officeId: '',
        office: '',
        vendorId: '',
        vendorName: '',
        user: '1 - Admin User',
        date: '',
        expectedDeliveryDate: '',
        taxAmount: '',
        shippingCost: '',
        discountAmount: '',
        notes: '',
        poItems: [],
        currentItem: {
            itemId: '',
            itemName: '',
            unitOfMeasurement: '',
            quantityOrdered: 1,
            unitPrice: '',
            totalPrice: ''
        }
    });

    const getPurchaseOrderId = (order) => {
        if (!order) return null;
        if (typeof order === 'string' || typeof order === 'number') return order;
        return order.id ?? order.purchaseOrderId ?? order._id ?? null;
    };

    const { mutate: createPurchaseOrder, mutateAsync: createPurchaseOrderAsync, isPending: isCreating } = useCreatePurchaseOrder({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            setShowAddModal(false);
            setSubmitError('');
            setPurchaseRequestActionPendingId(null);
            setPurchaseRequestRejectReason('');
            setFormData(resetForm());
        },
        onError: (error) => {
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to create purchase order.');
        },
    });

    const { mutate: deletePurchaseOrder, isPending: isDeleting } = useDeletePurchaseOrder({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            setDeleteModal({ isOpen: false, poId: null });
        },
    });

    const { mutate: approvePurchaseOrder } = useApprovePurchaseOrder({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            setPoActionPendingId(null);
            setPreviewPO((prev) => (prev ? { ...prev, approvalStatus: 'APPROVED' } : prev));
            setPoRejectReason('');
        },
        onError: (error) => {
            setPoActionPendingId(null);
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to approve purchase order.');
        },
    });

    const { mutate: rejectPurchaseOrder } = useRejectPurchaseOrder({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            setPoActionPendingId(null);
            setPreviewPO((prev) => (prev ? { ...prev, approvalStatus: 'REJECTED' } : prev));
            setPoRejectReason('');
        },
        onError: (error) => {
            setPoActionPendingId(null);
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to reject purchase order.');
        },
    });
    const { mutateAsync: downloadPurchaseOrderPdf, isPending: isDownloadingPoPdf } = useDownloadPurchaseOrderPdf({
        onError: (error) => {
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to download purchase order PDF.');
        },
    });

    const { mutate: approvePurchaseRequest, mutateAsync: approvePurchaseRequestAsync } = useApprovePurchaseRequest({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
            setPurchaseRequestRejectReason('');
        },
        onError: (error) => {
            setPurchaseRequestActionPendingId(null);
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to approve purchase request.');
        },
    });

    const { mutate: rejectPurchaseRequest } = useRejectPurchaseRequest({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
            setPurchaseRequestActionPendingId(null);
            setPurchaseRequestRejectReason('');
            setFormData((prev) => ({
                ...prev,
                purchaseRequestId: '',
                poItems: [],
                currentItem: {
                    itemId: '',
                    itemName: '',
                    unitOfMeasurement: '',
                    quantityOrdered: 1,
                    unitPrice: '',
                    totalPrice: ''
                }
            }));
        },
        onError: (error) => {
            setPurchaseRequestActionPendingId(null);
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to reject purchase request.');
        },
    });

    const filteredOrders = useMemo(() => {
        const term = searchTerm.toLowerCase();
        return normalizedOrders.filter((order) =>
            (order.storeName || '').toLowerCase().includes(term) ||
            (order.vendorName || '').toLowerCase().includes(term) ||
            String(order.officeId || '').toLowerCase().includes(term) ||
            (order.userId || '').toLowerCase().includes(term) ||
            (order.purchasedRequestNo || '').toLowerCase().includes(term) ||
            (order.purchaseOrderNo || '').toLowerCase().includes(term)
        );
    }, [normalizedOrders, searchTerm]);

    const calculateTotalAmount = (lines = []) => {
        return lines.reduce((sum, line) => {
            const meta = getLineDisplayMeta(line);
            const asNumber = Number(meta.totalAmount);
            return sum + (Number.isFinite(asNumber) ? asNumber : 0);
        }, 0);
    };

    const tableColumns = [
        { key: 'purchaseOrderNo', label: 'PO #', width: '14%' },
        { key: 'purchasedRequestNo', label: 'PR #', width: '14%' },
        { key: 'officeName', label: 'Office', width: '12%', render: (item) => item.officeName || 'N/A' },
        { key: 'storeName', label: 'Store', width: '16%', render: (item) => item.storeName || 'N/A' },
        { key: 'vendorName', label: 'Vendor', width: '16%', render: (item) => item.vendorName || 'N/A' },
        {
            key: 'totalAmount',
            label: 'Total Amount',
            width: '10%',
            render: (item) => formatMoney(calculateTotalAmount(item.lines || [])),
        },
        { key: 'createdOn', label: 'Created At', width: '16%', render: (item) => item.createdOn ? new Date(item.createdOn).toLocaleString() : 'N/A' },
        {
            key: 'approvalStatus',
            label: 'Approval Status',
            width: '12%',
            render: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                    item.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                    item.approvalStatus === 'SUBMITTED' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                }`}>
                    {item.approvalStatus}
                </span>
            )
        },
        {
            key: 'deliveryStatus',
            label: 'Delivery Status',
            width: '12%',
            render: (item) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    item.deliveryStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                    item.deliveryStatus === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                }`}>
                    {item.deliveryStatus}
                </span>
            )
        }
    ];

    const handleOpenModal = () => {
        setSubmitError('');
        setFormData(resetForm());
        setPurchaseRequestRejectReason('');
        setPurchaseRequestActionPendingId(null);
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setSubmitError('');
        setFormData(resetForm());
        setPurchaseRequestRejectReason('');
        setPurchaseRequestActionPendingId(null);
    };

    const handleQuantityChange = (e) => {
        const value = Math.max(1, parseInt(e.target.value, 10) || 1);
        const unitPrice = formData.currentItem.unitPrice;
        setFormData((prev) => ({
            ...prev,
            currentItem: {
                ...prev.currentItem,
                quantityOrdered: value,
                totalPrice: unitPrice ? (value * parseFloat(unitPrice)).toFixed(2) : ''
            }
        }));
    };

    const handleUnitPriceChange = (e) => {
        const unitPrice = e.target.value;
        const qty = formData.currentItem.quantityOrdered;
        setFormData((prev) => ({
            ...prev,
            currentItem: {
                ...prev.currentItem,
                unitPrice,
                totalPrice: unitPrice && qty ? (parseFloat(unitPrice) * qty).toFixed(2) : ''
            }
        }));
    };

    const handleIncrement = () => {
        const newQty = formData.currentItem.quantityOrdered + 1;
        const unitPrice = formData.currentItem.unitPrice;
        setFormData((prev) => ({
            ...prev,
            currentItem: {
                ...prev.currentItem,
                quantityOrdered: newQty,
                totalPrice: unitPrice ? (newQty * parseFloat(unitPrice)).toFixed(2) : ''
            }
        }));
    };

    const handleDecrement = () => {
        const newQty = Math.max(1, formData.currentItem.quantityOrdered - 1);
        const unitPrice = formData.currentItem.unitPrice;
        setFormData((prev) => ({
            ...prev,
            currentItem: {
                ...prev.currentItem,
                quantityOrdered: newQty,
                totalPrice: unitPrice ? (newQty * parseFloat(unitPrice)).toFixed(2) : ''
            }
        }));
    };

    const handleAddItem = () => {
        const { currentItem } = formData;
        if (!currentItem.itemId || !currentItem.unitPrice || currentItem.quantityOrdered < 1) return;

        setFormData((prev) => ({
            ...prev,
            poItems: [...prev.poItems, { ...currentItem, id: Date.now() }],
            currentItem: {
                itemId: '',
                itemName: '',
                unitOfMeasurement: '',
                quantityOrdered: 1,
                unitPrice: '',
                totalPrice: ''
            }
        }));
    };

    const handleSaveCurrentItemToReview = () => {
        const current = formData.currentItem;
        if (!current.itemId || current.quantityOrdered < 1) return;

        const qty = Math.max(1, Number.parseInt(current.quantityOrdered, 10) || 1);
        const unitPriceNum = Number(current.unitPrice) || 0;
        const nextRow = {
            ...current,
            itemId: String(current.itemId),
            quantityOrdered: qty,
            unitPrice: String(current.unitPrice ?? ''),
            totalPrice: String((qty * unitPriceNum).toFixed(2)),
        };

        setFormData((prev) => {
            const existingIndex = prev.poItems.findIndex(
                (row) => String(row.itemId) === String(current.itemId)
            );
            if (existingIndex >= 0) {
                const updated = [...prev.poItems];
                updated[existingIndex] = { ...updated[existingIndex], ...nextRow };
                return { ...prev, poItems: updated };
            }
            return {
                ...prev,
                poItems: [...prev.poItems, { ...nextRow, id: Date.now() }],
            };
        });
    };

    const handleRemoveItem = (id) => {
        setFormData((prev) => ({ ...prev, poItems: prev.poItems.filter((item) => item.id !== id) }));
    };

    const recalculatePoLineTotal = (item) => {
        const qty = Math.max(1, Number.parseInt(item.quantityOrdered, 10) || 1);
        const unitPrice = Number(item.unitPrice) || 0;
        const taxAmount = Number(item.taxAmount) || 0;
        return (qty * unitPrice + taxAmount).toFixed(2);
    };

    const handleUpdatePoItemField = (rowId, field, rawValue) => {
        setFormData((prev) => ({
            ...prev,
            poItems: prev.poItems.map((item) => {
                if (item.id !== rowId) return item;
                const updated = { ...item, [field]: rawValue };
                if (field === 'quantityOrdered') {
                    updated.quantityOrdered = Math.max(1, Number.parseInt(rawValue, 10) || 1);
                }
                updated.totalPrice = recalculatePoLineTotal(updated);
                return updated;
            }),
        }));
    };

    const buildPurchaseOrderPayload = () => {
        if (!formData.officeId) {
            return { error: 'Please select an Office first.' };
        }
        if (!formData.purchaseRequestId) {
            return { error: 'Please select a Purchase Request first.' };
        }
        if (!formData.vendorId) {
            return { error: 'Please select a Vendor first.' };
        }
        const itemsToSubmit = [...formData.poItems];

        if (itemsToSubmit.length === 0) {
            return { error: 'Please add at least one PO line.' };
        }

        const purchaseRequestId = Number.parseInt(formData.purchaseRequestId, 10);
        const vendorId = Number.parseInt(formData.vendorId, 10);

        if (!Number.isInteger(purchaseRequestId) || purchaseRequestId < 1) {
            return { error: 'Purchase Request must be a valid ID.' };
        }
        if (!Number.isInteger(vendorId) || vendorId < 1) {
            return { error: 'Vendor must be a valid ID.' };
        }

        return {
            purchaseRequestId,
            vendorId,
            shipToOfficeId: Number(formData.officeId) || Number(selectedPurchaseRequest?.officeId) || undefined,
            shipToStoreId: Number(selectedPurchaseRequest?.storeId) || undefined,
            remarks: formData.notes?.trim() || undefined,
            taxAmount: toOptionalAmount(
                formData.poItems.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0) || formData.taxAmount
            ),
            shippingCost: toOptionalAmount(formData.shippingCost),
            discountAmount: toOptionalAmount(formData.discountAmount),
            expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
            lines: itemsToSubmit.map((item) => {
                const qty = Math.max(1, Number.parseInt(item.quantityOrdered, 10) || 1);
                const unitPrice = Number(item.unitPrice);
                const totalPrice = Number(item.totalPrice);
                const line = {
                    itemId: Number(item.itemId),
                    qty,
                };
                if (Number.isFinite(unitPrice) && unitPrice >= 0) {
                    line.unitPrice = unitPrice;
                }
                if (Number.isFinite(totalPrice) && totalPrice >= 0) {
                    line.totalPrice = totalPrice;
                }
                return line;
            }),
        };
    };

    const handleSubmit = () => {
        const result = buildPurchaseOrderPayload();
        if (result?.error) {
            setSubmitError(result.error);
            return;
        }

        setSubmitError('');
        createPurchaseOrder(result);
    };

    const handleDelete = (itemId) => {
        const resolvedId = getPurchaseOrderId(itemId);
        if (!resolvedId) return;
        setDeleteModal({ isOpen: true, poId: resolvedId });
    };

    const handleConfirmDelete = () => {
        if (!deleteModal.poId) return;
        deletePurchaseOrder(deleteModal.poId);
    };

    const handleApproveSelectedPurchaseRequest = () => {
        const id = selectedPurchaseRequest?.id;
        if (!id) return;
        setSubmitError('');
        setPurchaseRequestActionPendingId(id);
        approvePurchaseRequest(id);
    };

    const handleApproveAndSaveSelectedPurchaseRequest = async () => {
        const id = selectedPurchaseRequest?.id;
        if (!id) return;

        const result = buildPurchaseOrderPayload();
        if (result?.error) {
            setSubmitError(result.error);
            return;
        }

        setSubmitError('');
        setPurchaseRequestActionPendingId(id);

        try {
            await approvePurchaseRequestAsync(id);
            await createPurchaseOrderAsync({ ...result, status: 'APPROVED' });
        } catch (error) {
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to approve and save purchase order.');
            setPurchaseRequestActionPendingId(null);
        }
    };

    const handleRejectSelectedPurchaseRequest = () => {
        const id = selectedPurchaseRequest?.id;
        if (!id) return;
        if (!purchaseRequestRejectReason.trim()) {
            setSubmitError('Rejection reason is required.');
            return;
        }
        setSubmitError('');
        setPurchaseRequestActionPendingId(id);
        rejectPurchaseRequest({ id, reason: purchaseRequestRejectReason.trim() });
    };

    const handleApprovePO = () => {
        const id = previewPO?.id;
        if (!id) return;
        setSubmitError('');
        setPoActionPendingId(id);
        approvePurchaseOrder(id);
    };

    const handleRejectPO = () => {
        const id = previewPO?.id;
        if (!id) return;
        if (!poRejectReason.trim()) {
            setSubmitError('Rejection reason is required.');
            return;
        }
        setSubmitError('');
        setPoActionPendingId(id);
        rejectPurchaseOrder({ id, reason: poRejectReason.trim() });
    };

    const getLineDisplayMeta = (line) => {
        const lineItemId = String(line?.itemId ?? line?.id ?? line?.inventoryItemId ?? '');
        const itemMeta = inventoryItemLookup.get(lineItemId);
        const unitPrice = itemMeta?.unitPrice ?? line?.unitPrice ?? null;
        const taxAmount = itemMeta?.taxAmount ?? line?.taxAmount ?? null;
        const totalAmount =
            itemMeta?.totalAmount ??
            line?.totalAmount ??
            (Number.isFinite(Number(unitPrice)) && Number.isFinite(Number(taxAmount))
                ? Number(unitPrice) + Number(taxAmount)
                : null);
        return {
            itemSku: line?.itemSku || line?.sku || itemMeta?.sku || 'N/A',
            itemName: line?.itemName || line?.name || itemMeta?.name || `Item #${lineItemId || 'N/A'}`,
            unitOfMeasurement: resolveItemUnitOfMeasurement(line) || itemMeta?.unitOfMeasurement || 'N/A',
            categoryName: itemMeta?.categoryName || 'N/A',
            subCategoryName: itemMeta?.subCategoryName || 'N/A',
            unitPrice: formatMoney(unitPrice),
            taxAmount: formatMoney(taxAmount),
            totalAmount: formatMoney(totalAmount),
        };
    };

    const handleDownloadPOPdf = async () => {
        const id = previewPO?.id;
        if (!id) return;

        setSubmitError('');
        try {
            const pdfBlob = await downloadPurchaseOrderPdf(id);
            const fileName = `${previewPO?.purchaseOrderNo || `PO-${id}`}.pdf`;
            const downloadUrl = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (_) {
            // Error message is handled in mutation onError.
        }
    };

    const handleDownloadPOFromRow = async (order) => {
        const id = order?.id;
        if (!id || order?.approvalStatus !== 'APPROVED') return;
        setSubmitError('');
        try {
            const pdfBlob = await downloadPurchaseOrderPdf(id);
            const fileName = `${order?.purchaseOrderNo || `PO-${id}`}.pdf`;
            const downloadUrl = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (_) {
            // Error message is handled in mutation onError.
        }
    };

    return (
        <div className="bg-white p-8 min-h-screen scrollbar-hide m-5 rounded-lg">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Purchase Orders</h1>
                <button
                    onClick={handleOpenModal}
                    className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-customBlue text-white font-semibold rounded-lg hover:bg-customBlue/90"
                >
                    <Plus size={18} />
                    Add Purchase Order
                </button>
            </div>

            {submitError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                </div>
            )}

            <div className="pb-6 md:pb-8">
                <DataTable
                    isLoading={purchaseOrdersQuery.isLoading || purchaseRequestsQuery.isLoading || officesQuery.isLoading || itemsQuery.isLoading}
                    error={purchaseOrdersQuery.error?.message || purchaseRequestsQuery.error?.message || officesQuery.error?.message || itemsQuery.error?.message || null}
                    items={filteredOrders}
                    columns={tableColumns}
                    showView={true}
                    showEdit={false}
                    showDelete={true}
                    showToggle={false}
                    searchQuery={searchTerm}
                    onSearchChange={setSearchTerm}
                    onView={(item) => setPreviewPO(item)}
                    onDelete={handleDelete}
                    rowActions={(item) => {
                        const isApproved = item?.approvalStatus === 'APPROVED';
                        return (
                            <button
                                type="button"
                                onClick={() => handleDownloadPOFromRow(item)}
                                disabled={!isApproved || isDownloadingPoPdf}
                                title={isApproved ? 'Download PDF' : 'Only approved PO can be downloaded'}
                                className="rounded-lg border border-green-600 px-3 py-2 text-green-700 transition hover:bg-green-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent cursor-pointer"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        );
                    }}
                    tabName="Purchase Order"
                />
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col" style={{ maxHeight: '95vh' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Add New Purchase Order</h2>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <FieldWrapper label="Purchase Request" required className="text-sm">
                                    <Select
                                        placeholder="Select PR"
                                        value={formData.purchaseRequestId}
                                        selectedLabel={selectedPurchaseRequest?.requestNo || ''}
                                        onChange={(e) => {
                                            const prId = String(e.target.value);
                                            const selectedRequest = normalizedPurchaseRequests.find(
                                                (req) => String(req.id) === prId
                                            );
                                            const rawLines = selectedRequest?.items || [];
                                            const requestItems = rawLines.map((item, index) => {
                                                const rawItemId = item.itemId ?? item.id ?? item.inventoryItemId ?? '';
                                                const catalog = normalizedItems.find(
                                                    (ni) => String(ni.id) === String(rawItemId)
                                                );
                                                const itemMeta = inventoryItemLookup.get(String(rawItemId));
                                                const qty =
                                                    Number(item.quantity ?? item.qty ?? item.quantityOrdered ?? 1) || 1;
                                                const unitPrice =
                                                    Number(item.unitPrice ?? item.price ?? itemMeta?.unitPrice ?? catalog?.price ?? 0) || 0;
                                                const taxAmount =
                                                    Number(item.taxAmount ?? itemMeta?.taxAmount ?? 0) || 0;
                                                return {
                                                    id: item.id ?? item.lineId ?? `pr-line-${index}-${rawItemId}`,
                                                    itemId: catalog ? String(catalog.id) : String(rawItemId),
                                                    itemName:
                                                        item.itemName ||
                                                        item.name ||
                                                        catalog?.name ||
                                                        itemMeta?.name ||
                                                        (rawItemId ? `Item ${rawItemId}` : 'Unknown item'),
                                                    unitOfMeasurement:
                                                        resolveItemUnitOfMeasurement(item) ||
                                                        catalog?.unitOfMeasurement ||
                                                        itemMeta?.unitOfMeasurement ||
                                                        '',
                                                    quantityOrdered: qty,
                                                    unitPrice: String(unitPrice),
                                                    taxAmount: String(taxAmount),
                                                    totalPrice: String((qty * unitPrice + taxAmount).toFixed(2)),
                                                };
                                            });
                                            const first = requestItems[0];
                                            const officeIdVal = selectedRequest?.officeId ?? selectedRequest?.office?.id ?? '';
                                            const officeLabel =
                                                selectedRequest?.officeName ||
                                                selectedRequest?.office?.branchName ||
                                                offices.find((o) => String(o.id) === String(officeIdVal))?.branchName ||
                                                '';
                                            setFormData((prev) => ({
                                                ...prev,
                                                purchaseRequestId: prId,
                                                poItems: requestItems,
                                                officeId: officeIdVal !== '' && officeIdVal != null ? String(officeIdVal) : prev.officeId,
                                                office: officeLabel || prev.office,
                                                vendorId: '',
                                                vendorName: '',
                                                user:
                                                    selectedRequest?.userId ||
                                                    selectedRequest?.createdBy ||
                                                    selectedRequest?.userEmail ||
                                                    prev.user,
                                                date: toDatetimeLocalValue(
                                                    selectedRequest?.createdAt ||
                                                        selectedRequest?.createdOn ||
                                                        selectedRequest?.date ||
                                                        new Date().toISOString()
                                                ),
                                                currentItem: first
                                                    ? {
                                                          itemId: String(first.itemId),
                                                          itemName: first.itemName,
                                                          unitOfMeasurement: first.unitOfMeasurement,
                                                          quantityOrdered: first.quantityOrdered,
                                                          unitPrice: first.unitPrice,
                                                          totalPrice: first.totalPrice,
                                                      }
                                                    : {
                                                          itemId: '',
                                                          itemName: '',
                                                          unitOfMeasurement: '',
                                                          quantityOrdered: 1,
                                                          unitPrice: '',
                                                          totalPrice: '',
                                                      },
                                            }));
                                        }}
                                        className="text-sm"
                                        options={purchaseRequestOptions}
                                    />
                                </FieldWrapper>

                                <FieldWrapper label="Office" required className="text-sm">
                                    <Select
                                        placeholder="Select Office"
                                        value={formData.officeId}
                                        onChange={(e) => {
                                            const selected = offices.find((o) => String(o.id) === String(e.target.value));
                                            setFormData((prev) => ({
                                                ...prev,
                                                officeId: e.target.value,
                                                office: selected?.branchName || '',
                                                vendorId: '',
                                                vendorName: '',
                                            }));
                                        }}
                                        className="text-sm"
                                        options={officeOptions}
                                    >
                                    </Select>
                                </FieldWrapper>

                                <FieldWrapper label="Vendor" required className="text-sm">
                                    <Select
                                        placeholder={formData.officeId ? 'Select Vendor' : 'Select office first'}
                                        value={formData.vendorId}
                                        onChange={(e) => {
                                            const selected = filteredVendors.find((v) => String(v.id) === String(e.target.value));
                                            setFormData((prev) => ({
                                                ...prev,
                                                vendorId: e.target.value,
                                                vendorName: selected?.name || '',
                                            }));
                                        }}
                                        className="text-sm"
                                        options={vendorOptions}
                                        disabled={!formData.officeId}
                                    >
                                    </Select>
                                </FieldWrapper>

                                <FieldWrapper label="User" required className="text-sm">
                                    <Input value={formData.user} disabled placeholder="Auto" className="text-sm py-2 bg-gray-50" />
                                </FieldWrapper>

                                <FieldWrapper label="Date & Time" required className="text-sm">
                                    <Input type="datetime-local" value={formData.date} disabled placeholder="Auto" className="text-sm py-2 bg-gray-50" />
                                </FieldWrapper>
                            </div>

                            <div className="border-t border-gray-200 pt-6 space-y-4">
                                <p className="text-xs text-gray-500">
                                    PO lines load from the selected Purchase Request. Edit Qty, Unit Price, and Tax in the table below.
                                </p>
                                {formData.poItems.length === 0 && (
                                <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper label="Item Name" required className="text-sm">
                                        <Select
                                            placeholder="Select Item"
                                            value={formData.currentItem.itemId}
                                            onChange={(e) => {
                                                const selectedFromReview = formData.poItems.find(
                                                    (item) => String(item.itemId) === String(e.target.value)
                                                );
                                                const selectedFromCatalog = normalizedItems.find(
                                                    (item) => String(item.id) === String(e.target.value)
                                                );
                                                const selected = selectedFromReview || selectedFromCatalog;
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    currentItem: {
                                                        ...prev.currentItem,
                                                        itemId: selected?.id || selected?.itemId || '',
                                                        itemName: selected?.itemName || selected?.name || '',
                                                        quantityOrdered: Number(selected?.quantityOrdered ?? prev.currentItem.quantityOrdered ?? 1),
                                                        unitPrice: selected?.unitPrice
                                                            ? String(selected.unitPrice)
                                                            : selected?.price
                                                                ? String(selected.price)
                                                                : prev.currentItem.unitPrice,
                                                        totalPrice: selected?.totalPrice
                                                            ? String(selected.totalPrice)
                                                            : prev.currentItem.totalPrice,
                                                        unitOfMeasurement: resolveItemUnitOfMeasurement(selected || {})
                                                    }
                                                }));
                                            }}
                                            className="text-sm"
                                            options={itemOptions}
                                        >
                                        </Select>
                                    </FieldWrapper>

                                    <FieldWrapper label="Unit of Measurement" className="text-sm">
                                        <Input value={formData.currentItem.unitOfMeasurement ?? ''} disabled placeholder="Auto" className="text-sm py-2 bg-gray-50" />
                                    </FieldWrapper>
                                </div>

                                <FieldWrapper label="Quantity Ordered" required className="text-sm">
                                    <div className="flex items-center gap-2">
                                        <button onClick={handleDecrement} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-semibold cursor-pointer">−</button>
                                        <Input type="number" value={formData.currentItem.quantityOrdered} onChange={handleQuantityChange} min="1" className="text-sm py-2 text-center flex-1" />
                                        <button onClick={handleIncrement} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-semibold cursor-pointer">+</button>
                                    </div>
                                </FieldWrapper>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FieldWrapper label="Unit Price" required className="text-sm">
                                        <Input type="number" value={formData.currentItem.unitPrice} onChange={handleUnitPriceChange} placeholder="0.00" step="0.01" min="0" className="text-sm py-2" />
                                    </FieldWrapper>
                                    <FieldWrapper label="Total Price" className="text-sm">
                                        <Input value={formData.currentItem.totalPrice} disabled placeholder="Auto calculated" className="text-sm py-2 bg-gray-50" />
                                    </FieldWrapper>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSaveCurrentItemToReview}
                                        className="rounded-lg border border-customBlue px-4 py-2 text-sm font-medium text-customBlue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={!formData.currentItem.itemId}
                                    >
                                        Save
                                    </button>
                                </div>
                                </>
                                )}

                            </div>

                            {formData.poItems.length > 0 && (
                                <div className="border-t border-gray-200 pt-6">
                                    <h3 className="text-base font-semibold text-gray-800 mb-1">Review Details</h3>
                                    <p className="text-xs text-gray-500 mb-4">Edit quantity, unit price, and tax amount per line.</p>
                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">S.No.</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Item SKU</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Item Name</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">UOM</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Qty</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Unit Price</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Tax Amount</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Total</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Category</th>
                                                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">Sub Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.poItems.map((item, index) => {
                                                    const meta = getLineDisplayMeta(item);
                                                    return (
                                                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                                                        <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">{meta.itemSku}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">{meta.itemName}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">{meta.unitOfMeasurement}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantityOrdered}
                                                                onChange={(e) => handleUpdatePoItemField(item.id, 'quantityOrdered', e.target.value)}
                                                                className="text-sm py-1.5 w-20"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.unitPrice}
                                                                onChange={(e) => handleUpdatePoItemField(item.id, 'unitPrice', e.target.value)}
                                                                className="text-sm py-1.5 w-24"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                value={item.taxAmount ?? ''}
                                                                onChange={(e) => handleUpdatePoItemField(item.id, 'taxAmount', e.target.value)}
                                                                className="text-sm py-1.5 w-24"
                                                            />
                                                        </td>
                                                        <td className="py-3 px-4 text-sm font-semibold text-gray-700">
                                                            {formatMoney(item.totalPrice ?? recalculatePoLineTotal(item))}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">{meta.categoryName}</td>
                                                        <td className="py-3 px-4 text-sm text-gray-700">{meta.subCategoryName}</td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                                <div className=' w-full flex-1 '>
                                    <Input
                                        value={purchaseRequestRejectReason}
                                        onChange={(e) => setPurchaseRequestRejectReason(e.target.value)}
                                        placeholder="Rejection reason"
                                        className="text-sm py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 px-4"
                                        disabled={!canActOnSelectedPurchaseRequest || isSelectedPurchaseRequestActionPending}
                                    />
                                </div>
                                <div className='flex flex-wrap items-center gap-3'>
                                    <button
                                        type="button"
                                        onClick={handleRejectSelectedPurchaseRequest}
                                        disabled={!canActOnSelectedPurchaseRequest || isSelectedPurchaseRequestActionPending}
                                        className="w-40 py-3.5 bg-red-600 text-white hover:bg-red-900 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {isSelectedPurchaseRequestActionPending ? 'Processing...' : 'Reject'}
                                    </button>
                                    <button
                                        onClick={handleCloseModal}
                                        className="w-40 py-3.5 border border-customBlue text-customBlue hover:bg-gray-50 rounded-lg text-sm font-medium transition cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleApproveAndSaveSelectedPurchaseRequest}
                                        disabled={!selectedPurchaseRequest || !canActOnSelectedPurchaseRequest || isSelectedPurchaseRequestActionPending || isCreating}
                                        className="w-40 py-3.5 bg-customBlue text-white hover:bg-customBlue/90 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {(isCreating || isSelectedPurchaseRequestActionPending) && <Loader size={16} className="animate-spin" />}
                                        Approve and Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {previewPO && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col" style={{ maxHeight: '95vh' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Purchase Order Details</h2>
                            <button onClick={() => setPreviewPO(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    ['Office', previewPO.officeName || 'N/A'],
                                    ['Store', previewPO.storeName || 'N/A'],
                                    ['Vendor', previewPO.vendorName || 'N/A'],
                                    ['User', previewPO.userId],
                                    ['PR #', previewPO.purchasedRequestNo],
                                    ['PO #', previewPO.purchaseOrderNo],
                                    ['Created On', previewPO.createdOn ? new Date(previewPO.createdOn).toLocaleString() : 'N/A'],
                                    ['Approval Status', previewPO.approvalStatus],
                                    ['Delivery Status', previewPO.deliveryStatus],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                                        <p className="text-sm text-gray-900">{value}</p>
                                    </div>
                                ))}
                            </div>

                            {(Array.isArray(previewPO.lines) ? previewPO.lines : []).length > 0 && (
                                <div className="mt-6 border-t border-gray-200 pt-4">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">PO Lines</h3>
                                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-50 border-b border-gray-200">
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Item ID</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Item SKU</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Item Name</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">UOM</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Qty</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Unit Price</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Tax Amount</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Total Amount</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Category</th>
                                                    <th className="py-2 px-3 text-left font-semibold text-gray-700">Sub Category</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {previewPO.lines.map((line, idx) => {
                                                    const meta = getLineDisplayMeta(line);
                                                    return (
                                                    <tr key={line.id ?? line.purchaseOrderLineId ?? `po-line-${idx}`} className="border-b border-gray-200">
                                                        <td className="py-2 px-3 text-gray-700">{line.itemId ?? 'N/A'}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.itemSku}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.itemName}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.unitOfMeasurement}</td>
                                                        <td className="py-2 px-3 text-gray-700">{line.qty ?? line.quantity ?? 'N/A'}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.unitPrice}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.taxAmount}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.totalAmount}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.categoryName}</td>
                                                        <td className="py-2 px-3 text-gray-700">{meta.subCategoryName}</td>
                                                    </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                            {previewPO.approvalStatus === 'APPROVED' && (
                                <button
                                    onClick={handleDownloadPOPdf}
                                    disabled={isDownloadingPoPdf}
                                    className="cursor-pointer w-44 py-2.5 px-4 border border-green-600 text-green-700 hover:bg-green-50 duration-100 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                                >
                                    {isDownloadingPoPdf ? <Loader size={16} className="animate-spin" /> : <Download size={26} />}
                                    {isDownloadingPoPdf ? 'Downloading...' : 'Download PDF'}
                                </button>
                            )}
                            {!['APPROVED', 'REJECTED'].includes(previewPO.approvalStatus) && (<>
                                <Input
                                    value={poRejectReason}
                                    onChange={(e) => setPoRejectReason(e.target.value)}
                                    placeholder="Rejection reason"
                                    className="text-sm py-2 w-64 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={poActionPendingId === previewPO.id || previewPO.approvalStatus === 'APPROVED' || previewPO.approvalStatus === 'REJECTED'}
                                />
                                <button
                                    onClick={handleRejectPO}
                                    disabled={poActionPendingId === previewPO.id || previewPO.approvalStatus === 'APPROVED' || previewPO.approvalStatus === 'REJECTED'}
                                    className="cursor-pointer w-40 py-3.5 bg-red-600 hover:bg-red-900 duration-100 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {poActionPendingId === previewPO.id ? 'Processing...' : 'Reject'}
                                </button>
                                <button
                                    onClick={handleApprovePO}
                                    disabled={poActionPendingId === previewPO.id || previewPO.approvalStatus === 'APPROVED' || previewPO.approvalStatus === 'REJECTED'}
                                    className="cursor-pointer w-40 py-3.5 bg-green-600 hover:bg-green-900 duration-100 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                    {poActionPendingId === previewPO.id ? 'Processing...' : 'Approve'}
                                </button>
                                </>)}
                            <button
                                onClick={() => setPreviewPO(null)}
                                className="w-40 py-3.5 bg-customBlue text-white hover:bg-customBlue/90 rounded-lg text-sm font-medium transition cursor-pointer"
                                >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col" style={{ maxHeight: '95vh' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <h2 className="text-lg font-semibold text-gray-900">Confirm Delete</h2>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <p className="text-gray-600">Are you sure you want to delete this purchase order? This action cannot be undone.</p>
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                            <button
                                onClick={() => setDeleteModal({ isOpen: false, poId: null })}
                                className="w-40 py-3.5 border border-customBlue text-customBlue hover:bg-gray-50 rounded-lg text-sm font-medium transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="w-40 py-3.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isDeleting && <Loader size={16} className="animate-spin" />}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PurchaseOrderPage;