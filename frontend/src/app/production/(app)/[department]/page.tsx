"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProductionLog } from "@/components/production/ProductionLog";
import { DEPARTMENT_META, storedProductionDepartments, type ProductionDepartment } from "@/lib/productionApi";

export default function DepartmentLogPage() {
  const params = useParams<{ department: string }>();
  const department = params?.department as ProductionDepartment;
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAllowed(storedProductionDepartments().includes(department));
  }, [department]);

  if (!department || !DEPARTMENT_META[department]) {
    return <p className="text-sm text-blue-800">Unknown department.</p>;
  }
  if (allowed === null) return null;
  if (!allowed) {
    return (
      <p className="text-sm text-blue-800 dark:text-blue-100">
        This account records Reactor Area, Liquid (LMS), and BFS. Drymix laboratory results stay in QC Hub.
      </p>
    );
  }
  return <ProductionLog department={department} />;
}
