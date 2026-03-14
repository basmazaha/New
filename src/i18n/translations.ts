export const translations = {
  ar: {

    nav: {
      home: 'الرئيسية',
      about: 'عنّا',
      contact: 'اتصل بنا'
    },

    hero: {
      title: '!مرحبا بالعالم',
      subtitle: 'قالب Astro متعدد اللغات جاهز للتخصيص والنشر بسرعة'
    },

    buttons: {
      start_now: 'ابدأ الآن',
      contact_us: 'تواصل معنا',
      submit: 'إرســــــال',
      cancel: 'إلغاء',
      confirm: 'تأكيد',
      book: 'احجز الآن',
    },

    services: {
      title: 'خدماتنا',
      cards: [
        {
          icon: '⚡',
          title: 'تطوير واجهات حديثة',
          description: 'نقوم بتصميم وتطوير واجهات مستخدم سريعة ومتجاوبة باستخدام أحدث التقنيات.'
        },
        {
          icon: '🛠️',
          title: 'حلول Backend قوية',
          description: 'بناء أنظمة خلفية آمنة وقابلة للتطوير تدعم ملايين المستخدمين بكفاءة عالية.'
        }
      ]
    },

    newsletter: {
      title: 'اشترك في النشرة البريدية',
      description: 'احصل على آخر الأخبار والعروض مباشرة في بريدك الإلكترونى'
    },

    booking: {

      title: 'حجز موعد',

      full_name: 'الاسم الكامل',
      full_name_placeholder: 'اكتب اسمك الكامل',

      email: 'البريد الالكتروني',
      email_placeholder: 'مثال: example@email.com',

      phone: 'رقم الهاتف',
      phone_placeholder: 'مثال: 01012345678',

      reason: 'سبب الحجز (اختياري)',
      reason_placeholder: 'اكتب سبب الحجز أو أي ملاحظات...',

      date: 'التاريخ',
      time: 'الوقت',

      select_date_first: 'اختر التاريخ أولا',
      no_times_available: 'لا توجد أوقات متاحة لهذا التاريخ',

      date_trigger_default: 'اختر التاريخ ←',
      time_trigger_default: 'اختر الوقت ←',

      ui: {
        sending: 'جاري الإرسال...',
        loading_appointments: 'جاري تحميل المواعيد...',
        fetch_error: 'خطأ في جلب المواعيد',
        missing_datetime: 'يرجى اختيار التاريخ والوقت',
        no_appointments_days: 'لا توجد مواعيد متاحة في الفترة القادمة'
      },

      success: {
        APPOINTMENT_CREATED: 'تم حجز الموعد بنجاح',
        APPOINTMENT_RESCHEDULED: 'تم تعديل الموعد بنجاح',
        APPOINTMENT_CANCELLED: 'تم إلغاء الموعد بنجاح',
        GENERIC_SUCCESS: 'تمت العملية بنجاح'
      },

      errors: {
        TIME_ALREADY_BOOKED: 'هذا الموعد محجوز بالفعل',
        TIME_NOT_AVAILABLE: 'هذا الوقت غير متاح',
        PAST_DATE: 'لا يمكن حجز موعد في الماضي',
        INVALID_EMAIL: 'البريد الإلكتروني غير صالح',
        UNKNOWN_ERROR: 'حدث خطأ غير متوقع'
      }

    }

  },

  en: {

    nav: {
      home: 'Home',
      about: 'About',
      contact: 'Contact'
    },

    hero: {
      title: 'Hello World!',
      subtitle: 'A multilingual Astro template ready for customization and fast deployment'
    },

    buttons: {
      start_now: 'Get Started Now',
      contact_us: 'Contact Us',
      submit: 'Submit',
      cancel: 'Cancel',
      confirm: 'Confirm',
      book: 'Book Now',
    },

    services: {
      title: 'Our Services',
      cards: [
        {
          icon: '⚡',
          title: 'Modern Frontend Development',
          description: 'We design & build fast, responsive user interfaces using the latest technologies.'
        },
        {
          icon: '🛠️',
          title: 'Powerful Backend Solutions',
          description: 'Secure, scalable backend systems that handle millions of users efficiently.'
        }
      ]
    },

    newsletter: {
      title: 'Subscribe to our newsletter',
      description: 'Get the latest news and offers directly in your inbox'
    },

    booking: {

      title: 'Book an Appointment',

      full_name: 'Full Name',
      full_name_placeholder: 'Enter your full name',

      email: 'Email Address',
      email_placeholder: 'Example: example@email.com',

      phone: 'Phone Number',
      phone_placeholder: 'Example: +201012345678',

      reason: 'Booking Reason (optional)',
      reason_placeholder: 'Write the reason for booking or any notes...',

      date: 'Date',
      time: 'Time',

      select_date_first: 'Select date first',
      no_times_available: 'No times available for this date',

      date_trigger_default: 'Choose date ←',
      time_trigger_default: 'Choose time ←',

      ui: {
        sending: 'Submitting...',
        loading_appointments: 'Loading appointments...',
        fetch_error: 'Failed to load appointments',
        missing_datetime: 'Please select date and time',
        no_appointments_days: 'No appointments available in upcoming days'
      },

      success: {
        APPOINTMENT_CREATED: 'Appointment booked successfully',
        APPOINTMENT_RESCHEDULED: 'Appointment rescheduled successfully',
        APPOINTMENT_CANCELLED: 'Appointment cancelled successfully',
        GENERIC_SUCCESS: 'Operation completed successfully'
      },

      errors: {
        TIME_ALREADY_BOOKED: 'This time slot is already booked',
        TIME_NOT_AVAILABLE: 'This time is not available',
        PAST_DATE: 'Cannot book a past date',
        INVALID_EMAIL: 'Invalid email address',
        UNKNOWN_ERROR: 'Unexpected error occurred'
      }

    }

  }

} as const;

export type Locale = keyof typeof translations;
