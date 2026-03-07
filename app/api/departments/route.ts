import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: جلب كل الأقسام
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const manager_id = searchParams.get("manager_id")
        
        console.log("جاري جلب الأقسام...")
        
        let query = supabase
            .from("departments")
            .select(`
                id, 
                name
            `)
            .order("name", { ascending: true })

        // لو المدير، نجيب الأقسام اللي هو مدير عليها بس
        if (manager_id) {
            const { data: managedDepts } = await supabase
                .from("manager_departments")
                .select("department_id")
                .eq("manager_id", manager_id)
            
            const deptIds = managedDepts?.map(d => d.department_id) || []
            if (deptIds.length > 0) {
                query = query.in("id", deptIds)
            } else {
                return NextResponse.json([])
            }
        }

        const { data, error } = await query

        if (error) {
            console.error("خطأ في جلب الأقسام:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }
        
        // جلب عدد الموظفين لكل قسم
        const departmentsWithCount = await Promise.all(
            (data || []).map(async (dept) => {
                const { count, error: countError } = await supabase
                    .from("employees")
                    .select("*", { count: "exact", head: true })
                    .eq("department_id", dept.id)
                
                // جلب المدراء المسؤولين عن القسم
                const { data: managers } = await supabase
                    .from("manager_departments")
                    .select(`
                        manager_id,
                        employees:manager_id (name, username)
                    `)
                    .eq("department_id", dept.id)
                
                // تحويل بيانات المدراء مع التأكد من النوع
                const managersList = managers?.map(m => {
                    // التأكد من أن employees هو كائن وليس مصفوفة
                    const empData = Array.isArray(m.employees) ? m.employees[0] : m.employees
                    return {
                        id: m.manager_id,
                        name: empData?.name || "",
                        username: empData?.username || ""
                    }
                }) || []
                
                return {
                    id: dept.id,
                    name: dept.name,
                    employees_count: count || 0,
                    managers: managersList
                }
            })
        )
        
        console.log("تم جلب الأقسام بنجاح:", departmentsWithCount.length)
        return NextResponse.json(departmentsWithCount || [])
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء جلب الأقسام" }, { status: 500 })
    }
}

// POST: إضافة قسم جديد
export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json()
        
        if (!name) {
            return NextResponse.json({ error: "اسم القسم مطلوب" }, { status: 400 })
        }

        // التحقق من عدم وجود قسم بنفس الاسم
        const { data: existing, error: checkError } = await supabase
            .from("departments")
            .select("id")
            .eq("name", name)
            .maybeSingle()

        if (checkError) {
            console.error("خطأ في التحقق من وجود القسم:", checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "يوجد قسم بنفس الاسم بالفعل" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("departments")
            .insert([{ name }])
            .select()
            .single()

        if (error) {
            console.error("خطأ في إضافة القسم:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ 
            message: "تم إضافة القسم بنجاح", 
            department: {
                id: data.id,
                name: data.name,
                employees_count: 0,
                managers: []
            }
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء إضافة القسم" }, { status: 500 })
    }
}

// PUT: تعديل قسم
export async function PUT(req: NextRequest) {
    try {
        const { id, name } = await req.json()
        
        if (!id || !name) {
            return NextResponse.json({ error: "معرف القسم واسمه مطلوب" }, { status: 400 })
        }

        // التحقق من عدم وجود قسم آخر بنفس الاسم
        const { data: existing, error: checkError } = await supabase
            .from("departments")
            .select("id")
            .eq("name", name)
            .neq("id", id)
            .maybeSingle()

        if (checkError) {
            console.error("خطأ في التحقق من وجود القسم:", checkError)
            return NextResponse.json({ error: checkError.message }, { status: 500 })
        }

        if (existing) {
            return NextResponse.json({ error: "يوجد قسم بنفس الاسم بالفعل" }, { status: 400 })
        }

        const { data, error } = await supabase
            .from("departments")
            .update({ name })
            .eq("id", id)
            .select()
            .single()

        if (error) {
            console.error("خطأ في تعديل القسم:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ 
            message: "تم تعديل القسم بنجاح", 
            department: data 
        })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء تعديل القسم" }, { status: 500 })
    }
}

// DELETE: حذف قسم
export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const id = searchParams.get("id")

        if (!id) {
            return NextResponse.json({ error: "معرف القسم مطلوب" }, { status: 400 })
        }

        // التحقق من عدم وجود موظفين في هذا القسم
        const { data: employees, error: empError } = await supabase
            .from("employees")
            .select("id")
            .eq("department_id", id)
            .limit(1)

        if (empError) {
            console.error("خطأ في التحقق من الموظفين:", empError)
            return NextResponse.json({ error: empError.message }, { status: 500 })
        }

        if (employees && employees.length > 0) {
            return NextResponse.json({ 
                error: "لا يمكن حذف القسم لأنه يوجد موظفين تابعين له" 
            }, { status: 400 })
        }

        // حذف علاقات المدراء أولاً
        await supabase
            .from("manager_departments")
            .delete()
            .eq("department_id", id)

        // حذف القسم
        const { error } = await supabase
            .from("departments")
            .delete()
            .eq("id", id)

        if (error) {
            console.error("خطأ في حذف القسم:", error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ message: "تم حذف القسم بنجاح" })
    } catch (error) {
        console.error("خطأ غير متوقع:", error)
        return NextResponse.json({ error: "حدث خطأ أثناء حذف القسم" }, { status: 500 })
    }
}