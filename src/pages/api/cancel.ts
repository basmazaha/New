import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    const formData = await request.formData();

    const booking_id = formData.get('booking_id') as string;
    const token      = formData.get('token')     as string;

    if (!booking_id || !token) {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'معرف الحجز والرابط (التوكن) مطلوبان'
            : 'Booking ID and token are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // استخدام anon key → RLS سيتحكم في الصلاحيات
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // التحقق من صحة الرابط (التوكن) + وجود الحجز
    const { data: booking, error: checkError } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', booking_id)
      .eq('manage_token', token)
      .single();

    if (checkError || !booking) {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'رابط الإلغاء غير صالح أو منتهي الصلاحية'
            : 'Invalid or expired cancellation link'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // تنفيذ الإلغاء
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        appointment_date: null,
        appointment_time: null,
        manage_token: null,           // إبطال الرابط نهائيًا (مهم لمنع إعادة الاستخدام)
        // cancelled_at: new Date().toISOString(),   // اختياري: تسجيل وقت الإلغاء
      })
      .eq('id', booking_id)
      .eq('manage_token', token);     // طبقة أمان إضافية (تتوافق مع RLS)

    if (updateError) {
      console.error('Cancel update failed:', updateError.message);
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'تعذر إلغاء الموعد، حاول مرة أخرى لاحقًا'
            : 'Failed to cancel appointment, please try again'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        message: isArabic
          ? 'تم إلغاء الموعد بنجاح'
          : 'Appointment cancelled successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Cancel API error:', err?.message || err);

    const isArabic = new URL(request.url).searchParams.get('lang')?.startsWith('ar') ?? true;

    return new Response(
      JSON.stringify({
        error: isArabic
          ? 'خطأ في النظام، يرجى المحاولة لاحقًا'
          : 'System error, please try again later'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}; 
