import React, { useEffect, useMemo, useState } from 'react';
import FieldWrapper from '../ui/FieldWrapper';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useProducts } from '@/hooks/product/useProducts';
import { usePackages } from '@/hooks/package/usePackages';
import { useZones } from '@/hooks/zone/useZones';
import { useDeviceCombos } from '@/hooks/device-combo/useDeviceCombos';
import { useSims } from '@/hooks/sims/useSims';
import { useAccessories } from '@/hooks/accessories/useAccessories';
import { useDevices } from '@/hooks/devices/useDevices';
import { useEmployees } from '@/hooks/employee/useEmployees';
import { useUpdateOperationsStage } from '@/hooks/sales/useUpdateOperationsStage';
import { useSaleById } from '@/hooks/sales/useSaleById';
import { useClientCategories } from '@/hooks/client-category/useClientCategories';

const initialForm = {
    productId: '',
    zoneId: '',
    deviceComboId: '',
    simId: '',
    accessory1Id: '',
    accessory2Id: '',
    accessory3Id: '',
    packageId: '',
    assignedTechnicianUserId: '',
    deviceId: '',
    deviceImei: '',
};

const mapOptions = (items, idKeys, labelKeys) =>
    (items || []).map((item) => {
        const value = idKeys.map((k) => item?.[k]).find((v) => v !== undefined && v !== null);
        const label = labelKeys.map((k) => item?.[k]).find((v) => typeof v === 'string' && v.trim() !== '');
        return { value: String(value ?? ''), label: label || `ID: ${value}` };
    }).filter((opt) => opt.value);

const OperationProcessForm = ({ saleId, onSuccess}) => {
    const [form, setForm] = useState(initialForm);
    const [successMessage, setSuccessMessage] = useState('');
    const [validationMessage, setValidationMessage] = useState('');
    const { data: sale } = useSaleById(saleId);
    const { data: clientCategories = [] } = useClientCategories();
    const { update, loading, error } = useUpdateOperationsStage();
    const { data: products = [] } = useProducts();
    const { data: packages = [] } = usePackages();
    const { data: zones = [] } = useZones();
    const { data: combos = [] } = useDeviceCombos();
    const { data: sims = [] } = useSims();
    const { data: accessories = [] } = useAccessories();
    const { data: devices = [] } = useDevices();
    const { data: employees = [] } = useEmployees();

    // Helper to map clientCategoryId to name
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
        const clientCategoryName =
            client?.clientCategory?.categoryName ||
            sale?.clientCategory?.categoryName ||
            getMappedLabel(clientCategories, client?.clientCategoryId, ['id', 'clientCategoryId', 'categoryId', '_id'], ['categoryName', 'name', 'label']);
        return {
            clientCategory: clientCategoryName || '',
            irNo: client?.irNo || sale?.irNo || '',
            fullName: client?.fullName || sale?.fullName || '',
            clientStatus: client?.clientStatus || sale?.clientStatus || '',
            cellNo: client?.cellNo || sale?.cellNo || '',
            fatherName: client?.fatherName || sale?.fatherName || '',
            saleType: product?.saleType || sale?.saleType || '',
            salesRemarks: product?.salesRemarks || sale?.salesRemarks || '',
            defaultProductId: product?.productId || sale?.productId || '',
            defaultPackageId: product?.packageId || sale?.packageId || '',
        };
    }, [sale, clientCategories]);

    useEffect(() => {
        const stage = sale?.operationsAssignment || sale?.operationsStage || sale?.operationStage || {};
        const newForm = {
            productId: stage.productId ? String(stage.productId) : (normalizedSale.defaultProductId ? String(normalizedSale.defaultProductId) : ''),
            zoneId: stage.zoneId ? String(stage.zoneId) : '',
            deviceComboId: stage.deviceComboId ? String(stage.deviceComboId) : '',
            simId: stage.simId ? String(stage.simId) : '',
            accessory1Id: stage.accessory1Id ? String(stage.accessory1Id) : '',
            accessory2Id: stage.accessory2Id ? String(stage.accessory2Id) : '',
            accessory3Id: stage.accessory3Id ? String(stage.accessory3Id) : '',
            packageId: stage.packageId ? String(stage.packageId) : (normalizedSale.defaultPackageId ? String(normalizedSale.defaultPackageId) : ''),
            assignedTechnicianUserId: stage.assignedTechnicianUserId ? String(stage.assignedTechnicianUserId) : '',
            deviceId: stage.deviceId ? String(stage.deviceId) : '',
            deviceImei: stage.deviceImei ? String(stage.deviceImei) : undefined,
        };
        // Only update if values actually changed
        setForm(prev => {
            const nextForm = {
                ...newForm,
                deviceImei: newForm.deviceImei !== undefined ? newForm.deviceImei : (prev.deviceImei || ''),
            };
            const isSame = Object.keys(nextForm).every(key => prev[key] === nextForm[key]);
            if (isSame) return prev;
            return nextForm;
        });
    }, [sale, normalizedSale.defaultProductId, normalizedSale.defaultPackageId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSuccessMessage('');
        setValidationMessage('');
        if (name === 'deviceImei') {
            const digitsOnly = value.replace(/\D/g, '').slice(0, 15);
            setForm((prev) => ({ ...prev, [name]: digitsOnly }));
            return;
        }
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const isValidImei = (value) => /^\d{15}$/.test(value);

    const submit = async (submitToTechnician) => {
        if (!saleId) return;
        if (form.deviceImei && !isValidImei(form.deviceImei)) {
            setValidationMessage('Device IMEI must be exactly 15 digits.');
            return;
        }
        if (submitToTechnician) {
            const requiredFields = [
                'productId',
                'zoneId',
                'deviceComboId',
                'simId',
                'accessory1Id',
                'accessory2Id',
                'accessory3Id',
                'packageId',
                'assignedTechnicianUserId',
                'deviceId',
            ];
            const missing = requiredFields.filter((field) => !form[field]);
            if (missing.length) {
                setValidationMessage('Please fill all required operations fields before sending to technician.');
                return;
            }
        }
        const payload = {
            productId: Number(form.productId) || undefined,
            zoneId: Number(form.zoneId) || undefined,
            deviceComboId: Number(form.deviceComboId) || undefined,
            simId: Number(form.simId) || undefined,
            accessory1Id: Number(form.accessory1Id) || undefined,
            accessory2Id: Number(form.accessory2Id) || undefined,
            accessory3Id: Number(form.accessory3Id) || undefined,
            packageId: Number(form.packageId) || undefined,
            assignedTechnicianUserId: Number(form.assignedTechnicianUserId) || undefined,
            deviceId: Number(form.deviceId) || undefined,
            submitToTechnician,
        };
        await update(saleId, payload);
        setSuccessMessage(submitToTechnician ? 'Saved and sent to technician stage.' : 'Saved as hold.');
        onSuccess(sale);
    };

    const productOptions = useMemo(() => mapOptions(products, ['id', 'productId'], ['productName', 'name']), [products]);
    const packageOptions = useMemo(() => mapOptions(packages, ['id', 'packageId'], ['packageName', 'name']), [packages]);
    const zoneOptions = useMemo(() => mapOptions(zones, ['id', 'zoneId'], ['zoneName', 'name']), [zones]);
    const comboOptions = useMemo(() => mapOptions(combos, ['id', 'deviceComboId'], ['comboName', 'name']), [combos]);
    const simOptions = useMemo(() => mapOptions(sims, ['id', 'simId'], ['simName', 'name']), [sims]);
    const accessoryOptions = useMemo(() => mapOptions(accessories, ['id', 'accessoryId'], ['accessoryName', 'name']), [accessories]);
    const deviceOptions = useMemo(() => mapOptions(devices, ['id', 'deviceId'], ['deviceName', 'name']), [devices]);
    const technicianOptions = useMemo(
        () => mapOptions(employees, ['userId', 'id'], ['emailId', 'name', 'cnic']),
        [employees],
    );

    return (
        <>
            <div className="flex-1 flex flex-col gap-3 md:gap-4">
                {!saleId && <div className="text-sm text-yellow-700">Create a sale first, then continue operations process.</div>}
                {/* Client Details Section */}
                <div>
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                        Client Details
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Client Category" required className="text-sm">
                                <Input value={normalizedSale.clientCategory || ''} placeholder="Client category" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Select IR No." className="text-sm">
                                <Input value={normalizedSale.irNo || ''} placeholder="IR No." className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Full Name" className="text-sm">
                                <Input value={normalizedSale.fullName || ''} placeholder="Full name" className="text-sm py-2" disabled />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Client Status" required className="text-sm">
                                <Input value={normalizedSale.clientStatus || ''} placeholder="Client status" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Cell No." className="text-sm">
                                <Input value={normalizedSale.cellNo || ''} placeholder="Cell no." className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Father Name" className="text-sm">
                                <Input value={normalizedSale.fatherName || ''} placeholder="Father name" className="text-sm py-2" disabled />
                            </FieldWrapper>
                        </div>
                    </div>
                </div>

                {/* Product & Package Details Section */}
                <div className="mt-4 md:mt-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                        Product & Package Details
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Product" required className="text-sm">
                                <Select name="productId" value={form.productId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={productOptions} disabled={true}/>
                            </FieldWrapper>
                            
                            <FieldWrapper label="Sale Type" required className="text-sm">
                                <Input value={normalizedSale.saleType || ''} placeholder="Sale type" className="text-sm py-2" disabled />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Package Type" required className="text-sm">
                                <Select name="packageId" value={form.packageId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={packageOptions} disabled={true}/>
                            </FieldWrapper>

                            <FieldWrapper label="Sales Remarks" className="text-sm">
                                <Input value={normalizedSale.salesRemarks || ''} className="text-sm py-2" disabled />
                            </FieldWrapper>
                        </div>
                    </div>
                </div>

                {/* Add Device & Accessories Section */}
                <div className="mt-4 md:mt-6">
                    <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                        Add Device & Accessories
                    </h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Product" required className="text-sm">
                                <Select name="productId" value={form.productId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={productOptions} disabled={true}/>
                            </FieldWrapper>
                            
                            <FieldWrapper label="Select Zone" required className="text-sm">
                                <Select name="zoneId" value={form.zoneId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={zoneOptions} />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Select Device Combo" required className="text-sm">
                                <Select name="deviceComboId" value={form.deviceComboId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={comboOptions} />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Select SIM" required className="text-sm">
                                <Select name="simId" value={form.simId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={simOptions} />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Select Accessories 2" required className="text-sm">
                                <Select name="accessory2Id" value={form.accessory2Id} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={accessoryOptions} />
                            </FieldWrapper>

                            <FieldWrapper label="Select Accessories 3" required className="text-sm">
                                <Select name="accessory3Id" value={form.accessory3Id} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={accessoryOptions} />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Package Type" required className="text-sm">
                                <Select name="packageId" value={form.packageId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={packageOptions} />
                            </FieldWrapper>
                            
                            <FieldWrapper label="Assign Technician" required className="text-sm">
                                <Select name="assignedTechnicianUserId" value={form.assignedTechnicianUserId} onChange={handleChange} placeholder="Select" className="text-sm py-2" 
                                // options={technicianOptions}
                                options={
                                    [
                                        { value: 4, label: 'Technician 1' },
                                        { value: 4, label: 'Technician 2' },
                                        { value: 4, label: 'Technician 3' },
                                        { value: 4, label: 'Technician 4' },
                                    ]
                                }
                                 />
                            </FieldWrapper>

                            <FieldWrapper label="Select Device" required className="text-sm">
                                <Select name="deviceId" value={form.deviceId} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={deviceOptions} />
                            </FieldWrapper>

                            <FieldWrapper label="Device IMEI" required className="text-sm">
                                <Input
                                    name="deviceImei"
                                    value={form.deviceImei}
                                    onChange={handleChange}
                                    placeholder="Enter 15-digit IMEI"
                                    className="text-sm py-2"
                                    maxLength={15}
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Select Accessories 1" required className="text-sm">
                                <Select name="accessory1Id" value={form.accessory1Id} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={accessoryOptions} />
                            </FieldWrapper>
                        </div>
                    </div>
                </div>

                {/* Buttons Section */}
                <div className="flex flex-col md:flex-row justify-end gap-3 mt-6 md:mt-8">
                    <button
                        type="button"
                        disabled={!saleId || loading}
                        onClick={() => submit(false)}
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
                        "
                    >
                        Hold
                    </button>

                    <button
                        type="button"
                        disabled={!saleId || loading}
                        onClick={() => submit(true)}
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
                        Save
                    </button>
                </div>
                {validationMessage && <div className="text-sm text-amber-700">{validationMessage}</div>}
                {error && <div className="text-sm text-red-600">{error}</div>}
                {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
            </div>
        </>
    )
}

export default OperationProcessForm;