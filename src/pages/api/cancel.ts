import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

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

    // التحقق من المتغيرات البيئية
    const requiredEnv = [
      'PUBLIC_SUPABASE_URL',
      'PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_JWT_PRIVATE_KEY',
      'SUPABASE_JWT_KID'
    ];

    for (const env of requiredEnv) {
      if (!import.meta.env[env]) {
        console.error(`Missing environment variable: ${env}`);
        throw new Error('Missing Supabase configuration');
      }
    }

    // إنشاء JWT مخصص
    const payload = {
      sub: 'anonymous',
      role: 'authenticated',
      manage_token: token,
      exp: Math.floor(Date.now() / 1000) + (60 * 10),
      iat: Math.floor(Date.now() / 1000)
    };

    const privateKey = import.meta.env.SUPABASE_JWT_PRIVATE_KEY as string;
    const kid = import.meta.env.SUPABASE_JWT_KID as string;

    let access_token: string;
    try {
      access_token = jwt.sign(payload, privateKey, {
        algorithm: 'ES256',
        keyid: kid
      });
      console.log('[CANCEL] JWT generated successfully');
    } catch (jwtErr) {
      console.error('[CANCEL] JWT signing error:', jwtErr);
      throw jwtErr;
    }

    // Client للمستخدم (RLS)
    const supabaseUser = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL as string,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string,
      {
        global: {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        }
      }
    );

    // التحقق من الحجز
    const { data: booking, error: checkError } = await supabaseUser
      .from('appointments')
      .select('id')
      .eq('id', booking_id)
      .single();

    if (checkError || !booking) {
      console.error('[CANCEL] Booking check failed:', checkError?.message);
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
    const { error: updateError } = await supabaseUser
      .from('appointments')
      .update({
        status: 'cancelled',
        appointment_date: null,
        appointment_time: null,
        manage_token: null
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('[CANCEL] Update failed:', updateError.message);
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
    console.error('[CANCEL API] Error:', err?.message || err);

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
