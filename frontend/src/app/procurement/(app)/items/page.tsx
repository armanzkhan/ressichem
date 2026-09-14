import { redirect } from "next/navigation";

export default function LegacyItemsPage() {
  redirect("/procurement/local/items");
}
