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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log("[Render API] 正在调用渲染服务...");
    console.log("[Render API] 服务地址:", RENDER_SERVER);

    // 调用 Remotion 渲染服务
    const response = await fetch(`${RENDER_SERVER}/api/render`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        design: body.design,
        options: body.options
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Render API] 渲染服务错误:", errorText);
      return NextResponse.json(
        { message: "渲染服务错误: " + errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("[Render API] 渲染任务已创建:", data);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[Render API] 错误:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
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
      }
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: "Failed to fetch render status" },
        { status: response.status }
      );
    }

    const statusData = await response.json();
    return NextResponse.json(statusData, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
