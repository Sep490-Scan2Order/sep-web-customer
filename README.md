# S2O - Scan2Order

Nền tảng đặt món tại nhà hàng với công nghệ quét mã QR. Scan. Order. Enjoy.

## Chạy dự án

```bash
npm run dev
# hoặc
pnpm dev
# hoặc
bun dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

---

## Kiến trúc tổng quan

### Các folder chính

| Folder | Vai trò |
|--------|---------|
| **app/** | Chứa **pages** (controller) — nhận request, xử lý logic, gọi service. |
| **services/** | Lấy data (mock hoặc gọi API backend). Trả data về cho page. |
| **views/** | Giao diện trang — nhận data từ page qua props, chỉ lo render HTML. |
| **components/** | UI nhỏ tái sử dụng (button, card...) — dùng trong views. |
| **layouts/** | Khung chung (header, footer) — bao quanh nội dung trang. |
| **lib/** | Code dùng chung — constants, utils, mock data. |
| **types/** | Định nghĩa TypeScript — interfaces dùng chung. |
| **routes/** | Định nghĩa path (URL) — tránh hardcode. |

---

### Quy trình từ người dùng truy cập đến hiển thị

**Ví dụ 1:** Người dùng vào `/` (trang chủ).

```
1. Người dùng truy cập URL → /
2. app/page.tsx (Controller) → Gọi service: getRestaurants()
3. services/restaurantService.ts → Lấy mockData, trả về
4. Page nhận data → Truyền xuống View: <HomePage restaurants={data} />
5. views/HomePage (View) → Render HTML → Trả về giao diện
```

**Ví dụ 2:** Người dùng vào `/restaurant/1` (chi tiết nhà hàng).

```
1. Người dùng truy cập URL → /restaurant/1
2. app/restaurant/[id]/page.tsx (Controller) → Gọi service: getRestaurantById("1")
3. services/restaurantService.ts → Lấy mockData, tìm theo id, trả về
4. Page nhận data → Kiểm tra: có data không? Không → notFound()
5. Có → Truyền xuống View: <RestaurantDetailView restaurant={data} />
6. views/RestaurantDetail (View) → Render HTML → Trả về giao diện
```

**Tóm lại:** User → **app** (controller) → **services** (lấy data) → **views** (hiển thị).

Khi có Backend .NET: đổi service dùng `api.get()` và set `NEXT_PUBLIC_API_URL` trong `.env`.

---

## Deploy

Có thể deploy lên [Vercel](https://vercel.com/new) hoặc host tương thích Next.js.
