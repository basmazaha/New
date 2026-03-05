import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const formData = await request.formData();

    const booking_id = formData.get('booking_id') as string;
    const token      = formData.get('token')     as string;

    if (!booking_id || !token) {
      return new Response(
        JSON.stringify({ error: 'معرف الحجز والتوكن مطلوبان' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // الوصول إلى متغيرات البيئة من runtime في Cloudflare Pages
    const env = locals.runtime.env;

    const supabaseUrl = env.PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
    const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase configuration in environment variables');
      return new Response(
        JSON.stringify({ error: 'خطأ في إعدادات الخادم' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // إنشاء عميل Supabase باستخدام service_role key
    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      }
    );

    // التحقق من وجود الحجز + مطابقة التوكن (بغض النظر عن الحالة الحالية)
    const { data: currentBooking, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', booking_id)
      .eq('manage_token', token)
      .single();

    if (checkError || !currentBooking) {
      return new Response(
        JSON.stringify({ error: 'الرابط غير صالح أو انتهت صلاحيته' }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // تحديث الحجز: إلغاء + مسح التاريخ والوقت + إبطال التوكن
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        appointment_date: null,
        appointment_time: null,
        manage_token: null,           // إبطال رابط الإدارة نهائيًا
        // cancelled_at: new Date().toISOString(),  // اختياري
      })
      .eq('id', booking_id)
      .eq('manage_token', token);     // أمان إضافي

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'فشل في إلغاء الموعد، حاول مرة أخرى' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ message: 'تم إلغاء الموعد بنجاح' }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Cancel API error:', err);
    return new Response(
      JSON.stringify({ error: 'خطأ داخلي في الخادم' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
