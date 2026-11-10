import {
  createStaffResponseSchema,
  loginHistoryResponseSchema,
  resetPasswordResponseSchema,
  staffListResponseSchema,
  staffMemberResponseSchema,
  type CreateStaffRequest,
  type UpdateStaffRequest,
} from "@books/shared";
import { apiRequest } from "@/lib/api";

const member = (id: string) => `/staff/${encodeURIComponent(id)}`;

/** Typed calls to /api/v1/staff (F02 §4). */
export const staffApi = {
  list: () => apiRequest("/staff", { schema: staffListResponseSchema }),
  create: (body: CreateStaffRequest) =>
    apiRequest("/staff", { method: "POST", body, schema: createStaffResponseSchema }),
  update: (id: string, body: UpdateStaffRequest) =>
    apiRequest(member(id), { method: "PATCH", body, schema: staffMemberResponseSchema }),
  switchOff: (id: string) =>
    apiRequest(`${member(id)}/switch-off`, { method: "POST", schema: staffMemberResponseSchema }),
  switchOn: (id: string) =>
    apiRequest(`${member(id)}/switch-on`, { method: "POST", schema: staffMemberResponseSchema }),
  resetPassword: (id: string) =>
    apiRequest(`${member(id)}/reset-password`, {
      method: "POST",
      schema: resetPasswordResponseSchema,
    }),
  logins: (id: string) =>
    apiRequest(`${member(id)}/logins`, { schema: loginHistoryResponseSchema }),
};
