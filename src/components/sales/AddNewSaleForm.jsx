
import React, { useEffect, useState } from 'react';
import { FiChevronDown, FiCalendar } from "react-icons/fi";
import FieldWrapper from '../ui/FieldWrapper';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/TextArea';
import DateInput from '../ui/DateInput';
import { useCreateSale } from '../../hooks/sales/useUpdateSalesStage';
import { useClientCategories } from '../../hooks/client-category/useClientCategories';
import { useProducts } from '../../hooks/product/useProducts';
import { usePackages } from '../../hooks/package/usePackages';
import { Key } from 'lucide-react';

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

const AddNewSaleForm = ({ onSuccess }) => {
    const [form, setForm] = useState(initialForm);
    const [validationError, setValidationError] = useState('');
    const { create, loading, error, data } = useCreateSale();
    const { data: clientCategories, isLoading: loadingCategories } = useClientCategories();
    const { data: products, isLoading: loadingProducts } = useProducts();
    const { data: packages, isLoading: loadingPackages } = usePackages();

    // Debug: Log clientCategories data
    useEffect(() => {
        console.log('clientCategories from API:', clientCategories);
    }, [clientCategories]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setValidationError('');
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const isValidCnic = (value) => /^\d{13}$/.test(value);
    const isValidPhone = (value) => /^\d{11}$/.test(value);

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

            const payload = {
                clientCategoryId: resolvedClientCategoryId,
                irNo: form.irNo,
                fullName: form.fullName,
                cnicNo: form.cnicNo,
                phoneHome: form.phoneHome,
                emailId: form.emailId,
                address: form.address,
                clientStatus: form.clientStatus,
                cellNo: form.cellNo,
                fatherName: form.fatherName,
                dateOfBirth: form.dateOfBirth,
                phoneOffice: form.phoneOffice,
                companyDepartment: form.companyDepartment,
                addressLine2: form.addressLine2,
                productId: form.productId ? parseInt(form.productId) : 0,
                saleAmount: form.saleAmount ? parseInt(form.saleAmount) : 0,
                saleType: form.saleType.toUpperCase() || 'CREDIT',
                packageId: form.packageId ? parseInt(form.packageId) : 0,
                renewalCharges: form.renewalCharges ? parseInt(form.renewalCharges) : 0,
                customTypeValue: form.customTypeValue ? parseInt(form.customTypeValue) : 0,
                salesRemarks: form.salesRemarks,
                submitToAccounts: form.submitToAccounts,
            };
            const sale = await create(payload);
            if (onSuccess && sale) onSuccess(sale);
        } catch (err) {
            // Error handled by hook
        }
    };

    // Create option arrays
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

    return (
        <form onSubmit={handleSubmit}>
            <div className="flex-1 flex flex-col gap-3 md:gap-4">
                {/* Heading */}
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                    Add New Sale
                </h2>

                {/* Form Grid - 2 columns on medium and large screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {/* Column 1 - Client Information */}
                    <div className="flex flex-col gap-3 md:gap-3">
                        <FieldWrapper label="Select Client Category" className="text-sm">
                            <Select
                                name="clientCategoryId"
                                value={form.clientCategoryId}
                                onChange={handleChange}
                                placeholder={loadingCategories ? "Loading client categories..." : "Choose client category"}
                                className="text-sm py-2"
                                disabled={false}
                                options={clientCategoryOptions}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Select IR No." className="text-sm">
                            <Select
                                name="irNo"
                                value={form.irNo}
                                onChange={handleChange}
                                placeholder="Choose IR number"
                                className="text-sm py-2"
                                options={[
                                    { value: 'IR-1001', label: 'IR-1001' },
                                    { value: 'IR-1002', label: 'IR-1002' },
                                    { value: 'IR-1003', label: 'IR-1003' },
                                    { value: 'IR-1004', label: 'IR-1004' },
                                ]}
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Full Name" className="text-sm">
                            <Input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Enter full name" className="text-sm py-2" />
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
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Email ID" className="text-sm">
                            <Input name="emailId" value={form.emailId} onChange={handleChange} placeholder="Enter email address" className="text-sm py-2" type="email" />
                        </FieldWrapper>

                        <FieldWrapper label="Address" className="text-sm">
                            <Input name="address" value={form.address} onChange={handleChange} placeholder="Enter address" className="text-sm py-2" />
                        </FieldWrapper>
                    </div>

                    {/* Column 2 - Client Details */}
                    <div className="flex flex-col gap-3 md:gap-3">
                        <FieldWrapper label="Select Client Status" className="text-sm">
                            <Select
                                name="clientStatus"
                                value={form.clientStatus}
                                onChange={handleChange}
                                placeholder="Choose client status"
                                className="text-sm py-2"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'inactive', label: 'Inactive' },
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'blocked', label: 'Blocked' },
                                ]}
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
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Father Name" className="text-sm">
                            <Input name="fatherName" value={form.fatherName} onChange={handleChange} placeholder="Enter father name" className="text-sm py-2" />
                        </FieldWrapper>

                        <FieldWrapper label="Date of Birth" className="text-sm">
                            <DateInput name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} placeholder="Select date of birth" className="text-sm py-2" />
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
                            />
                        </FieldWrapper>

                        <FieldWrapper label="Company/ Department" className="text-sm">
                            <Input name="companyDepartment" value={form.companyDepartment} onChange={handleChange} placeholder="Enter company or department" className="text-sm py-2" />
                        </FieldWrapper>
                        
                        <FieldWrapper label="Address Line 2" className="text-sm">
                            <Input name="addressLine2" value={form.addressLine2} onChange={handleChange} placeholder="Enter address line 2" className="text-sm py-2" />
                        </FieldWrapper>
                    </div>
                </div>

                {/* Product & Package Section */}
                <div className="mt-4 md:mt-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                        Select Product & Package
                    </h2>

                    {/* Product Grid - 2 columns on medium and large screens */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Product" className="text-sm">
                                <Select
                                    name="productId"
                                    value={form.productId}
                                    onChange={handleChange}
                                    placeholder={loadingProducts ? "Loading products..." : "Choose product"}
                                    className="text-sm py-2"
                                    options={productOptions}
                                    disabled={loadingProducts}
                                />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Sale Amount" className="text-sm">
                                <Input
                                    name="saleAmount"
                                    value={form.saleAmount}
                                    onChange={e => {
                                        // Only allow numbers
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        handleChange({ target: { name: 'saleAmount', value: val } });
                                    }}
                                    placeholder="Enter sale amount (numbers only)"
                                    className="text-sm py-2"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Sale Type" className="text-sm">
                                <Select
                                    name="saleType"
                                    value={form.saleType}
                                    onChange={handleChange}
                                    placeholder="Choose sale type"
                                    className="text-sm py-2"
                                    options={[
                                        { value: 'credit', label: 'Credit' },
                                        { value: 'cash', label: 'Cash' },
                                        { value: 'cheque', label: 'Cheque' },
                                        { value: 'transfer', label: 'Transfer' },
                                    ]}
                                />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Package Type" className="text-sm">
                                <Select
                                    name="packageId"
                                    value={form.packageId}
                                    onChange={handleChange}
                                    placeholder={loadingPackages ? "Loading packages..." : "Choose package type"}
                                    className="text-sm py-2"
                                    options={packageOptions}
                                    disabled={loadingPackages}
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Renewal Charges" className="text-sm">
                                <Input
                                    name="renewalCharges"
                                    value={form.renewalCharges}
                                    onChange={e => {
                                        // Only allow numbers
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        handleChange({ target: { name: 'renewalCharges', value: val } });
                                    }}
                                    placeholder="Enter renewal charges (numbers only)"
                                    className="text-sm py-2"
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Sales Remarks" className="text-sm">
                                <Textarea 
                                    name="salesRemarks"
                                    value={form.salesRemarks}
                                    onChange={handleChange}
                                    placeholder="Enter any sales remarks (optional)" 
                                    className="min-h-[60px] md:min-h-[80px] text-sm"
                                />
                            </FieldWrapper>
                        </div>
                    </div>
                </div>

               
                {/* Buttons Section */}
                <div className="flex flex-col md:flex-row justify-between gap-3 mt-6 md:mt-8">
                    {/* Credit Check Button */}
                    <button
                        className="
                            w-full md:w-auto
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
                        Credit Check
                    </button>
                    
                    {/* Cancel & Save Buttons */}
                    <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                        <button
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
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save & Submit'}
                        </button>
                    </div>
                </div>
            </div>
            {error && <div className="text-red-500 mt-2">{error}</div>}
            {validationError && <div className="text-red-500 mt-2">{validationError}</div>}
            {data && <div className="text-green-600 mt-2">Sale stage updated successfully!</div>}
        </form>
    )
}

export default AddNewSaleForm