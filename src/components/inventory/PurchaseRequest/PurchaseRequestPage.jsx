'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader } from 'lucide-react';
import DataTable from '@/components/components/DataTable';
import FieldWrapper from '@/components/ui/FieldWrapper';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import ValidationErrorModal from '@/components/components/ValidationErrorModal';
import SuccessModal from '@/components/ui/SuccessModal';
import { useOffices } from '@/hooks/office/useOffices';
import { useItems } from '@/hooks/inventory/items/useItems';
import { useDropdownStores } from '@/hooks/inventory/utility/useDropdownStores';
import { usePurchaseRequests } from '@/hooks/inventory/purchase request/usePurchaseRequests';
import { useCreatePurchaseRequest } from '@/hooks/inventory/purchase request/useCreatePurchaseRequest';
import { useUpdatePurchaseRequest } from '@/hooks/inventory/purchase request/useUpdatePurchaseRequest';
import { useDeletePurchaseRequest } from '@/hooks/inventory/purchase request/useDeletePurchaseRequest';
import { purchaseRequestLineList, resolveItemRecordId, resolveItemUnitOfMeasurement } from '@/lib/inventoryItemMeta';
import { useAppUserById } from '@/hooks/users/useAppUserById';

function extractUserRecord(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  if (!payload || typeof payload !== 'object') return null;
  const preferredKeys = ['data', 'user', 'result', 'details'];
  for (const key of preferredKeys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  }
  return payload;
}

function UserEmailCell({ userId }) {
  const { data } = useAppUserById(userId, { enabled: !!userId });
  const user = useMemo(() => extractUserRecord(data), [data]);
  return user?.email || user?.emailId || user?.userEmail || 'N/A';
}

function formatApiErrorMessage(error, fallback) {
  const msg = error?.response?.data?.message;
  if (Array.isArray(msg)) return msg.join('; ');
  if (typeof msg === 'string' && msg) return msg;
  return error?.message || fallback;
}

function extractItemRecord(payload) {
  if (Array.isArray(payload)) return payload[0] || null;
  if (!payload || typeof payload !== 'object') return null;

  const preferredKeys = ['data', 'item', 'result', 'details'];
  for (const key of preferredKeys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return candidate;
    }
  }

  return payload;
}

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return 'N/A';
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return String(value);
  return asNumber.toFixed(2);
}

const PurchaseRequestItemDetailRow = ({ item, index, showAction, onRemove, itemLookup }) => {
  const itemRecordId = String(item.itemId ?? item.inventoryItemId ?? '');
  const itemDetails = itemLookup.get(itemRecordId);

  const unitPrice = itemDetails?.amount ?? itemDetails?.unitPrice ?? itemDetails?.price ?? item.unitPrice ?? null;
  const taxAmount = itemDetails?.taxAmount ?? item.taxAmount ?? null;
  const computedTotal =
    itemDetails?.totalAmount ??
    item.totalAmount ??
    (Number.isFinite(Number(unitPrice)) && Number.isFinite(Number(taxAmount))
      ? Number(unitPrice) + Number(taxAmount)
      : null);
  const categoryName =
    itemDetails?.category?.categoryName ||
    itemDetails?.category?.name ||
    itemDetails?.categoryName ||
    'N/A';
  const subCategoryName =
    itemDetails?.subCategory?.subCategoryName ||
    itemDetails?.subCategory?.name ||
    itemDetails?.subCategoryName ||
    'N/A';

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-4 py-3 text-gray-700">{String(index + 1).padStart(2, '0')}</td>
      <td className="px-4 py-3 text-gray-700">{item.itemSku || item.sku || 'N/A'}</td>
      <td className="px-4 py-3 text-gray-700">{item.itemName || item.name || 'N/A'}</td>
      <td className="px-4 py-3 text-gray-700">{item.unitOfMeasurement || item.uom || 'N/A'}</td>
      <td className="px-4 py-3 text-gray-700">{item.quantity ?? item.qty ?? 'N/A'}</td>
      <td className="px-4 py-3 text-gray-700">{formatMoney(unitPrice)}</td>
      <td className="px-4 py-3 text-gray-700">{formatMoney(taxAmount)}</td>
      <td className="px-4 py-3 text-gray-700">{formatMoney(computedTotal)}</td>
      <td className="px-4 py-3 text-gray-700">{categoryName}</td>
      <td className="px-4 py-3 text-gray-700">{subCategoryName}</td>
      {showAction && (
        <td className="px-4 py-3 text-center">
          <button
            onClick={() => onRemove(item.id)}
            className="w-6 h-6 rounded bg-red-500 hover:bg-red-600 flex items-center justify-center text-white mx-auto"
          >
            ✕
          </button>
        </td>
      )}
    </tr>
  );
};

const PurchaseRequestPage = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [previewRequest, setPreviewRequest] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [isEditingRequest, setIsEditingRequest] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState(null);

  const [user] = useState({ id: 'admin@crescent.com', userId: 'admin' });

  const [purchaseRequestItems, setPurchaseRequestItems] = useState([]);
  const [purchaseFormData, setPurchaseFormData] = useState({
    officeId: '',
    storeId: '',
    itemSku: '',
    itemId: '',
    itemName: '',
    unitOfMeasurement: '',
    quantity: 1,
  });

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];

    const preferredKeys = ['data', 'items', 'results', 'list', 'rows', 'purchaseRequests', 'requests', 'content'];
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

  const normalizeItems = (data) => {
    return normalizeList(data).map((item) => ({
      ...item,
      id: resolveItemRecordId(item) || (item.id ?? item.itemId ?? item._id),
      name: item.name || item.itemName || '',
      sku: item.sku || item.itemSku || '',
      unitOfMeasurement: resolveItemUnitOfMeasurement(item),
      price: item.price ?? item.unitPrice ?? 0,
    }));
  };

  const requestsQuery = usePurchaseRequests();
  const officesQuery = useOffices(undefined, { enabled: true });
  const storesQuery = useDropdownStores();
  const itemsQuery = useItems();

  const offices = useMemo(
    () => normalizeList(officesQuery.data).map((office) => ({
      ...office,
      id: office.id ?? office.officeId ?? office._id,
      branchName: office.branchName || office.officeName || office.name || '',
      cityId: office.cityId ?? office.city?.cityId ?? null,
    })),
    [officesQuery.data]
  );

  const officeOptions = useMemo(
    () => offices.map((office) => ({ value: String(office.id), label: office.branchName })),
    [offices]
  );

  const stores = useMemo(
    () => normalizeList(storesQuery.data).map((store) => ({
      ...store,
      id: store.id ?? store.storeId ?? store._id ?? store.value,
      name: store.name || store.storeName || store.label || '',
      officeId: store.officeId ?? store.office?.officeId ?? store.office?.id ?? null,
    })),
    [storesQuery.data]
  );

  const filteredStores = useMemo(() => {
    if (!purchaseFormData.officeId) return [];
    return stores.filter(
      (store) => String(store.officeId ?? '') === String(purchaseFormData.officeId)
    );
  }, [stores, purchaseFormData.officeId]);

  const storeOptions = useMemo(
    () => filteredStores.map((store) => ({ value: String(store.id), label: store.name })),
    [filteredStores]
  );

  const items = useMemo(() => {
    return normalizeItems(itemsQuery.data).map((item) => {
      const details = extractItemRecord(item) || item;
      return {
        ...item,
        ...details,
        id: resolveItemRecordId(details) || item.id,
      };
    });
  }, [itemsQuery.data]);

  const findItemById = (rawId) =>
    items.find((item) => String(item.id) === String(rawId ?? ''));

  const itemOptions = useMemo(
    () => items.map((item) => ({ value: String(item.id), label: item.sku ? `${item.sku} - ${item.name}` : item.name })),
    [items]
  );

  const itemLookup = useMemo(() => {
    const map = new Map();
    items.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [items]);

  const requests = useMemo(() => {
    return normalizeList(requestsQuery.data).map((request) => {
      const id = request.purchaseRequestId ?? request.id ?? request.requestId ?? request._id;
      const lines = purchaseRequestLineList(request).map((line, idx) => {
        const lineItemId = line.itemId ?? line.id ?? line.inventoryItemId ?? '';
        const itemMeta = itemLookup.get(String(lineItemId));
        return {
          ...line,
          id: line.purchaseRequestLineId ?? line.id ?? `${id || 'pr'}-line-${idx}`,
          itemId: lineItemId,
          itemSku: line.itemSku || line.sku || itemMeta?.sku || '',
          itemName: line.itemName || line.name || itemMeta?.name || `Item #${lineItemId}`,
          unitOfMeasurement: resolveItemUnitOfMeasurement(line) || itemMeta?.unitOfMeasurement || '',
          quantity: Number(line.qty ?? line.quantity ?? line.quantityOrdered ?? 0),
        };
      });
      return {
        ...request,
        id,
        requestNo: request.requestNo || request.purchaseRequestNo || (id != null ? `PR-${id}` : ''),
        officeId: request.officeId ?? request.office?.officeId ?? request.office?.id ?? '',
        officeName:
          request.officeName ||
          request.office?.branchName ||
          request.office?.officeName ||
          request.branchName ||
          offices.find((office) => String(office.id) === String(request.officeId ?? request.office?.officeId ?? request.office?.id ?? ''))?.branchName ||
          '',
        storeId: request.storeId ?? request.store?.storeId ?? request.store?.id ?? '',
        storeName: request.storeName || request.store?.storeName || request.store?.name || '',
        storeLocation: request.store?.location || '',
        requestedByName:
          request.requestedBy?.email ||
          request.requestedBy?.emailId ||
          request.requestedByEmail ||
          request.userEmail ||
          '',
        requestedByUserId: request.requestedByUserId ?? null,
        createdAt: request.createdAt || request.createdOn || request.date || new Date().toISOString(),
        status: String(request.status || request.approvalStatus || 'DRAFT').toUpperCase(),
        approvedByUserId: request.approvedByUserId ?? null,
        approvedAt: request.approvedAt ?? null,
        rejectedByUserId: request.rejectedByUserId ?? null,
        rejectedAt: request.rejectedAt ?? null,
        rejectionReason: request.rejectionReason ?? null,
        items: lines,
        lineCount: lines.length,
      };
    });
  }, [itemLookup, offices, requestsQuery.data]);

  const calculateRequestTotalAmount = (requestItems = []) => {
    return requestItems.reduce((sum, line) => {
      const itemDetails = itemLookup.get(String(line.itemId ?? line.inventoryItemId ?? ''));
      const unitPrice = itemDetails?.amount ?? itemDetails?.unitPrice ?? itemDetails?.price ?? line.unitPrice ?? 0;
      const taxAmount = itemDetails?.taxAmount ?? line.taxAmount ?? 0;
      const totalAmount =
        itemDetails?.totalAmount ??
        line.totalAmount ??
        (Number.isFinite(Number(unitPrice)) && Number.isFinite(Number(taxAmount))
          ? Number(unitPrice) + Number(taxAmount)
          : Number(unitPrice) || 0);

      const asNumber = Number(totalAmount);
      return sum + (Number.isFinite(asNumber) ? asNumber : 0);
    }, 0);
  };

  const tableColumns = [
    { key: 'requestNo', label: 'PR #', width: '16%' },
    { key: 'officeName', label: 'Office', width: '14%', render: (item) => item.officeName || 'N/A' },
    { key: 'storeName', label: 'Store', width: '18%', render: (item) => item.storeName || 'N/A' },
    {
      key: 'requestedByName',
      label: 'Requested By',
      width: '14%',
      render: (item) =>
        item.requestedByName || (item.requestedByUserId ? <UserEmailCell userId={item.requestedByUserId} /> : 'N/A'),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      width: '12%',
      render: (item) => formatMoney(calculateRequestTotalAmount(item.items || []))
    },
    {
      key: 'createdAt',
      label: 'Created At',
      width: '18%',
      render: (item) => new Date(item.createdAt).toLocaleString()
    },
    {
      key: 'status',
      label: 'Status',
      width: '12%',
      render: (item) => (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
          item.status === 'APPROVED' || item.status === 'SUBMITTED' ? 'bg-green-100 text-green-700' :
          item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
        }`}>
          {item.status || 'DRAFT'}
        </span>
      )
    }
  ];

  const resetForm = () => {
    setPurchaseRequestItems([]);
    setPurchaseFormData({
      officeId: '',
      storeId: '',
      itemSku: '',
      itemId: '',
      itemName: '',
      unitOfMeasurement: '',
      quantity: 1,
    });
    setIsEditingRequest(false);
    setSelectedRequestId(null);
    setSubmitError('');
  };

  const handleOpenModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const handleQuantityChange = (value) => {
    const num = parseInt(value, 10) || 1;
    if (num > 0) {
      setPurchaseFormData((prev) => ({ ...prev, quantity: num }));
    }
  };

  const handleAddItem = () => {
    if (!purchaseFormData.itemId) {
      setValidationErrors(['Item']);
      setShowValidationError(true);
      return;
    }

    const selectedItem = findItemById(purchaseFormData.itemId);
    if (!selectedItem) return;

    setPurchaseRequestItems((prev) => [...prev, {
      id: Date.now(),
      itemId: selectedItem.id,
      itemSku: selectedItem.sku,
      itemName: selectedItem.name,
      unitOfMeasurement: purchaseFormData.unitOfMeasurement || selectedItem.unitOfMeasurement,
      quantity: purchaseFormData.quantity,
      unitPrice: selectedItem.price || 0,
    }]);

    setPurchaseFormData((prev) => ({
      ...prev,
      itemSku: '',
      itemId: '',
      itemName: '',
      unitOfMeasurement: '',
      quantity: 1,
    }));
  };

  const handleRemoveItem = (itemId) => {
    setPurchaseRequestItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const buildPayload = () => {
    const toNumericId = (value) => {
      if (value === undefined || value === null || value === '') return value;
      const n = Number(value);
      return Number.isFinite(n) ? n : value;
    };

    return {
      officeId: toNumericId(purchaseFormData.officeId),
      storeId: toNumericId(purchaseFormData.storeId),
      lines: purchaseRequestItems.map((row) => ({
        itemId: toNumericId(row.itemId),
        qty: Math.max(1, parseInt(row.quantity, 10) || 1),
      })),
    };
  };

  const closeAfterSuccess = (message) => {
    setSuccessModal({ isOpen: true, message });
    setShowAddModal(false);
    resetForm();
  };

  const { mutate: createPurchaseRequest, isPending: isCreating } = useCreatePurchaseRequest({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      closeAfterSuccess('Purchase Request created successfully');
    },
    onError: (error) => {
      setSubmitError(formatApiErrorMessage(error, 'Failed to create purchase request.'));
    },
  });

  const { mutate: updatePurchaseRequest, isPending: isUpdating } = useUpdatePurchaseRequest({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      closeAfterSuccess('Purchase Request updated successfully');
    },
    onError: (error) => {
      setSubmitError(formatApiErrorMessage(error, 'Failed to update purchase request.'));
    },
  });

  const { mutate: deletePurchaseRequest } = useDeletePurchaseRequest({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
    },
  });

  const filteredRequests = useMemo(() => {
    const term = searchQuery.toLowerCase();
    return requests.filter((request) =>
      (request.requestNo || '').toLowerCase().includes(term) ||
      (request.storeName || '').toLowerCase().includes(term) ||
      (request.userId || '').toLowerCase().includes(term) ||
      String(request.id || '').toLowerCase().includes(term)
    );
  }, [requests, searchQuery]);

  const handleAddRequest = () => {
    if (!purchaseFormData.officeId || !purchaseFormData.storeId || purchaseRequestItems.length === 0) {
      setValidationErrors(['Office', 'Store', 'Items']);
      setShowValidationError(true);
      return;
    }

    const payload = buildPayload();
    setSubmitError('');

    if (isEditingRequest && selectedRequestId) {
      updatePurchaseRequest({ id: selectedRequestId, data: payload });
      return;
    }

    createPurchaseRequest(payload);
  };

  const handleDeleteRequest = (itemId) => {
    if (!itemId) return;
    deletePurchaseRequest(itemId);
  };

  const handleEditRequest = (item) => {
    const normalizedModalItems = (item.items || purchaseRequestLineList(item) || []).map((line, idx) => {
      const lineItemId = line.itemId ?? line.id ?? line.inventoryItemId ?? '';
      const itemMeta = itemLookup.get(String(lineItemId));
      return {
        ...line,
        id: line.id ?? line.purchaseRequestLineId ?? `${item.id || 'pr'}-line-${idx}`,
        itemId: lineItemId,
        itemSku: line.itemSku || line.sku || itemMeta?.sku || '',
        itemName: line.itemName || line.name || itemMeta?.name || `Item #${lineItemId}`,
        unitOfMeasurement: resolveItemUnitOfMeasurement(line) || itemMeta?.unitOfMeasurement || '',
        quantity: Number(line.quantity ?? line.qty ?? line.quantityOrdered ?? 0),
      };
    });

    setSelectedRequestId(item.id);
    setIsEditingRequest(true);
    setPurchaseRequestItems(normalizedModalItems);
    setPurchaseFormData({
      officeId: item.officeId || '',
      storeId: item.storeId || '',
      itemSku: '',
      itemId: '',
      itemName: '',
      unitOfMeasurement: '',
      quantity: 1,
    });
    setShowAddModal(true);
  };

  const handleViewRequest = (item) => {
    setPreviewRequest(item);
  };

  const previewItems = previewRequest
    ? (Array.isArray(previewRequest.items) ? previewRequest.items : purchaseRequestLineList(previewRequest))
    : [];

  return (
    <div className="bg-white p-8 min-h-screen scrollbar-hide m-5 rounded-lg">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Requests</h1>
        <button
          onClick={handleOpenModal}
          className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-customBlue text-white font-semibold rounded-lg hover:bg-customBlue/90"
        >
          <Plus size={18} />
          Add New Request
        </button>
      </div>

      {submitError && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      <div className="pb-6 md:pb-8">
        <DataTable
          isLoading={requestsQuery.isLoading || officesQuery.isLoading || storesQuery.isLoading || itemsQuery.isLoading}
          error={requestsQuery.error?.message || officesQuery.error?.message || storesQuery.error?.message || itemsQuery.error?.message || null}
          items={filteredRequests}
          columns={tableColumns}
          showView={true}
          showEdit={true}
          showDelete={true}
          showToggle={false}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onView={handleViewRequest}
          onEdit={handleEditRequest}
          onDelete={handleDeleteRequest}
          tabName="Purchase Request"
        />
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col h-full " style={{ maxHeight: '95vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">
                {isEditingRequest ? 'Edit Purchase Request' : 'Add New Purchase Request'}
              </h2>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FieldWrapper label="Office" required className="text-sm">
                  <Select
                    placeholder="Select Office"
                    value={purchaseFormData.officeId}
                    onChange={(e) => setPurchaseFormData((prev) => ({ ...prev, officeId: e.target.value, storeId: '' }))}
                    className="text-sm"
                    options={officeOptions}
                  >
                  </Select>
                </FieldWrapper>

                <FieldWrapper label="Store" required className="text-sm">
                  <Select
                    placeholder={purchaseFormData.officeId ? 'Select Store' : 'Select office first'}
                    value={purchaseFormData.storeId}
                    onChange={(e) => setPurchaseFormData((prev) => ({ ...prev, storeId: e.target.value }))}
                    className="text-sm"
                    options={storeOptions}
                    disabled={!purchaseFormData.officeId}
                  >
                  </Select>
                </FieldWrapper>

                <FieldWrapper label="User ID" required className="text-sm">
                  <Input value={user?.id || 'Loading...'} disabled className="text-sm py-2 bg-gray-50" />
                </FieldWrapper>

                <FieldWrapper label="Date & Time" required className="text-sm">
                  <Input value={new Date().toLocaleString()} disabled className="text-sm py-2 bg-gray-50" />
                </FieldWrapper>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Add Items</h3>
                <div className="grid grid-cols-1  md:grid-cols-4 gap-4">
                  <FieldWrapper label="Item SKU / Name" required className="text-sm">
                    <SearchableSelect
                      placeholder="Select Item"
                      value={purchaseFormData.itemId}
                      onChange={(e) => {
                        const selected = findItemById(e.target.value);
                        if (selected) {
                          setPurchaseFormData((prev) => ({
                            ...prev,
                            itemId: String(selected.id ?? ''),
                            itemSku: selected.sku,
                            itemName: selected.name,
                            unitOfMeasurement: resolveItemUnitOfMeasurement(selected),
                          }));
                        }
                      }}
                      className="text-sm"
                      options={itemOptions}
                    >
                    </SearchableSelect>
                  </FieldWrapper>

                  <FieldWrapper label="Unit of Measurement" required className="text-sm">
                    <Input value={purchaseFormData.unitOfMeasurement ?? ''} disabled className="text-sm py-2 bg-gray-50" />
                  </FieldWrapper>
                  
                  <FieldWrapper label="Quantity" required className="text-sm">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleQuantityChange(purchaseFormData.quantity - 1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-semibold cursor-pointer">−</button>
                      <Input
                        type="number"
                        value={purchaseFormData.quantity}
                        onChange={(e) => handleQuantityChange(e.target.value)}
                        className="text-sm py-2 text-center flex-1"
                      />
                      <button onClick={() => handleQuantityChange(purchaseFormData.quantity + 1)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-lg font-semibold cursor-pointer">+</button>
                    </div>
                  </FieldWrapper>

                  <button
                      onClick={handleAddItem}
                      className="w-full px-4 py-2 bg-customBlue text-white rounded-lg text-sm font-medium hover:bg-customBlue/90 transition cursor-pointer flex items-center justify-center gap-2 h-full"
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                </div>
              </div>

              {purchaseRequestItems.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Items in Request</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">S. No.</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Item SKU</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Unit</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Quantity</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Unit Price</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Tax Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Total Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Sub Category</th>
                          <th className="text-center px-4 py-3 font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchaseRequestItems.map((item, index) => (
                          <PurchaseRequestItemDetailRow
                            key={item.id}
                            item={item}
                            index={index}
                            showAction
                            onRemove={handleRemoveItem}
                            itemLookup={itemLookup}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
              <button
                onClick={handleCloseModal}
                className="w-40 py-3.5 border border-customBlue text-customBlue hover:bg-gray-50 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRequest}
                disabled={isCreating || isUpdating}
                className="w-40 py-3.5 bg-customBlue text-white hover:bg-customBlue/90 rounded-lg text-sm font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(isCreating || isUpdating) && <Loader size={16} className="animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {previewRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl flex flex-col" style={{ maxHeight: '95vh' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Purchase Request Details</h2>
              <button onClick={() => setPreviewRequest(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  ['PR #', previewRequest.requestNo || `PR-${previewRequest.id}`],
                  ['Office', previewRequest.officeName || 'N/A'],
                  ['Store', previewRequest.storeName || 'N/A'],
                  ['Store Location', previewRequest.storeLocation || 'N/A'],
                  ['Created On', new Date(previewRequest.createdAt).toLocaleString()],
                  ['Status', previewRequest.status || 'DRAFT'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
                    <p className="text-sm text-gray-900">{value}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Requested By</p>
                  <p className="text-sm text-gray-900">
                    {previewRequest.requestedByName ||
                      (previewRequest.requestedByUserId ? (
                        <UserEmailCell userId={previewRequest.requestedByUserId} />
                      ) : (
                        'N/A'
                      ))}
                  </p>
                </div>
              </div>

              {previewItems.length > 0 && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Items</h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">S. No.</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Item SKU</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Item Name</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Unit</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Quantity</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Unit Price</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Tax Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Total Amount</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Category</th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700">Sub Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewItems.map((item, idx) => (
                          <PurchaseRequestItemDetailRow
                            key={item.id ?? item.purchaseRequestLineId ?? `line-${idx}`}
                            item={item}
                            index={idx}
                            showAction={false}
                            itemLookup={itemLookup}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white shrink-0">
              <button
                onClick={() => setPreviewRequest(null)}
                className="w-40 py-3.5 bg-customBlue text-white hover:bg-customBlue/90 rounded-lg text-sm font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <ValidationErrorModal
        isOpen={showValidationError}
        onClose={() => setShowValidationError(false)}
        missingFields={validationErrors}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        title="Success"
        message={successModal.message}
      />
    </div>
  );
};

export default PurchaseRequestPage;
