import { api } from "@/services/apiClient";
import type {
	GroupedMenuResponse,
	MenuLayoutConfig,
	MenuRestaurantTemplateResponse,
	MenuRestaurantTemplateResponseData,
} from "@/types";

export interface MenuCategoryItem {
	id: string;
	name: string;
}

export interface MenuDishItem {
	id: string;
	name: string;
	price: number | null;
	description: string;
	categoryId: string;
	imageUrl?: string;
	isSoldOut?: boolean;
}

export interface RestaurantMenuSection {
	id: string;
	name: string;
	dishes: MenuDishItem[];
}

export interface RestaurantMenuData {
	sections: RestaurantMenuSection[];
	ungroupedDishes: MenuDishItem[];
}

export async function getMenuRestaurantTemplateByRestaurantId(
	restaurantId: number
): Promise<MenuRestaurantTemplateResponseData | null> {
	if (!Number.isFinite(restaurantId) || restaurantId <= 0) return null;

	try {
		const { data } = await api.get<MenuRestaurantTemplateResponse>(
			`api/MenuRestaurant/${restaurantId}`
		);
		if (data.isSuccess && data.data) return data.data;
		return null;
	} catch (err: unknown) {
		const status = (err as { response?: { status?: number } })?.response?.status;
		if (status === 404) return null;
		throw err;
	}
}

export function parseMenuLayoutConfig(
	layoutConfigJson?: string | null
): MenuLayoutConfig | null {
	if (!layoutConfigJson) return null;

	try {
		const parsed = JSON.parse(layoutConfigJson) as MenuLayoutConfig;
		if (!parsed || !Array.isArray(parsed.slots)) return null;
		return parsed;
	} catch {
		return null;
	}
}

function getStringValue(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return "";
}

function getNumberValue(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

function extractArrayPayload(payload: unknown): Record<string, unknown>[] {
	if (Array.isArray(payload)) {
		return payload.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null
		);
	}

	if (!payload || typeof payload !== "object") return [];
	const objectPayload = payload as Record<string, unknown>;

	if (Array.isArray(objectPayload.data)) {
		return objectPayload.data.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null
		);
	}

	const nestedData = objectPayload.data;
	if (nestedData && typeof nestedData === "object") {
		const nestedDataRecord = nestedData as Record<string, unknown>;
		if (Array.isArray(nestedDataRecord.items)) {
			return nestedDataRecord.items.filter(
				(item): item is Record<string, unknown> =>
					typeof item === "object" && item !== null
			);
		}
	}

	if (Array.isArray(objectPayload.items)) {
		return objectPayload.items.filter(
			(item): item is Record<string, unknown> =>
				typeof item === "object" && item !== null
		);
	}

	return [];
}

function toSourceCandidates(
	source: string | undefined,
	kind: "category" | "dish",
	tenantId?: string
): string[] {
	const normalized = source?.trim().toUpperCase();
	
	// Xử lý API.CATEGORY.GET_ALL_BY_TENANT_ID(tenantId)
	if (normalized?.includes("GET_ALL_BY_TENANT_ID")) {
		if (!tenantId) {
			console.warn("tenantId required for GET_ALL_BY_TENANT_ID but not provided");
			return [];
		}
		if (normalized.includes("CATEGORY")) {
			return [`api/Category/get-category-by-tenantId/${tenantId}`];
		}
		if (normalized.includes("DISH")) {
			return [`api/Dish/get-dish-by-tenantId/${tenantId}`];
		}
	}
	
	// Nếu source là GET_ALL nhưng có tenantId, ưu tiên dùng GET_ALL_BY_TENANT_ID
	if (normalized === "API.CATEGORY.GET_ALL" || normalized === "API.CATEGORIES.GET_ALL") {
		if (tenantId) {
			// Có tenantId → dùng endpoint by tenantId
			return [`api/Category/get-category-by-tenantId/${tenantId}`];
		}
		// Không có tenantId → fallback endpoint cũ
		return ["api/Category", "api/Categories", "api/Category/get-all"];
	}
	
	if (normalized === "API.DISHES.GET_ALL" || normalized === "API.DISH.GET_ALL") {
		if (tenantId) {
			// Có tenantId → dùng endpoint by tenantId
			return [`api/Dish/get-dish-by-tenantId/${tenantId}`];
		}
		// Không có tenantId → fallback endpoint cũ
		return ["api/Dishes", "api/Dish", "api/Dishes/get-all"];
	}
	
	if (!source) {
		// Default fallback
		if (tenantId) {
			return kind === "category"
				? [`api/Category/get-category-by-tenantId/${tenantId}`]
				: [`api/Dish/get-dish-by-tenantId/${tenantId}`];
		}
		return kind === "category"
			? ["api/Category", "api/Categories"]
			: ["api/Dishes", "api/Dish"];
	}

	const trimmed = source.trim();
	if (/^https?:\/\//i.test(trimmed)) {
		return [trimmed];
	}

	if (trimmed.startsWith("/")) {
		return [trimmed.slice(1)];
	}

	return [trimmed];
}

async function fetchFirstMatchedArray(
	paths: string[],
	restaurantId?: number
): Promise<Record<string, unknown>[]> {
	for (const path of paths) {
		try {
			// Kiểm tra nếu path đã có tenantId trong URL thì không cần thêm params
			const hasTenantIdInPath = path.includes("/get-category-by-tenantId/") || 
									   path.includes("/get-dish-by-tenantId/");
			
			const { data } = await api.get<unknown>(path, {
				params: hasTenantIdInPath ? undefined : {
					restaurantId,
					restaurantID: restaurantId,
					restaurant_id: restaurantId,
				},
			});
			return extractArrayPayload(data);
		} catch (err: unknown) {
			const status = (err as { response?: { status?: number } })?.response?.status;
			if (status === 404 || status === 400) {
				continue;
			}
			throw err;
		}
	}

	return [];
}

function normalizeCategory(
	item: Record<string, unknown>,
	index: number,
	displayField?: string
): MenuCategoryItem {
	const id = getStringValue(item.id ?? item.categoryId ?? `cat-${index}`) || `cat-${index}`;
	const preferredField = displayField?.trim();
	const name =
		(preferredField ? getStringValue(item[preferredField]) : "") ||
		getStringValue(item.categoryName) ||
		getStringValue(item.name) ||
		`Danh mục ${index + 1}`;

	return { id, name };
}

function normalizeDish(item: Record<string, unknown>, index: number): MenuDishItem {
	return {
		id: getStringValue(item.id ?? item.dishId ?? `dish-${index}`) || `dish-${index}`,
		name:
			getStringValue(item.dishName) ||
			getStringValue(item.name) ||
			`Món ${index + 1}`,
		price:
			getNumberValue(item.price) ??
			getNumberValue(item.basePrice) ??
			getNumberValue(item.sellingPrice),
		description:
			getStringValue(item.description) || getStringValue(item.shortDescription),
		categoryId:
			getStringValue(item.categoryId) ||
			getStringValue(item.categoryID) ||
			getStringValue(item.menuCategoryId),
	};
}

export async function getRestaurantMenuByDataMapping(
	restaurantId: number,
	mapping: MenuLayoutConfig["dataMapping"],
	tenantId?: string
): Promise<RestaurantMenuData> {
	if (!mapping) {
		return { sections: [], ungroupedDishes: [] };
	}

	const categoryPaths = toSourceCandidates(mapping.categories?.source, "category", tenantId);
	const dishPaths = toSourceCandidates(mapping.dishes?.source, "dish", tenantId);

	console.log("📡 Fetching from paths:");
	console.log("  Categories:", categoryPaths);
	console.log("  Dishes:", dishPaths);

	const [categoryRaw, dishRaw] = await Promise.all([
		fetchFirstMatchedArray(categoryPaths, restaurantId),
		fetchFirstMatchedArray(dishPaths, restaurantId),
	]);

	console.log(`📊 Fetched ${categoryRaw.length} categories, ${dishRaw.length} dishes`);

	const categories = categoryRaw.map((item, index) =>
		normalizeCategory(item, index, mapping.categories?.displayField)
	);
	const dishes = dishRaw.map((item, index) => normalizeDish(item, index));

	const dishByCategory = new Map<string, MenuDishItem[]>();
	for (const dish of dishes) {
		if (!dish.categoryId) continue;
		const key = dish.categoryId;
		const existing = dishByCategory.get(key) || [];
		existing.push(dish);
		dishByCategory.set(key, existing);
	}

	const sections: RestaurantMenuSection[] = categories.map((category) => ({
		id: category.id,
		name: category.name,
		dishes: dishByCategory.get(category.id) || [],
	}));

	const matchedCategoryIds = new Set(sections.map((section) => section.id));
	const ungroupedDishes = dishes.filter(
		(dish) => !dish.categoryId || !matchedCategoryIds.has(dish.categoryId)
	);

	if (!categories.length && dishes.length) {
		return {
			sections: [
				{
					id: "all-dishes",
					name: "Tất cả món",
					dishes,
				},
			],
			ungroupedDishes: [],
		};
	}

	return { sections, ungroupedDishes };
}

export async function getRestaurantGroupedMenu(
	restaurantId: number
): Promise<RestaurantMenuData> {
	if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
		return { sections: [], ungroupedDishes: [] };
	}

	const endpoints = [
		`api/Restaurant/${restaurantId}/menu`,
		`api/Menu/restaurant/${restaurantId}`,
		`api/Dish/by-restaurant/${restaurantId}`,
	];

	for (const endpoint of endpoints) {
		try {
			const { data } = await api.get<GroupedMenuResponse>(endpoint);
			if (!data.isSuccess || !Array.isArray(data.data)) continue;

			const sections: RestaurantMenuSection[] = data.data.map((category) => ({
				id: String(category.categoryId),
				name: category.categoryName,
				dishes: category.dishes.map((dish) => ({
					id: String(dish.dishId),
					name: dish.dishName,
					price: dish.price,
					description: dish.description || "",
					categoryId: String(category.categoryId),
					imageUrl: dish.imageUrl,
					isSoldOut: dish.isSoldOut,
				})),
			}));

			return { sections, ungroupedDishes: [] };
		} catch (err: unknown) {
			const status = (err as { response?: { status?: number } })?.response?.status;
			if (status === 404 || status === 400) continue;
			throw err;
		}
	}

	return { sections: [], ungroupedDishes: [] };
}

/**
 * Kết quả lấy menu từ template
 */
export interface RestaurantMenuFromTemplateResult {
	menuData: RestaurantMenuData;
	templateData: MenuRestaurantTemplateResponseData | null;
}

/**
 * Lấy menu của restaurant từ template đã được áp dụng
 * Fetch menu data từ grouped menu API
 * Trả về cả menu data lẫn template info
 */
export async function getRestaurantMenuFromTemplate(
	restaurantId: number
): Promise<RestaurantMenuFromTemplateResult> {
	const defaultResult: RestaurantMenuFromTemplateResult = {
		menuData: { sections: [], ungroupedDishes: [] },
		templateData: null,
	};

	if (!Number.isFinite(restaurantId) || restaurantId <= 0) {
		return defaultResult;
	}

	try {
		// Lấy template của restaurant (để có layout config)
		const templateData = await getMenuRestaurantTemplateByRestaurantId(restaurantId);

		console.log(`🔍 Fetching menu for restaurant ${restaurantId}`);

		// Fetch menu data từ grouped menu API
		const menuData = await getRestaurantGroupedMenu(restaurantId);

		console.log(`✅ Loaded ${menuData.sections.length} sections, ${menuData.ungroupedDishes.length} ungrouped dishes`);
		return { menuData, templateData };
	} catch (err: unknown) {
		console.error("Error loading menu from template:", err);
		// Fallback về grouped menu API nếu có lỗi
		const groupedMenu = await getRestaurantGroupedMenu(restaurantId);
		return { menuData: groupedMenu, templateData: null };
	}
}
