import { notFound } from "next/navigation";
import { CostingView } from "@/components/procurement/views/CostingView";
import { ExportDocumentsView } from "@/components/procurement/views/ExportDocumentsView";
import { ExportShipmentDetailsView } from "@/components/procurement/views/ExportShipmentDetailsView";
import { GrnView } from "@/components/procurement/views/GrnView";
import { ItemsView } from "@/components/procurement/views/ItemsView";
import { PaymentsView } from "@/components/procurement/views/PaymentsView";
import { PfiView } from "@/components/procurement/views/PfiView";
import { PrReportsView } from "@/components/procurement/views/PrReportsView";
import { PurchaseOrdersView } from "@/components/procurement/views/PurchaseOrdersView";
import { RequisitionsView } from "@/components/procurement/views/RequisitionsView";
import { SupplierInvoicesView } from "@/components/procurement/views/SupplierInvoicesView";
import { SuppliersView } from "@/components/procurement/views/SuppliersView";
import { isValidSectionModule, type TradeModule, type TradeSection } from "@/lib/procurementScope";

type PageProps = {
  params: Promise<{ section: string; module: string }>;
};

export default async function ProcurementSectionPage({ params }: PageProps) {
  const { section, module } = await params;

  if (!isValidSectionModule(section, module)) {
    notFound();
  }

  const tradeSection = section as TradeSection;
  const tradeModule = module as TradeModule;

  if (tradeModule === "suppliers") {
    if (tradeSection === "export") notFound();
    return <SuppliersView section={tradeSection} />;
  }
  if (tradeModule === "items") {
    if (tradeSection === "export") notFound();
    return <ItemsView section={tradeSection} />;
  }
  if (tradeModule === "po") {
    if (tradeSection === "export") notFound();
    return <PurchaseOrdersView section={tradeSection} />;
  }
  if (tradeModule === "pr") {
    if (tradeSection === "export") notFound();
    return <RequisitionsView section={tradeSection} />;
  }
  if (tradeModule === "reports") {
    if (tradeSection === "export") notFound();
    return <PrReportsView section={tradeSection} />;
  }
  if (tradeModule === "costing") {
    if (tradeSection === "export") notFound();
    return <CostingView section={tradeSection} />;
  }
  if (tradeModule === "grn") {
    if (tradeSection === "export") notFound();
    return <GrnView section={tradeSection} />;
  }
  if (tradeModule === "invoices") {
    if (tradeSection === "export") notFound();
    return <SupplierInvoicesView section={tradeSection} />;
  }
  if (tradeModule === "payments") {
    if (tradeSection === "export") notFound();
    return <PaymentsView section={tradeSection} />;
  }
  if (tradeModule === "shipment-details") {
    if (tradeSection !== "export") notFound();
    return <ExportShipmentDetailsView />;
  }
  if (tradeModule === "documents") {
    if (tradeSection !== "export") notFound();
    return <ExportDocumentsView />;
  }
  if (tradeModule === "pfi" || tradeModule === "pfi-received") {
    if (tradeSection === "local") notFound();
    return <PfiView section={tradeSection} module={tradeModule} />;
  }

  notFound();
}
