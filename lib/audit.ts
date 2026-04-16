import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type AuditActorRole = "user" | "admin" | "system" | "ai";

type JsonObject = Record<string, unknown>;

export type WriteAuditLogInput = {
  submissionId: number;
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole: AuditActorRole;
  action: string;
  oldValue?: JsonObject | null;
  newValue?: JsonObject | null;
  metadata?: JsonObject | null;
};

export async function writeAuditLog(input: WriteAuditLogInput) {
  const { error } = await supabase.from("audit_logs").insert({
    submission_id: input.submissionId,
    actor_user_id: input.actorUserId ?? null,
    actor_email: input.actorEmail ?? null,
    actor_role: input.actorRole,
    action: input.action,
    old_value: input.oldValue ?? null,
    new_value: input.newValue ?? null,
    metadata: input.metadata ?? null,
  });

  if (error) {
    console.error("writeAuditLog failed:", error.message);
  }
}