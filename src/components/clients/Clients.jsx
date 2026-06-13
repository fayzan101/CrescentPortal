"use client";

import { useClientContext } from "@/context/clientContext";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiEye, FiEdit, FiTrash2, FiPlus, FiFilter, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { useInstalledClients } from "@/hooks/sales/useInstalledClients";
import { deleteSale, reopenSale } from "@/services/sales.service";
import ClientDetailModal from "./ClientDetailModal";

const defaultClientRow = {
  id: "",
  irNo: "-",
  name: "Unknown Client",
  cnic: "-",
  cell: "-",
  email: "-",
  vehicles: 0,
  category: "General",
  activationDate: "-",
  dueBalance: "0.00",
  office: "-",
};

const withDefault = (value, fallback) => {
  if (value === undefined || value === null || value === "") return fallback;
  return value;
};

const formatDate = (value) => {
  if (!value) return "-";
  const raw = typeof value === "string" ? value : value instanceof Date ? value.toISOString() : String(value);
  return raw.slice(0, 10);
};

const normalizeClient = (sale, index) => {
  const clientDetails = sale?.clientDetails || {};
  const office = sale?.office || sale?.operationsAssignment?.zone?.office || null;
  const clientCategoryName =
    clientDetails?.clientCategory?.categoryName ||
    sale?.clientCategory?.categoryName ||
    sale?.clientCategoryName;

  return {
    ...defaultClientRow,
    id: withDefault(sale?.saleId ?? sale?.id ?? sale?._id, index + 1),
    irNo: withDefault(clientDetails?.irNo || sale?.irNo, defaultClientRow.irNo),
    name: withDefault(clientDetails?.fullName || sale?.fullName || sale?.name, defaultClientRow.name),
    cnic: withDefault(clientDetails?.cnicNo || sale?.cnicNo || sale?.cnic, defaultClientRow.cnic),
    cell: withDefault(
      clientDetails?.cellNo || clientDetails?.phoneHome || sale?.cellNo || sale?.phoneHome || sale?.contactNo,
      defaultClientRow.cell
    ),
    email: withDefault(clientDetails?.emailId || sale?.emailId || sale?.email, defaultClientRow.email),
    vehicles: withDefault(sale?.vehiclesCount, defaultClientRow.vehicles),
    category: withDefault(clientCategoryName, defaultClientRow.category),
    activationDate: formatDate(
      sale?.activationDate ||
      sale?.installation?.installedAt ||
      sale?.installation?.installationDate ||
      sale?.createdAt
    ),
    dueBalance: withDefault(
      sale?.dueBalance != null ? String(sale.dueBalance) : defaultClientRow.dueBalance,
      defaultClientRow.dueBalance
    ),
    office: withDefault(office?.officeName || sale?.officeName, defaultClientRow.office),
  };
};

const Clients = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [screenSize, setScreenSize] = useState("desktop");
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [viewSaleId, setViewSaleId] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [officeFilter, setOfficeFilter] = useState("All");
  const [minBalance, setMinBalance] = useState("");
  const [maxBalance, setMaxBalance] = useState("");
  const [minVehicles, setMinVehicles] = useState("");

  const { openAddClientForm } = useClientContext();
  const { data: sales = [], loading, error, refetch } = useInstalledClients();
  const clients = (Array.isArray(sales) ? sales : []).map((sale, index) => normalizeClient(sale, index));

  const handleView = (client) => {
    if (!client?.id) return;
    setViewSaleId(client.id);
  };

  const handleEdit = async (client) => {
    if (!client?.id) return;
    setActionMessage("");
    setActionError("");
    setEditingId(client.id);
    try {
      await reopenSale(client.id, "TECHNICIAN");
      router.push(`/dashboard/sales?saleId=${client.id}&form=installation`);
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to reopen sale for editing.");
    } finally {
      setEditingId(null);
    }
  };

  const handleDelete = async (client) => {
    if (!client?.id) return;
    const confirmed = window.confirm(`Void ${client.name}? This will cancel the sale and reverse inventory.`);
    if (!confirmed) return;

    setActionMessage("");
    setActionError("");
    setDeletingId(client.id);
    try {
      await deleteSale(client.id);
      setActionMessage(`${client.name} voided successfully.`);
      await refetch();
    } catch (err) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to void client.");
    } finally {
      setDeletingId(null);
    }
  };

  const actionButtonClass = "p-1.5 rounded hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed";

  const ClientRowActions = ({ client, size = "md" }) => {
    const iconClass = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";
    return (
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleView(client)}
          className={`${actionButtonClass} bg-blue-50 text-blue-600 hover:bg-blue-100`}
          title="View"
        >
          <FiEye className={iconClass} />
        </button>
        <button
          type="button"
          onClick={() => handleEdit(client)}
          disabled={editingId === client.id}
          className={`${actionButtonClass} bg-blue-50 text-blue-600 hover:bg-blue-100`}
          title="Edit in Sales"
        >
          <FiEdit className={iconClass} />
        </button>
        <button
          type="button"
          onClick={() => handleDelete(client)}
          disabled={deletingId === client.id}
          className={`${actionButtonClass} bg-red-50 text-red-600 hover:bg-red-100`}
          title="Void"
        >
          <FiTrash2 className={iconClass} />
        </button>
      </div>
    );
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize("mobile");
      } else if (width < 768) {
        setScreenSize("small-tablet");
      } else if (width < 1024) {
        setScreenSize("tablet");
      } else {
        setScreenSize("desktop");
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const categoryOptions = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(clients.map((client) => client.category).filter(Boolean))
    );
    return ["All", ...uniqueCategories];
  }, [clients]);

  const officeOptions = useMemo(() => {
    const uniqueOffices = Array.from(
      new Set(clients.map((client) => client.office).filter(Boolean))
    );
    return ["All", ...uniqueOffices];
  }, [clients]);

  const activeFilterCount = useMemo(() => {
    return [
      categoryFilter !== "All",
      officeFilter !== "All",
      minBalance !== "",
      maxBalance !== "",
      minVehicles !== "",
    ].filter(Boolean).length;
  }, [categoryFilter, officeFilter, minBalance, maxBalance, minVehicles]);

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      String(client.name).toLowerCase().includes(search.toLowerCase()) ||
      String(client.irNo).toLowerCase().includes(search.toLowerCase()) ||
      String(client.cnic).includes(search);
    const matchesCategory = categoryFilter === "All" || client.category === categoryFilter;
    const matchesOffice = officeFilter === "All" || client.office === officeFilter;

    const balanceValue = Number(String(client.dueBalance).replace(/[^0-9.-]/g, ""));
    const safeBalance = Number.isFinite(balanceValue) ? balanceValue : 0;
    const minBalanceValue = minBalance === "" ? null : Number(minBalance);
    const maxBalanceValue = maxBalance === "" ? null : Number(maxBalance);
    const matchesMinBalance = minBalanceValue === null || safeBalance >= minBalanceValue;
    const matchesMaxBalance = maxBalanceValue === null || safeBalance <= maxBalanceValue;

    const vehiclesValue = Number(client.vehicles);
    const safeVehicles = Number.isFinite(vehiclesValue) ? vehiclesValue : 0;
    const minVehiclesValue = minVehicles === "" ? null : Number(minVehicles);
    const matchesVehicles = minVehiclesValue === null || safeVehicles >= minVehiclesValue;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesOffice &&
      matchesMinBalance &&
      matchesMaxBalance &&
      matchesVehicles
    );
  });

  const totalPages = Math.ceil(filteredClients.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentClients = filteredClients.slice(startIndex, endIndex);

  const renderMobileView = () => (
    <div className="p-2 space-y-3">
      {currentClients.map((client) => (
        <div key={client.id} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 bg-white">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-sm truncate">{client.name}</h3>
              <p className="text-gray-500 text-xs">{client.irNo}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              client.category === "Gold" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
            }`}>
              {client.category}
            </span>
          </div>
          
          <div className="space-y-2 text-xs mb-3">
            <div className="flex">
              <span className="text-gray-500 w-16">CNIC:</span>
              <span className="ml-2 font-medium truncate">{client.cnic}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-16">Phone:</span>
              <span className="ml-2 font-medium">{client.cell}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-16">Email:</span>
              <span className="ml-2 text-blue-600 truncate text-xs">{client.email}</span>
            </div>
          </div>
          
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-green-600">Rs {client.dueBalance}</span>
              <span className="ml-2">•</span>
              <span className="ml-2">{client.office}</span>
            </div>
            <div className="flex items-center gap-1">
              <ClientRowActions client={client} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSmallTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left font-semibold text-gray-700">Client</th>
            <th className="p-2 text-left font-semibold text-gray-700">Category</th>
            <th className="p-2 text-left font-semibold text-gray-700">Balance</th>
            <th className="p-2 text-left font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentClients.map((client) => (
            <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-2">
                <div>
                  <div className="font-medium text-gray-800 truncate max-w-[120px]">{client.name}</div>
                  <div className="text-gray-500 text-xs">{client.irNo}</div>
                  <div className="text-blue-600 truncate max-w-[120px] text-xs">{client.email}</div>
                </div>
              </td>
              <td className="p-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  client.category === "Gold" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {client.category}
                </span>
              </td>
              <td className="p-2 font-medium text-green-600 text-sm">Rs {client.dueBalance}</td>
              <td className="p-2">
                <ClientRowActions client={client} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left font-semibold text-gray-700">Client</th>
            <th className="p-3 text-left font-semibold text-gray-700">Contact</th>
            <th className="p-3 text-left font-semibold text-gray-700">Category</th>
            <th className="p-3 text-left font-semibold text-gray-700">Balance</th>
            <th className="p-3 text-left font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentClients.map((client) => (
            <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-3">
                <div>
                  <div className="font-medium text-gray-800">{client.name}</div>
                  <div className="text-gray-500 text-xs">{client.irNo}</div>
                </div>
              </td>
              <td className="p-3">
                <div className="text-xs">
                  <div className="font-medium">{client.cell}</div>
                  <div className="text-blue-600 truncate max-w-[150px]">{client.email}</div>
                </div>
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  client.category === "Gold" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {client.category}
                </span>
              </td>
              <td className="p-3 font-medium text-green-600 text-sm">Rs {client.dueBalance}</td>
              <td className="p-3">
                <ClientRowActions client={client} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDesktopView = () => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">IR No.</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Client Name</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">CNIC</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Phone</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Email</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Vehicles</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Category</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Balance</th>
            <th className="p-3 text-left text-xs font-semibold text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody>
          {currentClients.map((client) => (
            <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-3 font-medium text-blue-600 text-xs">{client.irNo}</td>
              <td className="p-3">
                <div className="font-medium text-gray-800 text-sm">{client.name}</div>
                <div className="text-gray-500 text-xs">{client.office}</div>
              </td>
              <td className="p-3 text-gray-700 text-xs">{client.cnic}</td>
              <td className="p-3 text-gray-700 text-xs">{client.cell}</td>
              <td className="p-3 text-blue-600 text-xs truncate max-w-[150px]">{client.email}</td>
              <td className="p-3 text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 bg-blue-50 text-blue-700 rounded text-xs font-bold">
                  {client.vehicles}
                </span>
              </td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  client.category === "Gold" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                }`}>
                  {client.category}
                </span>
              </td>
              <td className="p-3 font-bold text-green-600 text-sm">Rs {client.dueBalance}</td>
              <td className="p-3">
                <ClientRowActions client={client} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="mb-4 md:mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
          <div>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Clients</h1>
            <p className="text-gray-500 text-xs md:text-sm mt-1">Installed customers (technician stage completed)</p>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={openAddClientForm}
              className="cursor-pointer flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg font-medium text-xs md:text-sm"
            >
              <FiPlus className="w-4 h-4" />
              <span className="hidden xs:inline">Add Client</span>
              <span className="xs:hidden">Add New</span>
            </button>
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="flex items-center gap-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium text-xs md:text-sm"
                type="button"
              >
                <FiFilter className="w-4 h-4" />
                <span className="xs:inline">Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}</span>
              </button>
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                  <div className="p-3 space-y-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Category</label>
                      <select
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                      >
                        {categoryOptions.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Office</label>
                      <select
                        value={officeFilter}
                        onChange={(e) => {
                          setOfficeFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                      >
                        {officeOptions.map((office) => (
                          <option key={office} value={office}>
                            {office}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Balance range (Rs)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Min"
                          value={minBalance}
                          onChange={(e) => {
                            setMinBalance(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                        />
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Max"
                          value={maxBalance}
                          onChange={(e) => {
                            setMaxBalance(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-500 mb-1">Min vehicles</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={minVehicles}
                        onChange={(e) => {
                          setMinVehicles(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => {
                          setCategoryFilter("All");
                          setOfficeFilter("All");
                          setMinBalance("");
                          setMaxBalance("");
                          setMinVehicles("");
                          setCurrentPage(1);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-700"
                        type="button"
                      >
                        Clear filters
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:w-[300px] w-full pl-10 pr-4 py-2.5 md:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm bg-white"
          />
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="px-3 md:px-4 py-3 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">Client List</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                {filteredClients.length} total clients
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Show:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="px-3 md:px-4 py-3 text-sm text-gray-500 border-b border-gray-200">
            Loading clients...
          </div>
        )}
        {error && (
          <div className="px-3 md:px-4 py-3 text-sm text-red-600 border-b border-gray-200">
            Failed to load clients.
          </div>
        )}
        {actionMessage && (
          <div className="px-3 md:px-4 py-3 text-sm text-green-700 border-b border-gray-200">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div className="px-3 md:px-4 py-3 text-sm text-red-600 border-b border-gray-200">
            {actionError}
          </div>
        )}

        {screenSize === "mobile" ? renderMobileView() : 
         screenSize === "small-tablet" ? renderSmallTableView() :
         screenSize === "tablet" ? renderTableView() : 
         renderDesktopView()}

        {/* Pagination */}
        <div className="px-3 md:px-4 py-3 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredClients.length)} of {filteredClients.length}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage === 1) {
                    pageNum = i + 1;
                  } else if (currentPage === totalPages) {
                    pageNum = totalPages - 2 + i;
                  } else {
                    pageNum = currentPage - 1 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded border text-xs ${
                        currentPage === pageNum
                          ? "bg-blue-500 text-white border-blue-500"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewSaleId && (
        <ClientDetailModal saleId={viewSaleId} onClose={() => setViewSaleId(null)} />
      )}
    </div>
  );
};

export default Clients;