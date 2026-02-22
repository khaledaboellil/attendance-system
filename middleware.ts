import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
    const username = req.cookies.get("username")?.value
    const role = req.cookies.get("role")?.value

    const url = req.nextUrl.clone()

    // حماية صفحات admin و employee
    if ((url.pathname.startsWith("/admin") || url.pathname.startsWith("/employee")) && !username) {
        url.pathname = "/"
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/admin/:path*", "/employee/:path*"]
}