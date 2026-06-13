"use client";

import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";

const ClientContext = createContext(null);

export const ClientProvider = ({ children }) => {
  const [showAddClient, setShowAddClient] = useState(false);
  const router = useRouter();

  // const openAddClientForm = () => setShowAddClient(true);
  const openAddClientForm = () => {
    router.push("/dashboard/sales?form=addSale");
  };
  const closeAddClientForm = () => setShowAddClient(false);

  return (
    <ClientContext.Provider
      value={{
        showAddClient,
        openAddClientForm,
        closeAddClientForm,
        setShowAddClient,
      }}
    >
      {children}
    </ClientContext.Provider>
  );
};

export const useClientContext = () => {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error(
      "useClientContext must be used within a ClientProvider"
    );
  }
  return context;
};
