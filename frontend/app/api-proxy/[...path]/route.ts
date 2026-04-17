import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Strip hop-by-hop / duplicate headers when forwarding to the FastAPI backend. */
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function backendBase(): string {
  const raw = (process.env.BACKEND_URL || "http://127.0.0.1:8000").trim();
  return raw.replace(/\/$/, "");
}

function forwardRequestHeaders(req: NextRequest): Headers {
  const out = new Headers();
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    out.append(key, value);
  });
  return out;
}

function forwardResponseHeaders(upstream: Response): Headers {
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    out.append(key, value);
  });
  return out;
}

async function proxy(req: NextRequest, pathSegments: string[]): Promise<Response> {
  const base = backendBase();
  const suffix = pathSegments.length ? pathSegments.join("/") : "";
  const url = `${base}/${suffix}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: forwardRequestHeaders(req),
    redirect: "manual",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const buf = await req.arrayBuffer();
    if (buf.byteLength > 0) {
      init.body = buf;
    }
  }

  const upstream = await fetch(url, init);
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: forwardResponseHeaders(upstream),
  });
}

type RouteCtx = { params: { path: string[] } };

function segments(ctx: RouteCtx): string[] {
  return ctx.params.path ?? [];
}

export async function GET(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function HEAD(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function POST(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function PUT(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  return proxy(req, segments(ctx));
}
