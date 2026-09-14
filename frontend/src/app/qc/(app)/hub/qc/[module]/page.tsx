"use client";

import { useParams } from "next/navigation";
import { getModuleBySlug } from "@/lib/qcHubDryMortarSrs";
import { QCHubBatchModulePage } from "@/components/qc-hub/QCHubBatchModulePage";
import Link from "next/link";

export default function QCHubModulePage() {
  const params = useParams();
  const slug = String(params?.module || "");
  const moduleDef = getModuleBySlug(slug);

  if (!moduleDef) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">Unknown QC module: {slug}</p>
        <Link href="/qc/hub" className="text-sky-600 underline text-sm">Back to QC Hub</Link>
      </div>
    );
  }

  return <QCHubBatchModulePage moduleDef={moduleDef} />;
}
