
import React, { useEffect, useMemo, useState } from 'react';
import FieldWrapper from '../ui/FieldWrapper';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/TextArea';
import DateInput from '../ui/DateInput';
import { useCreateSale } from '../../hooks/sales/useUpdateSalesStage';
import { usePatchSalesStage } from '../../hooks/sales/usePatchSalesStage';
import { useSaleById } from '../../hooks/sales/useSaleById';
import { useClientCategories } from '../../hooks/client-category/useClientCategories';
import { useProducts } from '../../hooks/product/useProducts';
import { usePackages } from '../../hooks/package/usePackages';
import { formatDateInput, getStageStatusMap } from '@/lib/saleWorkflow';

const initialForm = {
    clientCategoryId: '',
    irNo: '',
    fullName: '',
    cnicNo: '',
    phoneHome: '',
    emailId: '',
    address: '',
    clientStatus: '',
    cellNo: '',
    fatherName: '',
    dateOfBirth: '',
    phoneOffice: '',
    companyDepartment: '',
    addressLine2: '',
    productId: '',
    saleAmount: '',
    saleType: '',
    packageId: '',
    renewalCharges: '',
    customTypeValue: '',
    salesRemarks: '',
    submitToAccounts: true,
};

const CLIENT_STATUS_OPTIONS = [
    { value: 'Active', label: 'Active' },
    { value: 'Inactive', label: 'Inactive' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Blocked', label: 'Blocked' },
];

const SALE_TYPE_OPTIONS = [
    { value: 'credit', label: 'Credit' },
    { value: 'cash', label: 'Cash' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'transfer', label: 'Transfer' },
];

function saleToForm(sale) {
    const client = sale?.clientDetails || {};
    const product = sale?.productDetails || {};
    return {
        clientCategoryId: client.clientCategoryId ? String(client.clientCategoryId) : '',
        irNo: client.irNo || '',
        fullName: client.fullName || '',
        cnicNo: client.cnicNo || '',
        phoneHome: client.phoneHome || '',
        emailId: client.emailId || '',
        address: client.address || '',
        clientStatus: client.clientStatus || '',
        cellNo: client.cellNo || '',
        fatherName: client.fatherName || '',
        dateOfBirth: formatDateInput(client.dateOfBirth),
        phoneOffice: client.phoneOffice || '',
        companyDepartment: client.companyDepartment || '',
        addressLine2: client.addressLine2 || '',
        productId: product.productId ? String(product.productId) : '',
        saleAmount: product.saleAmount != null ? String(product.saleAmount) : '',
        saleType: product.saleType ? String(product.saleType).toLowerCase() : '',
        packageId: product.packageId ? String(product.packageId) : '',
        renewalCharges: product.renewalCharges != null ? String(product.renewalCharges) : '',
        customTypeValue: product.customTypeValue != null ? String(product.customTypeValue) : '',
        salesRemarks: product.salesRemarks || '',
        submitToAccounts: false,
    };
}

const AddNewSaleForm = ({ saleId, onSuccess }) => {
    const [form, setForm] = useState(initialForm);
    const [validationError, setValidationError] = useState('');
    const { create, loading: createLoading, error: createError, data } = useCreateSale();
    const patchMutation = usePatchSalesStage();
    const { data: existingSale, loading: saleLoading } = useSaleById(saleId);
    const { data: clientCategories, isLoading: loadingCategories } = useClientCategories();
    const { data: products, isLoading: loadingProducts } = useProducts();
    const { data: packages, isLoading: loadingPackages } = usePackages();

    const salesStageStatus = useMemo(() => {
        const map = getStageStatusMap(existingSale);
        return map.SALES;
    }, [existingSale]);

    const isEditMode = Boolean(saleId);
    const canEditExisting = !isEditMode || ['PENDING', 'IN_PROGRESS'].includes(salesStageStatus);

    useEffect(() => {
        if (!existingSale || !isEditMode) return;
        setForm(saleToForm(existingSale));
    }, [existingSale, isEditMode]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setValidationError('');
        setForm((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const isValidCnic = (value) => /^\d{13}$/.test(value);
    const isValidPhone = (value) => /^\d{11}$/.test(value);

    const buildPayload = () => {
        const selectedClientCategoryValue = form.clientCategoryId || clientCategoryOptions[0]?.value;
        const resolvedClientCategoryId = Number(selectedClientCategoryValue);
        const productId = form.productId ? Number.parseInt(form.productId, 10) : undefined;
        const packageId = form.packageId ? Number.parseInt(form.packageId, 10) : undefined;

        return {
            clientCategoryId: resolvedClientCategoryId,
            irNo: form.irNo?.trim() || undefined,
            fullName: form.fullName?.trim() || undefined,
            cnicNo: form.cnicNo || undefined,
            phoneHome: form.phoneHome || undefined,
            emailId: form.emailId?.trim() || undefined,
            address: form.address?.trim() || undefined,
            clientStatus: form.clientStatus || undefined,
            cellNo: form.cellNo || undefined,
            fatherName: form.fatherName?.trim() || undefined,
            dateOfBirth: form.dateOfBirth || undefined,
            phoneOffice: form.phoneOffice || undefined,
            companyDepartment: form.companyDepartment?.trim() || undefined,
            addressLine2: form.addressLine2?.trim() || undefined,
            productId: Number.isFinite(productId) && productId > 0 ? productId : undefined,
            saleAmount: form.saleAmount ? Number.parseInt(form.saleAmount, 10) : undefined,
            saleType: form.saleType ? form.saleType.toUpperCase() : undefined,
            packageId: Number.isFinite(packageId) && packageId > 0 ? packageId : undefined,
            renewalCharges: form.renewalCharges ? Number.parseInt(form.renewalCharges, 10) : undefined,
            customTypeValue: form.customTypeValue ? Number.parseInt(form.customTypeValue, 10) : undefined,
            salesRemarks: form.salesRemarks?.trim() || undefined,
            submitToAccounts: form.submitToAccounts,
        };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (!isValidCnic(form.cnicNo)) {
                setValidationError('CNIC must be 13 digits (numbers only).');
                return;
            }

            if (form.cellNo && !isValidPhone(form.cellNo)) {
                setValidationError('Cell number must be 11 digits (numbers only).');
                return;
            }

            if (form.phoneHome && !isValidPhone(form.phoneHome)) {
                setValidationError('Home phone must be 11 digits (numbers only).');
                return;
            }

            if (form.phoneOffice && !isValidPhone(form.phoneOffice)) {
                setValidationError('Office phone must be 11 digits (numbers only).');
                return;
            }

            const selectedClientCategoryValue = form.clientCategoryId || clientCategoryOptions[0]?.value;
            const resolvedClientCategoryId = Number(selectedClientCategoryValue);

            if (!Number.isFinite(resolvedClientCategoryId) || resolvedClientCategoryId <= 0) {
                setValidationError('Please select a valid client category.');
                return;
            }

            if (!form.productId) {
                setValidationError('Please select a product.');
                return;
            }

            if (!form.saleType) {
                setValidationError('Please select a sale type.');
                return;
            }

            if (isEditMode && !canEditExisting) {
                setValidationError('Sales stage is closed. Reopen the sale from the workflow panel to edit.');
                return;
            }

            const payload = buildPayload();

            const sale = isEditMode
                ? await patchMutation.mutateAsync({ saleId, payload })
                : await create(payload);

            if (onSuccess && sale) onSuccess(sale);
        } catch (_err) {
            // Error handled by hook/mutation
        }
    };

    const handleCancel = () => {
        setValidationError('');
        if (isEditMode && existingSale) {
            setForm(saleToForm(existingSale));
            return;
        }
        setForm(initialForm);
    };

    const clientCategoryOptions = clientCategories && clientCategories.length > 0
        ? clientCategories.map(cat => ({
            value: String(cat.categoryId),
            label: cat.categoryName
        }))
        : [];

    const productOptions = products && products.length > 0
        ? products.map(prod => ({
            value: String(prod.id || prod._id || prod.value || prod.productId),
            label: prod.productName || prod.label || prod.name
        }))
        : [];

    const packageOptions = packages && packages.length > 0
        ? packages.map(pkg => ({
            value: String(pkg.id || pkg._id || pkg.value || pkg.packageId),
            label: pkg.packageName || pkg.label || pkg.name
        }))
        : [];

    const loading = createLoading || patchMutation.isPending;
    const patchError = patchMutation.error?.response?.data?.message
        || patchMutation.error?.message
        || (patchMutation.isError ? 'Failed to update sale' : null);
    const error = createError || patchError;

    if (isEditMode && saleLoading) {
        return <div className="text-sm text-gray-600">Loading sale...</div>;
    }

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex-1 flex flex-col gap-3 md:gap-4">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                        {isEditMode ? 'Edit Sale' : 'Add New Sale'}
                    </h2>
                    {isEditMode && !canEditExisting && (
                        <p className="text-xs text-amber-700">
                            Sales stage is {salesStageStatus?.toLowerCase()}. Reopen at Sales stage to edit.
                        </p>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    <div className="flex flex-col gap-3 md:gap-3">
                        <FieldWrapper label="Select Client Category" className="text-sm">
                            <Select
                                name="clientCategoryId"
                                value={form.clientCategoryId}
                                onChange={handleChange}
                                placeholder={loadingCategories ? "Loading client categories..." : "Choose client category"}
                                className="text-sm py-2"
                                disabled={!canEditExisting}
                                options={clientCategoryOptions}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="IR No." className="text-sm">
                            <Input
                                name="irNo"
                                value={form.irNo}
                                onChange={handleChange}
                                placeholder="Enter IR / reference number"
                                className="text-sm py-2"
                                disabled={!canEditExisting}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Full Name" className="text-sm">
                            <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter full name" className="text-sm py-2" disabled={!canEditExisting} />
                        </FieldWrapper>

                        <FieldWrapper label="CNIC No." className="text-sm">
                            <Input
                                name="cnicNo"
                                value={form.cnicNo}
                                onChange={e => {
                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val.length > 13) val = val.slice(0, 13);
                                    handleChange({ target: { name: 'cnicNo', value: val } });
                                }}
                                placeholder="Enter 13-digit CNIC (without dashes)"
                                className="text-sm py-2"
                                maxLength={13}
                                disabled={!canEditExisting}
                            />
                        </FieldWrapper>
                        
                        <FieldWrapper label="Phone Home" className="text-sm">
                            <Input
                                name="phoneHome"
                                value={form.phoneHome}
                                onChange={e => {
                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val.length > 11) val = val.slice(0, 11);
                                    handleChange({ target: { name: 'phoneHome', value: val } });
                                }}
                                placeholder="Enter home phone (11 digits)"
                                className="text-sm py-2"
                                maxLength={11}
                                disabled={!canEditExisting}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Email ID" className="text-sm">
                            <Input name="emailId" value={form.emailId} onChange={handleChange} placeholder="Enter email address" className="text-sm py-2" type="email" disabled={!canEditExisting} />
                        </FieldWrapper>

                        <FieldWrapper label="Address" className="text-sm">
                            <Input name="address" value={form.address} onChange={handleChange} placeholder="Enter address" className="text-sm py-2" disabled={!canEditExisting} />
                        </FieldWrapper>
                    </div>

                    <div className="flex flex-col gap-3 md:gap-3">
                        <FieldWrapper label="Select Client Status" className="text-sm">
                            <Select
                                name="clientStatus"
                                value={form.clientStatus}
                                onChange={handleChange}
                                placeholder="Choose client status"
                                className="text-sm py-2"
                                disabled={!canEditExisting}
                                options={CLIENT_STATUS_OPTIONS}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Cell No." className="text-sm">
                            <Input
                                name="cellNo"
                                value={form.cellNo}
                                onChange={e => {
                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val.length > 11) val = val.slice(0, 11);
                                    handleChange({ target: { name: 'cellNo', value: val } });
                                }}
                                placeholder="Enter mobile number (11 digits)"
                                className="text-sm py-2"
                                maxLength={11}
                                disabled={!canEditExisting}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Father Name" className="text-sm">
                            <Input name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Enter father name" className="text-sm py-2" disabled={!canEditExisting} />
                        </FieldWrapper>

                        <FieldWrapper label="Date of Birth" className="text-sm">
                            <DateInput name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} placeholder="Select date of birth" className="text-sm py-2" disabled={!canEditExisting} />
                        </FieldWrapper>

                        <FieldWrapper label="Phone Office" className="text-sm">
                            <Input
                                name="phoneOffice"
                                value={form.phoneOffice}
                                onChange={e => {
                                    let val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val.length > 11) val = val.slice(0, 11);
                                    handleChange({ target: { name: 'phoneOffice', value: val } });
                                }}
                                placeholder="Enter office phone (11 digits)"
                                className="text-sm py-2"
                                maxLength={11}
                                disabled={!canEditExisting}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Company/ Department" className="text-sm">
                            <Input name="companyDepartment" value={form.companyDepartment} onChange={handleChange} placeholder="Enter company or department" className="text-sm py-2" disabled={!canEditExisting} />
                        </FieldWrapper>
                        
                        <FieldWrapper label="Address Line 2" className="text-sm">
                            <Input name="addressLine2" value={form.addressLine2} onChange={handleChange} placeholder="Enter address line 2" className="text-sm py-2" disabled={!canEditExisting} />
                        </FieldWrapper>
                    </div>
                </div>

                <div className="mt-4 md:mt-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                        Select Product & Package
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Product" className="text-sm">
                                <Select
                                    name="productId"
                                    value={form.productId}
                                    onChange={handleChange}
                                    placeholder={loadingProducts ? "Loading products..." : "Choose product"}
                                    className="text-sm py-2"
                                    options={productOptions}
                                    disabled={loadingProducts || !canEditExisting}
                                />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Sale Amount" className="text-sm">
                                <Input
                                    name="saleAmount"
                                    value={form.saleAmount}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        handleChange({ target: { name: 'saleAmount', value: val } });
                                    }}
                                    placeholder="Enter sale amount (numbers only)"
                                    className="text-sm py-2"
                                    disabled={!canEditExisting}
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Sale Type" className="text-sm">
                                <Select
                                    name="saleType"
                                    value={form.saleType}
                                    onChange={handleChange}
                                    placeholder="Choose sale type"
                                    className="text-sm py-2"
                                    disabled={!canEditExisting}
                                    options={SALE_TYPE_OPTIONS}
                                />
                            </FieldWrapper>
                        </div>

                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Package Type" className="text-sm">
                                <Select
                                    name="packageId"
                                    value={form.packageId}
                                    onChange={handleChange}
                                    placeholder={loadingPackages ? "Loading packages..." : "Choose package type"}
                                    className="text-sm py-2"
                                    options={packageOptions}
                                    disabled={loadingPackages || !canEditExisting}
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Renewal Charges" className="text-sm">
                                <Input
                                    name="renewalCharges"
                                    value={form.renewalCharges}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        handleChange({ target: { name: 'renewalCharges', value: val } });
                                    }}
                                    placeholder="Enter renewal charges (numbers only)"
                                    className="text-sm py-2"
                                    disabled={!canEditExisting}
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Custom Type Value" className="text-sm">
                                <Input
                                    name="customTypeValue"
                                    value={form.customTypeValue}
                                    onChange={e => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        handleChange({ target: { name: 'customTypeValue', value: val } });
                                    }}
                                    placeholder="Optional custom type value"
                                    className="text-sm py-2"
                                    disabled={!canEditExisting}
                                />
                            </FieldWrapper>
                        </div>
                    </div>

                    <div className="mt-3 md:mt-4">
                        <FieldWrapper label="Sales Remarks" className="text-sm w-full">
                            <Textarea
                                name="salesRemarks"
                                value={form.salesRemarks}
                                onChange={handleChange}
                                placeholder="Enter any sales remarks (optional)"
                                className="w-full min-h-[80px] md:min-h-[100px] text-sm"
                                disabled={!canEditExisting}
                            />
                        </FieldWrapper>
                    </div>
                </div>

                {!isEditMode && (
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                            type="checkbox"
                            name="submitToAccounts"
                            checked={form.submitToAccounts}
                            onChange={handleChange}
                        />
                        Submit to accounts after save
                    </label>
                )}
               
                <div className="flex flex-col md:flex-row justify-between gap-3 mt-6 md:mt-8">
                    <button
                        type="button"
                        disabled
                        title="Credit check integration is not available yet"
                        className="
                            w-full md:w-auto
                            border border-gray-300
                            text-gray-400
                            px-4 py-2
                            rounded-lg
                            text-sm font-medium
                            cursor-not-allowed
                        "
                    >
                        Credit Check
                    </button>
                    
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="
                                w-full md:w-32
                                border border-customBlue
                                text-customBlue
                                px-4 py-2
                                rounded-lg
                                cursor-pointer
                                text-sm font-medium
                                transition
                                hover:bg-customBlue/10
                            "
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="
                                w-full md:w-32
                                bg-customBlue
                                text-gray-100
                                px-4 py-2
                                rounded-lg
                                cursor-pointer
                                text-sm font-medium
                                transition
                                hover:bg-customBlue/90
                                disabled:opacity-60
                            "
                            disabled={loading || (isEditMode && !canEditExisting)}
                        >
                            {loading ? 'Saving...' : isEditMode ? 'Update Sale' : 'Save & Submit'}
                        </button>
                    </div>
                </div>
            </div>
            {error && <div className="text-red-500 mt-2">{error}</div>}
            {validationError && <div className="text-red-500 mt-2">{validationError}</div>}
            {data && !isEditMode && <div className="text-green-600 mt-2">Sale created successfully!</div>}
        </form>
    )
}

export default AddNewSaleForm
