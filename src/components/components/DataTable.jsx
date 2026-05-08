"use client";

import React, { useState, useRef } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Input from "@/components/ui/Input";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import SuccessModal from "@/components/ui/SuccessModal";
import { ViewButton, EditButton, DeleteButton, ToggleButton } from "./ButtonComponents";
import Image from "next/image";

const DataTable = ({
  isLoading = false,
  error = null,
  items = [],
  columns = [],
  showView = true,
  showEdit = true,
  showDelete = true,
  showToggle = true,
  onView,
  onEdit,
  onDelete,
  onToggle,
  searchQuery = "",
  onSearchChange = () => {},
  tabName = "Item",
  itemsPerPage = 6,
  showPageSizeSelector = true,
  pageSizeOptions = [5, 10, 25, 50],
  rowActions = null,
}) => {
  const [pageSize, setPageSize] = useState(itemsPerPage);
  const [toggleStates, setToggleStates] = useState(() =>
    Object.fromEntries(items.map((item, index) => [index, item?.isActive ?? true]))
  );
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterActive, setFilterActive] = useState(null);
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterPanelStyle, setFilterPanelStyle] = useState({ top: 0, left: 0 });
  const filterButtonRef = useRef(null);
  const filterPanelRef = useRef(null);

  const [deleteConfirmation, setDeleteConfirmation] = useState({
    isOpen: false,
    itemName: "",
    itemIndex: null,
  });
  const [successModal, setSuccessModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    type: "create",
  });

  const getColumnValue = (item, columnKey) => {
    const keys = columnKey.split(".");
    let value = item;
    for (let key of keys) {
      value = value?.[key];
    }
    return value ?? "";
  };

  const getItemName = (item) => {
    if (typeof item === "string") return item;
    return item?.name || item?.storeName || item?.businessName || item?.title || item?.itemName || item?.officeName || "";
  };

  const getItemId = (item) => {
    if (typeof item === "string") return item;
    return item?.id ?? item?.storeId ?? item?._id ?? item?.store_id ?? null;
  };

  const getItemActive = (item, index) => {
    if (typeof item === "string") return toggleStates[index];
    return item?.isActive ?? toggleStates[index];
  };

  const getSortedAndFiltered = () => {
    let result = items
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => {
        const name = getItemName(item);
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase());
        const isActive = getItemActive(item, index);

        if (filterActive === null) return matchesSearch;
        if (filterActive === true) return matchesSearch && isActive;
        if (filterActive === false) return matchesSearch && !isActive;

        return matchesSearch;
      });

    if (sortBy === "a-z") {
      result.sort((a, b) => getItemName(a.item).localeCompare(getItemName(b.item)));
    } else if (sortBy === "z-a") {
      result.sort((a, b) => getItemName(b.item).localeCompare(getItemName(a.item)));
    } else if (sortBy === "active-first") {
      result.sort((a, b) => {
        const aActive = getItemActive(a.item, a.index) ? 0 : 1;
        const bActive = getItemActive(b.item, b.index) ? 0 : 1;
        return aActive - bActive;
      });
    } else if (sortBy === "inactive-first") {
      result.sort((a, b) => {
        const aActive = getItemActive(a.item, a.index) ? 1 : 0;
        const bActive = getItemActive(b.item, b.index) ? 1 : 0;
        return aActive - bActive;
      });
    }

    return result;
  };

  const filteredItems = getSortedAndFiltered();

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterActive, sortBy, pageSize]);

  React.useEffect(() => {
    if (!showFilterPanel) return;

    const updateFilterPanelPosition = () => {
      const buttonEl = filterButtonRef.current;
      const panelEl = filterPanelRef.current;
      if (!buttonEl || !panelEl) return;

      const buttonRect = buttonEl.getBoundingClientRect();
      const panelRect = panelEl.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 12;
      const gap = 8;

      let left = buttonRect.right - panelRect.width;
      left = Math.max(padding, Math.min(left, viewportWidth - panelRect.width - padding));

      const spaceBelow = viewportHeight - buttonRect.bottom - gap;
      const spaceAbove = buttonRect.top - gap;
      let top;

      if (spaceBelow >= panelRect.height || spaceBelow >= spaceAbove) {
        top = buttonRect.bottom + gap;
      } else {
        top = buttonRect.top - panelRect.height - gap;
      }

      top = Math.max(padding, Math.min(top, viewportHeight - panelRect.height - padding));
      setFilterPanelStyle({ top, left });
    };

    updateFilterPanelPosition();
    requestAnimationFrame(updateFilterPanelPosition);

    const resizeObserver =
      typeof ResizeObserver !== "undefined" && filterPanelRef.current
        ? new ResizeObserver(updateFilterPanelPosition)
        : null;
    if (resizeObserver && filterPanelRef.current) {
      resizeObserver.observe(filterPanelRef.current);
    }

    window.addEventListener("resize", updateFilterPanelPosition);
    window.addEventListener("scroll", updateFilterPanelPosition, true);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("resize", updateFilterPanelPosition);
      window.removeEventListener("scroll", updateFilterPanelPosition, true);
    };
  }, [showFilterPanel]);

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  const handleToggle = (item, index) => {
    const nextValue = !getItemActive(item, index);
    setToggleStates((prev) => ({ ...prev, [index]: nextValue }));
    if (onToggle) onToggle(item, index, nextValue);
  };

  const handleDeleteClick = (item, index) => {
    setDeleteConfirmation({
      isOpen: true,
      itemName: getItemName(item),
      itemIndex: index,
    });
  };

  const handleDeleteConfirm = async () => {
    const { itemIndex, itemName } = deleteConfirmation;
    const item = items[itemIndex];
    const itemId = getItemId(item) ?? itemName;
  
    setDeleteConfirmation({
      isOpen: false,
      itemName: "",
      itemIndex: null,
    });
  
    if (!onDelete) return;
  
    try {
      const response = await onDelete(itemId, itemIndex, item);
  
      const status =
        response?.status ||
        response?.response?.status;
  
      const isSuccess =
        (status >= 200 && status < 300) ||
        response === true ||
        response === undefined;
  
      if (!isSuccess) return;
  
      setSuccessModal({
        isOpen: true,
        title: "Deleted Successfully",
        message: `"${itemName}" has been deleted successfully.`,
        type: "delete",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleEditClick = (item, index) => {
    if (onEdit) onEdit(item, index);
  };

  const handleViewClick = (item, index) => {
    if (onView) onView(item, index);
  };

  const getPaginationPages = () => {
    const delta = 1;
    const left = currentPage - delta;
    const right = currentPage + delta + 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i == 1 || i == totalPages || (i >= left && i < right)) {
        range.push(i);
      }
    }

    range.forEach((i) => {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  };

  return (
    <div className="relative">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between h-12">
        <div className="flex flex-row items-center gap-4 relative w-full sm:max-w-105 border border-gray-200 rounded-xl px-4 py-2.5 h-full">
          <Search className="h-6 w-6 text-black" />
          <Input 
            placeholder="Search Item" 
            className="py-2.5 font-lexend font-light caret-gray-900"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <button
          ref={filterButtonRef}
          type="button"
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-8 py-2.5 text-md font-lexend text-gray-700 transition hover:bg-gray-50 h-full relative"
        >
          <Image src="/Icons/FilterIcon.svg" alt="Filter Icon" width={22} height={22} />
          Filter
          {(filterActive !== null || sortBy !== "default") && (
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
              ●
            </span>
          )}
        </button>
      </div>

      {showFilterPanel && (
        <div
          ref={filterPanelRef}
          className="fixed bg-white border border-gray-300 rounded-xl shadow-xl p-6 z-50 w-72 animate-in fade-in"
          style={{
            ...filterPanelStyle,
            maxHeight: "calc(100vh - 24px)",
            overflowY: "auto",
          }}
        >
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-800">Filter & Sort</h3>
            <button
              onClick={() => setShowFilterPanel(false)}
              className="cursor-pointer text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Status</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="filter"
                  checked={filterActive === null}
                  onChange={() => setFilterActive(null)}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">All Items</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="filter"
                  checked={filterActive === true}
                  onChange={() => setFilterActive(true)}
                  className="w-4 h-4 cursor-pointer accent-green-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Active Only
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="filter"
                  checked={filterActive === false}
                  onChange={() => setFilterActive(false)}
                  className="w-4 h-4 cursor-pointer accent-gray-500"
                />
                <span className="text-sm text-gray-700">
                  <span className="inline-block w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                  Inactive Only
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 my-4"></div>

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Sort By</h4>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "default"}
                  onChange={() => setSortBy("default")}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">Default</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "a-z"}
                  onChange={() => setSortBy("a-z")}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">A to Z</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "z-a"}
                  onChange={() => setSortBy("z-a")}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">Z to A</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "active-first"}
                  onChange={() => setSortBy("active-first")}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">Active First</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 py-0 rounded-lg transition">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === "inactive-first"}
                  onChange={() => setSortBy("inactive-first")}
                  className="w-4 h-4 cursor-pointer accent-blue-500"
                />
                <span className="text-sm text-gray-700">Inactive First</span>
              </label>
            </div>
          </div>

          <button
            onClick={() => {
              setFilterActive(null);
              setSortBy("default");
            }}
            className="cursor-pointer w-full mt-5 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
          >
            Reset All
          </button>
        </div>
      )}

      <div className="mt-15 sm:mt-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="inline-block animate-spin">
                <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
              </div>
              <p className="mt-4 text-gray-600">Loading</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <p className="text-red-600 font-semibold">Error</p>
              <p className="text-red-500 mt-2">{error}</p>
            </div>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No items available
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className="py-3 px-4 font-semibold text-gray-700 text-sm text-left"
                        style={{ width: column.width }}
                      >
                        {column.label}
                      </th>
                    ))}
                    {(showView || showEdit || showDelete || showToggle || rowActions) && (
                      <th className="py-3 px-4 font-semibold text-gray-700 text-sm text-center">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map(({ item, index }, displayIndex) => (
                    <tr key={item?.id ?? index} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      {columns.map((column) => (
                        <td key={column.key} className="py-4 px-4 text-sm text-gray-700">
                          {column.render
                            ? column.render(item, index)
                            : getColumnValue(item, column.key)}
                        </td>
                      ))}
                      {(showView || showEdit || showDelete || showToggle || rowActions) && (
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {showView && <ViewButton onClick={() => handleViewClick(item, index)} />}
                            {showEdit && <EditButton onClick={() => handleEditClick(item, index)} />}
                            {showDelete && <DeleteButton onClick={() => handleDeleteClick(item, index)} />}
                            {showToggle && (
                              <ToggleButton
                                isActive={!!getItemActive(item, index)}
                                onClick={() => handleToggle(item, index)}
                              />
                            )}
                            {typeof rowActions === "function" ? rowActions(item, index) : null}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 px-4">
              {showPageSizeSelector && (
                <div className="mr-auto flex items-center gap-2">
                  <span className="text-sm text-gray-600 font-medium">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="border border-gray-300 rounded px-3 py-2 text-gray-700 focus:outline-none focus:border-blue-500 text-sm bg-white"
                  >
                    {pageSizeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {getPaginationPages().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === "..." ? (
                      <span className="px-2 py-2 text-gray-600 text-sm font-medium">...</span>
                    ) : (
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`cursor-pointer px-3 py-2 min-w-8.75 rounded-lg font-medium text-sm transition ${
                          currentPage === page
                            ? "bg-blue-500 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <span className="ml-4 text-sm text-gray-600 font-medium">
                Page {currentPage} of {totalPages}
              </span>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No items found
          </div>
        )}
      </div>

      <DeleteConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        itemName={deleteConfirmation.itemName}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirmation({ isOpen: false, itemName: "", itemIndex: null })}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        title={successModal.title}
        message={successModal.message}
        type={successModal.type}
        onClose={() => setSuccessModal({ isOpen: false, title: "", message: "", type: "create" })}
      />
    </div>
  );
};

export default DataTable;
