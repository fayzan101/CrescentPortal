'use client';
import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, X, Loader, AlertCircle } from 'lucide-react';
import DataTable from '@/components/components/DataTable';
import { useGetAllGRNs } from '@/hooks/inventory/Grn/useGetAllGRNs';
import { useCreateGRN } from '@/hooks/inventory/Grn/useCreateGRN';
import { useDeleteGRN } from '@/hooks/inventory/Grn/useDeleteGRN';
import { useUpdateGRN } from '@/hooks/inventory/Grn/useUpdateGRN';
import { useItems } from '@/hooks/inventory/items/useItems';
import { useAppUserById } from '@/hooks/users/useAppUserById';
import { usePurchaseOrders } from '@/hooks/inventory/purchase orders/usePurchaseOrders';
import { useDropdownStores } from '@/hooks/inventory/utility/useDropdownStores';
import { useDropdownVendors } from '@/hooks/inventory/utility/useDropdownVendors';
import { normalizeApiList } from '@/lib/normalizeApiList';
import { resolveItemUnitOfMeasurement } from '@/lib/inventoryItemMeta';

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 'N/A';
  return n.toFixed(2);
};

const enrichGrnLineItem = (line, itemLookup) => {
  const itemId = line.itemId ?? line.item?.itemId;
  const meta = itemLookup.get(String(itemId ?? ''));
  const unitPrice = Number(line.unitPrice ?? line.item?.amount ?? meta?.unitPrice ?? 0);
  const taxAmount = Number(line.taxAmount ?? line.item?.taxAmount ?? meta?.taxAmount ?? 0);
  const quantityReceived = Math.max(0, Number(line.quantityReceived ?? line.qtyReceived ?? line.qty ?? 0) || 0);
  const quantityOrdered = Math.max(0, Number(line.quantityOrdered ?? line.qtyOrdered ?? 0));
  return {
    ...line,
    itemId,
    sku: line.sku || line.item?.sku || meta?.sku || 'N/A',
    itemName: line.itemName || line.item?.itemName || meta?.name || `Item #${itemId ?? 'N/A'}`,
    unitOfMeasurement: line.unitOfMeasurement || line.item?.uom || meta?.unitOfMeasurement || 'N/A',
    unitPrice,
    taxAmount,
    categoryName: line.categoryName || line.item?.category?.categoryName || meta?.categoryName || 'N/A',
    subCategoryName: line.subCategoryName || line.item?.subCategory?.subCategoryName || meta?.subCategoryName || 'N/A',
    quantityReceived,
    quantityOrdered,
    totalPrice: (quantityReceived * unitPrice + taxAmount).toFixed(2),
  };
};

const resolveUserLabel = (user, userId) => {
  if (user && typeof user === 'object') {
    return user.email || user.emailId || user.userEmail || user.name || null;
  }
  return userId ? String(userId) : null;
};

const extractItemRecord = (payload) => {
  if (Array.isArray(payload)) return payload[0] || null;
  if (!payload || typeof payload !== 'object') return null;
  const preferredKeys = ['data', 'item', 'result', 'details'];
  for (const key of preferredKeys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  }
  return payload;
};

const extractUserRecord = (payload) => {
  if (Array.isArray(payload)) return payload[0] || null;
  if (!payload || typeof payload !== 'object') return null;
  const preferredKeys = ['data', 'user', 'result', 'details'];
  for (const key of preferredKeys) {
    const candidate = payload[key];
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate;
  }
  return payload;
};

const UserEmailCell = ({ userId }) => {
  const { data } = useAppUserById(userId, { enabled: !!userId });
  const user = useMemo(() => extractUserRecord(data), [data]);
  return user?.email || user?.emailId || user?.userEmail || userId || 'N/A';
};

const GrnItemRow = ({
  item,
  index,
  onQtyChange,
  getLineTotal,
}) => (
  <tr className="border-b border-gray-200 hover:bg-gray-50">
    <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
    <td className="py-3 px-4 text-sm text-gray-700">{item.sku || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-700">{item.itemName || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-700">{item.unitOfMeasurement || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-700">
      <input
        type="number"
        min="1"
        max={item.quantityOrdered || undefined}
        value={item.quantityReceived}
        onChange={(e) => onQtyChange(item.id, e.target.value)}
        className="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
      />
      {item.quantityOrdered ? (
        <span className="block text-xs text-gray-500 mt-1">of {item.quantityOrdered} ordered</span>
      ) : null}
    </td>
    <td className="py-3 px-4 text-sm text-gray-700">{formatMoney(item.unitPrice)}</td>
    <td className="py-3 px-4 text-sm text-gray-700">{formatMoney(item.taxAmount)}</td>
    <td className="py-3 px-4 text-sm font-semibold text-gray-700">{formatMoney(getLineTotal(item))}</td>
    <td className="py-3 px-4 text-sm text-gray-700">{item.categoryName || 'N/A'}</td>
    <td className="py-3 px-4 text-sm text-gray-700">{item.subCategoryName || 'N/A'}</td>
  </tr>
);

const ReceiveGRNPage = () => {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedPO, setSelectedPO] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [grnItems, setGrnItems] = useState([]);
  const [nextGrnNumber, setNextGrnNumber] = useState('GRN-2024-001');
  const [grnFormData, setGrnFormData] = useState({
    purchaseOrderId: '',
    storeId: '',
    officeId: '',
    vendorId: '',
    invoicePeriodDays: 30,
    itemId: '',
    quantityReceived: 1,
    conditionStatus: 'NEW'
  });
  const [previewGrn, setPreviewGrn] = useState(null);
  const [editingGrnId, setEditingGrnId] = useState(null);

  const { data: grnsRaw, isLoading: loading } = useGetAllGRNs();
  const { data: purchaseOrdersRaw, isLoading: loadingPOs } = usePurchaseOrders();
  const { data: itemsRaw } = useItems();
  const { data: storesRaw } = useDropdownStores();
  const { data: vendorsRaw, isLoading: loadingVendors } = useDropdownVendors();
  const { mutateAsync: createGRN } = useCreateGRN();
  const { mutateAsync: updateGRN } = useUpdateGRN();
  const { mutateAsync: deleteGRN } = useDeleteGRN();

  const normalizeOrderLines = (order) => {
    if (!order || typeof order !== 'object') return [];
    if (Array.isArray(order.lines)) return order.lines;
    if (Array.isArray(order.items)) return order.items;
    if (Array.isArray(order.purchaseOrderItems)) return order.purchaseOrderItems;
    return [];
  };

  const items = useMemo(
    () =>
      normalizeApiList(itemsRaw).map((item) => {
        const details = extractItemRecord(item) || item;
        return {
          ...details,
          id: item.id ?? item.itemId ?? item._id,
          name: item.name || item.itemName || item.label || '',
          sku: item.sku || item.itemSku || '',
          unitOfMeasurement: resolveItemUnitOfMeasurement(details) || resolveItemUnitOfMeasurement(item),
          unitPrice: Number(details.amount ?? details.unitPrice ?? details.price ?? 0),
          taxAmount: Number(details.taxAmount ?? 0),
          categoryName:
            details?.category?.categoryName ||
            details?.categoryName ||
            'N/A',
          subCategoryName:
            details?.subCategory?.subCategoryName ||
            details?.subCategoryName ||
            'N/A',
        };
      }),
    [itemsRaw]
  );

  const itemLookup = useMemo(() => {
    const map = new Map();
    items.forEach((item) => map.set(String(item.id), item));
    return map;
  }, [items]);

  const purchaseOrders = useMemo(
    () =>
      normalizeApiList(purchaseOrdersRaw).map((order) => {
        const lines = normalizeOrderLines(order).map((line, idx) => {
          const rawItemId = line.itemId ?? line.id ?? line.inventoryItemId ?? '';
          const itemMeta = itemLookup.get(String(rawItemId));
          const unitPrice = Number(line.unitPrice ?? line.price ?? itemMeta?.unitPrice ?? 0);
          return {
            ...line,
            id: line.id ?? line.purchaseOrderLineId ?? `${order.purchaseOrderId ?? order.id ?? 'po'}-line-${idx}`,
            itemId: rawItemId,
            itemName: line.itemName || line.name || itemMeta?.name || `Item #${rawItemId}`,
            sku: line.itemSku || line.sku || itemMeta?.sku || '',
            unitOfMeasurement: line.unitOfMeasurement || itemMeta?.unitOfMeasurement || 'N/A',
            taxAmount: Number(line.taxAmount ?? itemMeta?.taxAmount ?? 0),
            categoryName: itemMeta?.categoryName || 'N/A',
            subCategoryName: itemMeta?.subCategoryName || 'N/A',
            quantityOrdered: Number(line.quantityOrdered ?? line.qty ?? line.quantity ?? 0),
            unitPrice,
          };
        });
        return {
          ...order,
          id: order.id ?? order.purchaseOrderId ?? order._id,
          poNo: order.purchaseOrderNo || order.poNo || order.code || '',
          prNo: order.purchaseRequestNo || order.purchasedRequestNo || order.prNo || '',
          approvalStatus: String(order.approvalStatus || order.status || 'DRAFT').toUpperCase(),
          deliveryStatus: String(order.deliveryStatus || order.delivery_state || 'PENDING').toUpperCase(),
          officeId: order.officeId ?? order.shipToOfficeId ?? order.purchaseRequest?.officeId ?? order.office?.id ?? order.office?.officeId ?? '',
          officeName: order.officeName || order.office?.branchName || order.branchName || '',
          storeId: order.storeId ?? order.store?.id ?? order.store?.storeId ?? '',
          vendorId: order.vendorId ?? order.vendor?.id ?? order.vendor?.vendorId ?? '',
          lines,
        };
      }),
    [itemLookup, purchaseOrdersRaw]
  );

  const grns = useMemo(
    () =>
      normalizeApiList(grnsRaw).map((grn) => ({
        ...grn,
        id: grn.id ?? grn.grnId ?? grn._id,
        grnNo: grn.grnNo || grn.grnNumber || '',
        purchaseOrderId: grn.purchaseOrderId ?? grn.poId ?? grn.purchaseOrder?.purchaseOrderId ?? grn.po?.id ?? '',
        poNo: grn.poNo || grn.purchaseOrder?.poNo || grn.purchaseOrder?.purchaseOrderNo || '',
        prNo:
          grn.prNo ||
          grn.prNumber ||
          grn.purchaseOrder?.purchaseRequest?.requestNo ||
          grn.purchaseOrder?.purchaseRequestNo ||
          '',
        officeId: grn.officeId ?? grn.office?.officeId ?? grn.office?.id ?? '',
        officeName: grn.officeName || grn.office?.branchName || grn.office?.officeName || grn.branchName || '',
        storeId: grn.storeId ?? grn.store?.storeId ?? grn.store?.id ?? '',
        storeName: grn.storeName || grn.store?.storeName || grn.store?.name || '',
        vendorName:
          grn.vendorName ||
          grn.purchaseOrder?.vendor?.vendorName ||
          grn.purchaseOrder?.vendor?.name ||
          '',
        receivedByUserId: grn.receivedByUserId ?? grn.receivedByUser ?? grn.receivedBy ?? null,
        receivedByEmail: resolveUserLabel(grn.receivedBy, grn.receivedByUserId),
        confirmedByUserId: grn.confirmedByUserId ?? null,
        confirmedByEmail: resolveUserLabel(grn.confirmedBy, grn.confirmedByUserId),
        confirmedAt: grn.confirmedAt ?? null,
        createdAt: grn.createdAt ?? grn.receivedDate ?? null,
        invoicePeriodDays: grn.invoicePeriodDays ?? null,
        remarks: grn.remarks ?? null,
        receivedDate: grn.receivedDate || grn.createdAt || grn.updatedAt || null,
        status: String(grn.status || 'DRAFT').toUpperCase(),
        items: Array.isArray(grn.lines) ? grn.lines : Array.isArray(grn.items) ? grn.items : [],
      })),
    [grnsRaw]
  );

  const previewLines = useMemo(() => {
    if (!previewGrn) return [];
    const rawLines = previewGrn.items || previewGrn.lines || [];
    return rawLines.map((line, idx) => enrichGrnLineItem({ ...line, id: line.id ?? line.grnLineId ?? idx }, itemLookup));
  }, [previewGrn, itemLookup]);

  const previewTotal = useMemo(
    () => previewLines.reduce((sum, line) => sum + Number(line.totalPrice || 0), 0),
    [previewLines]
  );

  const vendors = useMemo(
    () =>
      normalizeApiList(vendorsRaw).map((vendor) => ({
        ...vendor,
        id: vendor.id ?? vendor.vendorId ?? vendor._id,
        name: vendor.name || vendor.vendorName || vendor.label || '',
      })),
    [vendorsRaw]
  );

  const stores = useMemo(
    () =>
      normalizeApiList(storesRaw).map((store) => ({
        id: store.id ?? store.storeId ?? store._id,
        name: store.name || store.storeName || store.label || 'N/A',
      })),
    [storesRaw]
  );

  const grnTableData = useMemo(
    () =>
      grns.map((grn) => ({
        ...grn,
        name: [
          grn.grnNo,
          grn.poNo,
          grn.prNo,
          grn.storeName,
          grn.receivedByUserId,
        ]
          .filter(Boolean)
          .join(' '),
      })),
    [grns]
  );

  const grnColumns = useMemo(
    () => [
      { key: 'grnNo', label: 'GRN No.', width: '12%' },
      { key: 'poNo', label: 'PO No.', width: '12%' },
      { key: 'prNo', label: 'PR No.', width: '12%' },
      { key: 'storeName', label: 'Store', width: '18%' },
      {
        key: 'invoicePeriodDays',
        label: 'Period Days',
        width: '10%',
        render: (item) => item.invoicePeriodDays ?? 'N/A',
      },
      {
        key: 'createdAt',
        label: 'Created At',
        width: '12%',
        render: (item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'),
      },
      {
        key: 'receivedDate',
        label: 'GRN Received On',
        width: '14%',
        render: (item) => (item.receivedDate ? new Date(item.receivedDate).toLocaleDateString() : 'N/A'),
      },
      { key: 'receivedByUserId', label: 'Received By', width: '12%', render: (item) => <UserEmailCell userId={item.receivedByUserId} /> },
      {
        key: 'confirmedAt',
        label: 'Confirmed At',
        width: '12%',
        render: (item) => (item.confirmedAt ? new Date(item.confirmedAt).toLocaleString() : 'N/A'),
      },
      {
        key: 'status',
        label: 'Status',
        width: '10%',
        render: (item) => (
          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
              item.status === 'CONFIRMED'
                ? 'bg-green-100 text-green-700'
                : item.status === 'DRAFT'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {item.status || 'DRAFT'}
          </span>
        ),
      },
    ],
    []
  );
  const handlePreview = (grn) => {
    setPreviewGrn(grn);
  };

  const closePreviewModal = () => {
    setPreviewGrn(null);
  };

  const mapGrnLineToFormItem = (line, idx, parentId) =>
    enrichGrnLineItem(
      {
        id: line.id ?? line.grnLineId ?? `${parentId ?? 'grn'}-line-${idx}`,
        itemId: line.itemId,
        itemName: line.item?.itemName || line.itemName || line.item?.name || `Item #${line.itemId}`,
        sku: line.item?.sku || line.sku || '',
        quantityReceived: Math.max(1, Number(line.qtyReceived ?? line.qty ?? line.quantityReceived ?? 1)),
        quantityOrdered: Number(line.qtyOrdered ?? line.quantityOrdered ?? line.qty ?? 0),
        unitPrice: Number(line.unitPrice ?? line.price ?? 0),
        taxAmount: Number(line.taxAmount ?? 0),
        conditionStatus: line.conditionStatus || 'NEW',
        poItemId: line.poLineId ?? line.purchaseOrderLineId ?? null,
      },
      itemLookup
    );

  const handleEdit = (grn) => {
    if (grn.status === 'CONFIRMED') {
      toast.error('Confirmed GRNs cannot be edited');
      return;
    }

    setEditingGrnId(grn.id);
    setGrnFormData({
      purchaseOrderId: grn.purchaseOrderId || '',
      storeId: grn.storeId || '',
      officeId: grn.officeId || grn.office?.officeId || grn.office?.id
        ? String(grn.officeId ?? grn.office?.officeId ?? grn.office?.id ?? '')
        : '',
      vendorId: grn.vendorId || '',
      invoicePeriodDays: Number(grn.invoicePeriodDays ?? 30),
      itemId: '',
      quantityReceived: 1,
      conditionStatus: 'NEW'
    });
    const sourceLines = Array.isArray(grn.items) ? grn.items : Array.isArray(grn.lines) ? grn.lines : [];
    setGrnItems(sourceLines.map((line, idx) => mapGrnLineToFormItem(line, idx, grn.id)));
    setShowAddModal(true);
  };

  const handleDelete = async (grnId, grnNumber) => {
    setDeleting(grnId);
  
    return deleteGRN(grnId)
      .then((response) => {
        toast.success(`Deleted ${grnNumber}`);
        queryClient.invalidateQueries(['grns']);
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
        return response;
      })
      .catch((error) => {
        toast.error('Failed to delete GRN');
        throw error;
      })
      .finally(() => {
        setDeleting(null);
      });
  };

  const toggleRowSelection = (id) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedRows(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === displayGrns.length) {
      setSelectedRows(new Set());
    } else {
      const allIds = new Set(displayGrns.map(grn => grn.id));
      setSelectedRows(allIds);
    }
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Generate next GRN number based on existing GRNs
  const generateNextGrnNumber = () => {
    if (!grns || grns.length === 0) {
      return 'GRN-2024-001';
    }

    // Extract numeric part from existing GRN numbers
    const grnNumbers = grns
      .filter(grn => grn.grnNumber)
      .map(grn => {
        const match = grn.grnNumber.match(/GRN-\d+-(\d+)/);
        return match ? parseInt(match[1]) : 0;
      });

    const maxNumber = Math.max(...grnNumbers, 0);
    const nextNumber = String(maxNumber + 1).padStart(3, '0');
    const year = new Date().getFullYear();
    return `GRN-${year}-${nextNumber}`;
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingGrnId(null);
    setGrnItems([]);
    setGrnFormData({
      purchaseOrderId: '',
      storeId: '',
      officeId: '',
      vendorId: '',
      invoicePeriodDays: 30,
      itemId: '',
      quantityReceived: 1,
      conditionStatus: 'NEW'
    });
  };

  const fetchPODetails = (poId) => {
    const po = purchaseOrders.find((order) => String(order.id ?? order.purchaseOrderId) === String(poId));
    setSelectedPO(po || null);
    if (po) {
      const autoItems = (po.lines || []).map((line, index) =>
        enrichGrnLineItem(
          {
            id: line.id ?? `${po.id}-line-${index}`,
            itemId: line.itemId,
            itemName: line.itemName || line.name || `Item #${line.itemId}`,
            sku: line.sku || '',
            unitOfMeasurement: line.unitOfMeasurement,
            taxAmount: line.taxAmount,
            categoryName: line.categoryName,
            subCategoryName: line.subCategoryName,
            quantityReceived: Math.max(1, Number(line.quantityOrdered ?? line.qty ?? line.quantity ?? 1) || 1),
            quantityOrdered: Math.max(1, Number(line.quantityOrdered ?? line.qty ?? line.quantity ?? 1) || 1),
            unitPrice: Number(line.unitPrice ?? line.price ?? 0),
            conditionStatus: 'NEW',
            poItemId: line.id ?? null,
          },
          itemLookup
        )
      );

      setGrnFormData((prev) => ({
        ...prev,
        purchaseOrderId: String(poId),
        storeId: po.storeId ? String(po.storeId) : prev.storeId,
        officeId: po.officeId ? String(po.officeId) : prev.officeId,
        vendorId: po.vendorId ? String(po.vendorId) : prev.vendorId,
      }));
      setGrnItems(autoItems);
    } else {
      setGrnItems([]);
    }
  };

  const handleGrnFormChange = (e) => {
    const { name, value } = e.target;
    setGrnFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Fetch PO details when PO is selected
    if (name === 'purchaseOrderId' && value) {
      fetchPODetails(value);
    }
  };

  const handleQuantityChange = (value) => {
    const num = parseInt(value) || 1;
    if (num > 0) {
      setGrnFormData(prev => ({
        ...prev,
        quantityReceived: num
      }));
    }
  };

  const handleAddItem = () => {
    if (!grnFormData.itemId) {
      toast.error('Please select an item');
      return;
    }

    const selectedItem = items.find((i) => String(i.id) === String(grnFormData.itemId));
    if (!selectedItem) {
      toast.error('Selected item not found');
      return;
    }

    const poLine = (selectedPO?.lines || []).find((line) => String(line.itemId) === String(selectedItem.id));
    const quantityOrdered = Math.max(1, Number(poLine?.quantityOrdered ?? poLine?.qty ?? poLine?.quantity ?? 1) || 1);

    const newItem = {
      id: Date.now(),
      itemId: selectedItem.id,
      itemName: selectedItem.name || selectedItem.itemName || `Item #${selectedItem.id}`,
      sku: selectedItem.sku || selectedItem.itemSku || '',
      quantityReceived: Math.max(1, Number(grnFormData.quantityReceived) || 1),
      quantityOrdered,
      unitPrice: Number(poLine?.unitPrice ?? poLine?.price ?? 0),
      conditionStatus: 'NEW',
      poItemId: poLine?.id ?? null,
    };

    setGrnItems((prev) => [...prev, newItem]);
    setGrnFormData((prev) => ({
      ...prev,
      itemId: '',
      quantityReceived: 1,
    }));
  };

  const handleRemoveItem = (itemId) => {
    setGrnItems(grnItems.filter(item => item.id !== itemId));
    toast.success('Item removed from GRN');
  };

  const handleTableItemSelectionChange = (rowId, selectedItemId) => {
    const selectedItem = items.find((invItem) => String(invItem.id) === String(selectedItemId));
    setGrnItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        const poLine = (selectedPO?.lines || []).find((line) => String(line.itemId) === String(selectedItemId));
        return {
          ...item,
          itemId: selectedItem?.id ?? poLine?.itemId ?? item.itemId,
          itemName: selectedItem?.name || selectedItem?.itemName || poLine?.itemName || poLine?.name || item.itemName,
          sku: selectedItem?.sku || selectedItem?.itemSku || poLine?.sku || item.sku,
          unitPrice: Number(poLine.unitPrice ?? poLine.price ?? item.unitPrice ?? 0),
        };
      })
    );
  };

  const handleTableQtyChange = (rowId, value) => {
    setGrnItems((prev) =>
      prev.map((item) => {
        if (item.id !== rowId) return item;
        const ordered = Math.max(1, Number(item.quantityOrdered) || 1);
        const parsed = Math.max(1, Math.min(ordered, Number.parseInt(value, 10) || 1));
        const updated = { ...item, quantityReceived: parsed };
        return {
          ...updated,
          totalPrice: (parsed * Number(updated.unitPrice || 0) + Number(updated.taxAmount || 0)).toFixed(2),
        };
      })
    );
  };

  const getLineTotal = (item) => {
    const qty = Number(item.quantityReceived) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    const taxAmount = Number(item.taxAmount) || 0;
    return qty * unitPrice + taxAmount;
  };

  const totalItemsPrice = useMemo(
    () => grnItems.reduce((sum, item) => sum + getLineTotal(item), 0),
    [grnItems]
  );

  const handleSubmitGRN = () => {
    if (!grnFormData.purchaseOrderId || grnItems.length === 0) {
      toast.error('Please select a purchase order with line items.');
      return;
    }
    setSubmitting(true);
    const payload = {
      purchaseOrderId: Number(grnFormData.purchaseOrderId),
      invoicePeriodDays: Number(grnFormData.invoicePeriodDays) || 30,
      ...(grnFormData.officeId ? { officeId: Number(grnFormData.officeId) } : {}),
      lines: grnItems.map((item) => {
        const line = {
          itemId: Number(item.itemId),
          qty: Math.max(1, Number.parseInt(item.quantityReceived, 10) || 1),
        };
        const unitPrice = Number(item.unitPrice);
        if (Number.isFinite(unitPrice) && unitPrice >= 0) {
          line.unitPrice = unitPrice;
        }
        return line;
      }),
    };
    const submitPromise = editingGrnId
      ? updateGRN({ id: editingGrnId, data: payload })
      : createGRN(payload);

    submitPromise
      .then(() => {
        toast.success(editingGrnId ? 'GRN updated.' : 'GRN created and confirmed.');
        handleCloseModal();
        queryClient.invalidateQueries(['grns']);
        queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      })
      .catch((error) => {
        const msg = error?.response?.data?.message;
        const resolved = Array.isArray(msg) ? msg.join('; ') : msg;
        toast.error(resolved || 'Failed to save GRN.');
      })
      .finally(() => setSubmitting(false));
  };

  const confirmedGrnPoIds = useMemo(() => {
    const ids = new Set();
    grns.forEach((grn) => {
      if (grn.status === 'CONFIRMED' && grn.purchaseOrderId != null && grn.purchaseOrderId !== '') {
        ids.add(String(grn.purchaseOrderId));
      }
    });
    return ids;
  }, [grns]);

  const eligiblePurchaseOrders = useMemo(
    () =>
      purchaseOrders.filter((po) => {
        const poId = String(po.id);
        if (po.approvalStatus !== 'APPROVED') return false;
        if (confirmedGrnPoIds.has(poId) || po.deliveryStatus === 'DELIVERED') return false;

        const grnsForPo = grns.filter((grn) => String(grn.purchaseOrderId) === poId);
        if (!editingGrnId) {
          return grnsForPo.length === 0;
        }

        if (String(grnFormData.purchaseOrderId) === poId) return true;
        return grnsForPo.every((grn) => grn.status !== 'CONFIRMED');
      }),
    [purchaseOrders, confirmedGrnPoIds, grns, editingGrnId, grnFormData.purchaseOrderId]
  );

  return (
    <>
      <div className="bg-white p-6 min-h-screen scrollbar-hide">
        <div className="flex justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Receive GRN</h1>
            <p className="text-sm text-gray-500 mt-1">Manage received goods receipts using the shared table layout.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                  setNextGrnNumber(generateNextGrnNumber());
                  setShowAddModal(true);
                }}
              className="cursor-pointer flex items-center gap-2 px-6 py-2.5 bg-customBlue text-white font-semibold rounded-lg hover:bg-customBlue/90"
            >
              <Plus size={18} />
              Create New GRN
            </button>
          </div>
        </div>
{/* 
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
          <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">7-Step Atomic Transaction</p>
            <p className="text-xs text-blue-700 mt-1">Click "Receive" to start quality inspection. This will automatically: 1) Validate items, 2) Inspect quality, 3) Update PO, 4) Update inventory, 5) Record movements, 6) Update status, 7) Complete GRN.</p>
          </div>
        </div> */}

        <div className="space-y-4">
          <DataTable
            isLoading={loading}
            error={null}
            items={grnTableData}
            columns={grnColumns}
            showView={true}
            showEdit={true}
            showDelete={true}
            showToggle={false}
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            onView={handlePreview}
            onEdit={handleEdit}
            onDelete={handleDelete}
            tabName="GRN"
            itemsPerPage={itemsPerPage}
          />
        </div>
      </div>


      {/* Create/Edit GRN Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
              <h2 className="text-xl font-bold text-gray-800">{editingGrnId ? 'Edit GRN' : 'Create New GRN'}</h2>
              <button
                onClick={handleCloseModal}
                className="cursor-pointer text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
              {/* GRN Number Field - Auto-generated and Disabled */}
              <div>
                <label className="text-gray-700 font-semibold text-sm block mb-2">GRN Number</label>
                <input
                  type="text"
                  value={nextGrnNumber}
                  disabled
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 text-sm cursor-not-allowed font-medium"
                  placeholder="Auto-generated"
                />
              </div>

              {/* GRN Details */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="text-gray-700 font-semibold text-sm block mb-2">Purchase Order *</label>
                  <select
                    name="purchaseOrderId"
                    value={grnFormData.purchaseOrderId}
                    onChange={handleGrnFormChange}
                    disabled={loadingPOs || eligiblePurchaseOrders.length === 0}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50 disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingPOs ? 'Loading POs...' : eligiblePurchaseOrders.length === 0 ? 'No eligible POs available' : 'Select PO'}
                    </option>
                    {eligiblePurchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.poNo ? `${po.poNo}` : `PO #${po.id}`}
                      </option>
                    ))}
                  </select>
                  {loadingPOs && (
                    <div className="flex items-center gap-2 mt-2 text-blue-600 text-sm">
                      <Loader size={16} className="animate-spin" />
                      <span>Loading purchase orders...</span>
                    </div>
                  )}
                  {!loadingPOs && eligiblePurchaseOrders.length === 0 && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <AlertCircle size={16} />
                      <span>No approved POs without a confirmed GRN found</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 font-semibold text-sm block mb-2">Store *</label>
                  <select
                    name="storeId"
                    value={grnFormData.storeId}
                    onChange={handleGrnFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value="">Select Store</option>
                    {stores.map(store => (
                      <option key={store.id} value={store.id}>{store.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-gray-700 font-semibold text-sm block mb-2">Vendor *</label>
                  <select
                    name="vendorId"
                    value={grnFormData.vendorId}
                    onChange={handleGrnFormChange}
                    disabled={loadingVendors || vendors.length === 0}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 text-sm disabled:opacity-50 disabled:bg-gray-100"
                  >
                    <option value="">
                      {loadingVendors ? 'Loading vendors...' : vendors.length === 0 ? 'No vendors available' : 'Select Vendor'}
                    </option>
                    {vendors.map(vendor => (
                      <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                    ))}
                  </select>
                  {loadingVendors && (
                    <div className="flex items-center gap-2 mt-2 text-blue-600 text-sm">
                      <Loader size={16} className="animate-spin" />
                      <span>Loading vendors...</span>
                    </div>
                  )}
                  {!loadingVendors && vendors.length === 0 && (
                    <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
                      <AlertCircle size={16} />
                      <span>No vendors found in your organization</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-gray-700 font-semibold text-sm block mb-2">Invoice Period (Days)</label>
                  <select
                    name="invoicePeriodDays"
                    value={grnFormData.invoicePeriodDays}
                    onChange={handleGrnFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500 text-sm"
                  >
                    <option value={7}>7</option>
                    <option value={15}>15</option>
                    <option value={30}>30</option>
                    <option value={45}>45</option>
                    <option value={60}>60</option>
                  </select>
                </div>

              </div>

              {/* Review Items — loaded from PO; only quantity is editable */}
              <div className="mt-6">
                <h3 className="text-base font-semibold text-gray-800 mb-1">Review Details</h3>
                <p className="text-xs text-gray-500 mb-4">Items load from the purchase order. Adjust received quantity only.</p>
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
                      {grnItems.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="text-center py-6 text-gray-500 text-sm">Select a purchase order to load items</td>
                        </tr>
                      ) : (
                        grnItems.map((item, index) => (
                          <GrnItemRow
                            key={item.id}
                            item={item}
                            index={index}
                            onQtyChange={handleTableQtyChange}
                            getLineTotal={getLineTotal}
                          />
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 max-w-sm ml-auto">
                  <label className="text-gray-700 font-semibold text-sm block mb-2">Total Price (All Items)</label>
                  <input
                    type="text"
                    value={totalItemsPrice.toFixed(2)}
                    disabled
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700 text-sm font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="border border-gray-300 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitGRN}
                disabled={submitting}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader size={16} className="animate-spin" />}
                {submitting ? (editingGrnId ? 'Updating...' : 'Creating...') : (editingGrnId ? 'Update GRN' : 'Create GRN')}
              </button>
            </div>
          </div>
        </div>
      )}

      

      {/* GRN Preview Modal */}
      {previewGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-[95%] max-w-6xl max-h-[94vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gray-50 shrink-0">
              <div>
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">GRN Details</div>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                  {previewGrn.grnNo || `GRN-${previewGrn.id || 'N/A'}`}
                </h2>
              </div>
              <button
                onClick={closePreviewModal}
                className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Document Info</h3>
                  <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    {[
                      ['GRN Number', previewGrn.grnNo || `GRN-${previewGrn.id || 'N/A'}`],
                      ['PO No.', previewGrn.poNo || previewGrn.purchaseOrder?.purchaseOrderNo || 'N/A'],
                      ['PR No.', previewGrn.prNo || previewGrn.purchaseOrder?.purchaseRequest?.requestNo || 'N/A'],
                      ['Office', previewGrn.officeName || previewGrn.office?.officeName || previewGrn.office?.branchName || 'N/A'],
                      ['Store', previewGrn.storeName || previewGrn.store?.storeName || previewGrn.store?.name || 'N/A'],
                      ['Vendor', previewGrn.vendorName || previewGrn.purchaseOrder?.vendor?.vendorName || 'N/A'],
                      ['Invoice Period', previewGrn.invoicePeriodDays != null ? `${previewGrn.invoicePeriodDays} days` : 'N/A'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500 shrink-0">{label}</span>
                        <span className="font-semibold text-gray-900 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Status & Audit</h3>
                  <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                    <div className="flex justify-between gap-4 text-sm items-center">
                      <span className="text-gray-500">Status</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        previewGrn.status === 'CONFIRMED'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {previewGrn.status || 'DRAFT'}
                      </span>
                    </div>
                    {[
                      ['Received On', previewGrn.receivedDate || previewGrn.createdAt
                        ? new Date(previewGrn.receivedDate || previewGrn.createdAt).toLocaleString()
                        : 'N/A'],
                      ['Received By', previewGrn.receivedByEmail || resolveUserLabel(previewGrn.receivedBy, previewGrn.receivedByUserId) || 'N/A'],
                      ['Confirmed By', previewGrn.confirmedByEmail || resolveUserLabel(previewGrn.confirmedBy, previewGrn.confirmedByUserId) || 'N/A'],
                      ['Confirmed At', previewGrn.confirmedAt ? new Date(previewGrn.confirmedAt).toLocaleString() : 'N/A'],
                    ].map(([label, value]) => (
                      <div key={label} className="flex justify-between gap-4 text-sm">
                        <span className="text-gray-500 shrink-0">{label}</span>
                        <span className="font-semibold text-gray-900 text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {previewLines.length > 0 && (
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Line Items</h3>
                    <p className="text-sm font-semibold text-gray-700">
                      Total: {formatMoney(previewTotal)}
                    </p>
                  </div>
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
                        {previewLines.map((line, index) => (
                          <tr key={line.id ?? index} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4 text-sm text-gray-700">{index + 1}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{line.sku}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{line.itemName}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{line.unitOfMeasurement}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-gray-700">{line.quantityReceived}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{formatMoney(line.unitPrice)}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{formatMoney(line.taxAmount)}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-gray-700">{formatMoney(line.totalPrice)}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{line.categoryName}</td>
                            <td className="py-3 px-4 text-sm text-gray-700">{line.subCategoryName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end shrink-0">
              <button
                onClick={closePreviewModal}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReceiveGRNPage;
