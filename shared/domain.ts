export const DOMAIN_MODULES = [
  "dashboard",
  "taxpayers",
  "activities",
  "territory",
  "taxation",
  "obligations",
  "payments",
  "receipts",
  "deposits",
  "reports",
  "administration",
  "audit",
  "synchronization",
] as const;

export const DOMAIN_ACTIONS = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE_LOGICAL",
  "VALIDATE",
  "CANCEL",
  "PRINT",
  "EXPORT",
  "MANAGE_SETTINGS",
  "AUDIT_VIEW",
  "SYNC",
] as const;

export const PAYMENT_STATES = ["PENDING_SYNC", "PENDING", "VALIDATED", "CANCELLED", "REFUNDED"] as const;
export const OBLIGATION_STATES = ["PENDING", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED", "EXEMPTED"] as const;
export const DEPOSIT_STATES = ["PENDING", "SUBMITTED", "VALIDATED", "PARTIALLY_VALIDATED", "REJECTED"] as const;
