import { useLanguage } from './LanguageContext.jsx';
import { useMemo } from 'react';

const messages = {
    en: {
        'nav.brand': 'Sentra',
        'nav.services': 'Services',
        'nav.about': 'About',
        'nav.contact': 'Contact',
        'nav.admin': 'Admin',
        'nav.request_callback': 'Request callback',
        'nav.sign_in': 'Sign in',
        'nav.sign_out': 'Sign out',

        'landing.badge': 'Security Systems & Professional Services',
        'landing.title': 'Our core services',
        'landing.desc': 'We focus on three main directions to secure your property.',
        'landing.fire': 'Fire Safety',
        'landing.cctv': 'Cameras',
        'landing.access': 'Access Control',
        'landing.start': 'Start a request',

        'phone.title': 'Continue with phone',
        'phone.close': 'Close',
        'phone.number_label': 'Phone number (Georgia)',
        'phone.placeholder_local': '5XXXXXXXX',
        'phone.only_georgian': 'Only Georgian mobile numbers are supported.',
        'phone.send_code': 'Send code',
        'phone.verify': 'Verify',
        'phone.otp_label': 'Enter OTP',
        'phone.otp_placeholder': '6-digit code',
        'phone.disclaimer': 'We’ll send you a verification code.',

        'forms.title': 'Request Form',
        'forms.create_prompt': 'Create a new request',
        'forms.start': 'Start',
        'forms.step1.title': 'Choose a service direction',
        'forms.step1.next': 'Next',
        'forms.cancel': 'Cancel',
        'forms.step2.comment': 'Tell us what you need (comment)',
        'forms.step2.attachment': 'Attachment (DWG, PDF) – optional',
        'forms.step2.attachment_hint': 'If you attach a file, we will prioritize your request',
        'forms.full_name': 'Full name',
        'forms.contact': 'Contact info',
        'forms.submit': 'Submit',
        'forms.submitting': 'Submitting…',
        'forms.back': 'Back',
        'forms.step3.title': 'Your request has been received',
        'forms.step3.subtitle': 'Our engineer will contact you very soon.',
        'forms.close': 'Close',
        'forms.recent': 'Recent Requests',
        'forms.open': 'Open',
        'forms.signin_needed': 'Please sign in to view your forms.',
        'forms.sign_in': 'Sign in',
        'forms.your_forms': 'Your Forms',
        'admin.manage_pages': 'Manage Pages',

        'services.title': 'Our Services',
        'services.body': 'Describe your services here. This text can be managed by admin.',
        'about.title': 'About Us',
        'about.body': 'Write about the company here. This text can be managed by admin.',
        'contact.title': 'Contact',
        'contact.body': 'Provide contact information here. This text can be managed by admin.',

        'details.edit': 'Edit',
        'details.save': 'Save',
        'details.cancel': 'Cancel',
        'details.loading': 'Loading...',
        'details.status': 'Status',
        'details.input_one': 'Input one',
        'details.input_two': 'Input two',
        'details.input_three': 'Input three',

        'admin.title': 'Admin Dashboard',
        'admin.from': 'From',
        'admin.mark_under_review': 'Mark as Under Review',
        'admin.mark_in_progress': 'Mark as In Progress',
        'admin.mark_completed': 'Mark as Completed',
        'admin.col_unopened': 'Unopened',
        'admin.col_under_review': 'Under Review',
        'admin.col_in_progress': 'In Progress',
        'admin.col_completed': 'Completed',
        'admin.back': 'Back to Admin',
        
        'settings.title': 'Manage Settings',
        'settings.logo': 'Application Logo',
        'settings.favicon': 'Favicon (Browser Tab Icon)',
        'settings.carousel': 'Main Page Carousel Images',
        'settings.upload_logo': 'Upload a new logo (PNG, SVG, or JPG)',
        'settings.upload_favicon': 'Upload a new favicon (ICO, PNG, or SVG - recommended size: 32x32 or 64x64)',
        'settings.upload_carousel': 'Upload up to 3 images for the carousel on the main page',
        'settings.carousel_image': 'Carousel Image',
        'settings.save': 'Save Settings',
        'settings.saving': 'Saving...',
        'settings.saved': 'Settings saved successfully!',
        'settings.failed': 'Failed to save settings.',

        'status.unopened': 'Unopened',
        'status.under_review': 'Under Review',
        'status.in_progress': 'In Progress',
        'status.completed': 'Completed',

        'topic.fire': 'Fire Safety',
        'topic.cctv': 'Cameras',
        'topic.access': 'Access Control',
    },
    ka: {
        'nav.brand': 'Sentra',
        'nav.services': 'სერვისები',
        'nav.about': 'ჩვენ შესახებ',
        'nav.contact': 'კონტაქტი',
        'nav.admin': 'ადმინი',
        'nav.request_callback': 'დარეკვის მოთხოვნა',
        'nav.sign_in': 'შესვლა',
        'nav.sign_out': 'გასვლა',

        'landing.badge': 'უსაფრთხოების სისტემები და პროფესიული სერვისები',
        'landing.title': 'ჩვენი ძირითადი მიმართულებები',
        'landing.desc': 'სამ ძირითად მიმართულებაზე ვართ ფოკუსირებული.',
        'landing.fire': 'სახანძრო უსაფრთხოება',
        'landing.cctv': 'კამერები',
        'landing.access': 'დაშვების სისტემა',
        'landing.start': 'განაცხადის დაწყება',

        'phone.title': 'გაგრძელება ტელეფონით',
        'phone.close': 'დახურვა',
        'phone.number_label': 'ტელეფონის ნომერი (საქართველო)',
        'phone.placeholder_local': '5XXXXXXXX',
        'phone.only_georgian': 'მხოლოდ ქართული მობილური ნომრებია მხარდაჭერილი.',
        'phone.send_code': 'კოდის გაგზავნა',
        'phone.verify': 'დადასტურება',
        'phone.otp_label': 'შეიყვანეთ OTP',
        'phone.otp_placeholder': '6-ნიშნა კოდი',
        'phone.disclaimer': 'გამოგიგზავნით დადასტურების კოდს.',

        'forms.title': 'განაცხადი',
        'forms.create_prompt': 'დააყენეთ ახალი განაცხადი',
        'forms.start': 'დაწყება',
        'forms.step1.title': 'აირჩიე რომელი მიმართულება გინდა',
        'forms.step1.next': 'შემდეგი',
        'forms.cancel': 'გაუქმება',
        'forms.step2.comment': 'მოგვიყევი რა გსურთ (კომენტარი)',
        'forms.step2.attachment': 'ატაჩმენტი (DWG, PDF) – არასავალდებულო',
        'forms.step2.attachment_hint': 'თუ ატვირთავთ, თქვენი მოთხოვნა დაჩქარებული წესით განიხილება',
        'forms.full_name': 'სახელი და გვარი',
        'forms.contact': 'საკონტაქტო ინფორმაცია',
        'forms.submit': 'გაგზავნა',
        'forms.submitting': 'იგზავნება…',
        'forms.back': 'უკან',
        'forms.step3.title': 'თქვენი განაცხადი მიღებულია',
        'forms.step3.subtitle': 'ჩვენი ინჟინერი ძალიან მალე დაგიკავშირდებათ.',
        'forms.close': 'დახურვა',
        'forms.recent': 'ბოლო განაცხადები',
        'forms.open': 'გახსნა',
        'forms.signin_needed': 'გთხოვთ, შედით, რათა იხილოთ თქვენი განაცხადები.',
        'forms.sign_in': 'შესვლა',
        'forms.your_forms': 'თქვენი განაცხადები',
        'admin.manage_pages': 'გვერდების მართვა',

        'services.title': 'სერვისები',
        'services.body': 'აქ აღწერეთ თქვენი სერვისები. ეს ტექსტი ადმინს შეუძლია შეცვალოს.',
        'about.title': 'ჩვენს შესახებ',
        'about.body': 'აქ დაწერეთ კომპანიის შესახებ. ეს ტექსტი ადმინს შეუძლია შეცვალოს.',
        'contact.title': 'კონტაქტი',
        'contact.body': 'აქ მიუთითეთ საკონტაქტო ინფორმაცია. ეს ტექსტი ადმინს შეუძლია შეცვალოს.',

        'details.edit': 'რედაქტირება',
        'details.save': 'შენახვა',
        'details.cancel': 'გაუქმება',
        'details.loading': 'იტვირთება...',
        'details.status': 'სტატუსი',
        'details.input_one': 'ველი ერთი',
        'details.input_two': 'ველი ორი',
        'details.input_three': 'ველი სამი',

        'admin.title': 'ადმინისტრატორის პანელი',
        'admin.from': 'ავტორი',
        'admin.mark_under_review': 'მონიშნე - განხილვაში',
        'admin.mark_in_progress': 'მონიშნე - შესრულების პროცესში',
        'admin.mark_completed': 'მონიშნე - დასრულებულია',
        'admin.col_unopened': 'გაუხსნელი',
        'admin.col_under_review': 'განხილვაში',
        'admin.col_in_progress': 'შესრულების პროცესში',
        'admin.col_completed': 'დასრულებულია',
        'admin.back': 'ადმინის ახლოს',
        
        'settings.title': 'პარამეტრების მართვა',
        'settings.logo': 'აპლიკაციის ლოგო',
        'settings.favicon': 'Favicon (ბრაუზერის ტაბის ხატულა)',
        'settings.carousel': 'მთავარი გვერდის კაროსელის სურათები',
        'settings.upload_logo': 'ატვირთეთ ახალი ლოგო (PNG, SVG ან JPG)',
        'settings.upload_favicon': 'ატვირთეთ ახალი favicon (ICO, PNG ან SVG - რეკომენდებული ზომა: 32x32 ან 64x64)',
        'settings.upload_carousel': 'ატვირთეთ მაქსიმუმ 3 სურათი მთავარი გვერდის კაროსელისთვის',
        'settings.carousel_image': 'კაროსელის სურათი',
        'settings.save': 'პარამეტრების შენახვა',
        'settings.saving': 'შეინახება...',
        'settings.saved': 'პარამეტრები წარმატებით შეინახა!',
        'settings.failed': 'პარამეტრების შენახვა ვერ მოხერხდა.',

        'status.unopened': 'გაუხსნელი',
        'status.under_review': 'განხილვაში',
        'status.in_progress': 'შესრულების პროცესში',
        'status.completed': 'დასრულებულია',

        'topic.fire': 'სახანძრო უსაფრთხოება',
        'topic.cctv': 'კამერები',
        'topic.access': 'დაშვების სისტემა',
    },
};

const toUpper = (value) => (typeof value === 'string' ? value.toUpperCase() : value);

export function useI18n() {
    const { lang } = useLanguage();
    return useMemo(() => {
        return function t(key) {
            const message = messages[lang]?.[key] ?? messages.en[key] ?? key;
            return toUpper(message);
        };
    }, [lang]);
}

export function translateStatus(status, langCode) {
    const key = `status.${status}`;
    const message = messages[langCode]?.[key] ?? messages.en[key] ?? status;
    return toUpper(message);
}


