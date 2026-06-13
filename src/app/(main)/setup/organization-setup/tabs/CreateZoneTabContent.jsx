"use client";

import React, { useState, useEffect, useMemo } from "react";
import FieldWrapper from "@/components/ui/FieldWrapper";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FormActions from "@/components/components/FormActions";
import SearchList from "@/components/components/SearchList";
import EditModal from "@/components/components/EditModal";
import ViewModal from "@/components/components/ViewModal";
import ValidationErrorModal from "@/components/components/ValidationErrorModal";
import SuccessModal from "@/components/ui/SuccessModal";
import DeleteConfirmationModal from "@/components/ui/DeleteConfirmationModal";
import { EditButton, DeleteButton, ToggleButton } from "@/components/components/ButtonComponents";
import { useZones } from "@/hooks/zone/useZones";
import { useCreateZone } from "@/hooks/zone/useCreateZone";
import { useUpdateZone } from "@/hooks/zone/useUpdateZone";
import { useDeleteZone } from "@/hooks/zone/useDeleteZone";
import { useEmployees } from "@/hooks/employee/useEmployees";
import { useOffices } from "@/hooks/office/useOffices";
import { useAssignEmployeeToZone } from "@/hooks/zone-employee/useAssignEmployeeToZone";
import { useZoneEmployeeAssignments } from "@/hooks/zone-employee/useZoneEmployeeAssignments";
import { useUpdateZoneEmployeeAssignment } from "@/hooks/zone-employee/useUpdateZoneEmployeeAssignment";
import { useDeleteZoneEmployeeAssignment } from "@/hooks/zone-employee/useDeleteZoneEmployeeAssignment";
import { useCities } from "@/hooks/city/useCities";

const CreateZoneTabContent = () => {
  // ==================== STATE MANAGEMENT ====================

  // --- Zone Form State (Create) ---
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [selectedOfficeName, setSelectedOfficeName] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [officeId, setOfficeId] = useState("");

  // --- Zone Edit State ---
  const [editSelectedOfficeId, setEditSelectedOfficeId] = useState("");
  const [editZoneName, setEditZoneName] = useState("");
  const [editOfficeId, setEditOfficeId] = useState("");

  // --- Zone List & Search State ---
  const [localZones, setLocalZones] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedZone, setSelectedZone] = useState(null);

  // --- Zone Employee Assignment State ---
  const [zoneEmployeeAssignments, setZoneEmployeeAssignments] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [employeeToggleStates, setEmployeeToggleStates] = useState({});

  // --- Zone Employee Edit State ---
  const [selectedZoneEmployeeForEdit, setSelectedZoneEmployeeForEdit] = useState(null);
  const [editZoneEmployeeEmployeeId, setEditZoneEmployeeEmployeeId] = useState("");
  const [editZoneEmployeeZoneId, setEditZoneEmployeeZoneId] = useState("");

  // --- Zone Employee Delete Confirmation State ---
  const [zoneEmployeeDeleteConfirmation, setZoneEmployeeDeleteConfirmation] = useState({
    isOpen: false,
    employeeName: "",
    zoneEmployeeId: null,
  });

  // --- Modal & Validation State ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditZoneEmployeeModal, setShowEditZoneEmployeeModal] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [validationErrors, setValidationErrors] = useState([]);
  const [viewItem, setViewItem] = useState(null);

  // ==================== DATA FETCHING HOOKS ====================
  const { data: officesData } = useOffices();
  const { data: citiesData } = useCities();
  const { data: employeesData } = useEmployees();
  const { data, isLoading, error, isFetching, refetch } = useZones();
  const {
    data: zoneEmployeeData,
    isLoading: isLoadingAssignments,
    refetch: refetchAssignments,
  } = useZoneEmployeeAssignments({});

  // ==================== ZONE MUTATION HOOKS ====================
  const { mutate: createZone, isPending: isCreating } = useCreateZone({
    onSuccess: () => {
      resetForm();
      setTimeout(() => refetch(), 1000);
    },
  });

  const {
    mutate: updateZone,
    isPending: isUpdating,
    error: updateError,
    reset: resetUpdateError,
  } = useUpdateZone({
    onSuccess: () => {
      resetEditForm();
      setShowEditModal(false);
      refetch();
    },
  });

  const { mutate: deleteZone } = useDeleteZone({
    onSuccess: () => refetch(),
  });

  const { mutate: toggleStatus } = useUpdateZone();

  // ==================== ZONE-EMPLOYEE MUTATION HOOKS ====================
  const { mutate: assignEmployeeToZone, isPending: isAssigning } =
    useAssignEmployeeToZone({
      onSuccess: () => {
        setSuccessModal({ isOpen: true, message: "Zone-Employee assignment created successfully" });
        resetAssignmentForm();
        refetchAssignments();
      },
    });

  const { mutate: updateZoneEmployeeAssignment, isPending: isUpdatingAssignment } =
    useUpdateZoneEmployeeAssignment({
      onSuccess: () => {
        setSuccessModal({ isOpen: true, message: "Zone-Employee assignment updated successfully" });
        setShowEditZoneEmployeeModal(false);
        refetchAssignments();
      },
    });

  const { mutate: deleteZoneEmployeeAssignment, isPending: isDeletingAssignment } =
    useDeleteZoneEmployeeAssignment({
      onSuccess: () => {
        setSuccessModal({ isOpen: true, message: "Zone-Employee assignment deleted successfully" });
        refetchAssignments();
      },
    });

  // ==================== EFFECTS ====================

  // Sync zone-employee assignments from API
  useEffect(() => {
    if (zoneEmployeeData && Array.isArray(zoneEmployeeData)) {
      setZoneEmployeeAssignments(zoneEmployeeData);
    }
  }, [zoneEmployeeData]);

  // Auto-populate office info when selecting office (Create form)
  useEffect(() => {
    if (selectedOfficeId && officesData) {
      const selectedOffice = officesData.find((o) => o.officeId === parseInt(selectedOfficeId));
      if (selectedOffice) {
        setSelectedOfficeName(selectedOffice.officeName);
        setOfficeId(selectedOffice.officeId);
      }
    } else {
      setSelectedOfficeName("");
      setOfficeId("");
    }
  }, [selectedOfficeId, officesData]);

  // Auto-populate office info when selecting office (Edit form)
  useEffect(() => {
    if (editSelectedOfficeId && officesData) {
      const selectedOffice = officesData.find((o) => o.officeId === parseInt(editSelectedOfficeId));
      if (selectedOffice) {
        setEditOfficeId(selectedOffice.officeId);
      }
    } else {
      setEditOfficeId("");
    }
  }, [editSelectedOfficeId, officesData]);

  // Sync local zones with API data
  useEffect(() => {
    if (!isLoading && !error && data) {
      const mapped = data.map((zone) => ({
        id: zone.zoneId,
        name: zone.zoneName,
        zoneName: zone.zoneName,
        officeId: zone.officeId,
        office: zone.office,
        isActive: zone.isActive,
      }));
      setLocalZones(mapped);
    }
  }, [data, isLoading, error]);

  // ==================== COMPUTED VALUES (MEMOS) ====================

  const zones = useMemo(() => {
    if (isLoading || error) return [];
    return localZones;
  }, [localZones, isLoading, error]);

  const officeOptions = useMemo(() => {
    if (!officesData || officesData.length === 0) return [];
    return officesData.map((office) => ({
      value: office.officeId ? office.officeId.toString() : "",
      label: office.officeName || "Unknown Office",
    }));
  }, [officesData]);

  const resolveOfficeCityName = (office) => {
    if (!office) return "N/A";
    if (office.city?.cityName) return office.city.cityName;
    if (office.cityId && citiesData?.length) {
      const matched = citiesData.find((city) => city.cityId === office.cityId);
      if (matched?.cityName) return matched.cityName;
    }
    return "N/A";
  };

  const employeeOptions = useMemo(() => {
    const options = [{ value: "", label: "Select Employee" }];
    if (!employeesData || employeesData.length === 0) return options;
    const technicians = employeesData.filter(
      (emp) => String(emp.designation || "").toLowerCase() === "technician",
    );
    const source = technicians.length > 0 ? technicians : employeesData;
    return [
      ...options,
      ...source.map((emp) => ({
        value: emp.employeeId ? emp.employeeId.toString() : "",
        label: `${emp.emailId || emp.employeeId || "Employee"}${emp.designation ? ` (${emp.designation})` : ""}`,
      })),
    ];
  }, [employeesData]);

  const zoneOptions = useMemo(() => {
    const options = [{ value: "", label: "Select Zone" }];
    if (!zones || zones.length === 0) return options;
    return [
      ...options,
      ...zones.map((zone) => ({
        value: zone.id.toString(),
        label: zone.name || "Unknown Zone",
      })),
    ];
  }, [zones]);

  const employeesInZone = useMemo(() => {
    if (!Array.isArray(zoneEmployeeAssignments) || zoneEmployeeAssignments.length === 0) {
      return [];
    }

    return zoneEmployeeAssignments
      .map((assignment) => {
        const employee = assignment.employee
          ?? employeesData?.find((e) => e?.employeeId === assignment.employeeId);
        const zone = assignment.zone ?? zones?.find((z) => z?.id === assignment.zoneId);
        const office =
          assignment.zone?.office ??
          officesData?.find((o) => o?.officeId === zone?.officeId);

        if (!employee) {
          return null;
        }

        return {
          zoneEmployeeId: assignment.zoneEmployeeId,
          employeeId: assignment.employeeId,
          zoneId: assignment.zoneId,
          name: employee.emailId || employee.user?.email || "N/A",
          call: employee.primaryMobileNo || "N/A",
          cnic: employee.cnic || "N/A",
          zone: zone?.zoneName || zone?.name || "N/A",
          office: office?.officeName || "N/A",
          city: resolveOfficeCityName(office),
          isActive: employee.isActive !== false,
        };
      })
      .filter(Boolean);
  }, [zoneEmployeeAssignments, employeesData, zones, officesData, citiesData]);

  const selectedOfficeCityName = useMemo(() => {
    const office = officesData?.find((o) => o.officeId === parseInt(selectedOfficeId, 10));
    return resolveOfficeCityName(office);
  }, [selectedOfficeId, officesData, citiesData]);

  // ==================== RESET FUNCTIONS ====================

  const resetForm = () => {
    setSelectedOfficeId("");
    setSelectedOfficeName("");
    setZoneName("");
    setOfficeId("");
  };

  const resetEditForm = () => {
    setEditSelectedOfficeId("");
    setEditZoneName("");
    setEditOfficeId("");
  };

  const resetAssignmentForm = () => {
    setSelectedEmployeeId("");
    setSelectedZoneId("");
  };

  // ==================== ZONE HANDLERS ====================

  const validateCreateZone = () => {
    const errors = [];
    if (!zoneName.trim()) errors.push("Zone Name");
    if (!officeId) errors.push("Office");
    return errors;
  };

  const handleCreateZone = () => {
    const errors = validateCreateZone();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return false;
    }
    createZone({
      zoneName,
      officeId,
      isActive: true,
    });
  };

  const validateUpdateZone = () => {
    const errors = [];
    if (!editZoneName.trim()) errors.push("Zone Name");
    if (!editOfficeId) errors.push("Office");
    return errors;
  };

  const handleEditZone = (item) => {
    setSelectedZone(item);
    setEditSelectedOfficeId(item.officeId?.toString() || "");
    setEditZoneName(item.zoneName);
    setEditOfficeId(item.officeId || "");
    setShowEditModal(true);
  };

  const handleUpdateZone = (onSuccess) => {
    const errors = validateUpdateZone();
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return;
    }
    if (!selectedZone) return;
    updateZone(
      {
        id: selectedZone.id,
        payload: {
          zoneName: editZoneName,
          officeId: editOfficeId,
        },
      },
      { onSuccess }
    );
  };

  const handleDeleteZone = (itemName, index) => {
    if (zones[index]?.id) {
      deleteZone(zones[index].id);
    }
  };

  const handleToggleZone = (item) => {
    if (item?.id) {
      setLocalZones((prev) =>
        prev.map((zone) =>
          zone.id === item.id ? { ...zone, isActive: !zone.isActive } : zone
        )
      );
      toggleStatus({ id: item.id, payload: { isActive: !item.isActive } });
    }
  };

  const handleViewZone = (item) => {
    setViewItem(item);
    setShowViewModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetEditForm();
    resetUpdateError?.();
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewItem(null);
  };

  // ==================== ZONE-EMPLOYEE HANDLERS ====================

  const handleAssignEmployeeToZone = () => {
    if (!selectedEmployeeId || !selectedZoneId) {
      const errors = [];
      if (!selectedEmployeeId) errors.push("Employee");
      if (!selectedZoneId) errors.push("Zone");
      setValidationErrors(errors);
      setShowValidationError(true);
      return false;
    }

    assignEmployeeToZone({
      zoneId: parseInt(selectedZoneId),
      employeeId: parseInt(selectedEmployeeId),
    });
    return true;
  };

  const handleCancelAssignment = () => {
    resetAssignmentForm();
  };

  const handleEditZoneEmployee = (assignment) => {
    console.log(assignment)
    setSelectedZoneEmployeeForEdit(assignment);
    setEditZoneEmployeeEmployeeId(assignment.employeeId.toString());
    setEditZoneEmployeeZoneId(assignment.zoneId.toString());
    setShowEditZoneEmployeeModal(true);
  };

  const handleUpdateZoneEmployeeAssignment = () => {
    if (!selectedZoneEmployeeForEdit || !editZoneEmployeeEmployeeId || !editZoneEmployeeZoneId) {
      return;
    }
    updateZoneEmployeeAssignment({
      id: selectedZoneEmployeeForEdit.zoneEmployeeId,
      payload: {
        zoneId: parseInt(editZoneEmployeeZoneId),
        employeeId: parseInt(editZoneEmployeeEmployeeId),
      },
    });
  };

  const handleCloseEditZoneEmployeeModal = () => {
    setShowEditZoneEmployeeModal(false);
    setSelectedZoneEmployeeForEdit(null);
    setEditZoneEmployeeEmployeeId("");
    setEditZoneEmployeeZoneId("");
  };

  const handleDeleteZoneEmployee = (employeeName, zoneEmployeeId) => {
    setZoneEmployeeDeleteConfirmation({
      isOpen: true,
      employeeName: employeeName,
      zoneEmployeeId: zoneEmployeeId,
    });
  };

  const handleDeleteZoneEmployeeConfirm = () => {
    const { zoneEmployeeId } = zoneEmployeeDeleteConfirmation;
    setZoneEmployeeDeleteConfirmation({ isOpen: false, employeeName: "", zoneEmployeeId: null });
    
    if (zoneEmployeeId) {
      deleteZoneEmployeeAssignment(zoneEmployeeId);
    }
  };

  const handleToggleZoneEmployee = (assignment, index) => {
    if (assignment?.zoneEmployeeId) {
      setEmployeeToggleStates((prev) => ({
        ...prev,
        [index]: !prev[index],
      }));
    }
  };

  // ==================== RENDER ====================

  return (
    <div className="flex-1 flex flex-col">
      {/* ========== SECTION 1: CREATE ZONE ========== */}
      <div className="pb-6 md:pb-8">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6">
          Create Zone
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <FieldWrapper label="Select Office" required className="text-sm">
              {officesData && officesData.length > 0 ? (
                <Select
                  value={selectedOfficeId}
                  onChange={(e) => setSelectedOfficeId(e.target.value)}
                  placeholder="Select Office"
                  options={officeOptions}
                  className="text-sm"
                />
              ) : (
                <div className="text-sm text-gray-500 p-2 rounded">
                  Loading offices
                </div>
              )}
            </FieldWrapper>
          </div>
          
          <div className="space-y-1">
            <FieldWrapper label="City" className="text-sm">
              <Input
                value={selectedOfficeId ? selectedOfficeCityName : ""}
                placeholder="Select office to view city"
                className="text-sm"
                disabled
              />
            </FieldWrapper>
          </div>

          <div className="space-y-1">
            <FieldWrapper label="Zone Name" required className="text-sm">
              <Input 
                placeholder="Enter zone name" 
                className="text-sm"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
              />
            </FieldWrapper>
          </div>
        </div>

        <FormActions
          onSave={handleCreateZone}
          onCancel={resetForm}
          tabName="Zone"
          isLoading={isCreating}
        />
      </div>

      {/* ========== SECTION 2: SEARCH ZONES ========== */}
      <div className="pb-6 md:pb-8">
        <SearchList
          isLoading={isLoading || isFetching}
          error={error?.message}
          items={zones}
          showView={true}
          showEdit={true}
          showDelete={true}
          showToggle={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onView={handleViewZone}
          onEdit={handleEditZone}
          onDelete={handleDeleteZone}
          onToggle={handleToggleZone}
          tabName="Zone"
        />
      </div>

      {/* Edit Modal */}
      <EditModal
        isOpen={showEditModal}
        selectedItem={selectedZone}
        onUpdate={handleUpdateZone}
        onClose={handleCloseEditModal}
        isUpdating={isUpdating}
        error={updateError?.message}
        title="Edit Zone"
        itemType="zone"
        fields={[
          { label: "Select Office", value: editSelectedOfficeId, onChange: setEditSelectedOfficeId, type: "select", options: officeOptions },
          { label: "Zone Name", value: editZoneName, onChange: setEditZoneName },
        ]}
      />

      {/* View Modal */}
      <ViewModal
        isOpen={showViewModal}
        item={viewItem}
        onClose={handleCloseViewModal}
        title="Zone Details"
        fields={[
          { key: "id", label: "Zone ID" },
          { key: "zoneName", label: "Zone Name" },
          { key: "officeId", label: "Office ID" },
          {
            key: "isActive",
            label: "Status",
            render: (value) => (value ? "Active" : "Inactive"),
          },
        ]}
      />

      {/* ========== SECTION 3: ZONE-EMPLOYEE ASSIGNMENTS ========== */}
      <div className="pb-6 md:pb-8">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6">
          Add Employees in Zone
        </h2>

        <div className="flex flex-row gap-5 items-end mb-6">
            <div className="flex-1">
              <FieldWrapper label="Select Employee" required className="text-sm">
                <Select
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  placeholder="Select Employee"
                  options={employeeOptions}
                  className="text-sm"
                  disabled={isAssigning}
                />
              </FieldWrapper>
            </div>
            
            <div className="flex-1">
              <FieldWrapper label="Select Zone" required className="text-sm">
                <Select
                  value={selectedZoneId}
                  onChange={(e) => setSelectedZoneId(e.target.value)}
                  placeholder="Select Zone"
                  options={zoneOptions}
                  className="text-sm"
                  disabled={isAssigning}
                />
              </FieldWrapper>
            </div>
        </div>

        <FormActions
          onSave={handleAssignEmployeeToZone}
          onCancel={handleCancelAssignment}
          tabName="Zone"
          primaryClassName="bg-customBlue hover:bg-customBlue/90"
          isLoading={isAssigning}
          showAutoSuccess={false}
        />
        
        {isLoadingAssignments ? (
          <div className="text-center py-8 text-gray-500">Loading zone-employee assignments...</div>
        ) : employeesInZone.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No zone-employee assignments found. Assign an employee to a zone above.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm mt-4">
              <thead>
                <tr className="bg-[#EEF0FB]">
                  <th className="py-5 px-4 text-left border-r border-gray-300 rounded-l-xl">
                      <input type="checkbox" className="mr-2 w-4 h-4 rounded-md border border-gray-300 accent-customBlue cursor-pointer appearance-none" />
                  </th>
                  <th className="text-left py-5 px-4 whitespace-nowrap">Employee Name</th>
                  <th className="text-left py-5 px-4">Call No.</th>
                  <th className="text-left py-5 px-4">CNIC No.</th>
                  <th className="text-left py-5 px-4">Zone</th>
                  <th className="text-left py-5 px-4">Office</th>
                  <th className="text-left py-5 px-4">City</th>
                  <th className="text-left py-5 px-4 rounded-r-xl">Action</th>
                </tr>
              </thead>
              <tbody>
                {employeesInZone.map((emp, idx) => (
                  <tr key={emp.zoneEmployeeId || idx} className="hover:bg-gray-50">
                    <td className="py-5 px-4">
                      <input type="checkbox" className="mr-2 w-4 h-4 rounded-md border border-gray-300 accent-customBlue cursor-pointer appearance-none" />
                    </td>
                    <td className="py-5 px-4">{emp.name}</td>
                    <td className="py-5 px-4">{emp.call}</td>
                    <td className="py-5 px-4">{emp.cnic}</td>
                    <td className="py-5 px-4">{emp.zone}</td>
                    <td className="py-5 px-4">{emp.office}</td>
                    <td className="py-5 px-4">{emp.city}</td>
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-2">
                        <EditButton onClick={() => handleEditZoneEmployee(emp)} />
                        <DeleteButton
                          onClick={() => handleDeleteZoneEmployee(emp.name, emp.zoneEmployeeId)}
                          disabled={isDeletingAssignment}
                        />
                        <ToggleButton
                          isActive={!!employeeToggleStates[idx]}
                          onClick={() => handleToggleZoneEmployee(emp, idx)}
                          disabled={isDeletingAssignment}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
      </div>

      {/* Edit Zone-Employee Modal */}
      <EditModal
        isOpen={showEditZoneEmployeeModal}
        selectedItem={selectedZoneEmployeeForEdit}
        onUpdate={handleUpdateZoneEmployeeAssignment}
        onClose={handleCloseEditZoneEmployeeModal}
        isUpdating={isUpdatingAssignment}
        title="Edit Zone-Employee Assignment"
        itemType="zone-employee"
        fields={[
          { label: "Select Employee", value: editZoneEmployeeEmployeeId, onChange: setEditZoneEmployeeEmployeeId, type: "select", options: employeeOptions },
          { label: "Select Zone", value: editZoneEmployeeZoneId, onChange: setEditZoneEmployeeZoneId, type: "select", options: zoneOptions },
        ]}
      />

      {/* ========== MODALS ========== */}

      {/* Zone-Employee Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={zoneEmployeeDeleteConfirmation.isOpen}
        itemName={zoneEmployeeDeleteConfirmation.employeeName}
        onConfirm={handleDeleteZoneEmployeeConfirm}
        onCancel={() => setZoneEmployeeDeleteConfirmation({ isOpen: false, employeeName: "", zoneEmployeeId: null })}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        title="Success"
        message={successModal.message}
      />

      {/* Validation Error Modal */}
      <ValidationErrorModal
        isOpen={showValidationError}
        onClose={() => setShowValidationError(false)}
        missingFields={validationErrors}
      />
    </div>
  );
};

export default CreateZoneTabContent;
