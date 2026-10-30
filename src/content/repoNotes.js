// GitHub only has English descriptions, so the stalls that matter get a line of
// Arabic written by hand. A repo with no entry here falls back to its English.
export const REPO_NOTES_AR = {
  qanun: 'ابحث في قانون العمل القطري بالعربي والإنجليزي، والإجابة بتستشهد بالمواد نفسها. مش استشارة قانونية.',
  ACAS: 'تحليل تعليقات العملاء بالعربي والإنجليزي: المشاعر والنية والأولوية وتوزيع التذاكر أوتوماتيك. مبني بـFastAPI.',
  'qar-budget': 'تتبّع ميزانيتك في قطر بالريال القطري: ميزانيات شهرية ورسوم بيانية واستيراد وتصدير CSV، بالعربي والإنجليزي.',
  'sql-retail-analytics': '25 سؤال بيزنس متجاوب عليهم بـSQL لسلسلة بقالة في قطر: كوهورتس وRFM وسلة المشتريات وتأثير رمضان.',
  ds_salary_proj: 'وظايف البيانات والذكاء الاصطناعي بتقبض كام: تحليل 151 ألف راتب، ومعاهم أداة سطر أوامر لتقدير الراتب.',
  'arabic-normalize': 'توحيد النص العربي للبحث والـNLP: التشكيل وأشكال الألف والتمطيط والأرقام. من غير أي dependencies.',
  'British-airway-Task': 'سحب وتحليل مشاعر 1,000 تقييم من عملاء الخطوط البريطانية.',
  csvdiff: 'قارن ملفين CSV بعمود مفتاح: الصفوف اللي اتضافت واتشالت واتغيرت. من غير أي dependencies.',
  envcheck: 'راجع ملف .env قدام .env.example قبل الديبلوي: مفاتيح ناقصة وقيم فاضية. وعمره ما يطبع الأسرار.',
  Koru_Paper: 'هل مراجعة البشر لنصايح الذكاء الاصطناعي بتنفع فعلاً؟ إعادة تحليل 35 ألف قرار.',
  linkcheck: 'فاحص لينكات مكسورة سريع لملفات Markdown وHTML والمواقع. ملف تنفيذي واحد.',
};

// A line from the stall keeper, in each language, for the headline stalls.
export function describeRepo(repo, lang, fallback) {
  if (repo.more) return fallback.more;
  if (lang === 'ar' && REPO_NOTES_AR[repo.name]) return REPO_NOTES_AR[repo.name];
  return repo.description || fallback.none;
}
