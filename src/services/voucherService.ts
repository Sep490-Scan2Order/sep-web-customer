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

export async function getAllVouchers(): Promise<VoucherResponseDto[]> {
  const { data } = await api.get<ApiResponse<VoucherResponseDto[]>>("api/Voucher");
  return data.data;
}

export interface RedeemVoucherRequest {
  voucherId: number;
}

export interface MemberVoucherDto {
  memberVoucherId: number;
  voucherId: number;
  voucherName: string;
  discountValue: number;
  minOrderAmount: number;
  expiredAt: string | null;
}

export type RedeemVoucherResponse = MemberVoucherDto;

export type MyVouchersResponse = MemberVoucherDto[];

export type MyExpiredVouchersResponse = MemberVoucherDto[];

export async function redeemVoucher(
  request: RedeemVoucherRequest
): Promise<RedeemVoucherResponse> {
  const { data } = await api.post<ApiResponse<RedeemVoucherResponse>>(
    "api/voucher/redeem",
    request
  );
  return data.data;
}

export async function getMyVouchers(): Promise<MyVouchersResponse> {
  const { data } = await api.get<ApiResponse<MyVouchersResponse>>(
    "api/voucher/my-vouchers"
  );
  return data.data;
}

export async function getMyExpiredVouchers(): Promise<MyExpiredVouchersResponse> {
  const { data } = await api.get<ApiResponse<MyExpiredVouchersResponse>>(
    "api/voucher/my-expired-vouchers"
  );
  return data.data;
}

