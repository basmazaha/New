import { supabase } from "../../lib/supabase";
import { getTranslations } from "../../i18n/utils";

export const prerender = false;

function localTimeToUTCISO(localDate: string, localTime: string, timezone: string): string {
  const [year, month, day] = localDate.split('-').map(Number);
  const [hour, minute] = localTime.split(':').map(Number);

  const testDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const offsetFormatter = new Intl.DateTimeFormat('en', {
    timeZone: timezone,
    timeZoneName: 'shortOffset'
  });
  const offsetStr = offsetFormatter.format(testDate);

  const match = offsetStr.match(/([+-])(\d{2}):?(\d{2})?/);
  let offsetMinutes = 0;
  if (match) {
    const sign = match[1] === '+' ? 1 : -1;
    const h = parseInt(match[2]);
    const m = match[3] ? parseInt(match[3]) : 0;
    offsetMinutes = sign * (h * 60 + m);
  }

  const utcTimestamp = Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60 * 1000;
  return new Date(utcTimestamp).toISOString();
}

export async function POST({ request, url }) {
  const lang = url.searchParams.get("lang") || "ar";
  const t = getTranslations(lang);

  try {
    const contentType = request.headers.get("content-type") || "";
    let data: any = {};

    if (contentType.includes("application/json")) {
      data = await request.json();
    } else if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const formData = await request.formData();
      data = Object.fromEntries(formData);
    } else {
      return new Response(JSON.stringify({ error: lang === "en" ? `Content type not supported` : `نوع المحتوى غير مدعوم` }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const full_name        = (data.full_name || "").trim();
    const phone            = (data.phone || "").trim();
    const email            = (data.email || "").trim();
    const reason           = (data.reason || "").trim();
    const appointment_date = (data.appointment_date || "").trim();
    const appointment_time = (data.appointment_time || "").trim();

    if (!full_name || !phone || !email || !appointment_date || !appointment_time) {
      return new Response(JSON.stringify({ error: lang === "en" ? "All required fields must be filled" : "جميع الحقول المطلوبة يجب ملؤها" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: lang === "en" ? "Please enter a valid email address" : "الرجاء إدخال بريد إلكتروني صحيح" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    if (!/^\d{4}-\d{2}-\d{2}\( /.test(appointment_date) || !/^\d{2}:\d{2} \)/.test(appointment_time)) {
      return new Response(JSON.stringify({ error: lang === "en" ? "Invalid date or time format" : "صيغة التاريخ أو الوقت غير صحيحة" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data: settings } = await supabase.from('business_settings').select('timezone').maybeSingle();
    const businessTz = settings?.timezone || 'Africa/Cairo';

    // التحقق من الماضي حسب timezone الشركة
    const now = new Date();
    const dateF = new Intl.DateTimeFormat('en-CA', { timeZone: businessTz, year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentDateStr = dateF.format(now);

    const timeF = new Intl.DateTimeFormat('en', { timeZone: businessTz, hour: 'numeric', minute: 'numeric', hour12: false });
    const [currH, currM] = timeF.format(now).split(':').map(Number);
    const currentMinutes = currH * 60 + currM;

    const [appH, appM] = appointment_time.split(':').map(Number);
    const appMinutes = appH * 60 + appM;

    const isPast = appointment_date < currentDateStr || (appointment_date === currentDateStr && appMinutes <= currentMinutes);

    if (isPast) {
      return new Response(JSON.stringify({ error: lang === "en" ? "Cannot book a date in the past" : "لا يمكن حجز موعد في الماضي" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const [hour, minute] = appointment_time.split(':').map(Number);
    if (![0, 15, 30, 45].includes(minute)) {
      return new Response(JSON.stringify({ error: lang === "en" ? "Time must be in 15-minute increments" : "يجب أن يكون الوقت كل 15 دقيقة" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const { data: offDaysData } = await supabase.from('off_days').select('date').eq('date', appointment_date).maybeSingle();
    if (offDaysData) {
      return new Response(JSON.stringify({ error: lang === "en" ? "This date is an off day" : "هذا التاريخ يوم عطلة" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    const utcDateTime = localTimeToUTCISO(appointment_date, appointment_time, businessTz);

    const { data: existing } = await supabase
      .from("appointments")
      .select("id")
      .eq("date_time", utcDateTime)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: lang === "en" ? "This time is already booked" : "هذا الموعد محجوز بالفعل" }), { status: 409, headers: { "Content-Type": "application/json" } });
    }

    const { error: insertError } = await supabase.from("appointments").insert({
      full_name,
      phone,
      email,
      reason,
      appointment_date,
      appointment_time: appointment_time + ":00",
      date_time: utcDateTime,
      status: "confirmed",
    });

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(JSON.stringify({ error: lang === "en" ? "This appointment was just booked" : "هذا الموعد تم حجزه للتو" }), { status: 409, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: lang === "en" ? "Failed to save booking" : "فشل في حفظ الحجز" }), { status: 500, headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, message: t.booking.success_message }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: lang === "en" ? "An unexpected error occurred" : "حدث خطأ غير متوقع" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
