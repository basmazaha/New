const EDGE_FUNCTION_URL = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/check-booked-times`;

  const form = document.getElementById('bookingForm');
  const messageDiv = document.getElementById('message');
  const successMsg = messageDiv.dataset.successMsg;
  const errorMsgBase = messageDiv.dataset.errorMsg;

  const locale = document.documentElement.lang || 'ar';
  const isArabic = locale.startsWith('ar');

  const dateTriggerDefault = isArabic ? 'اختر التاريخ ←' : 'Choose date ←';
  const timeTriggerDefault = isArabic ? 'اختر الوقت ←' : 'Choose time ←';
  const selectDateFirstMsg = isArabic ? 'اختر التاريخ أولاً' : 'Select date first';
  const noTimesAvailableMsg = isArabic ? 'لا توجد مواعيد متاحة' : 'No times available';

  let offDays = new Set();

  async function fetchOffDays() {
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ query_type: "off_days" }),
      });

      if (!response.ok) return;
      const json = await response.json();
      if (json.off_days) {
        offDays = new Set(json.off_days);
      }
    } catch (err) {
      console.error("Failed to load off days", err);
    }
  }

  await fetchOffDays();

  // ──────────────────────────────────────────────
  //                 إرسال النموذج
  // ──────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.classList.remove('booking-form__message--hidden', 'success', 'error');
    messageDiv.textContent = isArabic ? 'جاري الإرسال...' : 'Submitting...';

    const formData = new FormData(form);

    try {
      const lang = document.documentElement.lang || 'ar';
      const response = await fetch(`/api/submit-booking?lang=${lang}`, { method: 'POST', body: formData });
      const result = await response.json();

      if (response.ok) {
        messageDiv.classList.add('success');
        messageDiv.textContent = result.message || successMsg;
        form.reset();

        document.getElementById('date-trigger').textContent = dateTriggerDefault;
        document.getElementById('time-trigger').textContent = timeTriggerDefault;
        document.getElementById('appointment_date').value = '';
        document.getElementById('appointment_time').value = '';

        document.getElementById('date-dropdown')?.classList.add('hidden');
        document.getElementById('time-dropdown')?.classList.add('hidden');
      } else {
        throw new Error(result.error || errorMsgBase);
      }
    } catch (err) {
      messageDiv.classList.add('error');
      messageDiv.textContent = err.message || errorMsgBase;
    }
  });

  // ──────────────────────────────────────────────
  //     جلب المواعيد المحجوزة
  // ──────────────────────────────────────────────
  async function getBookedTimesForDate(dateStr) {
    try {
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ date: dateStr }),
      });

      if (!response.ok) return new Set();
      const json = await response.json();
      if (json.error) return new Set();
      const booked = json.booked || [];
      return new Set(Array.isArray(booked) ? booked : []);
    } catch {
      return new Set();
    }
  }

  // ──────────────────────────────────────────────
  //               التواريخ dropdown
  // ──────────────────────────────────────────────
  const today = new Date();
  const dateTrigger = document.getElementById('date-trigger');
  const dateDropdown = document.getElementById('date-dropdown');
  const dateScroll = document.getElementById('date-scroll');
  const dateHidden = document.getElementById('appointment_date');

  async function generateDates() {
    dateScroll.innerHTML = '';
    let added = 0;
    let offset = 0;

    while (added < 15) {
      const d = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + offset
      );
      offset++;

      if (d.getDay() === 5) continue; // تجاهل يوم الجمعة

      const now = new Date();
      const lastPossibleTime = new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate(),
        22, 15
      );

      if (d.toDateString() === now.toDateString() && now > lastPossibleTime) {
        continue;
      }

      const year  = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day   = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      if (offDays.has(dateStr)) continue;

      const dayName   = d.toLocaleDateString(locale, { weekday: 'long' });
      const monthName = d.toLocaleDateString(locale, { month: 'long' });
      const dayNum    = d.getDate().toString().padStart(2, '0');

      const display = isArabic
        ? `${dayName} ${dayNum} ${monthName} ${year}`
        : `${dayName}, ${monthName} ${dayNum}, ${year}`;

      const item = document.createElement('div');
      item.className = 'scroll-item';
      item.dataset.value = dateStr;
      item.textContent = display;
      dateScroll.appendChild(item);
      added++;
    }
  }

  dateScroll.addEventListener('click', (e) => {
    const item = e.target.closest('.scroll-item');
    if (!item) return;
    dateScroll.querySelectorAll('.scroll-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
  });

  dateTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = !dateDropdown.classList.contains('hidden');

    document.getElementById('time-dropdown')?.classList.add('hidden');

    if (isOpen) {
      dateDropdown.classList.add('hidden');
    } else {
      await generateDates();
      dateDropdown.classList.remove('hidden');

      if (dateHidden.value) {
        const sel = dateScroll.querySelector(`[data-value="${dateHidden.value}"]`);
        if (sel) {
          sel.classList.add('selected');
          sel.scrollIntoView({ block: 'center', behavior: 'instant' });
        }
      }
    }
  });

  document.addEventListener('click', (e) => {
    if (!dateTrigger.contains(e.target) && !dateDropdown.contains(e.target)) {
      dateDropdown.classList.add('hidden');
    }
    if (!timeTrigger.contains(e.target) && !timeDropdown.contains(e.target)) {
      timeDropdown.classList.add('hidden');
    }
  });

  // ──────────────────────────────────────────────
  //               الأوقات dropdown
  // ──────────────────────────────────────────────
  const timeTrigger = document.getElementById('time-trigger');
  const timeDropdown = document.getElementById('time-dropdown');
  const timeScroll = document.getElementById('time-scroll');
  const timeHidden = document.getElementById('appointment_time');

  async function generateTimes() {
    timeScroll.innerHTML = '';

    const selectedDate = dateHidden.value;
    if (!selectedDate) {
      timeScroll.innerHTML = `<div class="scroll-item disabled">${selectDateFirstMsg}</div>`;
      return;
    }

    const booked = await getBookedTimesForDate(selectedDate);

    let hasAvailable = false;

    const now = new Date();
    const selectedDateObj = new Date(selectedDate);

    const isToday = 
      selectedDateObj.getFullYear() === now.getFullYear() &&
      selectedDateObj.getMonth() === now.getMonth() &&
      selectedDateObj.getDate() === now.getDate();

    let minStartTime = null;

    if (isToday) {
      // إضافة ساعة كاملة (60 دقيقة)
      const earliestAllowed = new Date(now.getTime() + 60 * 60 * 1000);
      
      // التقريب لأعلى إلى أقرب ربع ساعة تالية
      const minutes = earliestAllowed.getMinutes();
      const remainder = minutes % 15;
      let addMinutes = 0;
      
      if (remainder !== 0) {
        addMinutes = 15 - remainder;
      }
      
      minStartTime = new Date(earliestAllowed);
      minStartTime.setMinutes(earliestAllowed.getMinutes() + addMinutes);
      minStartTime.setSeconds(0);
      minStartTime.setMilliseconds(0);
    }

    for (let h = 12; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        const time24 = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;

        // تخطي المواعيد المحجوزة
        if (booked.has(time24)) continue;

        // في اليوم الحالي فقط: استبعاد الأوقات قبل الحد الأدنى المسموح
        if (isToday && minStartTime) {
          const slotDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            h,
            m,
            0,
            0
          );

          if (slotDate < minStartTime) continue;
        }

        hasAvailable = true;

        let display = isArabic
          ? (h === 12 ? `12:${m.toString().padStart(2,'0')} ظهرًا`
             : h > 12 ? `${(h-12).toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} مساءً`
             : `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')} صباحًا`)
          : `${(h % 12 || 12)}:${m.toString().padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;

        const item = document.createElement('div');
        item.className = 'scroll-item';
        item.dataset.value = time24;
        item.textContent = display;
        timeScroll.appendChild(item);
      }
    }

    if (!hasAvailable) {
      timeScroll.innerHTML = `<div class="scroll-item disabled">${noTimesAvailableMsg}</div>`;
    }
  }

  timeScroll.addEventListener('click', (e) => {
    const item = e.target.closest('.scroll-item');
    if (!item) return;
    timeScroll.querySelectorAll('.scroll-item').forEach(el => el.classList.remove('selected'));
    item.classList.add('selected');
  });

  timeTrigger.addEventListener('click', async (e) => {
    e.stopPropagation();
    const isOpen = !timeDropdown.classList.contains('hidden');

    document.getElementById('date-dropdown')?.classList.add('hidden');

    if (isOpen) {
      timeDropdown.classList.add('hidden');
    } else {
      await generateTimes();
      timeDropdown.classList.remove('hidden');

      if (timeHidden.value) {
        const sel = timeScroll.querySelector(`[data-value="${timeHidden.value}"]`);
        if (sel) {
          sel.classList.add('selected');
          sel.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }
    }
  });

  // اختيار وإغلاق الـ dropdown عند الضغط على عنصر
  [dateScroll, timeScroll].forEach(scroll => {
    scroll.addEventListener('click', (e) => {
      const item = e.target.closest('.scroll-item');
      if (!item || item.classList.contains('disabled')) return;

      const trigger = scroll.id === 'date-scroll' ? dateTrigger : timeTrigger;
      const hidden = scroll.id === 'date-scroll' ? dateHidden : timeHidden;
      const dropdown = scroll.id === 'date-scroll' ? dateDropdown : timeDropdown;

      trigger.textContent = item.textContent;
      hidden.value = item.dataset.value;
      dropdown.classList.add('hidden');
    });
  });
