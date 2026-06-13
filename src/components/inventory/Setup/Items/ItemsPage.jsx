"use client";

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Loader, X } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import FieldWrapper from '../../../ui/FieldWrapper';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';
import Textarea from '../../../ui/TextArea';
import EditModal from '@/components/components/EditModal';
import { useItems } from '@/hooks/inventory/items/useItems';
import { useWorkflowSummary } from '@/hooks/inventory/items/useWorkflowSummary';
import { useCreateItem } from '@/hooks/inventory/items/useCreateItem';
import { useUpdateItem } from '@/hooks/inventory/items/useUpdateItem';
import { useDeleteItem } from '@/hooks/inventory/items/useDeleteItem';
import { useCategories } from '@/hooks/inventory/setup/useCategories';
import { useSubCategories } from '@/hooks/inventory/setup/useSubCategories';
import { useGroups } from '@/hooks/inventory/setup/useGroups';

// Units object - easily extensible for future additions
const UNITS = {
    PCS: { value: 'PCS', label: 'Pieces' },
    KG: { value: 'KG', label: 'Kilogram' },
    G: { value: 'G', label: 'Gram' },
    LTR: { value: 'LTR', label: 'Liter' },
    ML: { value: 'ML', label: 'Milliliter' },
    BOX: { value: 'BOX', label: 'Box' },
    PKG: { value: 'PKG', label: 'Package' },
    MTR: { value: 'MTR', label: 'Meter' },
    SQM: { value: 'SQM', label: 'Square Meter' },
    TON: { value: 'TON', label: 'Ton' },
    DOZEN: { value: 'DOZEN', label: 'Dozen' },
    EACH: { value: 'EACH', label: 'Each' },
};

const UNIT_OPTIONS = Object.values(UNITS).map(unit => ({ value: unit.value, label: unit.label }));

const ItemsPage = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // Edit modal state
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [editName, setEditName] = useState('');
    const [editSku, setEditSku] = useState('');
    const [editCategoryId, setEditCategoryId] = useState('');
    const [editSubCategoryId, setEditSubCategoryId] = useState('');
    const [editGroupId, setEditGroupId] = useState('');
    const [editUom, setEditUom] = useState('');
    const [editSsnSidn, setEditSsnSidn] = useState('');
    const [editReorderLevel, setEditReorderLevel] = useState('');
    const [editExpiryDate, setEditExpiryDate] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editTaxAmount, setEditTaxAmount] = useState('');
    const [editTotalAmount, setEditTotalAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [updateError, setUpdateError] = useState(null);
    // View modal state
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewItem, setViewItem] = useState(null);
    const [viewParams, setViewParams] = useState(null);

    const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (!data || typeof data !== 'object') return [];

        const preferredKeys = ['data', 'items', 'results', 'list', 'rows', 'categories', 'groups', 'stores', 'content'];
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

    const setItemsQueryData = (updater) => {
        queryClient.setQueryData(['inventory-items'], (current) => {
            const currentList = normalizeList(current);
            const nextList = typeof updater === 'function' ? updater(currentList) : updater;

            if (Array.isArray(current)) return nextList;
            if (Array.isArray(current?.data)) return { ...current, data: nextList };
            if (Array.isArray(current?.items)) return { ...current, items: nextList };

            return nextList;
        });
    };

    const getItemId = (item) => {
        if (!item) return null;
        if (typeof item === 'string' || typeof item === 'number') return item;
        return item.id ?? item.itemId ?? item._id ?? null;
    };

    const itemsQuery = useItems();
    const categoriesQuery = useCategories();
    const groupsQuery = useGroups();

    const { mutate: createItem, isPending: isCreating } = useCreateItem({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        },
        onError: (error) => {
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to create item.');
        },
    });

    const { mutate: updateItem, isPending: isUpdating } = useUpdateItem({
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['inventory-items'] });
            const previousItems = queryClient.getQueryData(['inventory-items']);

            setItemsQueryData((currentList) =>
                currentList.map((item) => {
                    if (String(getItemId(item)) !== String(id)) return item;
                    return {
                        ...item,
                        ...data,
                        id: getItemId(item) ?? id,
                        itemName: data.itemName ?? item.itemName ?? item.name,
                        name: data.itemName ?? item.name ?? item.itemName,
                        uom: data.uom ?? item.uom ?? item.unitOfMeasurement,
                        unitOfMeasurement: data.uom ?? item.unitOfMeasurement ?? item.uom,
                    };
                })
            );

            return { previousItems };
        },
        onError: (error, variables, context) => {
            if (context?.previousItems !== undefined) {
                queryClient.setQueryData(['inventory-items'], context.previousItems);
            }
            setUpdateError(error?.response?.data?.message || error?.message || 'Failed to update item.');
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        },
    });

    const { mutate: deleteItem } = useDeleteItem({
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
        },
    });

    const items = useMemo(() => normalizeList(itemsQuery.data), [itemsQuery.data]);
    const categories = useMemo(
        () => normalizeList(categoriesQuery.data).map((category) => ({
            ...category,
            id: category.id ?? category.categoryId ?? category._id ?? category.category_id,
            name: category.categoryName || category.name || category.title || '',
        })),
        [categoriesQuery.data]
    );
    const groups = useMemo(
        () => normalizeList(groupsQuery.data).map((group) => ({
            ...group,
            id: group.id ?? group.groupId ?? group._id ?? group.group_id,
            name: group.groupName || group.name || group.title || '',
        })),
        [groupsQuery.data]
    );


    const categoryOptions = useMemo(
        () => categories
            .filter((category) => category.id !== undefined && category.id !== null && category.name)
            .map((category) => ({ value: String(category.id), label: category.name })),
        [categories]
    );

    const groupOptions = useMemo(
        () => groups
            .filter((group) => group.id !== undefined && group.id !== null && group.name)
            .map((group) => ({ value: String(group.id), label: group.name })),
        [groups]
    );



    const normalizedItems = useMemo(
        () => items.map((item) => ({
            ...item,
            id: item.id ?? item.itemId ?? item._id,
            itemName: item.itemName || item.name || '',
            name: item.name || item.itemName || '',
            uom: item.uom || item.unitOfMeasurement || '',
            ssnSidn: item.ssnSidn || '',
            categoryId: item.categoryId ?? item.category?.id ?? item.category?.categoryId ?? 0,
            groupId: item.groupId ?? item.group?.id ?? item.group?.groupId ?? 0,
            reorderLevel: item.reorderLevel ?? 0,
            isActive: item.isActive ?? true,
            amount: item.amount ?? null,
            taxAmount: item.taxAmount ?? null,
            totalAmount: resolveDisplayTotal(item),
            expiryDate: formatDateValue(item.expiryDate || item.expiry),
        })),
        [items]
    );
    const loading = itemsQuery.isLoading || categoriesQuery.isLoading || groupsQuery.isLoading;
    const tableError = itemsQuery.error?.message || null;

    const emptyForm = {
        itemName: '',
        sku: '',
        categoryId: '',
        subCategoryId: '',
        groupId: '',
        uom: '',
        ssnSidn: '',
        reorderLevel: '',
        isActive: true,
        expiryDate: '',
        amount: '',
        taxAmount: '',
        totalAmount: '',
        description: '',
    };

    const [formData, setFormData] = useState(emptyForm);

    // Subcategories for the add modal (depend on selected category)
    const addSubcategoriesQuery = useSubCategories({ categoryId: formData.categoryId }, { enabled: !!formData.categoryId });
    const addSubcategories = useMemo(() => normalizeList(addSubcategoriesQuery.data), [addSubcategoriesQuery.data]);
    const addSubcategoryOptions = useMemo(
        () => addSubcategories.map((s) => ({ value: String(s.id ?? s.subCategoryId ?? s._id), label: s.subCategoryName || s.name || '' })),
        [addSubcategories]
    );

    // Subcategories for the edit modal (depend on selected editCategoryId)
    const editSubcategoriesQuery = useSubCategories({ categoryId: editCategoryId }, { enabled: !!editCategoryId });
    const editSubcategories = useMemo(() => normalizeList(editSubcategoriesQuery.data), [editSubcategoriesQuery.data]);
    const editSubcategoryOptions = useMemo(
        () => editSubcategories.map((s) => ({ value: String(s.id ?? s.subCategoryId ?? s._id), label: s.subCategoryName || s.name || '' })),
        [editSubcategories]
    );

    const normalizeSkuInput = (value) => value.toUpperCase().replace(/[^A-Z0-9-_]/g, '').slice(0, 30);
    const normalizeNameInput = (value) => value.replace(/\s+/g, ' ').trim();
    const normalizeAmountInput = (value) => {
        const sanitized = value.replace(/[^0-9.]/g, '');
        const normalized = sanitized.replace(/(\..*)\./g, '$1');
        return normalized.slice(0, 12);
    };
    const parseAmount = (value) => {
        if (value === '' || value === null || value === undefined) return 0;
        const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const toOptionalId = (value) => {
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };
    const formatMoney = (value) => {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed.toFixed(2) : null;
    };
    const resolveDisplayTotal = (item) => {
        if (item?.totalAmount != null && item.totalAmount !== '') {
            return formatMoney(item.totalAmount);
        }
        const amount = Number(item?.amount);
        const taxAmount = Number(item?.taxAmount);
        if (Number.isFinite(amount) || Number.isFinite(taxAmount)) {
            return formatMoney((Number.isFinite(amount) ? amount : 0) + (Number.isFinite(taxAmount) ? taxAmount : 0));
        }
        return null;
    };
    const formatDateValue = (value) => {
        if (!value) return '-';
        return String(value).slice(0, 10);
    };
    const calculateTotalAmount = (amountValue, taxValue) => {
        const hasAnyValue = amountValue !== '' || taxValue !== '';
        if (!hasAnyValue) return '';
        const total = parseAmount(amountValue) + parseAmount(taxValue);
        return total.toFixed(2);
    };

    const getCategoryName = (categoryId) => categories.find(c => String(c.id) === String(categoryId))?.name || 'N/A';
    const getGroupName = (groupId) => groups.find(group => String(group.id) === String(groupId))?.name || 'N/A';

    const buildItemPayload = (data) => {
        const payload = {
            sku: data.sku,
            itemName: data.itemName,
            categoryId: toOptionalId(data.categoryId),
            subCategoryId: toOptionalId(data.subCategoryId),
            groupId: toOptionalId(data.groupId),
            uom: data.uom,
            ssnSidn: data.ssnSidn || '',
            reorderLevel: data.reorderLevel === '' ? 0 : Math.max(0, Number(data.reorderLevel) || 0),
            isActive: data.isActive ?? true,
        };

        const includesPricing = 'amount' in data || 'taxAmount' in data || 'totalAmount' in data;
        if (includesPricing) {
            const amount = parseAmount(data.amount);
            const taxAmount = parseAmount(data.taxAmount);
            const computedTotal = calculateTotalAmount(data.amount, data.taxAmount);
            const totalAmount = computedTotal !== '' ? parseAmount(computedTotal) : parseAmount(data.totalAmount);
            payload.amount = amount;
            payload.taxAmount = taxAmount;
            payload.totalAmount = totalAmount;
        }

        if ('description' in data) {
            payload.description = data.description || undefined;
        }
        if ('expiryDate' in data) {
            payload.expiryDate = data.expiryDate || undefined;
        }

        return payload;
    };

    const tableColumns = [
        { key: 'itemName', label: 'Item Name', width: '24%' },
        { key: 'sku', label: 'SKU', width: '14%' },
        {
            key: 'categoryId', label: 'Category', width: '12%',
            render: (item) => getCategoryName(item.categoryId)
        },
        {
            key: 'groupId', label: 'Group', width: '12%',
            render: (item) => getGroupName(item.groupId)
        },
        { key: 'uom', label: 'UOM', width: '8%' },
        { key: 'ssnSidn', label: 'SSN/SIDN', width: '12%' },
        { key: 'reorderLevel', label: 'Reorder Level', width: '8%' },
        { key: 'expiryDate', label: 'Expiry Date', width: '10%' },
        {
            key: 'totalAmount',
            label: 'Total Amount',
            width: '12%',
            render: (item) => (item.totalAmount != null ? `Rs ${item.totalAmount}` : '-'),
        },
        {
            key: 'isActive',
            label: 'Status',
            width: '10%',
            render: (item) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                    item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                    {item.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    const handleAddItemClick = () => {
        setFormData(emptyForm);
        setShowAddModal(true);
    };

    const handleCloseAddModal = () => {
        setShowAddModal(false);
        setFormData(emptyForm);
        setSubmitError(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name === 'reorderLevel') {
            const safeValue = value === '' ? '' : String(Math.max(0, Number(value) || 0));
            setFormData(prev => ({ ...prev, [name]: safeValue }));
            return;
        }
        if (name === 'amount' || name === 'taxAmount' || name === 'totalAmount') {
            setFormData(prev => {
                const nextValue = normalizeAmountInput(value);
                const nextState = { ...prev, [name]: nextValue };
                if (name === 'amount' || name === 'taxAmount') {
                    nextState.totalAmount = calculateTotalAmount(nextState.amount, nextState.taxAmount);
                }
                return nextState;
            });
            return;
        }
        if (name === 'sku') {
            setFormData(prev => ({ ...prev, [name]: normalizeSkuInput(value) }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmitForm = async () => {
        const normalizedName = normalizeNameInput(formData.itemName);
        const normalizedSku = normalizeSkuInput(formData.sku);
        const skuPattern = /^[A-Z0-9][A-Z0-9-_]{2,29}$/;

        if (!normalizedName) {
            setSubmitError('Item name is required.');
            return;
        }
        if (!skuPattern.test(normalizedSku)) {
            setSubmitError('SKU must be 3-30 characters using letters, numbers, dash, or underscore.');
            return;
        }
        if (!formData.categoryId) {
            setSubmitError('Category is required.');
            return;
        }
        if (!formData.uom) {
            setSubmitError('UOM is required.');
            return;
        }
        setSubmitError(null);
        createItem(
            buildItemPayload({
                ...formData,
                itemName: normalizedName,
                sku: normalizedSku,
            }),
            {
            onSuccess: () => {
                handleCloseAddModal();
            },
        }
        );
    };

    const handleEdit = (item) => {
        setSelectedItem(item);
        setEditName(item.itemName || item.name || '');
        setEditSku(item.sku || '');
        setEditCategoryId(String(item.categoryId ?? ''));
        setEditSubCategoryId(String(item.subCategoryId ?? item.subCategory?.id ?? ''));
        setEditGroupId(String(item.groupId ?? ''));
        setEditUom(item.uom || item.unitOfMeasurement || '');
        setEditSsnSidn(item.ssnSidn || '');
        setEditReorderLevel(String(item.reorderLevel ?? ''));
        setEditExpiryDate(item.expiryDate || '');
        const nextEditAmount = item.amount !== undefined && item.amount !== null ? String(item.amount) : '';
        const nextEditTaxAmount = item.taxAmount !== undefined && item.taxAmount !== null ? String(item.taxAmount) : '';
        const fallbackTotalAmount = item.totalAmount !== undefined && item.totalAmount !== null ? String(item.totalAmount) : '';
        setEditAmount(nextEditAmount);
        setEditTaxAmount(nextEditTaxAmount);
        setEditTotalAmount(calculateTotalAmount(nextEditAmount, nextEditTaxAmount) || fallbackTotalAmount);
        setEditDescription(item.description || '');
        setUpdateError(null);
        setShowEditModal(true);
    };

    const handleView = (item) => {
        setViewItem(item);
        const id = Number(getItemId(item));
        setViewParams(id ? { itemId: id } : null);
        setShowViewModal(true);
    };

    const handleCloseViewModal = () => {
        setShowViewModal(false);
        setViewItem(null);
        setViewParams(null);
    };

    const workflowQuery = useWorkflowSummary(viewParams || {}, { enabled: !!viewParams?.itemId });
    const workflowData = workflowQuery.data ? (Array.isArray(workflowQuery.data) ? workflowQuery.data[0] : workflowQuery.data) : null;

    const handleUpdateItem = (onSuccess) => {
        if (!editName.trim() || !editSku.trim() || !editCategoryId || !editUom.trim()) {
            setUpdateError('Item Name, SKU, Category and UOM are required.');
            return;
        }
        setUpdateError(null);
        updateItem(
            {
                id: selectedItem.id,
                data: buildItemPayload({
                    itemName: editName,
                    sku: editSku,
                    categoryId: editCategoryId,
                    subCategoryId: editSubCategoryId,
                    groupId: editGroupId,
                    uom: editUom,
                    ssnSidn: editSsnSidn,
                    reorderLevel: editReorderLevel,
                    expiryDate: editExpiryDate,
                    amount: editAmount,
                    taxAmount: editTaxAmount,
                    totalAmount: editTotalAmount,
                    description: editDescription,
                    isActive: selectedItem.isActive ?? true,
                }),
            },
            {
                onSuccess: () => {
                    setShowEditModal(false);
                    setSelectedItem(null);
                    onSuccess?.();
                },
            }
        );
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedItem(null);
        setEditName('');
        setEditSku('');
        setEditCategoryId('');
        setEditSubCategoryId('');
        setEditGroupId('');
        setEditUom('');
        setEditSsnSidn('');
        setEditReorderLevel('');
        setEditExpiryDate('');
        setEditAmount('');
        setEditTaxAmount('');
        setEditTotalAmount('');
        setEditDescription('');
        setUpdateError(null);
    };

    const handleDelete = (itemId) => {
        deleteItem(itemId);
    };

    const handleToggle = (item, index, nextValue) => {
        const targetItem = normalizedItems.find((entry) => String(entry.id) === String(item?.id ?? item));
        if (!targetItem) return;

        updateItem({
            id: targetItem.id,
            data: buildItemPayload({
                itemName: targetItem.itemName,
                sku: targetItem.sku,
                categoryId: targetItem.categoryId,
                subCategoryId: targetItem.subCategoryId,
                groupId: targetItem.groupId,
                uom: targetItem.uom,
                ssnSidn: targetItem.ssnSidn,
                reorderLevel: targetItem.reorderLevel,
                isActive: typeof nextValue === 'boolean' ? nextValue : !targetItem.isActive,
            }),
        });
    };

    return (
        <div className="bg-white p-8 min-h-screen scrollbar-hide m-5 rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Items</h1>
                <button
                    onClick={handleAddItemClick}
                    className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-customBlue text-white font-semibold rounded-lg hover:bg-customBlue/90"
                >
                    <Plus size={18} />
                    Add New Item
                </button>
            </div>

            {/* Table */}
            <DataTable
                isLoading={loading}
                error={tableError}
                items={normalizedItems}
                columns={tableColumns}
                showView={true}
                showEdit={true}
                showDelete={true}
                showToggle={true}
                searchQuery={searchTerm}
                onSearchChange={setSearchTerm}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                tabName="Item"
            />

            {/* ── Add New Item Modal ── */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col" style={{ maxHeight: '90vh' }}>

                        {/* Sticky Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <h2 className="text-base font-semibold text-gray-900">Add New Item</h2>
                            <button onClick={handleCloseAddModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Row 1: Item Name, Item Expiry, UOM */}
                                <FieldWrapper label="Item Name" className="text-xs" required={true}>
                                    <Input name="itemName" value={formData.itemName} onChange={handleFormChange} placeholder="Enter item name" className="text-sm" />
                                </FieldWrapper>
                                <FieldWrapper label="Item Expiry" className="text-xs" required={true}>
                                    <Input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleFormChange} className="text-sm" />
                                </FieldWrapper>
                                <FieldWrapper label="UOM" className="text-xs" required={true}>
                                    <Select
                                        name="uom"
                                        value={formData.uom}
                                        onChange={handleFormChange}
                                        options={UNIT_OPTIONS}
                                        placeholder="Select unit"
                                        className="text-sm"
                                    />
                                </FieldWrapper>

                                {/* Row 2: SKU / IMEI, SSN/SIDN, Reorder Level */}
                                <FieldWrapper label="SKU / IMEI" className="text-xs" required={true}>
                                    <Input name="sku" value={formData.sku} onChange={handleFormChange} placeholder="Enter SKU / IMEI" className="text-sm" />
                                </FieldWrapper>
                                <FieldWrapper label="SSN/SIDN" className="text-xs">
                                    <Input name="ssnSidn" value={formData.ssnSidn} onChange={handleFormChange} placeholder="Enter SSN/SIDN" className="text-sm" />
                                </FieldWrapper>
                                <FieldWrapper label="Reorder Level" className="text-xs" required={true}>
                                    <Input type="number" min="0" name="reorderLevel" value={formData.reorderLevel} onChange={handleFormChange} placeholder="0" className="text-sm" />
                                </FieldWrapper>

                                {/* Row 3: Category, Subcategory, Group */}
                                <FieldWrapper label="Category" className="text-xs" required={true}>
                                    <Select
                                        name="categoryId"
                                        value={formData.categoryId}
                                        onChange={handleFormChange}
                                        options={categoryOptions}
                                        placeholder="Select category"
                                        className="text-sm"
                                    />
                                </FieldWrapper>
                                <FieldWrapper label="Subcategory" className="text-xs">
                                    <Select
                                        name="subCategoryId"
                                        value={formData.subCategoryId}
                                        onChange={handleFormChange}
                                        options={addSubcategoryOptions}
                                        placeholder="Select subcategory"
                                        className="text-sm"
                                    />
                                </FieldWrapper>
                                <FieldWrapper label="Item Group" className="text-xs" required={true}>
                                    <Select
                                        name="groupId"
                                        value={formData.groupId}
                                        onChange={handleFormChange}
                                        options={groupOptions}
                                        placeholder="Select group"
                                        className="text-sm"
                                    />
                                </FieldWrapper>

                                {/* Row 4: Amount, Tax Amount, Total Amount */}
                                <FieldWrapper label="Amount" className="text-xs" required={true}>
                                    <Input type="text" name="amount" value={formData.amount} onChange={handleFormChange} placeholder="0.00" className="text-sm" />
                                </FieldWrapper>
                                <FieldWrapper label="Tax Amount" className="text-xs" required={true}>
                                    <Input type="text" name="taxAmount" value={formData.taxAmount} onChange={handleFormChange} placeholder="0.00" className="text-sm" />
                                </FieldWrapper>
                                <FieldWrapper label="Total Amount" className="text-xs">
                                    <Input type="text" name="totalAmount" value={formData.totalAmount} onChange={handleFormChange} placeholder="0.00" className="text-sm" readOnly={true} />
                                </FieldWrapper>

                                {/* Description - Full Width */}
                                <div className="lg:col-span-3">
                                    <FieldWrapper label="Description" className="text-xs">
                                        <Textarea
                                            name="description"
                                            value={formData.description}
                                            onChange={handleFormChange}
                                            placeholder="Enter item description"
                                            className="min-h-[80px] text-sm"
                                        />
                                    </FieldWrapper>
                                </div>
                            </div>

                            {submitError && (
                                <p className="mt-4 text-sm text-red-600">{submitError}</p>
                            )}
                        </div>

                        {/* Sticky Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                            <button
                                onClick={handleCloseAddModal}
                                className="w-40 py-3.5 border border-customBlue text-customBlue hover:bg-gray-50 rounded-lg text-sm font-medium transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitForm}
                                disabled={isCreating}
                                className="w-40 py-3.5 bg-customBlue text-white hover:bg-customBlue/90 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreating && <Loader size={16} className="animate-spin" />}
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            <EditModal
                isOpen={showEditModal}
                selectedItem={selectedItem}
                onUpdate={handleUpdateItem}
                onClose={handleCloseEditModal}
                isUpdating={isUpdating}
                error={updateError}
                title="Edit Item"
                itemType="item"
                fields={[
                    { label: "Item Name",     value: editName,         onChange: setEditName         },
                    { label: "SKU",           value: editSku,          onChange: setEditSku          },
                    {
                        label: "Category",
                        value: editCategoryId,
                        onChange: setEditCategoryId,
                        type: "select",
                        options: categoryOptions,
                    },
                    {
                        label: "Subcategory",
                        value: editSubCategoryId,
                        onChange: setEditSubCategoryId,
                        type: "select",
                        options: editSubcategoryOptions,
                    },
                    {
                        label: "Item Group",
                        value: editGroupId,
                        onChange: setEditGroupId,
                        type: "select",
                        options: groupOptions,
                    },
                    {
                        label: "UOM",
                        value: editUom,
                        onChange: setEditUom,
                        type: "select",
                        options: UNIT_OPTIONS,
                    },
                    { label: "SSN/SIDN",      value: editSsnSidn,      onChange: setEditSsnSidn      },
                    {
                        label: "Reorder Level",
                        value: editReorderLevel,
                        onChange: (value) => setEditReorderLevel(value === '' ? '' : String(Math.max(0, Number(value) || 0))),
                    },
                    {
                        label: "Item Expiry",
                        value: editExpiryDate,
                        onChange: setEditExpiryDate,
                        type: "date",
                    },
                    {
                        label: "Amount",
                        value: editAmount,
                        onChange: (value) => {
                            const normalized = normalizeAmountInput(value);
                            setEditAmount(normalized);
                            setEditTotalAmount(calculateTotalAmount(normalized, editTaxAmount));
                        },
                        type: "text",
                    },
                    {
                        label: "Tax Amount",
                        value: editTaxAmount,
                        onChange: (value) => {
                            const normalized = normalizeAmountInput(value);
                            setEditTaxAmount(normalized);
                            setEditTotalAmount(calculateTotalAmount(editAmount, normalized));
                        },
                        type: "text",
                    },
                    {
                        label: "Total Amount",
                        value: editTotalAmount,
                        onChange: () => {},
                        type: "text",
                        readOnly: true,
                    },
                    {
                        label: "Description",
                        value: editDescription,
                        onChange: setEditDescription,
                    },
                ]}
            />

            {/* View Modal (read-only) */}
            {showViewModal && viewItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
                            <div className="flex items-center gap-4">
                                <h2 className="text-base font-semibold text-gray-900">View Item</h2>
                                {workflowQuery?.isLoading && <Loader size={16} className="animate-spin text-gray-500" />}
                            </div>
                            <button onClick={handleCloseViewModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-6">
                            {/* Basic item info */}
                            <div className="mb-4 grid grid-cols-3 gap-6">
                                <div>
                                    <p className="text-xs text-gray-600">Item Name</p>
                                    <p className="text-sm font-semibold text-gray-900">{viewItem.itemName || viewItem.name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">SKU</p>
                                    <p className="text-sm font-semibold text-gray-900">{viewItem.sku || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Category</p>
                                    <p className="text-sm font-semibold text-gray-900">{getCategoryName(viewItem.categoryId)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Group</p>
                                    <p className="text-sm font-semibold text-gray-900">{getGroupName(viewItem.groupId)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">UOM</p>
                                    <p className="text-sm font-semibold text-gray-900">{viewItem.uom || viewItem.unitOfMeasurement || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Amount</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {viewItem.amount != null ? `Rs ${formatMoney(viewItem.amount)}` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Tax Amount</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {viewItem.taxAmount != null ? `Rs ${formatMoney(viewItem.taxAmount)}` : '-'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600">Total Amount</p>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {resolveDisplayTotal(viewItem) ? `Rs ${resolveDisplayTotal(viewItem)}` : '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Workflow response */}
                            {workflowQuery?.error && (
                                <div className="p-3 mb-4 bg-red-50 text-red-700 rounded">{workflowQuery.error?.message || String(workflowQuery.error)}</div>
                            )}

                            {workflowQuery?.isLoading && (
                                <div className="p-6 mb-4 flex flex-col items-center justify-center text-gray-600">
                                    <Loader size={28} className="animate-spin mb-3 text-gray-500" />
                                    <div className="text-sm">Loading workflow summary…</div>
                                </div>
                            )}

                            {!workflowQuery?.isLoading && workflowData && (
                                (() => {
                                    const wf = workflowData;
                                    if (!wf) return <div className="text-sm text-gray-600">No workflow data available.</div>;
                                    const entries = wf.entries || {};
                                    return (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-4 gap-4">
                                                <div className="p-3 bg-gray-50 rounded">
                                                    <p className="text-xs text-gray-500">Status</p>
                                                    <p className="text-sm font-semibold text-gray-900">{wf.status || 'N/A'}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded">
                                                    <p className="text-xs text-gray-500">Purchase Requests</p>
                                                    <p className="text-sm font-semibold text-gray-900">{(entries.purchaseRequests || []).length}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded">
                                                    <p className="text-xs text-gray-500">Purchase Orders</p>
                                                    <p className="text-sm font-semibold text-gray-900">{(entries.purchaseOrders || []).length}</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded">
                                                    <p className="text-xs text-gray-500">GRNs</p>
                                                    <p className="text-sm font-semibold text-gray-900">{(entries.grns || []).length}</p>
                                                </div>
                                            </div>

                                            {/* Detailed lists */}
                                            {entries.purchaseRequests && entries.purchaseRequests.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Purchase Requests</h4>
                                                    <div className="overflow-x-auto border rounded">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left">PR No</th>
                                                                    <th className="px-3 py-2 text-left">Qty</th>
                                                                    <th className="px-3 py-2 text-left">Status</th>
                                                                    <th className="px-3 py-2 text-left">Created At</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {entries.purchaseRequests.map((pr) => (
                                                                    <tr key={pr.purchaseRequestLineId} className="border-t">
                                                                        <td className="px-3 py-2">{pr.purchaseRequest?.requestNo || `PR-${pr.purchaseRequestId || pr.purchaseRequest?.purchaseRequestId || 'N/A'}`}</td>
                                                                        <td className="px-3 py-2">{pr.qty}</td>
                                                                        <td className="px-3 py-2">{pr.purchaseRequest?.status || 'N/A'}</td>
                                                                        <td className="px-3 py-2">{pr.createdAt ? new Date(pr.createdAt).toLocaleString() : 'N/A'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {entries.purchaseOrders && entries.purchaseOrders.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Purchase Orders</h4>
                                                    <div className="overflow-x-auto border rounded">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left">PO No</th>
                                                                    <th className="px-3 py-2 text-left">Qty</th>
                                                                    <th className="px-3 py-2 text-left">Status</th>
                                                                    <th className="px-3 py-2 text-left">Created At</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {entries.purchaseOrders.map((po) => (
                                                                    <tr key={po.purchaseOrderLineId} className="border-t">
                                                                        <td className="px-3 py-2">{po.purchaseOrder?.poNo || `PO-${po.purchaseOrderId || 'N/A'}`}</td>
                                                                        <td className="px-3 py-2">{po.qty}</td>
                                                                        <td className="px-3 py-2">{po.purchaseOrder?.status || 'N/A'}</td>
                                                                        <td className="px-3 py-2">{po.createdAt ? new Date(po.createdAt).toLocaleString() : 'N/A'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {entries.grns && entries.grns.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">GRNs</h4>
                                                    <div className="overflow-x-auto border rounded">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left">GRN No</th>
                                                                    <th className="px-3 py-2 text-left">Qty Received</th>
                                                                    <th className="px-3 py-2 text-left">Status</th>
                                                                    <th className="px-3 py-2 text-left">Created At</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {entries.grns.map((g) => (
                                                                    <tr key={g.grnLineId} className="border-t">
                                                                        <td className="px-3 py-2">{g.grn?.grnNo || `GRN-${g.grnId || 'N/A'}`}</td>
                                                                        <td className="px-3 py-2">{g.qtyReceived ?? g.qty ?? 0}</td>
                                                                        <td className="px-3 py-2">{g.grn?.status || 'N/A'}</td>
                                                                        <td className="px-3 py-2">{g.createdAt ? new Date(g.createdAt).toLocaleString() : 'N/A'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {entries.issuances && entries.issuances.length > 0 && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Issuances</h4>
                                                    <div className="overflow-x-auto border rounded">
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-100">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left">Ref</th>
                                                                    <th className="px-3 py-2 text-left">Qty</th>
                                                                    <th className="px-3 py-2 text-left">Created At</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {entries.issuances.map((it, idx) => (
                                                                    <tr key={idx} className="border-t">
                                                                        <td className="px-3 py-2">{it.issuance?.issuanceNo || it.reference || 'N/A'}</td>
                                                                        <td className="px-3 py-2">{it.qty ?? 0}</td>
                                                                        <td className="px-3 py-2">{it.createdAt ? new Date(it.createdAt).toLocaleString() : 'N/A'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
                            <button onClick={handleCloseViewModal} className="w-40 py-3.5 border border-customBlue text-customBlue hover:bg-gray-50 rounded-lg text-sm font-medium transition cursor-pointer">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ItemsPage;