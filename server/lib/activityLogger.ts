import { db, userActivityLogsTable } from "../../lib/db/src/index";

export type ActivityAction =
  | "register"
  | "login"
  | "logout"
  | "update_profile"
  | "enroll_course"
  | "view_lesson"
  | "complete_lesson"
  | "submit_challenge"
  | "solve_challenge"
  | "create_project"
  | "update_project"
  | "publish_project"
  | "like_project"
  | "fork_project"
  | "run_code"
  | "send_chat"
  | "password_reset"
  | "password_changed"
  | "email_changed";

export interface ActivityOpts {
  userId:      number;
  action:      ActivityAction;
  entityType?: string;
  entityId?:   number;
  entityTitle?: string;
  metadata?:   Record<string, unknown>;
  ip?:         string;
}

/** Fire-and-forget activity logger — never throws, never blocks the request */
export function logActivity(opts: ActivityOpts): void {
  db.insert(userActivityLogsTable).values({
    userId:      opts.userId,
    action:      opts.action,
    entityType:  opts.entityType  ?? null,
    entityId:    opts.entityId    ?? null,
    entityTitle: opts.entityTitle ?? null,
    metadata:    opts.metadata    ?? null,
    ip:          opts.ip          ?? null,
  }).catch(() => {});
}
