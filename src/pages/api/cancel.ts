import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    // قراءة البيانات من الطلب (form data)
    const formData = await request.formData();

    const booking_id = formData.get('booking_id') as string;
    const token      = formData.get('token')     as string;

    // التحقق من وجود الحقول المطلوبة
    if (!booking_id || !token) {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'معرف الحجز والرابط (التوكن) مطلوبان'
            : 'Booking ID and token are required'
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // إنشاء عميل Supabase باستخدام anon key (ليعمل Row Level Security)
    if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
      console.error('[CANCEL API] Missing Supabase environment variables');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // الخطوة 1: التحقق من صحة التوكن + وجود الحجز + أنه مؤكد
    const { data: booking, error: checkError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', booking_id)
      .eq('manage_token', token)
      .single();

    if (checkError || !booking) {
      console.warn('[CANCEL API] Invalid token or booking not found', { booking_id, error: checkError?.message });
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'رابط الإلغاء غير صالح أو منتهي الصلاحية'
            : 'Invalid or expired cancellation link'
        }),
        { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    if (booking.status !== 'confirmed') {
      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'لا يمكن إلغاء هذا الموعد (تم تعديله أو إلغاؤه مسبقًا)'
            : 'This appointment cannot be cancelled (already modified or cancelled)'
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // الخطوة 2: إلغاء الموعد (تغيير الحالة + مسح التاريخ والوقت) بدون لمس manage_token بعد
    const { error: updateStep1Error, count: affectedRows } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        appointment_date: null,
        appointment_time: null,
        // يمكنك إضافة حقول إضافية إذا أردت، مثل:
        // cancelled_at: new Date().toISOString(),
        // cancel_reason: formData.get('reason') as string || null,
      })
      .eq('id', booking_id)
      .eq('manage_token', token)
      .select('id', { count: 'exact', head: true });  // للتأكد من عدد الصفوف المتأثرة

    if (updateStep1Error || affectedRows === 0) {
      console.error('[CANCEL API] Step 1 failed', {
        error: updateStep1Error?.message,
        affectedRows,
        booking_id
      });

      return new Response(
        JSON.stringify({
          error: isArabic
            ? 'تعذر إلغاء الموعد، حاول مرة أخرى لاحقًا'
            : 'Failed to cancel appointment, please try again'
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // الخطوة 3: إبطال التوكن (إلغاء الرابط نهائيًا) بعد نجاح الإلغاء
    const { error: updateStep2Error } = await supabase
      .from('appointments')
      .update({
        manage_token: null
      })
      .eq('id', booking_id)
      .eq('status', 'cancelled');  // شرط آمن بديل عن manage_token

    if (updateStep2Error) {
      // لا نرجع خطأ هنا للمستخدم لأن الإلغاء تم بالفعل
      // لكن نسجل المشكلة للتصحيح لاحقًا
      console.warn('[CANCEL API] Step 2 failed (token not nulled)', {
        error: updateStep2Error.message,
        booking_id
      });
    }

    // النجاح
    return new Response(
      JSON.stringify({
        message: isArabic
          ? 'تم إلغاء الموعد بنجاح'
          : 'Appointment cancelled successfully'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );

  } catch (err: any) {
    console.error('[CANCEL API] Unexpected error:', {
      message: err?.message,
      stack: err?.stack?.split('\n').slice(0, 3)
    });

    const isArabic = new URL(request.url).searchParams.get('lang')?.startsWith('ar') ?? true;

    return new Response(
      JSON.stringify({
        error: isArabic
          ? 'خطأ في النظام، يرجى المحاولة لاحقًا'
          : 'System error, please try again later'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};
