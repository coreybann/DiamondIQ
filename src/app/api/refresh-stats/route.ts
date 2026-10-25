import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!secret || authorization !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  revalidatePath("/stats", "page");
  revalidatePath("/stats/team/[id]", "page");

  return NextResponse.json({
    message: "DiamondIQ stats cache invalidation requested",
    status: "success",
  });
}