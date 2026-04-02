import { api } from "@/services/apiClient";
import { API_BASE_URL } from "@/services/api";
import type { HybridSearchResponse, HybridSearchResult } from "@/types";

export interface HybridSearchParams {
  keyword: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  topK?: number;
}

/**
 * Performs a hybrid search for restaurants and dishes
 * @param params Search parameters
 * @returns Array of search results with restaurants and suggested dishes
 */
export async function hybridSearch(params: HybridSearchParams): Promise<HybridSearchResult[]> {
  const {
    keyword,
    latitude = null,
    longitude = null,
    radiusKm = 20,
    topK = 20,
  } = params;

  // Build query parameters
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

  try {
    const { data } = await api.get<HybridSearchResponse>(
      `/Search/hybrid?${queryParams.toString()}`
    );

    if (!data.isSuccess) {
      throw new Error(data.message || "Search failed");
    }

    return data.data || [];
  } catch (error) {
    console.error("Hybrid search error:", error);
    throw error;
  }
}
