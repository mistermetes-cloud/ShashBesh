# ShashBesh — oʻyin qoidalari

DRAFT_REVIEW_REQUIRED. Tarjima oʻzbek tilida soʻzlashuvchi mustaqil muharrir tomonidan tekshirilmagan. Ruscha manba va egasining GAME UPDATE 06 tasdigʻi asos hisoblanadi. Boshqa ochiq talqinlar tasdiqlangan deb hisoblanmaydi.

## Taxta va maqsad

2–4 oʻyinchi, har birida beshta dona. Uyining beshta katagini eng uzoq nuqtadan boshlab zich toʻldirgan birinchi oʻyinchi gʻolib boʻladi. Tashqi yoʻl 48 katakdan iborat: 1→2→…→48→1. Donalar raqamlar ortishi boʻyicha yuradi. Boshlash kataklari P1=1, P2=13, P3=25, P4=37. Har bir uy umumiy tashqi boshlash katagi va toʻrtta ichki katakdan tuzilgan: P1 uchun 1, Д1.2, Д1.3, Д1.4, Д1.5. Boshqa uylar ham shu tartibda. Jami 64 ta fizik katak bor. Burchaklar 7, 19, 31, 43; aniq joylashuv CSV faylida belgilangan. P1 qora, P2 qizil, P3 koʻk, P4 sariq.

## Boshlash va navbat

Har bir oʻyinchi bitta zar tashlaydi. Eng katta qiymat chiqargan boshlaydi; eng katta qiymatlar teng boʻlsa, faqat shu oʻyinchilar qayta tashlaydi. Navbat soat mili yoʻnalishida davom etadi. Boshqalar faol oʻyinchi barcha qoʻshimcha tashlashlarini tugatishini kutadi.

## Zarlar va yurishlar

Ikkita mustaqil olti yoqli zar tashlanadi. Oddiy a–b natijasi a va b qiymatli ikkita alohida yurish beradi. Har qanday n–n juftligi toʻrtta alohida n yurish va yana zar tashlash huquqini beradi. 6–6 ikki yoki uchta emas, toʻrtta olti demakdir. 6–5 yoki 5–6 olti va besh yurishdan keyin qoʻshimcha tashlash beradi. Ketma-ket qoʻshimcha tashlashlar soni cheklanmagan. Har bir tashlash keyingisidan oldin toʻliq oʻynalib, qayd etiladi. Qiymatlarni boshqa tashlashga oʻtkazish yoki aralashtirish mumkin emas.

Majburiy burchak sakrashlari va barcha ruxsat etilgan davomlarni hisobga olib, yurish qiymatlarining eng katta yigʻindisini ishlatish kerak. 6+3 ishlatilishi mumkin boʻlsa, uchni ishlatishga toʻsqinlik qiladigan olti yurishni tanlab boʻlmaydi. Faqat besh yoki uchdan bittasini ishlatish mumkin boʻlsa, besh ishlatiladi. Eng katta yigʻindisi teng variantlar orasidan oʻyinchi tanlaydi.

## Kiritish, toʻsiqlar va dona urish

Zaxiradagi dona bitta olti yurish bilan oʻz boshlash katagiga kiritiladi; olti katak yurmaydi. Boshlash katagida oʻz donasi boʻlsa, kiritish taqiqlanadi; raqib donasi boʻlsa, uriladi. Har katakda koʻpi bilan bitta dona turadi. Oʻz donasidan oʻtish, ustidan sakrash yoki uning katagiga tushish mumkin emas. Raqib donalari ustidan oʻtish mumkin.

Urish yurishini tanlash ixtiyoriy. Raqibni urish imkoni mavjudligi boshqa ruxsat etilgan yurishni taqiqlamaydi. Ammo tanlangan yurish raqib turgan katakda tugasa, raqib donasi avtomatik ravishda zaxiraga qaytadi va yoʻldagi yutuqlari nolga tushadi. Juft toʻsiqlar, donalar uyumi va koʻrsatilmagan xavfsiz kataklar yoʻq.

## Majburiy burchak sakrashi

Burchaklar aylanishi: 31→43→7→19→31. Dona burchakda turgan boʻlsa, ishlatilmagan 1 mavjud va sakrashga ruxsat etilgan boʻlsa, avval shu 1 bilan sakrash shart. Bu 1 ni boshqa donaning oddiy yurishiga sarflab boʻlmaydi. Bir nechta burchakdan sakrash mumkin boʻlsa, majburiy talablar va eng katta yigʻindiga mos variantlar saqlanadi.

Burchakka yetib kelish tartibi saqlanadi: 40 dan 3–1 bilan avval 40→41→42→43 yurishi uchni ishlatadi, keyin 43 dan 7 ga sakrash alohida 1 ni sarflaydi. Sakrash bepul emas. 1–2 bilan avval sakraladi, keyin oʻyinchi qolgan 2 bilan istalgan ruxsat etilgan yurishni tanlaydi. 2 avtomatik sarflanmaydi va aynan shu dona bilan davom etish shart emas. Qolgan 1 lar yangi ruxsat etilgan burchak sakrashini bersa, ustuvorlik yana qoʻllanadi.

Sakrash tashqi yoʻldagi haqiqiy masofani 12 ga oshiradi, lekin bitta 1 ni sarflaydi. Oʻz donalari yaqinlashish yoʻlini ham, sakrashning 12 katakli yoʻlini ham toʻsadi. Oraliqdagi raqib donalari joyida qoladi; faqat tushish katagidagi raqib uriladi. Noqonuniy sakrash majburlanmaydi; odatiy ruxsat etilgan yurishlar tekshiriladi. Ishlatilmagan 1 boʻlmasa, burchakka yetishning oʻzi ustuvorlik bermaydi. Uy kirishini sakrab oʻtishda mavjud `jumpEntry: skip` talqini saqlanadi. Boshqa ochiq savollar hal etilgan hisoblanmaydi.

## Uy va gʻalaba

Tashqi aylana tugagach, dona oʻz kirishiga yetganida uyga buriladi; ixtiyoriy yangi aylanaga ketish mumkin emas. Majburiy sakrash qoʻshimcha aylanaga olib kelishi mumkin. Uyning toʻrtta ichki katagi himoyalangan: raqib kira olmaydi va u yerdagi donani ura olmaydi. Uyda bir nechta hali yuradigan dona boʻlishi mumkin, lekin ular bir-biridan oʻta olmaydi va bitta katakni egallay olmaydi.

Aniq qiymat talab etiladi: oxirgi katakdan yoki marradan oshib ketish mumkin emas. Ortiqcha katta qiymat boshqa donaga mos kelishi mumkin. Donalar uzoq uchdan boshlab zich tartibda butunlay toʻxtaydi: Д1.5, Д1.4, Д1.3, Д1.2, soʻng toʻliq aylanadan keyin umumiy boshlash katagi. Boshqa oʻyinchilarda ham shu tartib. Beshta joy toʻldirilishi bilan oʻyin darhol tugaydi. Majburiy sakrash boʻlmasa, 1–1 bilan Д1.3 dagi A va Д1.2 dagi B shunday yura oladi: A→Д1.4, B→Д1.3, A→Д1.5, B→Д1.4.

Ruxsat etilgan yurish qolmaganda tashlash mavjud Core qoidalari bilan yakunlanadi; qoʻshimcha tashlash huquqi boʻlsa, oʻsha oʻyinchida qoladi. Stol chetidan tushgan haqiqiy zar hisobga olinmaydi. Jurnaldagi xesh zanjiri mahalliy yaxlitlik tekshiruvidir; pul tikish yoki blokcheynni anglatmaydi.
