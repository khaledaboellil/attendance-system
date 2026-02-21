import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("employees")
            .select("id, name, username, role")
            .order("name", { ascending: true })

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
        return NextResponse.json(data || [])
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الموظفين" }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name, username, password, role } = await req.json()
        if (!name || !username || !password || !role)
            return NextResponse.json({ error: "املأ كل البيانات" }, { status: 400 })

        // تحقق لو اليوزر موجود مسبقاً
        const { data: existing } = await supabase
            .from("employees")
            .select("*")
            .eq("username", username)
            .single()

        if (existing) return NextResponse.json({ error: "المستخدم موجود مسبقاً" }, { status: 400 })

        // IDs للأماكن الافتراضية التي تريد تعيينها للموظف الجديد
        const defaultLocations = [
            "a89a4bbf-83db-403b-b66d-4cb40250bd3d",
            "e2b17a94-a54e-4cb1-905d-9f13d2df3e20",
            "5bfa4c9c-08f5-442d-8441-f2cdd7e624da",
            "4d6aaa7a-9315-47e4-9d58-a0d27bf0a97c"
        ]

        const { error } = await supabase
            .from("employees")
            .insert([{ name, username, password, role, locations: defaultLocations }])

        if (error) return NextResponse.json({ error: error.message }, { status: 500 })

        return NextResponse.json({ message: "تم إضافة الموظف بنجاح" })
    } catch {
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة الموظف" }, { status: 500 })
    }
}