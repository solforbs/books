import { myAccessResponseSchema } from "@books/shared";
import { apiRequest } from "@/lib/api";

/** What the logged-in person may do in the selected business (role, locations, permissions). */
export const fetchMyAccess = () =>
  apiRequest("/me/permissions", { schema: myAccessResponseSchema });
