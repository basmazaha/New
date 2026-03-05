import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ locals }) => {
  const env = locals.runtime.env;

  const supabase = createClient(
    env.PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    }
  );

  const { data, error } = await supabase
    .from('appointments')
    .select('id, full_name, created_at')   // حدد الحقول المرغوبة فقط
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true, data }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();
    const full_name = formData.get('full_name')?.toString().trim();

    if (!full_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'حقل الاسم الكامل مطلوب' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const env = locals.runtime.env;

    const supabase = createClient(
      env.PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    const { data, error } = await supabase
      .from('appointments')
      .insert({ full_name })
      .select('id, full_name, created_at')
      .single();

    if (error) {
      console.error('Insert error:', error);
      return new Response(
        JSON.stringify({ success: false, message: 'فشل في إضافة السجل: ' + error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // إذا جاء الطلب من نموذج → إعادة توجيه إلى الصفحة
    if (request.headers.get('content-type')?.includes('form-data')) {
      return new Response(null, {
        status: 303,
        headers: { Location: '/test' }
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'تمت الإضافة بنجاح', record: data }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('API POST error:', err);
    return new Response(
      JSON.stringify({ success: false, message: 'خطأ داخلي في الخادم' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
