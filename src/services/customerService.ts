import { api } from "@/axios";

export interface UpdateCustomerInfoRequest {
  name: string;
  dob: string;
}

export interface UpdateCustomerInfoResponse {
  isSuccess: boolean;
  message: string;
  data?: {
    dob: string;
    name: string;
    accountId: string;
    id: string;
  };
  errors: string[] | null;
  timestamp: string;
}

/**
 * Cập nhật thông tin khách hàng (tên và ngày sinh).
 * PUT /api/Customer/update-info
 */
export async function updateCustomerInfo(
  name: string,
  dob: string
): Promise<UpdateCustomerInfoResponse> {
  const { data } = await api.put<UpdateCustomerInfoResponse>(
    "api/Customer/update-info",
    { name, dob }
  );
  return data;
}
