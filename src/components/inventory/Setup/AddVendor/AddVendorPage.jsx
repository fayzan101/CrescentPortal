"use client";

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Loader } from 'lucide-react';
import DataTable from '../../../components/DataTable';
import FieldWrapper from '../../../ui/FieldWrapper';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';
import EditModal from '@/components/components/EditModal';
import { useVendors } from '@/hooks/inventory/setup/useVendors';
import { useCreateVendor } from '@/hooks/inventory/setup/useCreateVendor';
import { useUpdateVendor } from '@/hooks/inventory/setup/useUpdateVendor';
import { useDeleteVendor } from '@/hooks/inventory/setup/useDeleteVendor';
import { useCities } from '@/hooks/city/useCities';

const AddVendorPage = ({ onStepChange, onMarkCompleted }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        vendorName: '',
        cityId: '',
        phone: '',
        email: '',
        address: '',
        contactPerson: '',
        isActive: true
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState(null);
    const [editVendorName, setEditVendorName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editAddress, setEditAddress] = useState('');
    const [editContactPerson, setEditContactPerson] = useState('');
    const [editCityId, setEditCityId] = useState('');
    const [updateError, setUpdateError] = useState(null);
    const [submitError, setSubmitError] = useState(null);

    const normalizeList = (data) => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.items)) return data.items;
        return [];
    };

    const setVendorsQueryData = (updater) => {
        queryClient.setQueryData(['inventory-vendors'], (current) => {
            const currentList = normalizeList(current);
            const nextList = typeof updater === 'function' ? updater(currentList) : updater;

            if (Array.isArray(current)) return nextList;
            if (Array.isArray(current?.data)) return { ...current, data: nextList };
            if (Array.isArray(current?.items)) return { ...current, items: nextList };

            return nextList;
        });
    };

    const getVendorId = (vendor) => {
        if (!vendor) return null;
        if (typeof vendor === 'string' || typeof vendor === 'number') return vendor;
        return vendor.id ?? vendor.vendorId ?? vendor._id ?? null;
    };

    const vendorsQuery = useVendors();
    const { data: citiesData } = useCities();
    const cities = useMemo(() => {
        const raw = Array.isArray(citiesData) ? citiesData : citiesData?.data ?? citiesData?.items ?? [];
        return Array.isArray(raw) ? raw : [];
    }, [citiesData]);
    const cityOptions = useMemo(
        () => cities.map((city) => ({
            value: String(city.cityId ?? city.id),
            label: city.cityName ?? city.name ?? '',
        })),
        [cities]
    );
    const cityNameById = useMemo(() => {
        const map = new Map();
        cities.forEach((city) => map.set(String(city.cityId ?? city.id), city.cityName ?? city.name ?? ''));
        return map;
    }, [cities]);
    const vendors = useMemo(() => normalizeList(vendorsQuery.data), [vendorsQuery.data]);
    const normalizedVendors = useMemo(
        () => vendors.map((vendor) => ({
            ...vendor,
            id: vendor.id ?? vendor.vendorId ?? vendor._id,
            vendorName: vendor.vendorName || vendor.businessName || vendor.name || '',
            businessName: vendor.businessName || vendor.vendorName || vendor.name || '',
            phone: vendor.phone || vendor.primaryContactNumber || '',
            email: vendor.email || vendor.emailId || '',
        })),
        [vendors]
    );
    const loading = vendorsQuery.isLoading;
    const tableError = vendorsQuery.error?.message || null;

    const { mutate: createVendor, isPending: isCreating } = useCreateVendor({
        onMutate: async (newVendor) => {
            await queryClient.cancelQueries({ queryKey: ['inventory-vendors'] });
            const previousVendors = queryClient.getQueryData(['inventory-vendors']);
            const tempVendor = {
                id: `temp-${Date.now()}`,
                ...newVendor,
            };

            setVendorsQueryData((currentList) => [tempVendor, ...currentList]);

            return { previousVendors };
        },
        onError: (error, variables, context) => {
            if (context?.previousVendors !== undefined) {
                queryClient.setQueryData(['inventory-vendors'], context.previousVendors);
            }
            setSubmitError(error?.response?.data?.message || error?.message || 'Failed to create vendor.');
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-vendors'] });
            await queryClient.invalidateQueries({ queryKey: ['dropdown-vendors'] });
        },
    });

    const { mutate: updateVendor, isPending: isUpdating } = useUpdateVendor({
        onMutate: async ({ id, data }) => {
            await queryClient.cancelQueries({ queryKey: ['inventory-vendors'] });
            const previousVendors = queryClient.getQueryData(['inventory-vendors']);

            setVendorsQueryData((currentList) =>
                currentList.map((vendor) => {
                    if (String(getVendorId(vendor)) !== String(id)) return vendor;
                    return {
                        ...vendor,
                        ...data,
                        id: getVendorId(vendor) ?? id,
                    };
                })
            );

            return { previousVendors };
        },
        onError: (error, variables, context) => {
            if (context?.previousVendors !== undefined) {
                queryClient.setQueryData(['inventory-vendors'], context.previousVendors);
            }
            setUpdateError(error?.response?.data?.message || error?.message || 'Failed to update vendor.');
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-vendors'] });
            await queryClient.invalidateQueries({ queryKey: ['dropdown-vendors'] });
        },
    });

    const { mutate: deleteVendor } = useDeleteVendor({
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['inventory-vendors'] });
            const previousVendors = queryClient.getQueryData(['inventory-vendors']);

            setVendorsQueryData((currentList) =>
                currentList.filter((vendor) => String(getVendorId(vendor)) !== String(id))
            );

            return { previousVendors };
        },
        onError: (error, variables, context) => {
            if (context?.previousVendors !== undefined) {
                queryClient.setQueryData(['inventory-vendors'], context.previousVendors);
            }
        },
        onSettled: async () => {
            await queryClient.invalidateQueries({ queryKey: ['inventory-vendors'] });
            await queryClient.invalidateQueries({ queryKey: ['dropdown-vendors'] });
        },
    });

    const filteredVendors = normalizedVendors.filter(vendor =>
        vendor.vendorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tableColumns = [
        { key: 'vendorName', label: 'Vendor Name', width: '18%' },
        {
            key: 'cityId',
            label: 'City',
            width: '12%',
            render: (item) => cityNameById.get(String(item.cityId ?? item.city?.cityId ?? '')) || 'N/A',
        },
        { key: 'contactPerson', label: 'Contact Person', width: '16%' },
        { key: 'phone', label: 'Phone', width: '15%' },
        { key: 'email', label: 'Email', width: '15%' },
        { key: 'address', label: 'Address', width: '25%' },
        {
            key: 'isActive',
            label: 'Status',
            width: '10%',
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

        if (!formData.vendorName || !formData.cityId || !formData.phone || !formData.email || !formData.address) {
            return;
        }

        setSubmitError(null);
        createVendor(
            {
                vendorName: formData.vendorName,
                cityId: Number(formData.cityId),
                contactPerson: formData.contactPerson,
                phone: formData.phone,
                email: formData.email,
                address: formData.address,
                isActive: formData.isActive
            },
            {
                onSuccess: () => {
                    onMarkCompleted?.('add-vendor');
                    setFormData({
                        vendorName: '',
                        cityId: '',
                        phone: '',
                        email: '',
                        address: '',
                        contactPerson: '',
                        isActive: true
                    });
                },
            }
        );
    };

    const handleCancel = () => {
        setFormData({
            vendorName: '',
            cityId: '',
            phone: '',
            email: '',
            address: '',
            contactPerson: '',
            isActive: true
        });
    };

    const handleToggleStatus = (vendor, index, nextValue) => {
        const vendorId = getVendorId(vendor);
        const targetVendor = normalizedVendors.find((item) => String(item.id) === String(vendorId));
        if (!targetVendor) return;

        updateVendor({
            id: vendorId,
            data: {
                vendorName: targetVendor.vendorName,
                cityId: targetVendor.cityId ?? targetVendor.city?.cityId,
                contactPerson: targetVendor.contactPerson,
                phone: targetVendor.phone,
                email: targetVendor.email,
                address: targetVendor.address,
                isActive: typeof nextValue === 'boolean' ? nextValue : !targetVendor.isActive,
            },
        });
    };

    const handleEdit = (vendor) => {
        setSelectedVendor(vendor);
        setEditVendorName(vendor.vendorName || vendor.businessName || vendor.name || '');
        setEditPhone(vendor.phone || vendor.primaryContactNumber || '');
        setEditEmail(vendor.email || vendor.emailId || '');
        setEditAddress(vendor.address || '');
        setEditContactPerson(vendor.contactPerson || '');
        setEditCityId(String(vendor.cityId ?? vendor.city?.cityId ?? ''));
        setUpdateError(null);
        setShowEditModal(true);
    };

    const handleUpdateVendor = (onSuccess) => {
        if (!editVendorName.trim() || !editCityId || !editPhone.trim() || !editEmail.trim() || !editAddress.trim()) {
            setUpdateError('Vendor Name, City, Phone, Email and Address are required.');
            return;
        }

        updateVendor(
            {
                id: selectedVendor.id,
                data: {
                    vendorName: editVendorName,
                    cityId: Number(editCityId),
                    contactPerson: editContactPerson,
                    phone: editPhone,
                    email: editEmail,
                    address: editAddress,
                    isActive: selectedVendor.isActive,
                },
            },
            {
                onSuccess: () => {
                    setShowEditModal(false);
                    setSelectedVendor(null);
                    onSuccess?.();
                },
            }
        );
    };

    const handleCloseEditModal = () => {
        setShowEditModal(false);
        setSelectedVendor(null);
        setEditVendorName('');
        setEditPhone('');
        setEditEmail('');
        setEditAddress('');
        setEditContactPerson('');
        setEditCityId('');
        setUpdateError(null);
    };

    const handleDelete = (vendorId) => {
        const targetVendorId = getVendorId(vendorId);
        if (!targetVendorId) return;
        deleteVendor(targetVendorId);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Add Vendor/Supplier</h1>

            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="flex flex-col items-center gap-4">
                        <Loader size={48} className="animate-spin text-blue-600" />
                        <p className="text-gray-600 font-medium">Loading vendors...</p>
                    </div>
                </div>
            ) : (
                <>
                    {/* Form Section */}
                    <div className="mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <FieldWrapper label="Vendor Name" required className="text-sm">
                                    <Input
                                        name="vendorName"
                                        value={formData.vendorName}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
                                    />
                                </FieldWrapper>
                            </div>

                            <div className="space-y-1">
                                <FieldWrapper label="City" required className="text-sm">
                                    <Select
                                        placeholder="Select City"
                                        value={formData.cityId}
                                        onChange={(e) => setFormData((prev) => ({ ...prev, cityId: e.target.value }))}
                                        className="text-sm"
                                        options={cityOptions}
                                    />
                                </FieldWrapper>
                            </div>

                            <div className="space-y-1">
                                <FieldWrapper label="Phone" required className="text-sm">
                                    <Input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
                                    />
                                </FieldWrapper>
                            </div>

                            <div className="space-y-1">
                                <FieldWrapper label="Email" required className="text-sm">
                                    <Input
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
                                    />
                                </FieldWrapper>
                            </div>

                            <div className="space-y-1">
                                <FieldWrapper label="Address" required className="text-sm">
                                    <Input
                                        name="address"
                                        value={formData.address}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
                                    />
                                </FieldWrapper>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="space-y-1">
                                <FieldWrapper label="Contact Person" required className="text-sm">
                                    <Input
                                        name="contactPerson"
                                        value={formData.contactPerson}
                                        onChange={handleInputChange}
                                        placeholder="Type here"
                                        className="text-sm py-2"
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

                    {/* Vendors Table */}
                    <div className="pb-6 md:pb-8">
                        <DataTable
                            isLoading={loading}
                            error={tableError}
                            items={filteredVendors}
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
                            tabName="Vendor"
                        />
                    </div>
                </>
            )}

            {/* Edit Modal */}
            <EditModal
                isOpen={showEditModal}
                selectedItem={selectedVendor}
                onUpdate={handleUpdateVendor}
                onClose={handleCloseEditModal}
                isUpdating={isUpdating}
                error={updateError}
                title="Edit Vendor/Supplier"
                itemType="vendor"
                fields={[
                    { label: "Vendor Name",   value: editVendorName,   onChange: setEditVendorName   },
                    { label: "City", type: "select", value: editCityId, onChange: setEditCityId, options: cityOptions },
                    { label: "Contact Person", value: editContactPerson, onChange: setEditContactPerson },
                    { label: "Phone",          value: editPhone,        onChange: setEditPhone        },
                    { label: "Email",          value: editEmail,        onChange: setEditEmail        },
                    { label: "Address",        value: editAddress,      onChange: setEditAddress      },
                ]}
            />
        </div>
    );
};

export default AddVendorPage;