import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request, locals }) => {
  console.log('Reschedule API route reached!', request.method);

  try {
    // قراءة اللغة من الـ query string (مثال: /api/reschedule?lang=en)
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    const formData = await request.formData();

    const booking_id       = formData.get('booking_id')     as string;
    const token            = formData.get('token')          as string;
    const appointment_date = formData.get('appointment_date') as string;
    const appointment_time = formData.get('appointment_time') as string;
    const reason           = formData.get('reason')         as string | null;

    if (!booking_id || !token || !appointment_date || !appointment_time) {
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'بيانات ناقصة (معرف الحجز، التوكن، التاريخ، الوقت مطلوبة)'
            : 'Missing required data (booking ID, token, date, time)'
        }),
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
        JSON.stringify({ error: isArabic ? 'خطأ في إعدادات الخادم' : 'Server configuration error' }),
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

    // التحقق من صحة التوكن + أن الموعد لسه confirmed
    const { data: currentBooking, error: checkError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', booking_id)
      .eq('manage_token', token)
      .single();

    if (checkError || !currentBooking) {
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'الرابط غير صالح أو انتهت صلاحيته'
            : 'Invalid or expired link'
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    if (currentBooking.status !== 'confirmed') {
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'هذا الموعد تم تعديله أو إلغاؤه مسبقًا'
            : 'This appointment has already been modified or cancelled'
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // تحديث الموعد
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        appointment_date,
        appointment_time,
        reason: reason || null,
        status: 'rescheduled',
        // manage_token: null,          // اختياري: إبطال التوكن بعد التعديل
        // updated_at: new Date().toISOString(),
      })
      .eq('id', booking_id)
      .eq('manage_token', token);

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'فشل في تعديل الموعد، حاول مرة أخرى'
            : 'Failed to reschedule the appointment, please try again'
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: isArabic 
          ? 'تم تعديل الموعد بنجاح'
          : 'The appointment has been successfully rescheduled'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (err) {
    console.error('Reschedule API error:', err);

    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    return new Response(
      JSON.stringify({ 
        error: isArabic 
          ? 'خطأ داخلي في الخادم'
          : 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
