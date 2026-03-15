// ======================
// Supabase Edge Functions Without JWT 
// ======================



// supabase/functions/check-booked-times/index.ts

import { createClient } from "npm:@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

Deno.serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  const body = await req.json().catch(() => ({}));
  const { query_type = "booked_times", date } = body;

  try {

    // ======================
    // تحميل الإعدادات
    // ======================

    const { data: settings } = await supabase
      .from("business_settings")
      .select("timezone,booking_days_ahead,min_booking_notice_minutes")
      .single();

    const timezone = settings?.timezone ?? "Africa/Cairo";
    const bookingDaysAhead = settings?.booking_days_ahead ?? 15;
    const notice = settings?.min_booking_notice_minutes ?? 60;

    // ======================
    // ساعات العمل
    // ======================

    const { data: hours } = await supabase
      .from("working_hours")
      .select(
        "day_of_week,is_open,start_time,end_time,slot_duration_minutes,break_start,break_end"
      );

    const workingMap = new Map();

    for (const h of hours ?? []) {
      workingMap.set(h.day_of_week, h);
    }

    // ======================
    // الوقت الحالي
    // ======================

    const now = new Date();

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);

    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);

    const nowMinutes = hour * 60 + minute + notice;

    const dateFormatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    const todayStr = dateFormatter.format(now);

    const today = new Date(todayStr);

    // ======================
    // off days
    // ======================

    const { data: offDays } = await supabase
      .from("off_days")
      .select("date")
      .gte("date", todayStr);

    const offSet = new Set(offDays?.map((d) => d.date));

    // ======================
    // AVAILABLE DATES
    // ======================

    if (query_type === "available_dates_next_days") {

      const available: string[] = [];

      for (let i = 0; i < bookingDaysAhead; i++) {

        const d = new Date(today);
        d.setDate(d.getDate() + i);

        const dateStr = d.toISOString().split("T")[0];

        if (offSet.has(dateStr)) continue;

        const dow = d.getUTCDay();

        const config = workingMap.get(dow);

        if (!config || !config.is_open) continue;

        const start = toMin(config.start_time);
        const end = toMin(config.end_time);
        const slot = config.slot_duration_minutes ?? 15;

        let firstSlot = start;

        if (dateStr === todayStr) {

          const r = nowMinutes % slot;

          firstSlot = Math.max(nowMinutes + (r ? slot - r : 0), start);
        }

        if (firstSlot < end) {
          available.push(dateStr);
        }
      }

      return json({ available_dates: available });
    }

    // ======================
    // AVAILABLE TIMES
    // ======================

    if (query_type === "available_times_for_date") {

      if (!date) return json({ available_times: [] });

      const dow = new Date(date).getUTCDay();

      const config = workingMap.get(dow);

      if (!config || !config.is_open) {
        return json({ available_times: [] });
      }

      const start = toMin(config.start_time);
      const end = toMin(config.end_time);
      const slot = config.slot_duration_minutes ?? 15;

      const breakStart = config.break_start ? toMin(config.break_start) : null;
      const breakEnd = config.break_end ? toMin(config.break_end) : null;

      let minStart = start;

      if (date === todayStr) {

        const r = nowMinutes % slot;

        minStart = Math.max(nowMinutes + (r ? slot - r : 0), start);

      } else if (nowMinutes >= 1440) {

        const next = nowMinutes - 1440;

        const r = next % slot;

        minStart = Math.max(next + (r ? slot - r : 0), start);
      }

      const booked = await getBooked(date, timezone);

      const result: string[] = [];

      for (let m = minStart; m < end; m += slot) {

        if (
          breakStart !== null &&
          breakEnd !== null &&
          m >= breakStart &&
          m < breakEnd
        ) continue;

        const t = toTime(m);

        if (!booked.has(t)) {
          result.push(t);
        }
      }

      return json({ available_times: result });
    }

    // ======================
    // BOOKED TIMES
    // ======================

    if (query_type === "booked_times") {

      if (!date) return json({ booked: [] });

      const booked = await getBooked(date, timezone);

      return json({ booked: Array.from(booked) });
    }

    return json({ error: "Invalid query_type" }, 400);

  } catch (e) {

    console.error(e);

    return json({ error: "Server error" }, 500);
  }
});


// ======================
// helpers
// ======================

function json(data: any, status = 200) {

  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toMin(t: string) {

  const [h, m] = t.split(":").map(Number);

  return h * 60 + m;
}

function toTime(m: number) {

  const h = Math.floor(m / 60);
  const min = m % 60;

  return `${h.toString().padStart(2, "0")}:${min
    .toString()
    .padStart(2, "0")}`;
}

async function getBooked(date: string, timezone: string) {

  const start = `${date}T00:00:00Z`;
  const end = `${date}T23:59:59Z`;

  const { data } = await supabase
    .from("appointments")
    .select("date_time")
    .gte("date_time", start)
    .lt("date_time", end);

  const booked = new Set<string>();

  const formatter = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  for (const r of data ?? []) {

    const t = formatter.format(new Date(r.date_time));

    booked.add(t);
  }

  return booked;
}





















// supabase/functions/create-appointment/index.ts

import { createClient } from "npm:@supabase/supabase-js@2.29.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } }
);

// cache timezone لتقليل الاستعلامات
let cachedTimezone: string | null = null;

Deno.serve(async (req) => {

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error_code: "METHOD_NOT_ALLOWED" }, 405);
  }

  let body;

  try {
    body = await req.json();
  } catch {
    return json({ error_code: "BAD_JSON_BODY" }, 400);
  }

  const {
    full_name = "",
    email = "",
    phone = "",
    reason = "",
    datetime,
    booking_id = null,
    token = null,
    cancel = false
  } = body;

  try {

    // ======================
    // get timezone (with cache)
    // ======================

    let tz = cachedTimezone;

    if (!tz) {
      const { data: settings } = await supabase
        .from("business_settings")
        .select("timezone")
        .maybeSingle();

      tz = settings?.timezone || "Africa/Cairo";
      cachedTimezone = tz;
    }

    let utcDateTime: string | null = null;

    if (datetime) {

      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(datetime)) {
        return json(
          { error_code: "INVALID_DATE_FORMAT" },
          400
        );
      }

      utcDateTime = localToUTC(datetime, tz);

      if (Date.parse(utcDateTime) < Date.now()) {
        return json(
          { error_code: "PAST_DATE" },
          400
        );
      }
    }

    // ======================
    // Cancel appointment
    // ======================

    if (cancel && booking_id && token) {

      const { count, error } = await supabase
        .from("appointments")
        .update({
          status: "cancelled",
          manage_token: null,
          reminder_sent_6h: true
        })
        .eq("id", booking_id)
        .eq("manage_token", token)
        .in("status", ["confirmed", "rescheduled"])
        .select("*", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      if (count === 0) {
        return json({
          error_code: "CANNOT_CANCEL_APPOINTMENT"
        }, 403);
      }

      return json({
        success: true,
        success_code: "APPOINTMENT_CANCELLED"
      });
    }

    // ======================
    // Reschedule
    // ======================

    if (booking_id && token && utcDateTime) {

      const { count, error } = await supabase
        .from("appointments")
        .update({
          date_time: utcDateTime,
          status: "rescheduled",
          reminder_sent_6h: false
        })
        .eq("id", booking_id)
        .eq("manage_token", token)
        .eq("status", "confirmed")
        .select("*", { count: "exact", head: true });

      if (error) {

        if (error.message.includes("unique")) {
          return json({
            error_code: "TIME_ALREADY_BOOKED"
          }, 409);
        }

        throw error;
      }

      if (count === 0) {
        return json({
          error_code: "CANNOT_RESCHEDULE_APPOINTMENT"
        }, 403);
      }

      return json({
        success: true,
        success_code: "APPOINTMENT_RESCHEDULED"
      });
    }

    // ======================
    // New booking
    // ======================

    if (!full_name || !email || !phone || !utcDateTime) {

      return json({
        error_code: "MISSING_REQUIRED_FIELDS"
      }, 400);
    }

    const manage_token = crypto.randomUUID();

    const { data: inserted, error } = await supabase
      .from("appointments")
      .insert({
        full_name: full_name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        reason: reason.trim(),
        date_time: utcDateTime,
        manage_token: manage_token,
        status: "confirmed",
        reminder_sent_6h: false
      })
      .select("id, full_name, email, manage_token")
      .single();

    if (error) {

      if (error.message.includes("unique")) {
        return json({
          error_code: "TIME_ALREADY_BOOKED"
        }, 409);
      }

      throw error;
    }

    supabase.functions
      .invoke("send-booking-confirmation-brevo", {
        body: {
          id: inserted.id,
          full_name: inserted.full_name,
          email: inserted.email,
          manage_token: inserted.manage_token
        }
      })
      .catch(console.error);

    return json({
      success: true,
      success_code: "APPOINTMENT_CREATED"
    });

  } catch (err) {

    console.error(err);

    return json({
      error_code: "SERVER_ERROR"
    }, 500);
  }

});

function localToUTC(localIso: string, tz: string) {

  const localDate = new Date(localIso);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(localDate);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));

  const y = Number(map.year);
  const m = Number(map.month) - 1;
  const d = Number(map.day);
  const hh = Number(map.hour);
  const mm = Number(map.minute);
  const ss = Number(map.second || "00");

  const localWall = new Date(y, m, d, hh, mm, ss);

  const offset = localWall.getTime() - localDate.getTime();

  return new Date(localDate.getTime() - offset).toISOString();
}

function json(data: any, status = 200) {

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}





















// supabase/functions/send-booking-confirmation-brevo/index.ts

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const APP_BASE_URL = (Deno.env.get("APP_BASE_URL") || "https://new-91v.pages.dev").replace(/\/+$/, "");

if (!BREVO_API_KEY) {
  console.error("Missing BREVO_API_KEY env var");

  Deno.serve(() =>
    new Response(
      JSON.stringify({ error: "Server misconfiguration: missing BREVO_API_KEY" }),
      { status: 500, headers: { "content-type": "application/json" } }
    )
  );

} else {

Deno.serve(async (req: Request) => {

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method Not Allowed" }),
      { status: 405, headers: { "content-type": "application/json" } }
    );
  }

  let body: any;

  try {
    body = await req.json();
  } catch (err) {
    console.error("Invalid JSON body:", err);

    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const {
    id,
    full_name,
    email,
    manage_token
  } = body ?? {};

  if (!email || !id) {
    return new Response(
      JSON.stringify({ error: "حقول مطلوبة ناقصة (email أو id)" }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const manageLinkAr = `${APP_BASE_URL}/manage/${manage_token}`;
  const manageLinkEn = `${APP_BASE_URL}/en/manage/${manage_token}`;

  const htmlContent = `
      <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px;">
        <!-- Arabic Section -->
        <h2 style="color: #1e40af; margin: 0 0 28px; text-align: center; font-size: 1.8rem;">
          تأكيد حجز موعدك
        </h2>

        <p style="font-size: 17px; color: #111827; line-height: 1.7; margin: 0 0 24px;">
          مرحباً ${full_name || "السيد/السيدة"}،
        </p>

        <p style="font-size: 16px; color: #374151; line-height: 1.7; margin: 0 0 32px;">
          لقد تلقينا تفاصيل الحجز الخاص بك .<br>
          يمكنك الاطلاع على تفاصيل موعدك وإدارة حجزك (إلغاء أو إعادة جدولة) من خلال الرابط التالي:
        </p>

        <div style="text-align: center; margin: 40px 0;">
          <a href="${manageLinkAr}"
             style="display: inline-block; padding: 16px 48px; background: #3b82f6; color: white; text-decoration: none; border-radius: 10px; font-size: 1.15rem; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            إدارة حجزي الآن
          </a>
        </div>

        <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 48px; line-height: 1.6;">
          إذا لم تقم أنت بحجز هذا الموعد، يرجى تجاهل هذه الرسالة.<br>
          شكراً لثقتك بعيادة د. عمرو.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 40px 0;">

        <div dir="ltr">
          <h2 style="color: #1e40af; margin: 0 0 28px; text-align: center; font-size: 1.8rem;">
            Appointment Confirmation
          </h2>

          <p style="font-size: 17px; color: #111827; line-height: 1.7; margin: 0 0 24px;">
            Hello ${full_name || "Dear Patient"},
          </p>

          <p style="font-size: 16px; color: #374151; line-height: 1.7; margin: 0 0 32px;">
            We have successfully received your appointment details.<br>
            You can view your appointment information and manage your booking (cancel or reschedule) using the link below:
          </p>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${manageLinkEn}"
               style="display: inline-block; padding: 16px 48px; background: #3b82f6; color: white; text-decoration: none; border-radius: 10px; font-size: 1.15rem; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
              Manage Booking
            </a>
          </div>

          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 48px; line-height: 1.6;">
            If you did not book this appointment, please ignore this message.<br>
            Thank you for choosing Dr. Amr Clinic.
          </p>
        </div>
      </div>
    `;

  const payload = {
    sender: {
      name: "عيادة د. عمرو",
      email: "info@dramrclinic.online",
    },
    to: [{ email, name: full_name || "العميل" }],
    subject: "تأكيد الحجز - Booking Confirmation",
    htmlContent,
  };

  try {

    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {

      const result = await resp.json().catch(() => null);

      console.error("Brevo API error:", result || { status: resp.status });

      return new Response(
        JSON.stringify({ error: result?.message || `Brevo error ${resp.status}` }),
        { status: 500, headers: { "content-type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  } catch (err) {

    console.error("Function error:", err);

    return new Response(
      JSON.stringify({ error: "خطأ داخلي في الخادم" }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }

});
}




















// ────────────────────────────────────────────────────────────────
// Edge Function: send-appointment-reminders
// الغرض: إرسال تذكير قبل \~6 ساعات من الموعد عبر Brevo
// المنطق: reminder_sent_6h = false AND status IN ('confirmed','rescheduled') AND email IS NOT NULL
// التخزين: date_time في UTC + timezone من business_settings
// ────────────────────────────────────────────────────────────────

const BREVO_API_KEY   = Deno.env.get("BREVO_API_KEY");
const APP_BASE_URL    = (Deno.env.get("APP_BASE_URL") || "https://new-91v.pages.dev/").replace(/\/+$/, "");
const REMINDER_SECRET = Deno.env.get("REMINDER_SECRET");

if (!BREVO_API_KEY || !REMINDER_SECRET) {
  console.error("Missing required environment variables");
  Deno.serve(() => new Response(
    JSON.stringify({ error: "Server misconfiguration – missing env vars" }),
    { status: 500, headers: { "Content-Type": "application/json" } }
  ));
}

Deno.serve(async (req: Request) => {
  if (req.headers.get("x-reminder-secret") !== REMINDER_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // ────────────────────────────────────────────────
  // إعداد Supabase client
  // ────────────────────────────────────────────────
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // ────────────────────────────────────────────────
  // إعداد Luxon
  // ────────────────────────────────────────────────
  const { DateTime } = await import("https://esm.sh/luxon");

  // ────────────────────────────────────────────────
  // جلب timezone العيادة
  // ────────────────────────────────────────────────
  const { data: settings, error: settingsError } = await supabase
    .from("business_settings")
    .select("timezone")
    .maybeSingle();

  const CLINIC_TZ = settings?.timezone && settings.timezone.trim() !== ""
    ? settings.timezone
    : "Africa/Cairo";

  if (settingsError) {
    console.warn("Could not load business_settings timezone, using default:", CLINIC_TZ);
  }

  // ────────────────────────────────────────────────
  // دالة تنسيق التاريخ عربي
  // ────────────────────────────────────────────────
  function formatArabicDate(utcIso: string | null | undefined): string | null {
    if (!utcIso) return null;
    const dt = DateTime.fromISO(utcIso, { zone: "utc" });
    if (!dt.isValid) return null;
    const local = dt.setZone(CLINIC_TZ);
    return local.isValid
      ? local.toLocaleString({ year: 'numeric', month: 'long', day: 'numeric' }, { locale: 'ar-EG' })
      : null;
  }

  // ────────────────────────────────────────────────
  // النافذة الزمنية (بتوقيت العيادة)
  // ────────────────────────────────────────────────
  const now = DateTime.now().setZone(CLINIC_TZ);
  const windowStart = now;                    // من الآن
  const windowEnd   = now.plus({ hours: 6, minutes: 15 });

  // تحويل النافذة إلى UTC للمقارنة مع date_time
  const windowStartUTC = windowStart.toUTC().toISO({ suppressMilliseconds: true });
  const windowEndUTC   = windowEnd.toUTC().toISO({ suppressMilliseconds: true });

  // ────────────────────────────────────────────────
  // جلب المواعيد المستحقة للتذكير
  // ────────────────────────────────────────────────
  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(`
      id,
      full_name,
      email,
      date_time,
      reason,
      manage_token,
      reminder_sent_6h,
      status
    `)
    .eq("reminder_sent_6h", false)
    .in("status", ["confirmed", "rescheduled"])
    .not("email", "is", null)
    .gte("date_time", windowStartUTC)
    .lte("date_time", windowEndUTC)
    .order("date_time", { ascending: true });

  if (error) {
    console.error("Supabase fetch error:", error);
    return new Response(
      JSON.stringify({ error: "فشل الاستعلام من قاعدة البيانات" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!appointments || appointments.length === 0) {
    return new Response(
      JSON.stringify({ message: "لا توجد تذكيرات مستحقة الآن" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const sent: string[] = [];
  const failed: string[] = [];

  for (const ap of appointments) {
    try {
      // ────────────────────────────────────────────────
      // تحويل وقت الموعد إلى توقيت العيادة
      // ────────────────────────────────────────────────
      const apUTC = DateTime.fromISO(ap.date_time, { zone: "utc" });
      if (!apUTC.isValid) {
        console.warn(`Invalid date_time for ap ${ap.id}: ${ap.date_time}`);
        continue;
      }

      const apLocal = apUTC.setZone(CLINIC_TZ);
      if (!apLocal.isValid) {
        console.warn(`Cannot set zone ${CLINIC_TZ} for ap ${ap.id}`);
        continue;
      }

      // تأكيد إضافي (رغم أن الاستعلام يفترض ذلك)
      
      

      // ────────────────────────────────────────────────
      // تنسيق الوقت
      // ────────────────────────────────────────────────
      const formattedTimeAr = apLocal.toFormat("hh:mm a", { locale: "ar-EG" });
      const formattedTimeEn = apLocal.toFormat("hh:mm a", { locale: "en-US" });

      // ────────────────────────────────────────────────
      // روابط الإدارة
      // ────────────────────────────────────────────────
      const manageLinkAr = `${APP_BASE_URL}/manage/${ap.manage_token}`;
      const manageLinkEn = `${APP_BASE_URL}/en/manage/${ap.manage_token}`;

      // ────────────────────────────────────────────────
      // محتوى الإيميل (نفس التنسيق السابق)
      // ────────────────────────────────────────────────
      const htmlContent = `
<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px;">
  <h2 style="color: #1a3c5e; text-align: center; margin-bottom: 24px;">تذكير بموعدك القادم</h2>
  <p style="font-size: 16px; color: #333; line-height: 1.6;">مرحباً ${ap.full_name || "السيد/السيدة"}،</p>
  <p style="font-size: 16px; color: #333; line-height: 1.6;"> هذا تذكير بموعدك القادم في عيادة دكتور عمرو لطب وتجميل الاسنان: </p>

  <table style="width:100%; margin:20px 0; border-collapse:collapse;">
    <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; width:140px; border:1px solid #e0e0e0;color:#333333;">الاسم</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${ap.full_name || "غير محدد"}</td></tr>
    <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; border:1px solid #e0e0e0;color:#333333;">التاريخ</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${formatArabicDate(ap.date_time) || "غير محدد"}</td></tr>
    <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; border:1px solid #e0e0e0;color:#333333;">الوقت</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${formattedTimeAr}</td></tr>
    <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; border:1px solid #e0e0e0;color:#333333;">السبب</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${ap.reason || "غير محدد"}</td></tr>
  </table>

  <div style="margin:32px 0; padding:20px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; text-align:center;">
    <p style="font-weight:bold; color:#1e40af; margin:0 0 16px; font-size:1.1rem;"> يمكنك إدارة موعدك من هنا: </p>
    <a href="${manageLinkAr}" style="display:inline-block; padding:14px 32px; background:#3b82f6; color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-size:1.1rem;">
      إدارة حجزي الآن
    </a>
  </div>

  <hr style="border:none; border-top:1px solid #e0e0e0; margin:40px 0;">

  <div dir="ltr">
    <h2 style="color:#1a3c5e; text-align:center; margin-bottom:24px;">Appointment Reminder</h2>
    <p style="font-size:16px; color:#333; line-height:1.6;">Hello ${ap.full_name || "Dear Patient"},</p>
    <p style="font-size:16px; color:#333; line-height:1.6;"> This is a reminder of your upcoming appointment at DR Amr Clinic:</p>

    <table style="width:100%; margin:20px 0; border-collapse:collapse;">
      <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; width:140px; border:1px solid #e0e0e0;color:#333333;">Name</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${ap.full_name || "Not specified"}</td></tr>
      <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; border:1px solid #e0e0e0;color:#333333;">Date</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${apLocal.toFormat('yyyy-MM-dd') || "Not specified"}</td></tr>
      <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; border:1px solid #e0e0e0;color:#333333;">Time</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${formattedTimeEn}</td></tr>
      <tr><td style="padding:12px; background:#f8f9fa; font-weight:bold; border:1px solid #e0e0e0;color:#333333;">Reason</td><td style="padding:12px; border:1px solid #e0e0e0;color:#333333;">${ap.reason || "Not specified"}</td></tr>
    </table>

    <div style="margin:32px 0; padding:20px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; text-align:center;">
      <p style="font-weight:bold; color:#1e40af; margin:0 0 16px; font-size:1.1rem;"> 
      You can manage your appointment here: </p>
      <a href="${manageLinkEn}" style="display:inline-block; padding:14px 32px; background:#3b82f6; color:white; text-decoration:none; border-radius:8px; font-weight:bold; font-size:1.1rem;">
        Manage Booking
      </a>
    </div>
  </div>
</div>`;

      // ────────────────────────────────────────────────
      // إرسال عبر Brevo
      // ────────────────────────────────────────────────
      const payload = {
        sender: { name: "عيادة د. عمرو", email: "info@dramrclinic.online" },
        to: [{ email: ap.email!, name: ap.full_name || "العميل" }],
        subject: "تذكير: موعدك قريب | Reminder: Your appointment is soon",
        htmlContent,
      };

      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "Unknown error");
        console.error(`Brevo failed for ap ${ap.id}: ${response.status} - ${errText}`);
        failed.push(ap.id);
        continue;
      }

      // تحديث حالة التذكير
      const { error: updateErr } = await supabase
        .from("appointments")
        .update({ reminder_sent_6h: true })
        .eq("id", ap.id);

      if (updateErr) {
        console.error(`Failed to update reminder_sent_6h for ${ap.id}:`, updateErr);
        failed.push(ap.id);
      } else {
        sent.push(ap.id);
      }

    } catch (err) {
      console.error(`Error processing appointment ${ap?.id || "unknown"}:`, err);
      failed.push(ap?.id || "unknown");
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent_count: sent.length,
      failed_count: failed.length,
      sent_ids: sent,
      failed_ids: failed,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});













// ======================
// Supabase Environment 
// ======================

SUPABASE_URL
	
SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

SUPABASE_DB_URL
	
MY_SUPABASE_SERVICE_ROLE_KEY

My_SUPABASE_URL    

BREVO_API_KEY

APP_BASE_URL	     // your domain

REMINDER_SECRET    // used by cron job to invoke reminder email
