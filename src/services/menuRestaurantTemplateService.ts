import { api } from "@/axios";
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

function toSourceCandidates(source: string | undefined, kind: "category" | "dish"): string[] {
	const normalized = source?.trim().toUpperCase();
	if (normalized === "API.CATEGORY.GET_ALL") {
		return ["api/Category", "api/Categories", "api/Category/get-all"];
	}
	if (normalized === "API.DISHES.GET_ALL") {
		return ["api/Dishes", "api/Dish", "api/Dishes/get-all"];
	}
	if (!source) {
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
	restaurantId: number
): Promise<Record<string, unknown>[]> {
	for (const path of paths) {
		try {
			const { data } = await api.get<unknown>(path, {
				params: {
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
	mapping: MenuLayoutConfig["dataMapping"]
): Promise<RestaurantMenuData> {
	if (!mapping) {
		return { sections: [], ungroupedDishes: [] };
	}

	const categoryPaths = toSourceCandidates(mapping.categories?.source, "category");
	const dishPaths = toSourceCandidates(mapping.dishes?.source, "dish");

	const [categoryRaw, dishRaw] = await Promise.all([
		fetchFirstMatchedArray(categoryPaths, restaurantId),
		fetchFirstMatchedArray(dishPaths, restaurantId),
	]);

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
