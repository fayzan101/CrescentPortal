"use client";

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import FieldWrapper from '../../../ui/FieldWrapper';
import Input from '../../../ui/Input';
import EditModal from '@/components/components/EditModal';
import Select from '../../../ui/Select';
import { useOffices } from '@/hooks/office/useOffices';
import { useStores } from '@/hooks/inventory/setup/useStores';
import { useCreateStore } from '@/hooks/inventory/setup/useCreateStore';
import { useUpdateStore } from '@/hooks/inventory/setup/useUpdateStore';
import { useDeleteStore } from '@/hooks/inventory/setup/useDeleteStore';

const AddStorePage = ({ onStepChange, onMarkCompleted }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        storeName: '',
        location: '',
        officeId: '',
        isActive: true,
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedStore, setSelectedStore] = useState(null);
    const [editStoreName, setEditStoreName] = useState('');
    const [editLocation, setEditLocation] = useState('');
    const [editOfficeId, setEditOfficeId] = useState('');
    const [updateError, setUpdateError] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.items)) return data.items;
        return [];
    };

    const setStoresQueryData = (updater) => {
        queryClient.setQueryData(['stores'], (current) => {
            const currentList = normalizeList(current);
            const nextList = typeof updater === 'function' ? updater(currentList) : updater;

            if (Array.isArray(current)) return nextList;
            if (Array.isArray(current?.data)) return { ...current, data: nextList };
            if (Array.isArray(current?.items)) return { ...current, items: nextList };

            return nextList;
        });
    };

    const storesQuery = useStores();
    const officesQuery = useOffices(undefined, { enabled: true });
    const stores = useMemo(() => normalizeList(storesQuery.data), [storesQuery.data]);
    const offices = useMemo(
        () =>
            normalizeList(officesQuery.data).map((office) => ({
                id: office.id ?? office.officeId ?? office._id,
                name: office.branchName || office.officeName || office.name || '',
            })),
        [officesQuery.data]
    );
    const officeOptions = useMemo(
        () => offices.map((office) => ({ value: String(office.id), label: office.name })),
        [offices]
    );
    const officeNameById = useMemo(() => {
        const map = new Map();
        offices.forEach((office) => map.set(String(office.id), office.name));
        return map;
    }, [offices]);
    const loading = storesQuery.isLoading;
    const tableError = storesQuery.error?.message || null;

    const getStoreId = (store) => {
        if (!store) return null;
        if (typeof store === 'string' || typeof store === 'number') return store;
        return store.id ?? store.storeId ?? store._id ?? store.store_id ?? null;
    };

    const normalizedStores = useMemo(
        () =>
            stores.map((store) => ({
                ...store,
                id: store.id ?? store.storeId ?? store._id ?? store.store_id,
                storeName: store.storeName || store.name || '',
                officeId: store.officeId ?? store.office?.officeId ?? store.office?.id ?? '',
                officeName:
                    store.office?.officeName ||
                    store.office?.branchName ||
                    store.officeName ||
                    officeNameById.get(String(store.officeId ?? store.office?.officeId ?? store.office?.id ?? '')) ||
                    '',
            })),
        [officeNameById, stores]
    );

    const { mutate: createStore, isPending: isCreating } = useCreateStore({
        onMutate: async (newStore) => {
            await queryClient.cancelQueries({ queryKey: ['stores'] });
            const previousStores = queryClient.getQueryData(['stores']);
            const tempStore = {
                id: `temp-${Date.now()}`,
                ...newStore,
            };

            setStoresQueryData((currentList) => [tempStore, ...currentList]);

            return { previousStores };
        },
        onError: (error, variables, context) => {
            if (context?.previousStores !== undefined) {
                queryClient.setQueryData(['stores'], context.previousStores);
            }
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to create store.');
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['stores'] });
        },
    });

    const { mutate: updateStore, isPending: isUpdating } = useUpdateStore({
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['stores'] });
            const previousStores = queryClient.getQueryData(['stores']);

            setStoresQueryData((currentList) =>
                currentList.map((store) => {
                    if (String(getStoreId(store)) !== String(id)) return store;
                    return {
                        ...store,
                        ...data,
                        id: getStoreId(store) ?? id,
                    };
                })
            );

            return { previousStores };
        },
        onError: (error, variables, context) => {
            if (context?.previousStores !== undefined) {
                queryClient.setQueryData(['stores'], context.previousStores);
            }
            setUpdateError(error?.response?.data?.message || error?.message || 'Failed to update store.');
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['stores'] });
        },
    });

    const { mutate: deleteStore } = useDeleteStore({
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['stores'] });
            const previousStores = queryClient.getQueryData(['stores']);

            setStoresQueryData((currentList) =>
                currentList.filter((store) => String(getStoreId(store)) !== String(id))
            );

            return { previousStores };
        },
        onError: (error, variables, context) => {
            if (context?.previousStores !== undefined) {
                queryClient.setQueryData(['stores'], context.previousStores);
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['stores'] });
        },
    });

    const filteredStores = normalizedStores.filter(store =>
        store.storeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tableColumns = [
        { key: 'storeName', label: 'Store Name', width: '20%' },
        { key: 'location', label: 'City', width: '16%' },
        { key: 'officeName', label: 'Office', width: '18%', render: (item) => item.officeName || 'N/A' },
        {
            key: 'isActive',
            label: 'Status',
            width: '15%',
            render: (item) => (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold inline-block ${
                  item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {item.isActive ? 'Active' : 'Inactive'}
                </span>
            )
        }
    ];

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.storeName || !formData.location) {
            return;
        }

        setSubmitError(null);
        createStore(
            {
                storeName: formData.storeName,
                location: formData.location,
                ...(formData.officeId ? { officeId: Number(formData.officeId) } : {}),
                isActive: formData.isActive,
            },
            {
                onSuccess: () => {
                    onMarkCompleted?.('add-store');
                    setFormData({ storeName: '', location: '', officeId: '', isActive: true });
                },
            }
        );
    };

    const handleCancel = () => {
        setFormData({ storeName: '', location: '', officeId: '', isActive: true });
    };

    const handleToggleStatus = (store, index, nextValue) => {
        const storeId = getStoreId(store);
        const targetStore = normalizedStores.find(item => String(item.id) === String(storeId));
        if (!targetStore) return;

        updateStore({
            id: storeId,
                data: {
                    storeName: targetStore.storeName,
                    location: targetStore.location,
                    officeId: targetStore.officeId ? Number(targetStore.officeId) : undefined,
                    isActive: typeof nextValue === 'boolean' ? nextValue : !targetStore.isActive,
                },
        });
    };

    const handleEdit = (store) => {
        setSelectedStore(store);
        setEditStoreName(store.storeName || store.name || '');
        setEditLocation(store.location || '');
        setEditOfficeId(store.officeId ? String(store.officeId) : '');
        setUpdateError(null);
        setShowEditModal(true);
    };

    const handleUpdateStore = (onSuccess) => {
        if (!editStoreName.trim() || !editLocation.trim()) {
            setUpdateError('Store Name and Location are required.');
            return;
        }

        updateStore(
            {
                id: selectedStore.id,
                data: {
                    storeName: editStoreName,
                    location: editLocation,
                    ...(editOfficeId ? { officeId: Number(editOfficeId) } : {}),
                    isActive: selectedStore.isActive,
                },
            },
            {
                onSuccess: () => {
                    setShowEditModal(false);
                    setSelectedStore(null);
                    onSuccess?.();
                },
            }
        );
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedStore(null);
        setEditStoreName('');
        setEditLocation('');
        setEditOfficeId('');
        setUpdateError(null);
    };

    const handleDelete = (storeId) => {
        const targetStoreId = getStoreId(storeId);
        if (!targetStoreId) return;
        deleteStore(targetStoreId);
    };

    return (
        <>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Add Store</h1>

            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-4">
                        <Loader size={48} className="animate-spin text-blue-600" />
                        <p className="text-gray-600 font-medium">Loading stores...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Form Section */}
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1">
                                <FieldWrapper label="Store Name" required className="text-sm">
                                    <Input
                                        name="storeName"
                                        value={formData.storeName}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
                                    />
                                </FieldWrapper>
                            </div>

                            <div className="space-y-1">
                                <FieldWrapper label="City" required className="text-sm">
                                    <Input
                                        name="location"
                                        value={formData.location}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
                                    />
                                </FieldWrapper>
                            </div>

                            <div className="space-y-1">
                                <FieldWrapper label="Office" className="text-sm">
                                    <Select
                                        name="officeId"
                                        value={formData.officeId}
                                        onChange={handleInputChange}
                                        options={officeOptions}
                                        placeholder="Select office"
                                        className="text-sm"
                                    />
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="flex gap-3 md:pt-4 mt-4 md:mt-6 justify-end">
                            <button
                                onClick={handleCancel}
                                className="w-40 py-3.5 border border-customBlue text-customBlue hover:bg-gray-50 rounded-lg text-md font-medium transition cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isCreating}
                                className="w-40 py-3.5 bg-customBlue text-white hover:bg-customBlue/90 rounded-lg text-md font-medium transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isCreating && <Loader size={18} className="animate-spin" />}
                                Save
                            </button>
                        </div>
                        {submitError && <p className="mt-3 text-sm text-red-600">{submitError}</p>}
                    </div>

                    <div className="border-t border-gray-300 my-8"></div>

                    {/* Stores Table */}
                    <div className="pb-6 md:pb-8">
                        <DataTable
                            isLoading={loading}
                            error={tableError}
                            items={filteredStores}
                            columns={tableColumns}
                            showView={false}
                            showEdit={true}
                            showDelete={true}
                            showToggle={true}
                            searchQuery={searchTerm}
                            onSearchChange={setSearchTerm}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onToggle={handleToggleStatus}
                            tabName="Store"
                        />
                    </div>
                </>
            )}

            {/* Edit Modal — same pattern as AddOfficeTabContent */}
            <EditModal
                isOpen={showEditModal}
                selectedItem={selectedStore}
                onUpdate={handleUpdateStore}
                onClose={handleCloseEditModal}
                isUpdating={isUpdating}
                error={updateError}
                title="Edit Store"
                itemType="store"
                fields={[
                    { label: "Store Name", value: editStoreName, onChange: setEditStoreName },
                    { label: "Location", value: editLocation, onChange: setEditLocation },
                    {
                        label: "Office",
                        type: "select",
                        value: editOfficeId,
                        onChange: setEditOfficeId,
                        options: officeOptions,
                    },
                ]}
            />
        </>
    );
};

export default AddStorePage;