import React, { PropsWithChildren } from "react";
import { render } from "@testing-library/react";

function AllProviders({ children }: PropsWithChildren) {
  // Thêm các Provider cần thiết ở đây (Router, ThemeProvider, QueryClient, ...)
  return <>{children}</>;
}

function customRender(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from "@testing-library/react"; // Re-export tất cả RTL utilities
export { customRender as render };       // Override render
