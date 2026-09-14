"use client";

import { useUser } from "@/components/Auth/user-context";

/** Shared QC Site result workflow permissions (submit / approve-reject). */
export function useQcResultPermissions() {
  const { hasPermission, loading } = useUser();
  return {
    loading,
    canSubmit: hasPermission("qc.results.submit"),
    canApprove: hasPermission("qc.results.approve"),
  };
}
