"use client";

import React, { useEffect, useState } from 'react';
import { Plus, Minus, Search, Filter, Download, Eye, Calendar, TrendingUp, Package, DollarSign, X, Loader } from 'lucide-react';
import FieldWrapper from '../../ui/FieldWrapper';
import { Trash2 } from "lucide-react";
import Input from '../../ui/Input';
import Textarea from '../../ui/TextArea';
import { useDashboardStats } from '@/hooks/inventory/dashboard/useDashboardStats';
import { useDropdownStores } from '@/hooks/inventory/utility/useDropdownStores';
import { useDropdownItems } from '@/hooks/inventory/utility/useDropdownItems';
import { useSearchGuards } from '@/hooks/inventory/utility/useSearchGuards';
import { useBulkIssuance } from '@/hooks/inventory/movements/useBulkIssuance';
import { useOffices } from '@/hooks/office/useOffices';
import { normalizeApiList } from '@/lib/normalizeApiList';
import { resolveItemRecordId, resolveItemUnitOfMeasurement } from '@/lib/inventoryItemMeta';
import OverviewSubPanels from './OverviewSubPanels';

const  OverviewPage = () => {
    const [activeSubTab, setActiveSubTab] = useState('inventory-card');
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewItems, setReviewItems] = useState([]);
    
    const [formData, setFormData] = useState({
        serviceNo: '',
        guardName: '',
        newOldSupply: '',
        selectStore: '',
        selectLocation: '',
        selectItem: '',
        itemSize: '',
        quantity: 1,
    });

    const subTabs = [
        { id: 'issuance', label: 'Issuance Register' },
        { id: 'return', label: 'Return Register' },
        { id: 'transfer', label: 'Transfer' },
        { id: 'items', label: 'Items List' },
        { id: 'requests', label: 'Purchase Requests' },
        { id: 'inventory-card', label: 'Inventory Card', highlight: true },
    ];

    const { data: dashboardStats } = useDashboardStats();
    const { data: storesRaw = [] } = useDropdownStores();
    const { data: itemsRaw = [] } = useDropdownItems();
    const { data: officesRaw = [] } = useOffices();
    const { data: guardSearchResult } = useSearchGuards(formData.serviceNo);
    const { mutateAsync: submitBulkIssuance } = useBulkIssuance();

    useEffect(() => {
        const guard = guardSearchResult?.data?.guard || guardSearchResult?.guard || guardSearchResult?.data || {};
        const resolvedName = guard?.name || guard?.guardName || guard?.fullName || '';
        if (!resolvedName) return;
        setFormData((prev) => ({ ...prev, guardName: resolvedName }));
    }, [guardSearchResult]);

    const statsPayload = dashboardStats?.data || dashboardStats || {};
    const stats = [
        { label: 'Items', value: Number(statsPayload.items ?? statsPayload.totalItems ?? 0) },
        { label: 'Stores', value: Number(statsPayload.stores ?? 0) },
        { label: 'Purchase Requests', value: Number(statsPayload.purchaseRequests ?? 0) },
        { label: 'Purchase Orders', value: Number(statsPayload.purchaseOrders ?? 0) },
        { label: 'GRN', value: Number(statsPayload.grn ?? 0) },
        { label: 'Issuance', value: Number(statsPayload.issuance ?? 0) },
        { label: 'Returns', value: Number(statsPayload.returns ?? 0) },
        { label: 'Transfers', value: Number(statsPayload.transfers ?? 0) },
    ];

    const stores = normalizeApiList(storesRaw).map((store) => ({
        id: String(store.id ?? store.storeId ?? store.value ?? ''),
        name: store.name || store.storeName || store.label || 'N/A',
    }));

    const locations = normalizeApiList(officesRaw).map((office) => ({
        id: String(office.id ?? office.officeId ?? office.value ?? ''),
        locationName: office.officeName || office.branchName || office.name || 'Office',
    })).filter((office) => office.id);

    const storeInventory = normalizeApiList(itemsRaw).map((item) => ({
        id: resolveItemRecordId(item) || String(item.id ?? item.itemId ?? item.value ?? ''),
        name: item.name || item.itemName || item.label || 'N/A',
        sku: item.sku || item.itemSku || 'N/A',
        quantityAvailable: Number(item.quantityAvailable ?? item.availableQty ?? 0),
        resolvedUom: resolveItemUnitOfMeasurement(item),
    }));

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleQuantityChange = (delta) => {
        setFormData(prev => ({
            ...prev,
            quantity: Math.max(1, prev.quantity + delta)
        }));
    };

    const handleAdd = () => {
        if (!formData.selectItem || !formData.quantity) {
            return;
        }

        const selectedItem = storeInventory.find(
            (item) => String(item.id) === String(formData.selectItem)
        );
        if (!selectedItem) return;

        const reviewItem = {
            id: Date.now(),
            itemId: formData.selectItem,
            itemName: selectedItem.name,
            sku: selectedItem.sku,
            itemSize: formData.itemSize || '',
            unitOfMeasurement:
                formData.itemSize ||
                selectedItem.resolvedUom ||
                'Unit',
            quantity: parseInt(formData.quantity),
        };

        setReviewItems(prev => [...prev, reviewItem]);

        setFormData(prev => ({
            ...prev,
            selectItem: '',
            itemSize: '',
            quantity: 1,
        }));
    };

    const handleRemoveItem = (itemId) => {
        setReviewItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleCancel = () => {
        setFormData({
            serviceNo: '',
            guardName: '',
            newOldSupply: '',
            selectStore: '',
            selectLocation: '',
            selectItem: '',
            itemSize: '',
            quantity: 1,
        });
        setReviewItems([]);
    };

    const handleSave = async () => {
        if (!formData.selectStore || reviewItems.length === 0) return;

        setIsSubmitting(true);
        try {
            const selectedLocation = locations.find(
                (location) => String(location.id) === String(formData.selectLocation)
            );
            const payload = {
                issuances: [{
                    storeId: Number(formData.selectStore),
                    issuedTo: formData.guardName || formData.serviceNo || undefined,
                    remarks: [
                        formData.serviceNo ? `Service No: ${formData.serviceNo}` : null,
                        formData.newOldSupply ? `First supply: ${formData.newOldSupply}` : null,
                        selectedLocation ? `Office: ${selectedLocation.locationName}` : null,
                    ].filter(Boolean).join('; ') || undefined,
                    lines: reviewItems.map((item) => ({
                        itemId: Number(item.itemId),
                        qty: Math.max(1, Number(item.quantity) || 1),
                        note: item.itemSize ? `Size: ${item.itemSize}` : undefined,
                    })),
                }],
            };
            await submitBulkIssuance(payload);
            handleCancel();
        } catch (_error) {
            // error surfaced by mutation caller if configured
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white m-5 rounded-lg min-h-screen p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-linear-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex flex-col items-center">
                            <div className="w-20 h-20 mb-4 rounded-full border-4 border-white/20 flex items-center justify-center">
                                <span className="text-2xl font-bold">{stat.value}</span>
                            </div>
                            <p className="text-center text-sm font-medium">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sub Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-gray-200">
                {subTabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeSubTab === tab.id
                                ? tab.highlight
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-blue-100 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSubTab !== 'inventory-card' ? (
                <OverviewSubPanels activeSubTab={activeSubTab} />
            ) : (
            <>
            {/* Form Section */}
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
                {/* First Row - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Service No Search */}
                    <div className="h-full">
                        <FieldWrapper label="Select Service No. *" className="text-sm">
                            <Input
                                name="serviceNo"
                                value={formData.serviceNo}
                                onChange={handleInputChange}
                                placeholder="Type service number or guard name"
                                className="text-sm py-2"
                            />
                        </FieldWrapper>
                    </div>

                    {/* Guard Name Display */}
                    <div className="h-full">
                        <FieldWrapper label="Guard Name *" className="text-sm">
                            <Input
                                name="guardName"
                                value={formData.guardName}
                                readOnly
                                placeholder="Auto-filled from Service Number"
                                className="text-sm py-2 bg-gray-100 h-10"
                            />
                        </FieldWrapper>
                    </div>

                    {/* New & First Supply Select */}
                    <div className="h-full">
                        <FieldWrapper label="New & First Supply" className="text-sm">
                            <select
                                name="newOldSupply"
                                value={formData.newOldSupply}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customBlue text-sm h-10"
                            >
                                <option value="">Yes or No</option>
                                <option value="yes">Yes</option>
                                <option value="no">No</option>
                            </select>
                        </FieldWrapper>
                    </div>
                </div>

                {/* Second Row - 3 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {/* Select Store */}
                    <div className="h-full">
                        <FieldWrapper label="Select Store *" className="text-sm">
                            <select
                                name="selectStore"
                                value={formData.selectStore}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customBlue text-sm h-10"
                            >
                                <option value="">Select Store</option>
                                {stores.map((store) => (
                                    <option key={store.id} value={store.id}>
                                        {store.name}
                                    </option>
                                ))}
                            </select>
                        </FieldWrapper>
                    </div>

                    {/* Select Location */}
                    <div className="h-full">
                        <FieldWrapper label="Select Location" className="text-sm">
                            <select
                                name="selectLocation"
                                value={formData.selectLocation}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customBlue text-sm h-10"
                            >
                                <option value="">Select Location</option>
                                {locations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                        {location.locationName}
                                    </option>
                                ))}
                            </select>
                        </FieldWrapper>
                    </div>

                    {/* Select Item */}
                    <div className="h-full">
                        <FieldWrapper label="Select Item (SKU/Barcode) *" className="text-sm">
                            <select
                                name="selectItem"
                                value={formData.selectItem}
                                onChange={handleInputChange}
                                disabled={!formData.selectStore}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customBlue text-sm h-10 disabled:bg-gray-100"
                            >
                                <option value="">
                                    {!formData.selectStore ? 'Select a store first' : 'Select Item'}
                                </option>
                                {storeInventory.map((inventory) => (
                                    <option key={inventory.id} value={inventory.id}>
                                        {inventory.name} ({inventory.sku}) - Available: {inventory.quantityAvailable}
                                    </option>
                                ))}
                            </select>
                        </FieldWrapper>
                    </div>
                </div>

                {/* Third Row - 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {/* Item Size */}
                    <div className="h-full">
                        <FieldWrapper label="Select Sized Unit of Measurement *" className="text-sm">
                            <select
                                name="itemSize"
                                value={formData.itemSize}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-customBlue text-sm h-10"
                            >
                                <option value="">Select</option>
                                <option value="small">Small</option>
                                <option value="medium">Medium</option>
                                <option value="large">Large</option>
                            </select>
                        </FieldWrapper>
                    </div>

                    {/* Quantity Input */}
                    <div className="h-full">
                        <FieldWrapper label={"Quantity"} className="text-sm">
                            <div className="flex items-center border border-gray-300 rounded-lg h-10">
                                <button
                                    onClick={() => handleQuantityChange(-1)}
                                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 h-full"
                                >
                                    <Minus size={16} />
                                </button>
                                <input
                                    type="number"
                                    value={formData.quantity}
                                    readOnly
                                    className="flex-1 text-center py-2 border-l border-r border-gray-300 text-sm h-full"
                                />
                                <button
                                    onClick={() => handleQuantityChange(1)}
                                    className="px-3 py-2 text-gray-600 hover:bg-gray-100 h-full"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </FieldWrapper>
                    </div>
                </div>

                {/* Add Button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleAdd}
                        className="bg-customBlue text-white px-8 py-2 rounded-lg font-semibold hover:bg-customBlue/90 transition"
                    >
                        Add
                    </button>
                </div>
            </div>

            {/* Review Details Table */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Review Details</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-200">
                                <th className="py-3 px-4 text-left font-semibold text-gray-700">S.</th>
                                <th className="py-3 px-4 text-left font-semibold text-gray-700">Item SKU / Barcode</th>
                                <th className="py-3 px-4 text-left font-semibold text-gray-700">Item Name</th>
                                <th className="py-3 px-4 text-left font-semibold text-gray-700">Unit of Measurement</th>
                                <th className="py-3 px-4 text-left font-semibold text-gray-700">Quantity</th>
                                <th className="py-3 px-4 text-left font-semibold text-gray-700">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviewItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-500">
                                        <p>No items added. Add items using the form above.</p>
                                    </td>
                                </tr>
                            ) : (
                                reviewItems.map((item, idx) => (
                                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-3 px-4 text-gray-700">{idx + 1}</td>
                                        <td className="py-3 px-4 text-gray-700 font-semibold">{item.sku}</td>
                                        <td className="py-3 px-4 text-gray-700">{item.itemName}</td>
                                        <td className="py-3 px-4 text-gray-700">{item.unitOfMeasurement}</td>
                                        <td className="py-3 px-4 text-gray-700">{item.quantity}</td>
                                        <td className="py-3 px-4 text-gray-700">
                                            <button
                                                onClick={() => handleRemoveItem(item.id)}
                                                className="text-red-600 hover:text-red-800 transition flex items-center gap-1"
                                                title="Remove item"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
                <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="px-8 py-2 border-2 border-customBlue text-customBlue rounded-lg font-semibold hover:bg-customBlue/10 transition disabled:opacity-50"
                >
                    Cancel
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSubmitting}
                    className="px-8 py-2 bg-customBlue text-white rounded-lg font-semibold hover:bg-customBlue/90 transition disabled:opacity-50 flex items-center gap-2"
                >
                    {isSubmitting ? (
                        <>
                            <Loader size={16} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        'Save'
                    )}
                </button>
            </div>
            </>
            )}
        </div>
    );
};

export default OverviewPage;
