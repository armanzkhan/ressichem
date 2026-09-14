export default function QCAuthLayout({ children }: { children: React.ReactNode }) {
  // Intentionally no dashboard/sidebar here: QC auth pages should be standalone.
  return <>{children}</>;
}


