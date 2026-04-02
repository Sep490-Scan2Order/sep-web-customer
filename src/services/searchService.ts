import { API, API_BASE_URL } from "@/services/api";
import { api } from "@/services/apiClient";
import type { HybridSearchResult } from "@/types";

type ApiResponse<T> = {
  isSuccess: boolean;
  message: string;
  data: T;
};

export async function searchHybrid(params: {
    keyword: string;
    latitude?: number | null;
    longitude?: number | null;
    radiusKm?: number;
    topK?: number;
}): Promise<HybridSearchResult[]> {
    const {
      keyword,
      latitude = null,
      longitude = null,
      radiusKm = 20,
      topK = 20,
    } = params;

    const queryParams = new URLSearchParams();
    queryParams.append("Keyword", keyword);
    
    if (latitude != null) {
      queryParams.append("Latitude", String(latitude));
    }
    if (longitude != null) {
      queryParams.append("Longitude", String(longitude));
    }
    
    queryParams.append("RadiusKm", String(radiusKm));
    queryParams.append("TopK", String(topK));

    const { data } = await api.get<ApiResponse<HybridSearchResult[]>>(
        `/Search/hybrid?${queryParams.toString()}`
    );
    return data.data ?? [];
}