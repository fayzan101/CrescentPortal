"use client";

import React, { useMemo } from "react";
import { Loader } from "lucide-react";
import { useSaleAudit } from "@/hooks/sales/useSaleAudit";
import { useReopenSale } from "@/hooks/sales/useReopenSale";
import {
  FORM_STAGE_MAP,
  getStageStatusMap,
  saleStageSummary,
} from "@/lib/saleWorkflow";

const REOPEN_OPTIONS = [
  { value: "SALES", label: "Sales" },
  { value: "ACCOUNTS", label: "Accounts" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "TECHNICIAN", label: "Technician" },
];

export default function SaleWorkflowPanel({ saleId, sale, activeForm, onReopened }) {
  const [reopenStage, setReopenStage] = React.useState("TECHNICIAN");
  const [showAudit, setShowAudit] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState("");
  const [actionError, setActionError] = React.useState("");

  const { data: auditRows = [], isLoading: auditLoading } = useSaleAudit(saleId, {
    enabled: showAudit && !!saleId,
  });
  const reopenMutation = useReopenSale();

  const stageMap = useMemo(() => getStageStatusMap(sale), [sale]);
  const currentStageCode = FORM_STAGE_MAP[activeForm];
  const currentStageStatus = currentStageCode ? stageMap[currentStageCode] : null;
  const isStageClosed =
    currentStageStatus === "COMPLETED" || currentStageStatus === "REJECTED";

  const handleReopen = async () => {
    if (!saleId || !reopenStage) return;
    setActionMessage("");
    setActionError("");
    try {
      await reopenMutation.mutateAsync({ saleId, stageCode: reopenStage });
      setActionMessage(`Sale reopened at ${reopenStage} stage.`);
      onReopened?.(reopenStage);
    } catch (error) {
      setActionError(
        error?.response?.data?.message || error?.message || "Failed to reopen sale."
      );
    }
  };

  if (!saleId) return null;

  return (
    <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium text-gray-800">Workflow status</p>
          <p className="text-xs text-gray-600">{saleStageSummary(sale) || "Loading stages..."}</p>
          {isStageClosed && (
            <p className="mt-1 text-xs text-amber-700">
              This stage is {currentStageStatus?.toLowerCase()}. Reopen it to make changes.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={reopenStage}
            onChange={(e) => setReopenStage(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
          >
            {REOPEN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Reopen: {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleReopen}
            disabled={reopenMutation.isPending}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {reopenMutation.isPending ? "Reopening..." : "Reopen Stage"}
          </button>
          <button
            type="button"
            onClick={() => setShowAudit((prev) => !prev)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            {showAudit ? "Hide Audit" : "View Audit"}
          </button>
        </div>
      </div>

      {actionMessage && <p className="text-sm text-green-700">{actionMessage}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {showAudit && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          {auditLoading ? (
            <div className="flex items-center gap-2 p-4 text-sm text-gray-600">
              <Loader size={16} className="animate-spin" />
              Loading audit log...
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2">When</th>
                  <th className="px-3 py-2">Stage</th>
                  <th className="px-3 py-2">Field</th>
                  <th className="px-3 py-2">Change</th>
                  <th className="px-3 py-2">By</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(auditRows) ? auditRows : []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                      No audit entries yet.
                    </td>
                  </tr>
                ) : (
                  auditRows.map((row) => (
                    <tr key={row.saleAuditLogId ?? `${row.changedAt}-${row.fieldName}`} className="border-t border-gray-100">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {row.changedAt ? new Date(row.changedAt).toLocaleString() : "-"}
                      </td>
                      <td className="px-3 py-2">{row.stageCode || "-"}</td>
                      <td className="px-3 py-2">{row.fieldName || "-"}</td>
                      <td className="px-3 py-2">
                        {[row.oldValue, row.newValue].filter(Boolean).join(" → ") || "-"}
                      </td>
                      <td className="px-3 py-2">{row.changedBy?.email || row.changedByUserId || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
