"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AddNewSaleForm from "./AddNewSaleForm";
import AccountsApprovalForm from "./AccountsApprovalForm";
import OperationProcessForm from "./OperationProcessForm";
import InstallationForm from "./InstallationForm";
import { useSales } from "@/hooks/sales/useSales";

const Sales = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeForm, setActiveForm] = useState("addSale");
  const [newSaleId, setNewSaleId] = useState(null);
  const [selectedSaleId, setSelectedSaleId] = useState("");
  const { data: sales = [] } = useSales();

  const validForms = useMemo(
    () => new Set(["addSale", "accountsApproval", "operationsProcess", "installation"]),
    [],
  );

  useEffect(() => {
    const saleId = searchParams.get("saleId");
    const form = searchParams.get("form");
    if (saleId) {
      setNewSaleId(null);
      setSelectedSaleId(saleId);
    }
    if (form && validForms.has(form)) {
      setActiveForm(form);
    }
  }, [searchParams, validForms]);

  const saleOptions = useMemo(
    () =>
      (Array.isArray(sales) ? sales : []).map((sale) => {
        const id = sale?.saleId ?? sale?.id ?? sale?._id;
        const code = sale?.saleCode || sale?.clientDetails?.irNo || `Sale #${id}`;
        return { id: String(id), label: code };
      }).filter((opt) => opt.id),
    [sales]
  );

  useEffect(() => {
    if (!newSaleId && !selectedSaleId && saleOptions.length) {
      setSelectedSaleId(saleOptions[0].id);
    }
  }, [newSaleId, selectedSaleId, saleOptions]);

  const effectiveSaleId = newSaleId ?? (selectedSaleId ? Number(selectedSaleId) : null);

  // Button config array
  const buttons = [
    { key: "addSale", label: "Add New Sale" },
    { key: "accountsApproval", label: "Accounts Approval" },
    { key: "operationsProcess", label: "Operations Process" },
    { key: "installation", label: "Installation by Technician" },
  ];

  return (
    <div className="bg-white rounded-xl shadow p-3 sm:p-4 md:p-6 flex flex-col md:flex-row gap-3 sm:gap-4 md:gap-6">
      {/* Left buttons - Fully responsive with flexible width */}
      <div className="flex flex-col items-stretch gap-1.5 sm:gap-2 md:gap-3 w-full md:w-auto md:min-w-[180px] lg:min-w-[200px] xl:min-w-[220px]">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            onClick={() => {
              setActiveForm(btn.key);
              if (effectiveSaleId) {
                router.replace(`/dashboard/sales?saleId=${effectiveSaleId}&form=${btn.key}`);
              } else {
                router.replace(`/dashboard/sales?form=${btn.key}`);
              }
            }}
            className={`
              w-full 
              px-2 sm:px-3 md:px-4 
              py-2 sm:py-2.5 md:py-3 
              text-[10px] sm:text-xs md:text-sm lg:text-base
              flex items-center justify-center 
              rounded-lg 
              transition-all duration-200
              whitespace-nowrap
              font-medium
              ${activeForm === btn.key 
                ? "bg-customGreen text-white shadow-md" 
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 cursor-pointer"}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Right form area */}
      <div className="flex-1 min-w-0">
        {activeForm !== "addSale" && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Sale</label>
            <select
              value={effectiveSaleId ?? ""}
              onChange={(e) => {
                setNewSaleId(null);
                setSelectedSaleId(e.target.value);
                router.replace(`/dashboard/sales?saleId=${e.target.value}&form=${activeForm}`);
              }}
              className="w-full md:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              {!saleOptions.length && <option value="">No sales available</option>}
              {saleOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {activeForm === "addSale" && (
          <AddNewSaleForm
            onSuccess={(sale) => {
              const createdId = sale?.saleId ?? sale?.id ?? sale?._id;
              setNewSaleId(createdId);
              setActiveForm("accountsApproval");
            }}
          />
        )}
        {activeForm === "accountsApproval" && <AccountsApprovalForm saleId={effectiveSaleId} 
            onSuccess={() => {
                  setActiveForm("operationsProcess");
            }}
          />}
        {activeForm === "operationsProcess" && <OperationProcessForm saleId={effectiveSaleId} 
            onSuccess={() => {
                  setActiveForm("installation");
                }}
            />}
        {activeForm === "installation" && <InstallationForm saleId={effectiveSaleId} />}
      </div>
    </div>
  );
};

export default Sales;