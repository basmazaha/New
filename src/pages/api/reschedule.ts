import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const POST: APIRoute = async ({ request }) => {
  console.log('[RESCHEDULE API] ──────────────────────────────────────────────');
  console.log('[RESCHEDULE API] Request received | Method:', request.method);
  console.log('[RESCHEDULE API] URL:', request.url);

  try {
    // 1. قراءة اللغة
    const url = new URL(request.url);
    const lang = url.searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');
    console.log('[RESCHEDULE API] Language detected:', lang, '| isArabic:', isArabic);

    // 2. قراءة FormData
    console.log('[RESCHEDULE API] Reading form data...');
    const formData = await request.formData();

    const booking_id     = formData.get('booking_id') as string;
    const token          = formData.get('token') as string;
    const appointment_date = formData.get('appointment_date') as string;
    const appointment_time = formData.get('appointment_time') as string;
    const reason         = formData.get('reason') as string | null;

    console.log('[RESCHEDULE API] Parsed form data:', {
      booking_id: booking_id || '(missing)',
      token: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : '(missing)',
      appointment_date: appointment_date || '(missing)',
      appointment_time: appointment_time || '(missing)',
      reason: reason || '(empty)',
    });

    // 3. التحقق من الحقول المطلوبة
    if (!booking_id || !token || !appointment_date || !appointment_time) {
      console.warn('[RESCHEDULE API] Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'بيانات ناقصة (معرف الحجز، التوكن، التاريخ، الوقت مطلوبة)'
            : 'Missing required data (booking ID, token, date, time)'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. التحقق من وجود مفاتيح البيئة
    console.log('[RESCHEDULE API] Environment variables check:');
    console.log('  → PUBLIC_SUPABASE_URL exists:', !!import.meta.env.PUBLIC_SUPABASE_URL);
    console.log('  → PUBLIC_SUPABASE_URL length:', import.meta.env.PUBLIC_SUPABASE_URL?.length || 0);
    console.log('  → SUPABASE_SERVICE_ROLE_KEY exists:', !!import.meta.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('  → SUPABASE_SERVICE_ROLE_KEY length:', import.meta.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0);

    if (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[RESCHEDULE API] Missing Supabase environment variables');
      throw new Error('Missing Supabase URL or Service Role Key');
    }

    // 5. إنشاء عميل Supabase
    console.log('[RESCHEDULE API] Creating Supabase client...');
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 6. التحقق من التوكن والحالة
    console.log('[RESCHEDULE API] Checking token validity...');
    const { data: currentBooking, error: tokenCheckError } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('id', booking_id)
      .eq('manage_token', token)
      .single();

    console.log('[RESCHEDULE API] Token check result:', {
      found: !!currentBooking,
      status: currentBooking?.status,
      error: tokenCheckError ? tokenCheckError.message : null,
    });

    if (tokenCheckError || !currentBooking) {
      console.warn('[RESCHEDULE API] Invalid or expired token');
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'الرابط غير صالح أو انتهت صلاحيته'
            : 'Invalid or expired link'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (currentBooking.status !== 'confirmed') {
      console.warn('[RESCHEDULE API] Appointment not in confirmed state | status:', currentBooking.status);
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'هذا الموعد تم تعديله أو إلغاؤه مسبقًا'
            : 'This appointment has already been modified or cancelled'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. التحقق من توافر الموعد الجديد
    console.log('[RESCHEDULE API] Checking availability for new date/time...');
    const formattedTime = appointment_time + ":00";
    console.log('  → Checking:', { appointment_date, formattedTime });

    const { data: existing, error: availabilityError } = await supabase
      .from("appointments")
      .select("id")
      .eq("appointment_date", appointment_date)
      .eq("appointment_time", formattedTime)
      .neq("id", booking_id)
      .maybeSingle();

    console.log('[RESCHEDULE API] Availability check result:', {
      conflictFound: !!existing,
      error: availabilityError ? availabilityError.message : null,
    });

    if (availabilityError) {
      console.error('[RESCHEDULE API] Availability check failed:', availabilityError);
      return new Response(
        JSON.stringify({ 
          error: isArabic ? "خطأ في التحقق من توافر الموعد" : "Error checking availability"
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (existing) {
      console.warn('[RESCHEDULE API] Time slot already booked');
      return new Response(
        JSON.stringify({ 
          error: isArabic ? "هذا الموعد محجوز بالفعل" : "This time is already booked"
        }),
        { status: 409, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8. تنفيذ التحديث
    console.log('[RESCHEDULE API] Performing update...');
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        appointment_date,
        appointment_time: formattedTime,
        reason: reason || null,
        status: 'rescheduled',
      })
      .eq('id', booking_id)
      .eq('manage_token', token);

    if (updateError) {
      console.error('[RESCHEDULE API] Update failed:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
      });
      return new Response(
        JSON.stringify({ 
          error: isArabic 
            ? 'فشل في تعديل الموعد، حاول مرة أخرى'
            : 'Failed to reschedule the appointment, please try again'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[RESCHEDULE API] Update successful');

    // 9. الرد الناجح
    return new Response(
      JSON.stringify({ 
        message: isArabic 
          ? 'تم تعديل الموعد بنجاح'
          : 'The appointment has been successfully rescheduled'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[RESCHEDULE API] ── CRITICAL ERROR ──');
    console.error('[RESCHEDULE API] Caught exception:', {
      name: err.name,
      message: err.message,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'), // أول 5 سطور فقط لتجنب الطول الزائد
    });

    const lang = new URL(request.url).searchParams.get('lang') || 'ar';
    const isArabic = lang.startsWith('ar');

    return new Response(
      JSON.stringify({ 
        error: isArabic 
          ? 'خطأ داخلي في الخادم'
          : 'Internal server error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    console.log('[RESCHEDULE API] Request completed ──────────────────────────────────────────────');
  }
};
