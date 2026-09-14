import { redirect } from "next/navigation";

export default function LegacyVendorsPage() {
  redirect("/procurement/local/suppliers");
}
