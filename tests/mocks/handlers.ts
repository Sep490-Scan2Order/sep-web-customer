import { http, HttpResponse } from "msw";

export const handlers = [
  // Ví dụ về cấu hình intercept 1 endpoint (cập nhật lại cho customer project khi cần)
  http.get("/api/example", async () => {
    return HttpResponse.json({ 
      isSuccess: true, 
      data: { message: "Hello from MSW" } 
    });
  }),
];
