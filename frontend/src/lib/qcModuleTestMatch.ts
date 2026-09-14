/** Match QCTest.applicableModules against a QC Result / batch module code. */
export function testAppliesToModule(test: { applicableModules?: string[] }, module: string): boolean {
  const mods = test.applicableModules || [];
  if (!mods.length) return true;
  if (mods.includes(module)) return true;

  if (module === "LMS" && mods.some((m) => m.startsWith("LMS_"))) return true;
  if (module.startsWith("LMS_") && mods.includes("LMS")) return true;
  if (module.startsWith("LMS_")) {
    const suffix = module.replace(/^LMS_/, "");
    if (mods.some((m) => m.includes(suffix))) return true;
  }

  return false;
}

export function filterTestsForModule<T extends { applicableModules?: string[] }>(tests: T[], module: string): T[] {
  return tests.filter((t) => testAppliesToModule(t, module));
}
