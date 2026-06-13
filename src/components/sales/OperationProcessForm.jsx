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
import { useZoneTechnicians } from '@/hooks/org/useZoneTechnicians';
import { useUpdateOperationsStage } from '@/hooks/sales/useUpdateOperationsStage';
import { useSaleById } from '@/hooks/sales/useSaleById';
import { useClientCategories } from '@/hooks/client-category/useClientCategories';
import { useDropdownStores } from '@/hooks/inventory/utility/useDropdownStores';

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
    storeId: '',
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
    const { data: sale, refetch: refetchSale } = useSaleById(saleId);
    const { data: clientCategories = [] } = useClientCategories();
    const { data: storesRaw = [] } = useDropdownStores();
    const { update, loading, error } = useUpdateOperationsStage();
    const { data: products = [] } = useProducts();
    const { data: packages = [] } = usePackages();
    const { data: zones = [] } = useZones();
    const { data: combos = [] } = useDeviceCombos();
    const { data: sims = [] } = useSims();
    const { data: accessories = [] } = useAccessories();
    const { data: devices = [] } = useDevices();
    const { data: zoneTechniciansData } = useZoneTechnicians(form.zoneId);

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
            deviceImei: stage.deviceImei
                ? String(stage.deviceImei)
                : stage.device?.imei
                    ? String(stage.device.imei)
                    : undefined,
            storeId: stage.issuance?.storeId
                ? String(stage.issuance.storeId)
                : sale?.inventoryIssuance?.storeId
                    ? String(sale.inventoryIssuance.storeId)
                    : '',
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
        if (name === 'deviceId') {
            setForm((prev) => ({ ...prev, deviceId: value }));
            return;
        }
        if (name === 'zoneId') {
            setForm((prev) => ({
                ...prev,
                zoneId: value,
                assignedTechnicianUserId: '',
            }));
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
                'deviceImei',
                'storeId',
            ];
            const missing = requiredFields.filter((field) => !form[field]);
            if (missing.length) {
                setValidationMessage('Please fill all required operations fields before sending to technician.');
                return;
            }
            if (!isValidImei(form.deviceImei)) {
                setValidationMessage('Device IMEI must be exactly 15 digits.');
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
            deviceImei: form.deviceImei || undefined,
            storeId: Number(form.storeId) || undefined,
            submitToTechnician,
        };
        try {
            const result = await update(saleId, payload);
            await refetchSale();
            setSuccessMessage(
                submitToTechnician
                    ? `Saved and sent to technician. Inventory issued${result?.operationsAssignment?.issuance?.issuanceNo ? `: ${result.operationsAssignment.issuance.issuanceNo}` : ''}.`
                    : 'Saved as hold.',
            );
            if (submitToTechnician) {
                onSuccess?.(result);
            }
        } catch {
            setSuccessMessage('');
        }
    };

    const productOptions = useMemo(() => mapOptions(products, ['id', 'productId'], ['productName', 'name']), [products]);
    const packageOptions = useMemo(() => mapOptions(packages, ['id', 'packageId'], ['packageName', 'name']), [packages]);
    const zoneOptions = useMemo(() => mapOptions(zones, ['id', 'zoneId'], ['zoneName', 'name']), [zones]);
    const comboOptions = useMemo(() => mapOptions(combos, ['id', 'deviceComboId'], ['comboName', 'name']), [combos]);
    const simOptions = useMemo(() => mapOptions(sims, ['id', 'simId'], ['simName', 'name']), [sims]);
    const accessoryOptions = useMemo(() => mapOptions(accessories, ['id', 'accessoryId'], ['accessoryName', 'name']), [accessories]);
    const deviceOptions = useMemo(
        () => (devices || []).map((item) => ({
            value: String(item.deviceId ?? item.id ?? ''),
            label: item.deviceName || item.name || `ID: ${item.deviceId}`,
        })).filter((opt) => opt.value),
        [devices],
    );
    const selectedZone = useMemo(
        () => (zones || []).find((z) => String(z.zoneId ?? z.id) === String(form.zoneId)),
        [zones, form.zoneId],
    );
    const storeOptions = useMemo(() => {
        const raw = storesRaw?.data ?? storesRaw?.stores ?? storesRaw;
        const list = Array.isArray(raw) ? raw : [];
        const officeId = selectedZone?.officeId;
        const filtered = officeId
            ? list.filter((store) => !store.officeId || Number(store.officeId) === Number(officeId))
            : list;
        return mapOptions(filtered, ['storeId', 'id'], ['storeName', 'name']);
    }, [storesRaw, selectedZone?.officeId]);
    const technicianOptions = useMemo(
        () => mapOptions(zoneTechniciansData?.technicians ?? [], ['userId'], ['emailId', 'cnic']),
        [zoneTechniciansData],
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
                                <Select
                                    name="assignedTechnicianUserId"
                                    value={form.assignedTechnicianUserId}
                                    onChange={handleChange}
                                    placeholder={form.zoneId ? 'Select zone technician' : 'Select zone first'}
                                    className="text-sm py-2"
                                    options={technicianOptions}
                                    disabled={!form.zoneId}
                                />
                            </FieldWrapper>

                            <FieldWrapper label="Issue From Store" required className="text-sm">
                                <Select name="storeId" value={form.storeId} onChange={handleChange} placeholder="Select store" className="text-sm py-2" options={storeOptions} />
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
                {(sale?.operationsAssignment?.issuance || sale?.inventoryIssuance) && (
                    <div className="text-sm text-gray-700 border border-gray-200 rounded-lg p-3">
                        Inventory linked:{' '}
                        <span className="font-medium">
                            {(sale.operationsAssignment?.issuance ?? sale.inventoryIssuance)?.issuanceNo}
                        </span>
                        {((sale.operationsAssignment?.issuance ?? sale.inventoryIssuance)?.store?.storeName) && (
                            <span> from {(sale.operationsAssignment?.issuance ?? sale.inventoryIssuance).store.storeName}</span>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}

export default OperationProcessForm;