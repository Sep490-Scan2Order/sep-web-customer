import type {
  MenuLayoutConfig,
  MenuRestaurantTemplateResponseData,
  RestaurantMenuData,
} from "@/types";
import DishItemCard from "./DishItemCard";

interface MenuSectionProps {
  menuData: RestaurantMenuData;
  menuTemplateData: MenuRestaurantTemplateResponseData | null;
  layoutConfig: MenuLayoutConfig | null;
  activeCategory: string | null;
  setActiveCategory: (categoryId: string) => void;
  selectedDishes: Record<string, number>;
  onToggleDish: (dishId: string) => void;
  onQuantityChange: (dishId: string, delta: number) => void;
  isMenuLoading: boolean;
  menuError: string | null;
  searchQuery?: string;
  menuOnly?: boolean;
}

export default function MenuSection({
  menuData,
  menuTemplateData,
  layoutConfig,
  activeCategory,
  setActiveCategory,
  selectedDishes,
  onToggleDish,
  onQuantityChange,
  isMenuLoading,
  menuError,
  searchQuery = "",
  menuOnly = false,
}: MenuSectionProps) {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const resolvedBackgroundImageUrl =
    menuTemplateData?.menuTemplate?.backgroundImageUrl || layoutConfig?.canvas?.backgroundImageUrl;
  const matchesSearch = (name: string, description?: string) => {
    if (!normalizedQuery) return true;
    return `${name} ${description || ""}`.toLowerCase().includes(normalizedQuery);
  };

  const activeSection = menuData.sections.find((s) => s.id === activeCategory);
  const activeSectionDishes = activeSection?.dishes.filter((dish) =>
    matchesSearch(dish.name, dish.description)
  ) || [];
  const filteredUngroupedDishes = menuData.ungroupedDishes.filter((dish) =>
    matchesSearch(dish.name, dish.description)
  );

  return (
    <section
      style={{
        marginTop: "0px",
        minHeight: menuOnly ? "calc(100vh - 52px)" : "clamp(400px, 60vh, 550px)",
        backgroundColor: layoutConfig?.canvas?.backgroundColor || "#FFFFFF",
        backgroundImage: resolvedBackgroundImageUrl ? `url('${resolvedBackgroundImageUrl}')` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        padding: menuOnly ? "clamp(8px, 2vw, 12px)" : "clamp(12px, 3vw, 24px)",
        paddingBottom: menuOnly ? "96px" : "clamp(12px, 3vw, 24px)",
        fontFamily: menuTemplateData?.menuTemplate?.fontFamily || "inherit",
      }}
    >
      {!menuOnly && (
        <h2
          className="mb-2 text-base font-bold sm:mb-4 md:text-lg"
          style={{ color: menuTemplateData?.menuTemplate?.themeColor || "#1e293b" }}
        >
          Thực đơn
        </h2>
      )}

      {isMenuLoading && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-xs text-slate-500 sm:rounded-xl sm:p-6 sm:text-sm">
          Đang tải mẫu menu...
        </div>
      )}

      {!isMenuLoading && menuError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center text-xs text-rose-600 sm:rounded-xl sm:p-6 sm:text-sm">
          {menuError}
        </div>
      )}

      {!isMenuLoading && !menuError && menuData.sections.length === 0 && menuData.ungroupedDishes.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-center text-xs text-slate-500 sm:rounded-xl sm:p-6 sm:text-sm">
          Nhà hàng này chưa có menu.
        </div>
      )}

      {!isMenuLoading && !menuError && (menuData.sections.length > 0 || menuData.ungroupedDishes.length > 0) && (
        <div className="space-y-2 sm:space-y-4">
          {!menuOnly && menuTemplateData && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 sm:rounded-xl sm:p-4">
              <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                {menuTemplateData.menuTemplate.templateName}
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Template ID: {menuTemplateData.menuTemplate.id} • Menu Template ID: {menuTemplateData.menuTemplateId}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Màu chủ đạo: {menuTemplateData.menuTemplate.themeColor} • Font: {menuTemplateData.menuTemplate.fontFamily}
              </p>
            </div>
          )}

          {menuData.sections.length > 0 && (
            <div className="space-y-2 sm:space-y-4">
              <div className="overflow-x-auto">
                <div className="flex gap-1 pb-2 sm:gap-2">
                  {menuData.sections.map((section) => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveCategory(section.id)}
                      className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium transition sm:px-4 sm:py-2 sm:text-sm ${
                        activeCategory === section.id
                          ? "text-white shadow-sm"
                          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                      style={
                        activeCategory === section.id
                          ? { backgroundColor: menuTemplateData?.menuTemplate?.themeColor || "#22c55e" }
                          : undefined
                      }
                    >
                      {section.name}
                      <span className="ml-1 text-xs opacity-75 sm:ml-1.5">
                        ({section.dishes.filter((dish) => matchesSearch(dish.name, dish.description)).length})
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {activeSection && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 sm:rounded-xl sm:p-4">
                  <h4 className="text-sm font-semibold text-slate-900 sm:text-base">{activeSection.name}</h4>

                  {activeSectionDishes.length > 0 ? (
                    <div className="mt-2 space-y-2 sm:mt-3 sm:space-y-3">
                      {activeSectionDishes.map((dish) => (
                        <DishItemCard
                          key={dish.id}
                          dish={dish}
                          isSelected={!!selectedDishes[dish.id]}
                          quantity={selectedDishes[dish.id] || 0}
                          onToggleDish={onToggleDish}
                          onQuantityChange={onQuantityChange}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500 sm:mt-2">
                      {normalizedQuery ? "Không tìm thấy món phù hợp." : "Danh mục này chưa có món."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {filteredUngroupedDishes.length > 0 && (
            <div className="space-y-2 sm:space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3 sm:rounded-xl sm:p-4">
                <h4 className="text-sm font-semibold text-slate-900 sm:text-base">Món chưa phân loại</h4>
                <div className="mt-2 space-y-2 sm:mt-3 sm:space-y-3">
                  {filteredUngroupedDishes.map((dish) => (
                    <DishItemCard
                      key={dish.id}
                      dish={dish}
                      isSelected={!!selectedDishes[dish.id]}
                      quantity={selectedDishes[dish.id] || 0}
                      onToggleDish={onToggleDish}
                      onQuantityChange={onQuantityChange}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
