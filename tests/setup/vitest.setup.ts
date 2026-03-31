import { vi, beforeAll, afterEach, afterAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";
import { server } from "../mocks/server";
import React from "react";

// Mock Next.js built-ins không hoạt động trong jsdom
vi.mock("next/image", () => ({ default: (props: any) => React.createElement("img", props) }));
vi.mock("next/link", () => ({ default: ({ href, children }: any) => React.createElement("a", { href }, children) }));

// Vòng đời MSW server
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

afterEach(() => {
  cleanup();              // Unmount React trees
  server.resetHandlers(); // Xóa handler override tạm thời
  window.localStorage.clear();
});

afterAll(() => server.close());
