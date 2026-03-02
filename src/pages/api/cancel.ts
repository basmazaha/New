import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    // قراءة اللغة من query string
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
            ? 'معرف الحجز والتوكن مطلوبان'
            : 'Booking ID and token are required'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // استخدام service_role key للسماح بالتعديلات الحساسة
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
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
        JSON.stringify({ 
          error: isArabic 
            ? 'الرابط غير صالح أو انتهت صلاحيته'
            : 'The link is invalid or has expired'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // ────────────────────────────────────────────────
    // تحديث الحجز: إلغاء + مسح التاريخ والوقت + إبطال التوكن
    // ────────────────────────────────────────────────
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        appointment_date: null,
        appointment_time: null,
        manage_token: null,           // إبطال رابط الإدارة نهائيًا
        // cancelled_at: new Date().toISOString(),   // اختياري
      })
      .eq('id', booking_id)
      .eq('manage_token', token);     // أمان إضافي

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'فشل في إلغاء الموعد، حاول مرة أخرى'
            : 'Failed to cancel the appointment, please try again'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // الرد الناجح
    return new Response(
      JSON.stringify({ 
        message: isArabic 
          ? 'تم إلغاء الموعد بنجاح'
          : 'The appointment has been successfully cancelled'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Cancel API error:', err);

    // محاولة قراءة اللغة مرة أخرى في حالة الـ catch
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    return new Response(
      JSON.stringify({ 
        error: isArabic 
          ? 'خطأ داخلي في الخادم'
          : 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
