import { supabase } from "./supabase";

export async function getCurrentUser(userId: string) {
    // جلب بيانات المستخدم مع الأقسام التي يديرها
    const { data, error } = await supabase
        .from("employees")
        .select(`
            *,
            managed_departments:manager_departments!manager_id (
                department_id,
                departments:department_id (
                    id,
                    name
                )
            )
        `)
        .eq("id", userId)
        .single();

    if (error) throw new Error(error.message);

    return data;
}