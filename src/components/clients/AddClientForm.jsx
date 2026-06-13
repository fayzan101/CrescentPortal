"use client";

import { useClientContext } from "@/context/clientContext";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const AddClientForm = () => {
    const { closeAddClientForm } = useClientContext();
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard/sales?form=addSale");
        closeAddClientForm?.();
    }, [closeAddClientForm, router]);

    return (
        <div className="bg-white rounded-xl shadow p-4 md:p-6">
            <p className="text-sm text-gray-600">Redirecting to Sales to create a new client record...</p>
        </div>
    );
};

export default AddClientForm;
