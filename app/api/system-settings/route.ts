import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
    try {
        const { data, error } = await supabase
            .from("system_settings")
            .select("*")
            .eq("id", 1)
            .single()

        if (error) {
            // إذا لم يكن هناك إعدادات، ننشئ الإعدادات الافتراضية
            const { data: newData, error: insertError } = await supabase
                .from("system_settings")
                .insert([{
                    id: 1,
                    month_start_day: 16,
                    month_end_day: 15,
                    max_hours_per_month: 2,
                    working_days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
                }])
                .select()
                .single()

            if (insertError) {
                return NextResponse.json({
                    error_ar: "خطأ في إنشاء الإعدادات",
                    error_en: "Error creating settings"
                }, { status: 500 })
            }

            return NextResponse.json(newData)
        }

        return NextResponse.json(data)
    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ في الخادم",
            error_en: "Server error"
        }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const settings = await req.json()

        const { data, error } = await supabase
            .from("system_settings")
            .update({
                month_start_day: settings.month_start_day,
                month_end_day: settings.month_end_day,
                max_hours_per_month: settings.max_hours_per_month,
                working_days: settings.working_days,
                updated_at: new Date()
            })
            .eq("id", 1)
            .select()
            .single()

        if (error) {
            return NextResponse.json({
                error_ar: error.message,
                error_en: error.message
            }, { status: 500 })
        }

        return NextResponse.json({
            message_ar: "تم حفظ الإعدادات بنجاح",
            message_en: "Settings saved successfully",
            data
        })
    } catch (error) {
        return NextResponse.json({
            error_ar: "حدث خطأ في حفظ الإعدادات",
            error_en: "Error saving settings"
        }, { status: 500 })
    }
}