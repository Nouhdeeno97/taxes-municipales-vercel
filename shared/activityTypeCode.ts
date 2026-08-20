export function makeActivityTypeCode(value: string, prefix = "ACT") {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 42);
  return `${prefix}-${normalized || "TYPE"}`;
}
