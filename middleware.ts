import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
    const role = request.cookies.get("role")?.value

    // لو حد حاول يدخل صفحة الأدمن
    if (request.nextUrl.pathname.startsWith("/admin")) {
        if (role !== "admin") {
            return NextResponse.redirect(new URL("/", request.url))
        }
    }

    return NextResponse.next()
}

// تحديد الصفحات اللي يتطبق عليها الحماية
export const config = {
    matcher: ["/admin/:path*"]
}