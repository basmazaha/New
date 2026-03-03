import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  console.log('[RESCHEDULE API] Request received');

  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    // قراءة البيانات من النموذج
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
            : 'Missing required fields'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من المتغيرات البيئية
    if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
      console.error('Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }

    // استخدام anon key → مهم لتفعيل Row Level Security
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // التحقق من صحة التوكن + حالة الحجز
    const { data: booking, error: checkError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', booking_id)
      .eq('manage_token', token)
      .single();

    if (checkError || !booking) {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'الرابط غير صالح أو منتهي الصلاحية'
            : 'Invalid or expired link'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (booking.status !== 'confirmed') {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'هذا الموعد تم تعديله أو إلغاؤه مسبقًا'
            : 'Appointment already modified or cancelled'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // التحقق من عدم وجود تعارض في الموعد الجديد
    const formattedTime = appointment_time + ':00';

    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', formattedTime)
      .neq('id', booking_id)
      .maybeSingle();

    if (conflict) {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'هذا الموعد محجوز بالفعل'
            : 'This time slot is already booked'
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // تنفيذ التعديل
    // ملاحظة: إضافة manage_token في الـ update مهمة للأمان مع RLS
    // (تمنع محاولات تغيير التوكن أو استغلال السياسات)
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        appointment_date,
        appointment_time: formattedTime,
        reason: reason || null,
        status: 'rescheduled',
        manage_token: token,           // ← إضافة التوكن هنا (مهم للأمان)
      })
      .eq('id', booking_id)
      .eq('manage_token', token);      // ← الفلتر الرئيسي للأمان

    if (updateError) {
      console.error('Update failed:', updateError);
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'فشل في تعديل الموعد، حاول مرة أخرى'
            : 'Failed to update appointment'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        message: isArabic
          ? 'تم تعديل الموعد بنجاح'
          : 'Appointment rescheduled successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[RESCHEDULE API] Error:', err);
    const isArabic = new URL(request.url).searchParams.get('lang')?.startsWith('ar') ?? true;

    return new Response(
      JSON.stringify({
        error: isArabic ? 'خطأ داخلي في الخادم' : 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
