"use client";

import React from "react";
import { FiX } from "react-icons/fi";
import { useSaleById } from "@/hooks/sales/useSaleById";

const formatDate = (value) => {
  if (!value) return "-";
  const raw = typeof value === "string" ? value : String(value);
  return raw.slice(0, 10);
};

const computeDueBalance = (sale) => {
  const amount = sale?.productDetails?.saleAmount;
  if (amount == null) return "0.00";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "0.00";

  const saleType = sale?.productDetails?.saleType;
  if (saleType && saleType !== "CREDIT") return "0.00";

  const decision = sale?.accountsReview?.decision;
  if (decision === "REJECTED") return "0.00";
  if (decision === "APPROVED" || decision === "CONTINUE") return num.toFixed(2);
  return saleType === "CREDIT" ? num.toFixed(2) : "0.00";
};

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-gray-500">{label}</span>
    <span className="text-sm text-gray-900 break-words">{value || "-"}</span>
  </div>
);

const ClientDetailModal = ({ saleId, onClose }) => {
  const { data: sale, loading, error } = useSaleById(saleId);

  if (!saleId) return null;

  const client = sale?.clientDetails || {};
  const product = sale?.productDetails || {};
  const installation = sale?.installation || {};
  const office = sale?.operationsAssignment?.zone?.office;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Client Details</h2>
            <p className="text-sm text-gray-500">{client.fullName || sale?.saleCode || `Sale #${saleId}`}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 md:px-6 py-4 space-y-6">
          {loading && <p className="text-sm text-gray-500">Loading client details...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && sale && (
            <>
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Client Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="IR No." value={client.irNo} />
                  <DetailRow label="Category" value={client.clientCategory?.categoryName} />
                  <DetailRow label="Full Name" value={client.fullName} />
                  <DetailRow label="CNIC" value={client.cnicNo} />
                  <DetailRow label="Cell No." value={client.cellNo} />
                  <DetailRow label="Phone Home" value={client.phoneHome} />
                  <DetailRow label="Email" value={client.emailId} />
                  <DetailRow label="Status" value={client.clientStatus} />
                  <DetailRow label="Address" value={client.address} />
                  <DetailRow label="Office" value={office?.officeName} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Product & Accounts</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Product" value={product.product?.productName} />
                  <DetailRow label="Package" value={product.package?.packageName} />
                  <DetailRow label="Sale Type" value={product.saleType} />
                  <DetailRow label="Sale Amount" value={product.saleAmount != null ? `Rs ${Number(product.saleAmount).toFixed(2)}` : "-"} />
                  <DetailRow label="Due Balance" value={`Rs ${computeDueBalance(sale)}`} />
                  <DetailRow label="Accounts Decision" value={sale.accountsReview?.decision} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Vehicle & Installation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <DetailRow label="Registration No." value={installation.registrationNo} />
                  <DetailRow label="Make / Model" value={installation.makeModel} />
                  <DetailRow label="Chassis No." value={installation.chassisNo} />
                  <DetailRow label="Engine No." value={installation.engineNo} />
                  <DetailRow label="Year" value={installation.vehicleYear} />
                  <DetailRow label="Color" value={installation.color} />
                  <DetailRow label="Installation Date" value={formatDate(installation.installationDate)} />
                  <DetailRow label="Renewal Date" value={formatDate(installation.renewalDate)} />
                  <DetailRow label="Device IMEI" value={sale.operationsAssignment?.deviceImei} />
                </div>
              </section>
            </>
          )}
        </div>

        <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailModal;
