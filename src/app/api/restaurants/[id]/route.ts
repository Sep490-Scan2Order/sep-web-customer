import { NextRequest, NextResponse } from "next/server";
import { mockRestaurants } from "@/lib/mockData";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const restaurant = mockRestaurants.find((r) => r.id === id);

  if (!restaurant) {
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
  }

  return NextResponse.json(restaurant);
}
