"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Edit2 } from "lucide-react";
import { api } from "@/src/services/api";
import EditCustomerModal from "./EditCustomerModal";
import { toast } from "sonner";

export default function EditCustomerButton({ customer }) {
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
        className="text-[#c9963e] border-[#dfd8cc] hover:bg-[#faf9f6]"
        onClick={() => setIsOpen(true)}
      >
        <Edit2 size={14} className="mr-2" />
        Edit Profile
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
