export const ADMIN_ROLES = [
  "super_admin",
  "admin",
  "content_admin",
  "users_admin",
  "articles_admin",
] as const;

export type AdminRole = typeof ADMIN_ROLES[number];

export const ROLE_LABELS: Record<string, string> = {
  user: "مستخدم",
  admin: "مدير",
  super_admin: "سوبر مدير",
  content_admin: "مدير المحتوى",
  users_admin: "مدير المستخدمين",
  articles_admin: "مدير المقالات",
};

export const ROLE_COLORS: Record<string, string> = {
  user: "bg-slate-500/15 text-slate-400",
  admin: "bg-violet-500/15 text-violet-400",
  super_admin: "bg-amber-500/15 text-amber-400",
  content_admin: "bg-green-500/15 text-green-400",
  users_admin: "bg-cyan-500/15 text-cyan-400",
  articles_admin: "bg-rose-500/15 text-rose-400",
};

export type AdminSection = "dashboard" | "users" | "courses" | "problems" | "articles" | "pages" | "settings" | "security";

export const ROLE_SECTIONS: Record<string, AdminSection[]> = {
  super_admin: ["dashboard", "users", "courses", "problems", "articles", "pages", "settings", "security"],
  admin:       ["dashboard", "users", "courses", "problems", "articles", "pages", "settings", "security"],
  content_admin:  ["courses", "problems", "pages"],
  users_admin:    ["users"],
  articles_admin: ["articles", "pages", "settings"],
};

export function canAccess(role: string, section: AdminSection): boolean {
  const allowed = ROLE_SECTIONS[role] ?? [];
  return allowed.includes(section);
}

export function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role as AdminRole);
}

export function getFirstSection(role: string): string {
  const sections = ROLE_SECTIONS[role];
  if (!sections || sections.length === 0) return "/admin";
  const sectionPaths: Record<AdminSection, string> = {
    dashboard: "/admin",
    users:     "/admin/users",
    courses:   "/admin/courses",
    problems:  "/admin/problems",
    articles:  "/admin/articles",
    pages:     "/admin/pages",
    settings:  "/admin/settings",
    security:  "/admin/ide-monitor",
  };
  return sectionPaths[sections[0]] ?? "/admin";
}
