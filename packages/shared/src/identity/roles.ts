/** Roles from F02 §4.1. Approvers never see approval steps for their own actions (G1). */
export const ROLES = ["owner", "manager", "cashier", "storekeeper", "accountant"] as const;
export type Role = (typeof ROLES)[number];

export const LANGUAGES = ["en", "so"] as const;
export type Language = (typeof LANGUAGES)[number];
