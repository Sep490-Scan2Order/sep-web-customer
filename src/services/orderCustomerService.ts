import { API } from "@/services/api";
import { api } from "@/services/apiClient";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
  errors?: unknown;
  timestamp?: string;
};

export type CustomerOrderSummary = {
  orderId: string;
  orderCode: number;
  status: number;
  createdAt: string;
  finalAmount: number;
  qrCodeUrl: string;
  orderDetails?: Array<{
    dishId: number;
    dishName: string;
    imageUrl?: string | null;
    quantity: number;
    originalPrice: number;
    discountedPrice?: number | null;
    subTotal: number;
  }>;
};

export async function getCustomerOrders(params: {
  restaurantId: number | string;
  phoneNumber: string;
  limit?: number;
}): Promise<CustomerOrderSummary[]> {
  const { data } = await api.get<ApiResponse<CustomerOrderSummary[]>>(
    API.ORDER.CUSTOMER_GET_ORDERS,
    {
      params: {
        restaurantId: params.restaurantId,
        phone: params.phoneNumber,
        limit: params.limit ?? 20,
      },
      // khách tra cứu theo SĐT không cần token
      _skipAuth: true,
    } as unknown as Record<string, unknown>
  );

  return Array.isArray(data.data) ? data.data : [];
}

