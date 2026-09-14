import { redirect } from "next/navigation";

export default function LegacyPfiPage() {
  redirect("/procurement/import/pfi-received");
}
