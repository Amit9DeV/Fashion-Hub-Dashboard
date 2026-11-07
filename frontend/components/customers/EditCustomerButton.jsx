"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { api } from "@/src/services/api";
import EditCustomerModal from "./EditCustomerModal";
import { toast } from "sonner";

export default function EditCustomerButton({ customer, iconOnly = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleUpdate = async (data) => {
    try {
      await api.customers.update(customer._id, data);
      toast.success("Customer profile updated successfully");
      router.refresh();
      setIsOpen(false);
    } catch (error) {
      toast.error(error.message || "Failed to update customer");
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className={iconOnly ? "h-7 w-7 p-0 text-[#c9963e] border-[#dfd8cc] hover:bg-[#faf9f6]" : "text-[#c9963e] border-[#dfd8cc] hover:bg-[#faf9f6]"}
        onClick={() => setIsOpen(true)}
        title="Edit Customer"
      >
        <Edit2 size={14} className={iconOnly ? "" : "mr-2"} />
        {!iconOnly && "Edit Profile"}
      </Button>

      <EditCustomerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        customer={customer}
        onUpdate={handleUpdate}
      />
    </>
  );
}
