"use client";
import { useRouter } from "next/navigation";
import { useZones } from "@/hooks/zone/useZones";
import { useDeviceCombos } from "@/hooks/device-combo/useDeviceCombos";
import { useSims } from "@/hooks/sims/useSims";
import { useAccessories } from "@/hooks/accessories/useAccessories";
import { useDevices } from "@/hooks/devices/useDevices";
import { useEmployees } from "@/hooks/employee/useEmployees";
import { useProducts } from "@/hooks/product/useProducts";
import { usePackages } from "@/hooks/package/usePackages";
import React, { useEffect, useMemo, useState } from "react";
import FieldWrapper from "../ui/FieldWrapper";
import Select from "../ui/Select";
import Input from "../ui/Input";
import Textarea from "../ui/TextArea";
import DateInput from "../ui/DateInput";
import ConfidentialForm from "./ConfidentialForm";
import { useUpdateTechnicianStage } from "@/hooks/sales/useUpdateTechnicianStage";
import { useSaleById } from "@/hooks/sales/useSaleById";
import { useClientCategories } from "@/hooks/client-category/useClientCategories";
import { formatDateInput, getStageStatusMap } from "@/lib/saleWorkflow";

const TABS = {
    CLIENT: "client",
    PRODUCT: "product",
    VEHICLE: "vehicle",
};

const mapOptions = (items, idKeys, labelKeys) =>
    (items || []).map((item) => {
        const value = idKeys.map((k) => item?.[k]).find((v) => v !== undefined && v !== null);
        const label = labelKeys.map((k) => item?.[k]).find((v) => typeof v === 'string' && v.trim() !== '');
        return { value: String(value ?? ''), label: label || `ID: ${value}` };
    }).filter((opt) => opt.value);

const InstallationForm = ({ saleId }) => {
    const router = useRouter();
    const { data: zones = [] } = useZones();
    const { data: combos = [] } = useDeviceCombos();
    const { data: sims = [] } = useSims();
    const { data: accessories = [] } = useAccessories();
    const { data: devices = [] } = useDevices();
    const { data: employees = [] } = useEmployees();
    // Map options for selects
    const zoneOptions = useMemo(() => mapOptions(zones, ["id", "zoneId"], ["zoneName", "name"]), [zones]);
    const comboOptions = useMemo(() => mapOptions(combos, ["id", "deviceComboId"], ["comboName", "name"]), [combos]);
    const simOptions = useMemo(() => mapOptions(sims, ["id", "simId"], ["simName", "name"]), [sims]);
    const accessoryOptions = useMemo(() => mapOptions(accessories, ["id", "accessoryId"], ["accessoryName", "name"]), [accessories]);
    const deviceOptions = useMemo(() => mapOptions(devices, ["id", "deviceId"], ["deviceName", "name"]), [devices]);
    const technicianOptions = useMemo(() => mapOptions(employees, ["userId", "id"], ["emailId", "name", "cnic"]), [employees]);
    const [activeTab, setActiveTab] = useState(TABS.CLIENT);
    const [confidentialForm, setConfidentialForm] = useState(false)
    const { update, loading, error } = useUpdateTechnicianStage();
    const { data: sale, refetch: refetchSale } = useSaleById(saleId);
    const { data: clientCategories = [] } = useClientCategories();
    const { data: products = [] } = useProducts();
    const { data: packages = [] } = usePackages();
    const [successMessage, setSuccessMessage] = useState("");
    const [validationMessage, setValidationMessage] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState("");
    const [form, setForm] = useState({
        installationDate: "",
        renewalDate: "",
        registrationNo: "",
        engineNo: "",
        transmissionType: "AUTO",
        chassisNo: "",
        makeModel: "",
        vehicleYear: "",
        color: "",
        zoneId: "",
        deviceComboId: "",
        simId: "",
        accessory1Id: "",
        accessory2Id: "",
        accessory3Id: "",
        packageId: "",
        assignedTechnicianUserId: "",
        deviceId: "",
        deviceImei: "",
    });

    // Create client category options
    const clientCategoryOptions = useMemo(
        () => mapOptions(clientCategories, ['id', 'clientCategoryId', '_id'], ['categoryName', 'name', 'label']),
        [clientCategories]
    );

    // Helper to map clientCategoryId to name (copied from OperationProcessForm)
    const getMappedLabel = (items, id, idKeys, labelKeys) => {
        if (id === undefined || id === null || id === "") return "";
        const item = (items || []).find((entry) =>
            idKeys.some((key) => String(entry?.[key]) === String(id))
        );
        if (!item) return String(id);
        const label = labelKeys.map((key) => item?.[key]).find((val) => typeof val === "string" && val.trim() !== "");
        return label || String(id);
    };

    const normalizedSale = useMemo(() => {
        const client = sale?.clientDetails || {};
        const product = sale?.productDetails || {};
        const clientCategoryName =
            client?.clientCategory?.categoryName ||
            sale?.clientCategory?.categoryName ||
            getMappedLabel(clientCategories, client?.clientCategoryId, ["id", "clientCategoryId", "categoryId", "_id"], ["categoryName", "name", "label"]);

        // Map productId/packageId to names
        const productName = products.find(p => String(p.productId) === String(product?.productId))?.productName || "";
        const packageName = packages.find(p => String(p.packageId) === String(product?.packageId))?.packageName || "";

        return {
            clientCategory: clientCategoryName || "",
            irNo: client?.irNo || sale?.irNo || "",
            fullName: client?.fullName || sale?.fullName || "",
            cnicNo: client?.cnicNo || sale?.cnicNo || "",
            phoneHome: client?.phoneHome || sale?.phoneHome || "",
            emailId: client?.emailId || sale?.emailId || "",
            address: client?.address || sale?.address || "",
            clientStatus: client?.clientStatus || sale?.clientStatus || "",
            cellNo: client?.cellNo || sale?.cellNo || "",
            fatherName: client?.fatherName || sale?.fatherName || "",
            dateOfBirth: (client?.dateOfBirth || sale?.dateOfBirth || "").slice(0, 10),
            phoneOffice: client?.phoneOffice || sale?.phoneOffice || "",
            companyDepartment: client?.companyDepartment || sale?.companyDepartment || "",
            addressLine2: client?.addressLine2 || sale?.addressLine2 || "",
            productName,
            packageName,
        };
    }, [sale, clientCategories, products, packages]);

    const technicianStageStatus = useMemo(() => {
        const map = getStageStatusMap(sale);
        return map.TECHNICIAN;
    }, [sale]);

    const canEditInstallation = ['PENDING', 'IN_PROGRESS'].includes(technicianStageStatus);

    useEffect(() => {
        const ops = sale?.operationsAssignment || sale?.operationsStage || sale?.operationStage || {};
        const inst = sale?.installation || sale?.technicianStage || sale?.technician || {};

        setForm((prev) => ({
            ...prev,
            installationDate: formatDateInput(inst.installationDate) || prev.installationDate,
            renewalDate: formatDateInput(inst.renewalDate) || prev.renewalDate,
            registrationNo: inst.registrationNo ?? prev.registrationNo,
            engineNo: inst.engineNo ?? prev.engineNo,
            transmissionType: inst.transmissionType || prev.transmissionType,
            chassisNo: inst.chassisNo ?? prev.chassisNo,
            makeModel: inst.makeModel ?? prev.makeModel,
            vehicleYear: inst.vehicleYear ? String(inst.vehicleYear) : prev.vehicleYear,
            color: inst.color ?? prev.color,
            zoneId: ops.zoneId ? String(ops.zoneId) : prev.zoneId || "",
            deviceComboId: ops.deviceComboId ? String(ops.deviceComboId) : prev.deviceComboId || "",
            simId: ops.simId ? String(ops.simId) : prev.simId || "",
            accessory1Id: ops.accessory1Id ? String(ops.accessory1Id) : prev.accessory1Id || "",
            accessory2Id: ops.accessory2Id ? String(ops.accessory2Id) : prev.accessory2Id || "",
            accessory3Id: ops.accessory3Id ? String(ops.accessory3Id) : prev.accessory3Id || "",
            packageId: ops.packageId ? String(ops.packageId) : prev.packageId || "",
            assignedTechnicianUserId: ops.assignedTechnicianUserId ? String(ops.assignedTechnicianUserId) : prev.assignedTechnicianUserId || "",
            deviceId: ops.deviceId ? String(ops.deviceId) : prev.deviceId || "",
            deviceImei: ops.deviceImei
                ? String(ops.deviceImei)
                : ops.device?.imei
                    ? String(ops.device.imei)
                    : prev.deviceImei || "",
        }));
        if (sale?.clientDetails?.clientCategoryId || sale?.clientCategoryId) {
            setSelectedCategoryId(String(sale?.clientDetails?.clientCategoryId || sale?.clientCategoryId || ''));
        }
    }, [sale]);

    const buildTechnicianPayload = (markComplete) => ({
        installationDate: form.installationDate || undefined,
        renewalDate: form.renewalDate || undefined,
        registrationNo: form.registrationNo || undefined,
        engineNo: form.engineNo || undefined,
        transmissionType: form.transmissionType || undefined,
        chassisNo: form.chassisNo || undefined,
        makeModel: form.makeModel || undefined,
        vehicleYear: Number(form.vehicleYear) || undefined,
        color: form.color || undefined,
        markComplete,
    });

    const handleSaveDraft = async () => {
        if (!saleId || !canEditInstallation) return;
        setValidationMessage("");
        await update(saleId, buildTechnicianPayload(false));
        await refetchSale();
        setSuccessMessage("Installation progress saved.");
    };

    const tabButtonClasses = (isActive) =>
        `
    px-3 py-2 md:px-4 md:py-2.5 rounded-lg text-sm md:text-sm font-medium transition-all duration-200
    whitespace-nowrap
    ${isActive
            ? "bg-customGreen text-gray-100 shadow-sm"
            : "border border-customGreen text-gray-900 hover:bg-customGreen/10 cursor-pointer"
        }
  `;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSuccessMessage("");
        setValidationMessage("");
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleNext = async () => {
        if (activeTab === TABS.CLIENT) {
            setActiveTab(TABS.PRODUCT);
        } else if (activeTab === TABS.PRODUCT) {
            setActiveTab(TABS.VEHICLE);
        } else if (activeTab === TABS.VEHICLE && saleId) {
            const requiredFields = [
                "installationDate",
                "renewalDate",
                "registrationNo",
                "engineNo",
                "transmissionType",
                "chassisNo",
                "makeModel",
                "vehicleYear",
                "color",
            ];
            const missing = requiredFields.filter((field) => !form[field]);
            if (missing.length) {
                setValidationMessage("Please complete all required installation fields before submit.");
                return;
            }
            await update(saleId, buildTechnicianPayload(true));
            await refetchSale();
            setSuccessMessage("Installation submitted successfully.");
            router.push('/dashboard/clients');
        }
    };


    return (
        <div className="flex-1 flex flex-col gap-4 md:gap-6">
            {!saleId && <div className="text-sm text-yellow-700">Create a sale first, then complete installation by technician.</div>}
            {saleId && !canEditInstallation && (
                <div className="text-sm text-amber-700">
                    Technician stage is {technicianStageStatus?.toLowerCase()}. Reopen at Technician stage to edit installation details.
                </div>
            )}
            {/* Tabs */}
            {
                !confidentialForm && (
                    <div className="flex flex-wrap gap-2 md:gap-3 overflow-x-auto pb-1">
                        <button
                            className={tabButtonClasses(activeTab === TABS.CLIENT)}
                            onClick={() => setActiveTab(TABS.CLIENT)}
                        >
                            Client Details
                        </button>

                        <button
                            className={tabButtonClasses(activeTab === TABS.PRODUCT)}
                            onClick={() => setActiveTab(TABS.PRODUCT)}
                        >
                            Product & Package
                        </button>

                        <button
                            className={tabButtonClasses(activeTab === TABS.VEHICLE)}
                            onClick={() => setActiveTab(TABS.VEHICLE)}
                        >
                            Vehicle & Installation
                        </button>
                    </div>
                )
            }

            {/* ================= Client Details Form ================= */}
            {activeTab === TABS.CLIENT && !confidentialForm && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Client Category" required className="text-sm">
                                <Input value={normalizedSale.clientCategory || ""} placeholder="Client Category" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Select IR No." className="text-sm">
                                <Input value={normalizedSale.irNo || ""} placeholder="Select" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Full Name" required className="text-sm">
                                <Input value={normalizedSale.fullName || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="CNIC No." required className="text-sm">
                                <Input value={normalizedSale.cnicNo || ""} placeholder="12345-1234567-1" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Phone Home" required className="text-sm">
                                <Input value={normalizedSale.phoneHome || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Email ID" required className="text-sm">
                                <Input value={normalizedSale.emailId || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Address" required className="text-sm">
                                <Input value={normalizedSale.address || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Client Status" required className="text-sm">
                                <Input value={normalizedSale.clientStatus || ""} placeholder="Select" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Cell No." required className="text-sm">
                                <Input value={normalizedSale.cellNo || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Father Name" required className="text-sm">
                                <Input value={normalizedSale.fatherName || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Date of Birth" className="text-sm">
                                <Input value={normalizedSale.dateOfBirth || ""} placeholder="Select (dd/mm/yyyy)" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Phone Office" className="text-sm">
                                <Input value={normalizedSale.phoneOffice || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Company / Department" className="text-sm">
                                <Input value={normalizedSale.companyDepartment || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Address Line 2" className="text-sm">
                                <Input value={normalizedSale.addressLine2 || ""} placeholder="Type here" className="text-sm py-2" disabled />
                            </FieldWrapper>
                        </div>
                    </div>
                </>
            )}

            {/* ================= Product & Package ================= */}
            {activeTab === TABS.PRODUCT && !confidentialForm && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Product" required className="text-sm">
                                <Input value={normalizedSale.productName || ""} placeholder="Select" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Installation Date" required className="text-sm">
                                <DateInput name="installationDate" value={form.installationDate} onChange={handleChange} placeholder="Select (dd/mm/yyyy)" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Select Package Type" required className="text-sm">
                                <Input value={normalizedSale.packageName || ""} placeholder="Select" className="text-sm py-2" disabled />
                            </FieldWrapper>

                            <FieldWrapper label="Renewal Date" required className="text-sm">
                                <DateInput name="renewalDate" value={form.renewalDate} onChange={handleChange} placeholder="Select (dd/mm/yyyy)" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>
                        </div>
                    </div>
                    
                    {/* Device & Accessories Section */}
                    <div className="mt-4 md:mt-6">
                        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                            Device & Accessories
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                            <div className="flex flex-col gap-3 md:gap-3">
                                <FieldWrapper label="Select Zone" required className="text-sm">
                                    <Select name="zoneId" value={form.zoneId || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={zoneOptions} disabled />
                                </FieldWrapper>
                                <FieldWrapper label="Select Device Combo" required className="text-sm">
                                    <Select name="deviceComboId" value={form.deviceComboId || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={comboOptions} disabled />
                                </FieldWrapper>
                                <FieldWrapper label="Select SIM" required className="text-sm">
                                    <Select name="simId" value={form.simId || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={simOptions} disabled />
                                </FieldWrapper>
                                <FieldWrapper label="Select Accessories 2" required className="text-sm">
                                    <Select name="accessory2Id" value={form.accessory2Id || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={accessoryOptions} disabled />
                                </FieldWrapper>
                                <FieldWrapper label="Select Accessories 3" required className="text-sm">
                                    <Select name="accessory3Id" value={form.accessory3Id || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={accessoryOptions} disabled />
                                </FieldWrapper>
                            </div>

                            <div className="flex flex-col gap-3 md:gap-3">
                                <FieldWrapper label="Assign Technician" required className="text-sm">
                                    <Select
                                        name="assignedTechnicianUserId"
                                        value={form.assignedTechnicianUserId || ""}
                                        onChange={handleChange}
                                        placeholder="Select"
                                        className="text-sm py-2"
                                        options={technicianOptions}
                                        disabled
                                    />
                                </FieldWrapper>
                                <FieldWrapper label="Select Device" required className="text-sm">
                                    <Select name="deviceId" value={form.deviceId || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={deviceOptions} disabled />
                                </FieldWrapper>
                                <FieldWrapper label="Device IMEI" required className="text-sm">
                                    <Input value={form.deviceImei || ""} placeholder="15-digit IMEI" className="text-sm py-2" disabled />
                                </FieldWrapper>
                                {(sale?.operationsAssignment?.issuance || sale?.inventoryIssuance) && (
                                    <FieldWrapper label="Inventory Issuance" className="text-sm">
                                        <Input
                                            value={(sale.operationsAssignment?.issuance ?? sale.inventoryIssuance)?.issuanceNo || ''}
                                            className="text-sm py-2"
                                            disabled
                                        />
                                    </FieldWrapper>
                                )}
                                <FieldWrapper label="Select Accessories 1" required className="text-sm">
                                    <Select name="accessory1Id" value={form.accessory1Id || ""} onChange={handleChange} placeholder="Select" className="text-sm py-2" options={accessoryOptions} disabled />
                                </FieldWrapper>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ================= Vehicle & Installation ================= */}
            {activeTab === TABS.VEHICLE && !confidentialForm && (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
                        {/* Column 1 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Registration No." required className="text-sm">
                                <Input name="registrationNo" value={form.registrationNo} onChange={handleChange} placeholder="Type (ABC-1234)" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>
                            <FieldWrapper label="Engine No." required className="text-sm">
                                <Input name="engineNo" value={form.engineNo} onChange={handleChange} placeholder="Type here" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>
                            <FieldWrapper label="Transmission Type" required className="text-sm">
                                <Select
                                    name="transmissionType"
                                    value={form.transmissionType}
                                    onChange={handleChange}
                                    placeholder="Select"
                                    className="text-sm py-2"
                                    disabled={!canEditInstallation}
                                    options={[
                                        { value: "AUTO", label: "Auto" },
                                        { value: "MANUAL", label: "Manual" },
                                    ]}
                                />
                            </FieldWrapper>
                            <FieldWrapper label="Chassis No." required className="text-sm">
                                <Input name="chassisNo" value={form.chassisNo} onChange={handleChange} placeholder="Type here" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>
                        </div>

                        {/* Column 2 */}
                        <div className="flex flex-col gap-3 md:gap-3">
                            <FieldWrapper label="Make/Model" required className="text-sm">
                                <Input name="makeModel" value={form.makeModel} onChange={handleChange} placeholder="Type here" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>

                            <FieldWrapper label="Year" required className="text-sm">
                                <Input name="vehicleYear" value={form.vehicleYear} onChange={handleChange} placeholder="Type year (e.g. 2023)" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>

                            <FieldWrapper label="Color" required className="text-sm">
                                <Input name="color" value={form.color} onChange={handleChange} placeholder="Type here" className="text-sm py-2" disabled={!canEditInstallation} />
                            </FieldWrapper>
                        </div>
                    </div>
                </>
            )}

            {
                confidentialForm && <ConfidentialForm />
            }

            {/* Bottom Buttons */}
            {
                !confidentialForm && (
                    <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleSaveDraft}
                            disabled={loading || !saleId || !canEditInstallation}
                            className="
                w-full sm:w-auto
                text-customBlue
                border border-customBlue
                px-4 py-2
                rounded-lg
                text-sm font-medium
                transition
                hover:bg-gray-100
                disabled:opacity-60 disabled:cursor-not-allowed
            "
                        >
                            {loading ? "Saving..." : "Save"}
                        </button>

                        <button
                            onClick={handleNext}
                            disabled={loading || !saleId || (activeTab === TABS.VEHICLE && !canEditInstallation)}
                            className={`
                w-full sm:w-auto
                px-4 py-2 rounded-lg text-sm font-medium transition
                ${loading || !saleId
                                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                    : "bg-customBlue text-gray-100 hover:bg-customBlue/90"
                                }
            `}
                        >
                            {activeTab === TABS.VEHICLE ? (loading ? "Submitting..." : "Submit") : "Next"}
                        </button>
                    </div>
                )
            }
            {validationMessage && <div className="text-sm text-amber-700">{validationMessage}</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            {successMessage && <div className="text-sm text-green-600">{successMessage}</div>}
        </div>
    );
};

export default InstallationForm;