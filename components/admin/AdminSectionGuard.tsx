"use client";

import { useAuth } from "@/lib/auth-context";
import { canAccess, ROLE_LABELS, type AdminSection } from "@/lib/admin-roles";
import { ShieldOff } from "lucide-react";
import Link from "next/link";
import { getFirstSection } from "@/lib/admin-roles";

interface Props {
  section: AdminSection;
  children: React.ReactNode;
}

export function AdminSectionGuard({ section, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return null;

  if (!canAccess(user.role, section)) {
    const roleLabel = ROLE_LABELS[user.role] ?? user.role;
    const firstSection = getFirstSection(user.role);
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <ShieldOff className="w-8 h-8 text-red-400" />
        </div>
        <h2 className="text-xl font-black dark:text-white text-slate-900 mb-2">
          غير مصرح بالوصول
        </h2>
        <p className="dark:text-slate-400 text-slate-500 text-sm mb-6 max-w-xs">
          حساب <span className="text-cyan-400 font-semibold">{roleLabel}</span> لا يملك صلاحية الوصول لهذا القسم.
        </p>
        <Link
          href={firstSection}
          className="btn-primary"
        >
          انتقل لقسمك
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
