import { NextResponse } from "next/server";
import { mockRestaurants } from "@/lib/mockData";

export async function GET() {
  return NextResponse.json(mockRestaurants);
}
