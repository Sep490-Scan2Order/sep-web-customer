import { api } from "@/axios";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
};

/**
 * Lấy điểm thành viên hiện tại của Customer.
 * GET api/MemberPoint/my-point
 * Auth: Bearer JWT, role Customer. User ID lấy từ JWT (claim sub).
 * @returns Điểm hiện tại (số nguyên, 0 nếu chưa có MemberPoint)
 */
export async function getMyPoint(): Promise<number> {
  const { data } = await api.get<ApiResponse<number>>("api/MemberPoint/my-point");
  return data.data;
}
