export interface BlockInfo {
  type: string;
  label: string;
  icon: string;
  description: string;
}

export interface BlockCategory {
  category: string;
  blocks: BlockInfo[];
}

export const BLOCK_CATALOG: BlockCategory[] = [
  {
    category: "أقسام رئيسية",
    blocks: [
      { type: "hero", label: "هيرو", icon: "🌟", description: "قسم رئيسي بعنوان وأزرار وأنيميشن مخصص" },
      { type: "cta", label: "دعوة للعمل", icon: "🚀", description: "قسم تحفيزي بأزرار وخلفية" },
      { type: "image_banner", label: "بانر صورة", icon: "🖼️", description: "صورة كاملة العرض مع نص وأزرار" },
    ],
  },
  {
    category: "بيانات المنصة",
    blocks: [
      { type: "stats", label: "الإحصائيات", icon: "📊", description: "أرقام وإحصائيات المنصة" },
      { type: "courses_grid", label: "شبكة الكورسات", icon: "📚", description: "عرض كورسات بعدد محدد" },
      { type: "courses_browser", label: "متصفح الكورسات", icon: "🔍", description: "صفحة كورسات كاملة مع بحث وفلترة" },
      { type: "challenges_grid", label: "شبكة التحديات", icon: "⚡", description: "عرض تحديات برمجية" },
      { type: "problems_browser", label: "متصفح التحديات", icon: "💻", description: "صفحة تحديات كاملة مع بحث وفلترة" },
      { type: "articles_grid", label: "شبكة المقالات", icon: "📰", description: "عرض مقالات حديثة" },
      { type: "articles_browser", label: "متصفح المقالات", icon: "📖", description: "صفحة مقالات كاملة مع بحث وتصنيفات" },
      { type: "leaderboard", label: "المتصدرون", icon: "🏆", description: "أفضل المستخدمين نقاطاً" },
      { type: "users_grid", label: "شبكة المستخدمين", icon: "👥", description: "عرض مستخدمي المنصة" },
    ],
  },
  {
    category: "محتوى مخصص",
    blocks: [
      { type: "features", label: "المميزات", icon: "✨", description: "شبكة بطاقات للمميزات" },
      { type: "cards", label: "بطاقات مخصصة", icon: "🃏", description: "بطاقات بمحتوى حر" },
      { type: "categories", label: "التصنيفات", icon: "🗂️", description: "تصنيفات بأيقونات وألوان" },
      { type: "testimonials", label: "آراء المستخدمين", icon: "💬", description: "شهادات وتقييمات المستخدمين" },
      { type: "faq", label: "الأسئلة الشائعة", icon: "❓", description: "أسئلة وأجوبة قابلة للطي" },
      { type: "pricing", label: "الأسعار", icon: "💰", description: "بطاقات أسعار وباقات" },
    ],
  },
  {
    category: "نص ووسائط",
    blocks: [
      { type: "text", label: "نص حر", icon: "📝", description: "فقرة نصية بتنسيق متكامل" },
      { type: "rich_text", label: "نص منسق", icon: "✍️", description: "عنوان أو فقرة أو قائمة أو اقتباس" },
      { type: "code_block", label: "بلوك كود", icon: "💻", description: "كود برمجي مع تمييز بالألوان" },
      { type: "video_embed", label: "فيديو مدمج", icon: "🎬", description: "فيديو يوتيوب أو رابط مباشر" },
    ],
  },
  {
    category: "أدوات تفاعلية",
    blocks: [
      { type: "cloud_ide", label: "Cloud IDE", icon: "🖥️", description: "محرر كود احترافي مع شجرة ملفات ومعاينة فورية وتيرمنال" },
    ],
  },
  {
    category: "تصميم وأنيميشن",
    blocks: [
      { type: "animation", label: "أنيميشن", icon: "🎨", description: "خلفية متحركة جذابة مع تخصيص كامل" },
      { type: "mascot_section", label: "شخصية متحركة", icon: "🤖", description: "شخصية متحركة مع نص وأزرار" },
      { type: "countdown", label: "عد تنازلي", icon: "⏱️", description: "عداد تنازلي لحدث قادم" },
      { type: "divider", label: "فاصل", icon: "➖", description: "فاصل بصري بين الأقسام" },
      { type: "spacer", label: "مسافة فارغة", icon: "⬜", description: "مسافة فارغة قابلة للتخصيص" },
    ],
  },
];
