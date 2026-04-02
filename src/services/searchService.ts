import { API, API_BASE_URL } from "@/services/api";
import { api } from "@/services/apiClient";
import { SearchResultItem } from "@/types";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
};

export async function searchHybrid(params: {
    keyword: string;
    latitude?: number;
    longitude?: number;
    radiusKm: number;
    topK: number;
}): Promise<SearchResultItem[]> {
    const { data } = await api.get<ApiResponse<SearchResultItem[]>>(
        API.SEARCH.SEARCH_HYBRID(params)
    );
    return data.data ?? [];
}