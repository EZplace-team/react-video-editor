import { NextResponse } from "next/server";

// 渲染服务地址（从环境变量 VIDEO_RANDER_URL 读取）
function getRenderServerUrl(): string {
  const url = process.env.VIDEO_RANDER_URL || "localhost:3001";
  // 自动补全 http:// 前缀
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `http://${url}`;
  }
  return url;
}

const RENDER_SERVER = getRenderServerUrl();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { message: "id parameter is required" },
        { status: 400 }
      );
    }

    // 调用渲染服务查询状态
    const response = await fetch(`${RENDER_SERVER}/api/render/${id}`, {
      headers: {
        "Content-Type": "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Render Status] 查询失败:", errorText);
      return NextResponse.json(
        { message: "Failed to get render status" },
        { status: response.status }
      );
    }

    const statusData = await response.json();
    
    // 如果有 presigned_url 且是相对路径，转换为完整 URL
    if (statusData.render?.presigned_url && statusData.render.presigned_url.startsWith('/')) {
      statusData.render.presigned_url = `${RENDER_SERVER}${statusData.render.presigned_url}`;
    }
    
    return NextResponse.json(statusData, { status: 200 });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
