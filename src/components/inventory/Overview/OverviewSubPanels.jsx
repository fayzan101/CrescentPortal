"use client";

import React, { useMemo } from "react";
import { Loader } from "lucide-react";
import DataTable from "@/components/components/DataTable";
import { useIssuances } from "@/hooks/inventory/movements/useIssuances";
import { useReturns } from "@/hooks/inventory/movements/useReturns";
import { useTransfers } from "@/hooks/inventory/movements/useTransfers";
import { useOverviewItems } from "@/hooks/inventory/items/useOverviewItems";
import { usePurchaseRequests } from "@/hooks/inventory/purchase request/usePurchaseRequests";
import { useOffices } from "@/hooks/office/useOffices";
import { normalizeApiList } from "@/lib/normalizeApiList";
import { purchaseRequestLineList } from "@/lib/inventoryItemMeta";

function formatDate(value) {
  if (!value) return "N/A";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
}

function lineCount(row) {
  const lines = row.lines ?? row.items ?? [];
  return Array.isArray(lines) ? lines.length : 0;
}

function lineQtySum(row) {
  const lines = row.lines ?? row.items ?? [];
  if (!Array.isArray(lines)) return 0;
  return lines.reduce((sum, line) => sum + (Number(line.qty ?? line.quantity ?? 0) || 0), 0);
}

const RegisterPanel = ({ title, isLoading, error, columns, rows, tabName }) => (
  <div className="bg-gray-50 rounded-xl p-6">
    <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
    {isLoading ? (
      <div className="flex items-center justify-center py-16 text-gray-600 gap-2">
        <Loader size={24} className="animate-spin" />
        Loading...
      </div>
    ) : (
      <DataTable
        items={rows}
        columns={columns}
        isLoading={isLoading}
        error={error?.message}
        showView={false}
        showEdit={false}
        showDelete={false}
        showToggle={false}
        tabName={tabName}
        itemsPerPage={10}
      />
    )}
  </div>
);

export default function OverviewSubPanels({ activeSubTab }) {
  const issuanceQuery = useIssuances({ enabled: activeSubTab === "issuance" });
  const returnsQuery = useReturns({ enabled: activeSubTab === "return" });
  const transfersQuery = useTransfers({ enabled: activeSubTab === "transfer" });
  const itemsQuery = useOverviewItems({ enabled: activeSubTab === "items" });
  const purchaseRequestsQuery = usePurchaseRequests({ enabled: activeSubTab === "requests" });
  const officesQuery = useOffices(undefined, { enabled: activeSubTab === "requests" });

  const officeNameById = useMemo(() => {
    const map = new Map();
    normalizeApiList(officesQuery.data).forEach((office) => {
      const id = office.id ?? office.officeId;
      if (id == null) return;
      map.set(
        String(id),
        office.branchName || office.officeName || office.name || `Office #${id}`
      );
    });
    return map;
  }, [officesQuery.data]);

  const issuances = useMemo(
    () =>
      normalizeApiList(issuanceQuery.data).map((row) => ({
        id: row.issuanceId ?? row.id,
        issuanceNo: row.issuanceNo || `ISS-${row.issuanceId ?? row.id ?? ""}`,
        storeName: row.store?.storeName || row.storeName || "N/A",
        issuedTo: row.issuedTo || row.sourceReference || "N/A",
        lineCount: lineCount(row),
        totalQty: lineQtySum(row),
        createdAt: formatDate(row.createdAt),
        name: [row.issuanceNo, row.issuedTo, row.store?.storeName].filter(Boolean).join(" "),
      })),
    [issuanceQuery.data]
  );

  const returns = useMemo(
    () =>
      normalizeApiList(returnsQuery.data).map((row) => ({
        id: row.returnId ?? row.id,
        returnNo: row.returnNo || `RET-${row.returnId ?? row.id ?? ""}`,
        storeName: row.store?.storeName || row.storeName || "N/A",
        sourceReference: row.sourceReference || "N/A",
        lineCount: lineCount(row),
        totalQty: lineQtySum(row),
        createdAt: formatDate(row.createdAt),
        name: [row.returnNo, row.sourceReference, row.store?.storeName].filter(Boolean).join(" "),
      })),
    [returnsQuery.data]
  );

  const transfers = useMemo(
    () =>
      normalizeApiList(transfersQuery.data).map((row) => ({
        id: row.transferId ?? row.id,
        transferNo: row.transferNo || `TRF-${row.transferId ?? row.id ?? ""}`,
        fromStore: row.fromStore?.storeName || row.fromStoreName || "N/A",
        toStore: row.toStore?.storeName || row.toStoreName || "N/A",
        lineCount: lineCount(row),
        totalQty: lineQtySum(row),
        createdAt: formatDate(row.createdAt),
        name: [row.transferNo, row.fromStore?.storeName, row.toStore?.storeName].filter(Boolean).join(" "),
      })),
    [transfersQuery.data]
  );

  const items = useMemo(
    () =>
      normalizeApiList(itemsQuery.data).map((row) => ({
        id: row.itemId ?? row.id,
        sku: row.sku || row.itemSku || "N/A",
        name: row.itemName || row.name || "N/A",
        category: row.category?.categoryName || row.categoryName || "N/A",
        uom: row.unitOfMeasurement || row.uom || "N/A",
        amount:
          row.amount != null
            ? Number(row.amount).toFixed(2)
            : row.totalAmount != null
              ? Number(row.totalAmount).toFixed(2)
              : "N/A",
        name: [row.sku, row.itemName || row.name].filter(Boolean).join(" "),
      })),
    [itemsQuery.data]
  );

  const purchaseRequests = useMemo(
    () =>
      normalizeApiList(purchaseRequestsQuery.data).map((row) => {
        const id = row.purchaseRequestId ?? row.id ?? row.requestId;
        const officeId = row.officeId ?? row.office?.officeId ?? row.office?.id ?? "";
        const officeName =
          row.officeName ||
          row.office?.branchName ||
          row.office?.officeName ||
          officeNameById.get(String(officeId)) ||
          "N/A";
        const lines = purchaseRequestLineList(row);
        return {
          id,
          requestNo: row.requestNo || row.purchaseRequestNo || (id != null ? `PR-${id}` : "N/A"),
          officeName,
          storeName: row.store?.storeName || row.storeName || "N/A",
          status: String(row.status || row.approvalStatus || "DRAFT").toUpperCase(),
          lineCount: lines.length,
          createdAt: formatDate(row.createdAt || row.createdOn),
          name: [row.requestNo, officeName, row.storeName].filter(Boolean).join(" "),
        };
      }),
    [officeNameById, purchaseRequestsQuery.data]
  );

  if (activeSubTab === "issuance") {
    return (
      <RegisterPanel
        title="Issuance Register"
        isLoading={issuanceQuery.isLoading}
        error={issuanceQuery.error}
        rows={issuances}
        tabName="Issuance"
        columns={[
          { key: "issuanceNo", label: "Issuance #", width: "16%" },
          { key: "storeName", label: "Store", width: "18%" },
          { key: "issuedTo", label: "Issued To", width: "18%" },
          { key: "lineCount", label: "Lines", width: "10%" },
          { key: "totalQty", label: "Total Qty", width: "10%" },
          { key: "createdAt", label: "Created", width: "20%" },
        ]}
      />
    );
  }

  if (activeSubTab === "return") {
    return (
      <RegisterPanel
        title="Return Register"
        isLoading={returnsQuery.isLoading}
        error={returnsQuery.error}
        rows={returns}
        tabName="Return"
        columns={[
          { key: "returnNo", label: "Return #", width: "16%" },
          { key: "storeName", label: "Store", width: "18%" },
          { key: "sourceReference", label: "Source", width: "18%" },
          { key: "lineCount", label: "Lines", width: "10%" },
          { key: "totalQty", label: "Total Qty", width: "10%" },
          { key: "createdAt", label: "Created", width: "20%" },
        ]}
      />
    );
  }

  if (activeSubTab === "transfer") {
    return (
      <RegisterPanel
        title="Transfer Register"
        isLoading={transfersQuery.isLoading}
        error={transfersQuery.error}
        rows={transfers}
        tabName="Transfer"
        columns={[
          { key: "transferNo", label: "Transfer #", width: "14%" },
          { key: "fromStore", label: "From Store", width: "18%" },
          { key: "toStore", label: "To Store", width: "18%" },
          { key: "lineCount", label: "Lines", width: "10%" },
          { key: "totalQty", label: "Total Qty", width: "10%" },
          { key: "createdAt", label: "Created", width: "20%" },
        ]}
      />
    );
  }

  if (activeSubTab === "items") {
    return (
      <RegisterPanel
        title="Items List"
        isLoading={itemsQuery.isLoading}
        error={itemsQuery.error}
        rows={items}
        tabName="Item"
        columns={[
          { key: "sku", label: "SKU", width: "16%" },
          { key: "name", label: "Item Name", width: "24%" },
          { key: "category", label: "Category", width: "18%" },
          { key: "uom", label: "UOM", width: "14%" },
          { key: "amount", label: "Amount", width: "12%" },
        ]}
      />
    );
  }

  if (activeSubTab === "requests") {
    return (
      <RegisterPanel
        title="Purchase Requests"
        isLoading={purchaseRequestsQuery.isLoading}
        error={purchaseRequestsQuery.error}
        rows={purchaseRequests}
        tabName="Purchase Request"
        columns={[
          { key: "requestNo", label: "PR #", width: "14%" },
          { key: "officeName", label: "Office", width: "18%" },
          { key: "storeName", label: "Store", width: "18%" },
          { key: "status", label: "Status", width: "12%" },
          { key: "lineCount", label: "Lines", width: "10%" },
          { key: "createdAt", label: "Created", width: "18%" },
        ]}
      />
    );
  }

  return null;
}
