"use client";

import React, { useMemo, useState, useEffect } from "react";
import FieldWrapper from "@/components/ui/FieldWrapper";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import FormActions from "@/components/components/FormActions";
import SearchList from "@/components/components/SearchList";
import { useOffices } from "@/hooks/office/useOffices";
import { useCities } from "@/hooks/city/useCities";
import { useDeleteOffice } from "@/hooks/office/useDeleteOffice";
import { useUpdateOffice } from "@/hooks/office/useUpdateOffice";
import { useCreateOffice } from "@/hooks/office/useCreateOffice";
import EditModal from "@/components/components/EditModal";
import ValidationErrorModal from "@/components/components/ValidationErrorModal";
import SuccessModal from "@/components/ui/SuccessModal";

const AddOfficeTabContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [cityId, setCityId] = useState("");
  const [editOfficeName, setEditOfficeName] = useState("");
  const [editCityId, setEditCityId] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: "" });
  const [validationErrors, setValidationErrors] = useState([]);
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [localOffices, setLocalOffices] = useState([]);

  const { data, isLoading, error, isFetching, isPending, refetch } = useOffices();
  const { data: citiesData } = useCities();

  const { mutate: deleteOffice, isPending: isDeleting } = useDeleteOffice({
    onSuccess: () => {
      refetch();
    },
  });

  const { mutate: updateOffice, isPending: isUpdating, error: updateError, reset: resetUpdateError } = useUpdateOffice({
    onSuccess: () => {
      setShowEditModal(false);
      resetForm();
      refetch();
    },
  });

  const { mutate: toggleStatus } = useUpdateOffice();

  const { mutate: createOffice, isPending: isCreating } = useCreateOffice({
    onSuccess: () => {
      setSuccessModal({ isOpen: true, message: "Office created successfully" });
      resetForm();
      refetch();
    },
  });

  const cityOptions = useMemo(
    () =>
      (citiesData || []).map((city) => ({
        value: city.cityId.toString(),
        label: city.cityName,
      })),
    [citiesData],
  );

  const resolveCityName = (office) =>
    office?.city?.cityName ||
    citiesData?.find((c) => c.cityId === office?.cityId)?.cityName ||
    "N/A";

  useEffect(() => {
    if (!isLoading && !error && data) {
      const mapped = data.map((office) => ({
        id: office.officeId,
        name: `${office.officeName}${resolveCityName(office) !== "N/A" ? ` (${resolveCityName(office)})` : ""}`,
        city: resolveCityName(office),
        cityId: office.cityId,
        isActive: office.isActive,
      }));
      setLocalOffices(mapped);
    }
  }, [data, isLoading, error, citiesData]);

  const offices = useMemo(() => {
    if (isLoading || error) return [];
    return localOffices;
  }, [localOffices, isLoading, error]);

  const handleCreateOffice = () => {
    const errors = [];
    if (!officeName.trim()) errors.push("Office Name");
    if (!cityId) errors.push("City");
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return false;
    }
    createOffice({
      officeName,
      cityId: parseInt(cityId, 10),
    });
  };

  const resetEditForm = () => {
    setEditOfficeName("");
    setEditCityId("");
  };

  const resetForm = () => {
    setOfficeName("");
    setCityId("");
    setSelectedOffice(null);
  };

  const handleEditOffice = (item) => {
    const source = data?.find((o) => o.officeId === item.id);
    setSelectedOffice(item);
    setEditOfficeName(item.name);
    setEditCityId(source?.cityId ? source.cityId.toString() : "");
    setShowEditModal(true);
  };

  const handleUpdateOffice = (onSuccess) => {
    const errors = [];
    if (!editOfficeName.trim()) errors.push("Office Name");
    if (!editCityId) errors.push("City");
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidationError(true);
      return;
    }
    if (!selectedOffice) return;
    updateOffice(
      {
        id: selectedOffice.id,
        payload: {
          officeName: editOfficeName,
          cityId: parseInt(editCityId, 10),
        },
      },
      { onSuccess },
    );
  };

  const handleToggleOffice = (item) => {
    if (item?.id) {
      setLocalOffices((prev) =>
        prev.map((office) =>
          office.id === item.id ? { ...office, isActive: !office.isActive } : office,
        ),
      );
      toggleStatus({ id: item.id, payload: { isActive: !item.isActive } });
    }
  };

  const handleDeleteOffice = (itemName, index) => {
    if (offices[index]?.id) {
      deleteOffice(offices[index].id);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    resetEditForm();
    resetUpdateError?.();
  };

  return (
    <div className="flex-1 flex flex-col">
      <div className="pb-6 md:pb-8">
        <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6">
          Add Office
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <FieldWrapper label="Office Name" required className="text-sm">
              <Input
                placeholder="e.g. Head Office, Regional HQ"
                className="text-sm py-2"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
              />
            </FieldWrapper>
          </div>

          <div className="space-y-1">
            <FieldWrapper label="City" required className="text-sm">
              <Select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                placeholder="Select City"
                options={cityOptions}
                className="text-sm"
              />
            </FieldWrapper>
          </div>
        </div>

        <FormActions
          onSave={handleCreateOffice}
          onCancel={resetForm}
          tabName="Office"
          isLoading={isCreating}
          showAutoSuccess={false}
        />
      </div>

      <div className=" pb-6 md:pb-8">
        <SearchList
          isLoading={isLoading || isFetching || isPending}
          error={error?.message}
          items={offices}
          showView={false}
          showEdit={true}
          showDelete={true}
          showToggle={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onEdit={handleEditOffice}
          onDelete={handleDeleteOffice}
          onToggle={handleToggleOffice}
          tabName="Office"
        />
      </div>

      <EditModal
        isOpen={showEditModal}
        selectedItem={selectedOffice}
        onUpdate={handleUpdateOffice}
        onClose={handleCloseEditModal}
        isUpdating={isUpdating}
        error={updateError?.message}
        title="Edit Office"
        itemType="office"
        fields={[
          { label: "Office Name", value: editOfficeName, onChange: setEditOfficeName },
          { label: "City", value: editCityId, onChange: setEditCityId, type: "select", options: cityOptions },
        ]}
      />

      <ValidationErrorModal
        isOpen={showValidationError}
        onClose={() => setShowValidationError(false)}
        missingFields={validationErrors}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: "" })}
        title="Success"
        message={successModal.message}
      />
    </div>
  );
};

export default AddOfficeTabContent;
