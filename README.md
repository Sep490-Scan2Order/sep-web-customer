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
| **app/** | Chứa **pages** (controller) — nhận request, xử lý logic, gọi service. Có cả **api/** để trả data (mock hoặc proxy backend). |
| **services/** | Gọi API qua axios — **duy nhất** nơi gọi API. Trả data về cho page. |
| **views/** | Giao diện trang — nhận data từ page qua props, chỉ lo render HTML. |
| **components/** | UI nhỏ tái sử dụng (button, card...) — dùng trong views. |
| **layouts/** | Khung chung (header, footer) — bao quanh nội dung trang. |
| **lib/** | Code dùng chung — constants, utils, mock data. |
| **types/** | Định nghĩa TypeScript — interfaces dùng chung. |
| **routes/** | Định nghĩa path (URL) — tránh hardcode. |

---

### Quy trình từ người dùng truy cập đến hiển thị

**Ví dụ:** Người dùng vào `/restaurant/1` để xem chi tiết nhà hàng.

```
1. Người dùng truy cập URL
   → /restaurant/1

2. app/restaurant/[id]/page.tsx (Controller)
   → Nhận params (id = "1")
   → Gọi service: getRestaurantById("1")

3. services/restaurantService.ts gọi API qua axios
   → Gửi request: GET /api/restaurants/1

4. app/api/restaurants/[id]/route.ts (API) nhận request
   → Lấy data (mock hoặc từ backend thật)
   → Trả JSON lại cho service (service nhận được data)

5. Page nhận data từ service
   → Kiểm tra: có data không? Không → notFound()
   → Có → Truyền xuống View: <RestaurantDetailView restaurant={data} />

6. views/RestaurantDetail (View)
   → Nhận props restaurant
   → Render HTML với components (layout, card, v.v.)
   → Trả về giao diện cho người dùng
```

**Tóm lại:** User → **app** (controller) → **services** (lấy data) → **API** → data về → **views** (hiển thị).

---

## Deploy

Có thể deploy lên [Vercel](https://vercel.com/new) hoặc host tương thích Next.js.
