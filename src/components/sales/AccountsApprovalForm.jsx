import React, { useMemo, useState } from 'react'
import FieldWrapper from '../ui/FieldWrapper';
import Input from '../ui/Input';
import Textarea from '../ui/TextArea';
import DateInput from '../ui/DateInput';
import { useSaleById } from '../../hooks/sales/useSaleById';
import { useClientCategories } from '../../hooks/client-category/useClientCategories';
import { useProducts } from '../../hooks/product/useProducts';
import { usePackages } from '../../hooks/package/usePackages';
import { useUpdateAccountsStage } from '../../hooks/sales/useUpdateAccountsStage';

const AccountsApprovalForm = ({ saleId , onSuccess}) => {
    const { data: sale, loading: saleLoading } = useSaleById(saleId);
    const { data: clientCategories = [] } = useClientCategories();
    const { data: products = [] } = useProducts();
    const { data: packages = [] } = usePackages();
    const { update, loading: submitLoading, error: submitError } = useUpdateAccountsStage();

    // Use sale as the single source of truth for autofill
    const [form, setForm] = useState({});

    // No useEffect needed; form state is only for user edits, sale is always the default

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const getMappedLabel = (items, id, idKeys, labelKeys) => {
        if (id === undefined || id === null || id === '') return '';
        const item = (items || []).find((entry) =>
            idKeys.some((key) => String(entry?.[key]) === String(id))
        );
        if (!item) return String(id);
        const label = labelKeys.map((key) => item?.[key]).find((val) => typeof val === 'string' && val.trim() !== '');
        return label || String(id);
    };

    const normalizedSale = useMemo(() => {
        const client = sale?.clientDetails || {};
        const product = sale?.productDetails || {};
        const accounts = sale?.accountsReview || {};

        const resolvedClientCategory = client?.clientCategory?.categoryName
            || sale?.clientCategory?.categoryName
            || getMappedLabel(clientCategories, client?.clientCategoryId, ['id', 'clientCategoryId', 'categoryId', '_id'], ['categoryName', 'name', 'label']);

        const resolvedProductName = product?.product?.productName
            || sale?.product?.productName
            || getMappedLabel(products, product?.productId, ['id', 'productId', '_id'], ['productName', 'name', 'label']);

        const resolvedPackageName = product?.package?.packageName
            || sale?.package?.packageName
            || getMappedLabel(packages, product?.packageId, ['id', 'packageId', '_id'], ['packageName', 'name', 'label']);

        return {
            clientCategory: resolvedClientCategory || '',
            irNo: client?.irNo || sale?.irNo || '',
            fullName: client?.fullName || sale?.fullName || '',
            cnic: client?.cnicNo || sale?.cnicNo || '',
            phoneHome: client?.phoneHome || sale?.phoneHome || '',
            email: client?.emailId || sale?.emailId || '',
            address: client?.address || sale?.address || '',
            clientStatus: client?.clientStatus || sale?.clientStatus || '',
            cellNo: client?.cellNo || sale?.cellNo || '',
            fatherName: client?.fatherName || sale?.fatherName || '',
            dob: (client?.dateOfBirth || sale?.dateOfBirth || '').slice(0, 10),
            phoneOffice: client?.phoneOffice || sale?.phoneOffice || '',
            company: client?.companyDepartment || sale?.companyDepartment || '',
            address2: client?.addressLine2 || sale?.addressLine2 || '',
            product: resolvedProductName || '',
            saleAmount: product?.saleAmount || sale?.saleAmount || '',
            saleType: product?.saleType || sale?.saleType || '',
            accountRemarks: accounts?.accountsRemark || '',
            packageType: resolvedPackageName || '',
            renewalCharges: product?.renewalCharges || sale?.renewalCharges || '',
            salesRemarks: product?.salesRemarks || sale?.salesRemarks || '',
        };
    }, [sale, clientCategories, products, packages]);

    const getValue = (field) =>
        form[field] !== undefined ? form[field] : (normalizedSale[field] ?? '');

    const handleDecision = async (decision) => {
        if (!saleId) return;
        await update(saleId, {
            accountsRemark: getValue('accountRemarks') || '',
            decision,
        });
        onSuccess?.();
    };

    const handleApproveSubmit = async () => {
        await handleDecision('APPROVED');
    };

    const handleHoldSubmit = async () => {
        await handleDecision('HOLD');
    };

    const handleRejectSubmit = async () => {
        const confirmed = window.confirm('Reject this sale? It will be voided.');
        if (!confirmed) return;
        await handleDecision('REJECTED');
    };

    if (saleLoading) return <div>Loading...</div>;

    return (
        <>
            <div className="flex-1 flex flex-col gap-3 md:gap-4">
                {/* Heading */}
                <h2 className="text-lg md:text-xl font-semibold text-gray-800">
                    Accounts Approval
                </h2>

                {/* Form Grid - 2 columns on medium and large screens */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                    {/* Column 1 - Client Information */}
                    <div className="flex flex-col gap-3 md:gap-3">
                        <FieldWrapper label="Select Client Category" required className="text-sm">
                                <Input name="clientCategory" value={getValue('clientCategory')} onChange={handleChange} placeholder="Select" className="text-sm py-2"disabled={true} />
                        </FieldWrapper>

                        <FieldWrapper label="Select IR No." className="text-sm">
                                <Input name="irNo" value={getValue('irNo')} onChange={handleChange} placeholder="Select" className="text-sm py-2"disabled={true} />
                        </FieldWrapper>

                        <FieldWrapper label="Full Name" className="text-sm">
                            <Input name="fullName" value={getValue('fullName')} onChange={handleChange} placeholder="Full Name" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="CNIC No." className="text-sm">
                            <Input name="cnic" value={getValue('cnic')} onChange={handleChange} placeholder="CNIC No." className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>
                        
                        <FieldWrapper label="Phone Home" className="text-sm">
                            <Input name="phoneHome" value={getValue('phoneHome')} onChange={handleChange} placeholder="Phone Home" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="Email ID" className="text-sm">
                            <Input name="email" value={getValue('email')} onChange={handleChange} placeholder="Email ID" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="Address" className="text-sm">
                            <Input name="address" value={getValue('address')} onChange={handleChange} placeholder="Address" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>
                    </div>

                    {/* Column 2 - Client Details */}
                    <div className="flex flex-col gap-3 md:gap-3">
                        <FieldWrapper label="Select Client Status" required className="text-sm">
                            <Input name="clientStatus" value={getValue('clientStatus')} onChange={handleChange} placeholder="Select" className="text-sm py-2"disabled={true} />
                        </FieldWrapper>

                        <FieldWrapper label="Cell No." className="text-sm">
                            <Input name="cellNo" value={getValue('cellNo')} onChange={handleChange} placeholder="Cell No." className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="Father Name" className="text-sm">
                            <Input name="fatherName" value={getValue('fatherName')} onChange={handleChange} placeholder="Father Name" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="Date of Birth" className="text-sm">
                            <DateInput name="dob" value={getValue('dob')} onChange={handleChange} placeholder="Date of Birth" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="Phone Office" className="text-sm">
                            <Input name="phoneOffice" value={getValue('phoneOffice')} onChange={handleChange} placeholder="Phone Office" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>

                        <FieldWrapper label="Company/ Department" className="text-sm">
                            <Input name="company" value={getValue('company')} onChange={handleChange} placeholder="Company/Department" className="text-sm py-2"disabled={true}
                             />
                        </FieldWrapper>
                        
                        <FieldWrapper label="Address Line 2" className="text-sm">
                            <Input name="address2" value={getValue('address2')} onChange={handleChange} placeholder="Address Line 2" className="text-sm py-2"disabled={true}
                             />
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
                            <FieldWrapper label="Select Product" required className="text-sm">
                                <Input name="product" value={getValue('product')} onChange={handleChange} placeholder="Select" className="text-sm py-2"disabled={true} />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Sale Amount" required className="text-sm">
                                <Input name="saleAmount" value={getValue('saleAmount')} onChange={handleChange} placeholder="Sale Amount" className="text-sm py-2"disabled={true}
                                 />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Sale Type" required className="text-sm">
                                <Input name="saleType" value={getValue('saleType')} onChange={handleChange} placeholder="Sale Type" className="text-sm py-2"disabled={true}
                                 />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Account Remarks" className="text-sm">
                                <Textarea 
                                    name="accountRemarks"
                                    value={getValue('accountRemarks')}
                                    onChange={handleChange}
                                    placeholder="Account Remarks"
                                    className="min-h-[60px] md:min-h-[80px] text-sm"
                                    disabled={false}
                                />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Package Type" required className="text-sm">
                                <Input name="packageType" value={getValue('packageType')} onChange={handleChange} placeholder="Select" className="text-sm py-2"disabled={true} />
                            </FieldWrapper>

                            <FieldWrapper label="Renewal Charges" required className="text-sm">
                                <Input name="renewalCharges" value={getValue('renewalCharges')} onChange={handleChange} placeholder="Renewal Charges" className="text-sm py-2"disabled={true}
                                 />
                            </FieldWrapper>

                            <FieldWrapper label="Sales Remarks" className="text-sm">
                                <Textarea 
                                    name="salesRemarks"
                                    value={getValue('salesRemarks')}
                                    onChange={handleChange}
                                    placeholder="Sales Remarks"
                                    className="min-h-[60px] md:min-h-[80px] text-sm"
                                    disabled={true}
                                />
                            </FieldWrapper>
                        </div>
                    </div>
                </div>

                {/* Buttons Section */}
                <div className="flex flex-col md:flex-row justify-end gap-3 mt-6 md:mt-8">
                    <button
                        type="button"
                        onClick={handleHoldSubmit}
                        disabled={submitLoading || !saleId}
                        className="
                            w-full md:w-auto
                            bg-yellow-600
                            text-gray-100
                            px-4 py-2
                            rounded-lg
                            cursor-pointer
                            text-sm font-medium
                            transition
                            hover:bg-yellow-700
                            disabled:opacity-60
                        "
                    >
                        {submitLoading ? 'Saving...' : 'Hold'}
                    </button>
                    <button
                        type="button"
                        onClick={handleRejectSubmit}
                        disabled={submitLoading || !saleId}
                        className="
                            w-full md:w-auto
                            bg-red-600
                            text-gray-100
                            px-4 py-2
                            rounded-lg
                            cursor-pointer
                            text-sm font-medium
                            transition
                            hover:bg-red-700
                            disabled:opacity-60
                        "
                    >
                        {submitLoading ? 'Saving...' : 'Reject'}
                    </button>

                    <button
                        type="button"
                        onClick={handleApproveSubmit}
                        disabled={submitLoading || !saleId}
                        className="
                            w-full md:w-auto
                            bg-customBlue
                            text-gray-100
                            px-4 py-2
                            rounded-lg
                            cursor-pointer
                            text-sm font-medium
                            transition
                            hover:bg-customBlue/90
                        "
                    >
                        {submitLoading ? 'Submitting...' : 'Save & Submit'}
                    </button>
                </div>
                {submitError && <div className="text-sm text-red-600">{submitError}</div>}
            </div>
        </>
    )
}

export default AccountsApprovalForm;