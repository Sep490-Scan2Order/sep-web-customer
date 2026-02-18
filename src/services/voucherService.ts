import { api } from "@/axios";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
};

export interface VoucherResponseDto {
  id: number;
  name: string;
  description?: string | null;
  discountValue: number;
  minOrderAmount: number;
  pointRequire: number;
  status: string;
}

/**
 * Lấy danh sách voucher (Admin) từ API GET api/Voucher
 */
export async function getAllVouchers(): Promise<VoucherResponseDto[]> {
  const { data } = await api.get<ApiResponse<VoucherResponseDto[]>>("api/Voucher");
  return data.data;
}

