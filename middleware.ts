import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname
    const role = request.cookies.get('role')?.value || ''
    const remembered = request.cookies.get('remembered')?.value || ''

    console.log(`🔍 مسار: ${path}, الدور: ${role}, متذكر: ${remembered}`)

    // لو مش مسجل دخول ومفيش تذكر، نسمح فقط بالصفحة الرئيسية
    if (!role && !remembered && path !== '/') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // المسارات المحمية
    if (path.startsWith('/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    if (path.startsWith('/manager') && role !== 'manager') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    if (path.startsWith('/employee') && !['employee'].includes(role)) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/manager/:path*', '/employee/:path*'],
}