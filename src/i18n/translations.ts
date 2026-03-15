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

    validation: {
       required: "يجب ملء هذا الحقل",
       name_short: "يجب ألا يقل الاسم عن ٣ حروف",
       email_invalid: "يرجى كتابة بريد الكتروني صالح",
       phone_invalid: "يرجى كتابة رقم هاتف صالح",
       email_notice: "سيتم ارسال رسالة الى بريدك الالكتروني"
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

    },

      manage: {  
        title: 'إدارة الموعد',  
        current_appointment: 'موعدك الحالي',  
        name: 'الاسم',  
        date: 'التاريخ',  
        time: 'الوقت',  
        reason: 'السبب',  
        cancel_button: 'إلغاء الموعد',  
        reschedule_button: 'إعادة جدولة الموعد',  
        cancelled_button: 'تم الإلغاء',  
        appointment_cancelled: 'تم إلغاء هذا الموعد',  
        confirm_title: 'تأكيد الإلغاء',  
        confirm_text: 'هل أنت متأكد من إلغاء هذا الموعد؟ لا يمكن التراجع عن هذا الإجراء.',  
        modal_cancel_btn: 'لا، الغِ',  
        modal_confirm_btn: 'نعم، إلغاء الموعد',  
        cancelling: 'جاري إلغاء الموعد...',  
        cancel_success: 'تم إلغاء الموعد بنجاح',  
        cancel_error: 'حدث خطأ أثناء محاولة الإلغاء',  
        not_available_after: 'غير متاح بعد الإلغاء',  
        success_cancelled: 'تم إلغاء الموعد بنجاح',  
        already_processed: 'تمت معالجة هذا الموعد مسبقًا',  
        cancel_failed: 'حدث خطأ أثناء محاولة الإلغاء، حاول مرة أخرى'  
    },  

      reschedule: {

        title: 'إعادة جدولة الموعد',
        current_appointment: 'موعدك الحالي',
        name: 'الاسم',
        date: 'التاريخ',
        time: 'الوقت',
        reason: 'السبب',
        submit_button: 'تأكيد التعديل',
        success_message: 'تم تعديل الموعد بنجاح',
        error_message: 'حدث خطأ أثناء محاولة التعديل',
        submitting: 'جاري تعديل الموعد...',
        invalid_link: 'الرابط غير صالح أو انتهت صلاحيته',
        already_cancelled: 'تم إلغاء هذا الموعد مسبقاً',
        already_modified: 'تم تعديل هذا الموعد من قبل. إذا كنت ترغب بتغيير موعدك يرجى إلغاء هذا الموعد وتسجيل حجز جديد',

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

    validation: {
      required: "This field is required",
      name_short: "The name must be at least 3 characters long",
      email_invalid: "Please enter a valid email address",
      phone_invalid: "Please enter a valid phone number",
      email_notice: "A confirmation email will be sent to your inbox"
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

      },

      manage: {  
       title: 'Manage Appointment',  
       current_appointment: 'Your Current Appointment',  
       name: 'Name',  
       date: 'Date',  
       time: 'Time',  
       reason: 'Reason',  
       cancel_button: 'Cancel Appointment',  
       reschedule_button: 'Reschedule Appointment',  
       cancelled_button: 'Cancelled',  
       appointment_cancelled: 'This appointment has been cancelled',  
       confirm_title: 'Confirm Cancellation',  
       confirm_text: 'Are you sure you want to cancel this appointment? This action cannot be undone.',  
       modal_cancel_btn: 'No, keep it',  
       modal_confirm_btn: 'Yes, cancel appointment',  
       cancelling: 'Cancelling appointment...',  
       cancel_success: 'Appointment cancelled successfully',  
       cancel_error: 'An error occurred while trying to cancel',  
       not_available_after: 'Not available after cancellation',  
       success_cancelled: 'Appointment cancelled successfully',  
       already_processed: 'This appointment has already been processed',  
       cancel_failed: 'An error occurred while trying to cancel, please try again'  
     },  

     reschedule: {

       title: 'Reschedule Appointment',
       current_appointment: 'Your Current Appointment',
       name: 'Name',
       date: 'Date',
       time: 'Time',
       reason: 'Reason',
       submit_button: 'Confirm Reschedule',
       success_message: 'Appointment rescheduled successfully',
       error_message: 'An error occurred while rescheduling',
       submitting: 'Rescheduling appointment...',
       invalid_link: 'The link is invalid or has expired',
       already_cancelled: 'This appointment has already been cancelled',
       already_modified: 'This appointment has already been modified. If you wish to change your appointment, please cancel this one and book a new one',

     }
    
   }

} as const;

export type Locale = keyof typeof translations;
