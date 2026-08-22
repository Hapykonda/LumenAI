import {
  cleanString,
  isIsoDate,
  isRecord,
  isUuid,
  LUMENITE_PHASE_ONE_CAPABILITIES,
  type ValidationFailure,
  type ValidationResult,
} from "./core";
import type {
  LumeniteActionDefinition,
  LumeniteExecutionContext,
  LumeniteSchema,
  LumeniteVerificationResult,
} from "./contracts";
import {
  createGoogleGmailDraft,
  deleteGoogleGmailDraft,
  verifyGoogleGmailDraft,
} from "@/lib/integrations/google-gmail";

type TaskInput = {
  title: string;
  description: string;
  dueAt: string | null;
  priority: "low" | "medium" | "high";
  leadId: string | null;
  conversationId: string | null;
};

type LeadNoteInput = { leadId: string; content: string };
type ResponseDraftInput = {
  conversationId: string;
  content: string;
  channel: "chat" | "email" | "whatsapp" | "panel";
};
type ConversationTagInput = { conversationId: string; tag: string; color: string | null };
type ReminderInput = {
  title: string;
  note: string;
  remindAt: string;
  resourceType: "general" | "lead" | "conversation" | "task";
  resourceId: string | null;
};
type GmailDraftInput = { recipient: string; subject: string; content: string };
type GmailDraftOutput = {
  id: string;
  draftId: string;
  messageId: string;
  externalUrl: string;
  recipient: string;
  subject: string;
  status: "created" | "verified";
  createdAt: string;
};

type EntityOutput = {
  id: string;
  label: string;
  status: string;
  createdAt: string;
  created: boolean;
};

function issues(...items: Array<[string, string]>): ValidationFailure {
  return {
    success: false,
    issues: items.map(([path, message]) => ({ path, message })),
  };
}

function optionalUuid(value: unknown, path: string): ValidationResult<string | null> {
  if (value === undefined || value === null || value === "") {
    return { success: true, data: null };
  }
  return isUuid(value)
    ? { success: true, data: String(value) }
    : issues([path, "Debe ser un UUID valido."]);
}

function entityOutputSchema(name: string): LumeniteSchema<EntityOutput> {
  return {
    name,
    shape: {
      id: "uuid",
      label: "string",
      status: "string",
      createdAt: "ISO datetime",
      created: "boolean",
    },
    safeParse(value): ValidationResult<EntityOutput> {
      if (!isRecord(value)) return issues(["output", "La salida debe ser un objeto."]);
      if (!isUuid(value.id)) return issues(["id", "La salida no contiene un ID valido."]);
      const label = cleanString(value.label, 240);
      const status = cleanString(value.status, 60);
      const createdAt = cleanString(value.createdAt, 80);
      if (!label || !status || !isIsoDate(createdAt)) {
        return issues(["output", "La salida operativa esta incompleta."]);
      }
      return {
        success: true,
        data: {
          id: String(value.id),
          label,
          status,
          createdAt,
          created: value.created !== false,
        },
      };
    },
  };
}

const gmailDraftInputSchema: LumeniteSchema<GmailDraftInput> = {
  name: "CreateGmailDraftInput",
  shape: {
    recipient: "email, max 320",
    subject: "string, 1..300",
    content: "string, 2..10000",
  },
  safeParse(value) {
    if (!isRecord(value)) return issues(["input", "La entrada debe ser un objeto."]);
    const recipient = cleanString(value.recipient, 320).toLowerCase();
    const subject = cleanString(value.subject, 300);
    const content = cleanString(value.content, 10_000);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || /[\r\n]/.test(recipient)) {
      return issues(["recipient", "Indica un destinatario valido."]);
    }
    if (!subject) return issues(["subject", "El borrador necesita un asunto."]);
    if (content.length < 2) return issues(["content", "El borrador no puede estar vacio."]);
    return { success: true, data: { recipient, subject, content } };
  },
};

const gmailDraftOutputSchema: LumeniteSchema<GmailDraftOutput> = {
  name: "CreateGmailDraftOutput",
  shape: {
    id: "uuid",
    draftId: "Google Gmail draft id",
    messageId: "Google Gmail message id",
    externalUrl: "Google Gmail draft URL",
    recipient: "email",
    subject: "string",
    status: "created | verified",
    createdAt: "ISO datetime",
  },
  safeParse(value) {
    if (!isRecord(value) || !isUuid(value.id)) return issues(["output", "El recibo del borrador no es valido."]);
    const draftId = cleanString(value.draftId, 500);
    const messageId = cleanString(value.messageId, 500);
    const externalUrl = cleanString(value.externalUrl, 1500);
    const recipient = cleanString(value.recipient, 320);
    const subject = cleanString(value.subject, 300);
    const status = cleanString(value.status, 30);
    const createdAt = cleanString(value.createdAt, 80);
    if (!draftId || !externalUrl.startsWith("https://mail.google.com/") || !recipient || !subject || !isIsoDate(createdAt)) {
      return issues(["output", "El recibo de Google Gmail esta incompleto."]);
    }
    if (!['created', 'verified'].includes(status)) return issues(["status", "El estado del borrador no es valido."]);
    return {
      success: true,
      data: {
        id: String(value.id),
        draftId,
        messageId,
        externalUrl,
        recipient,
        subject,
        status: status as GmailDraftOutput["status"],
        createdAt,
      },
    };
  },
};

const taskInputSchema: LumeniteSchema<TaskInput> = {
  name: "CreateTaskInput",
  shape: {
    title: "string, 2..160",
    description: "string, optional, max 1600",
    dueAt: "ISO datetime, optional",
    priority: "low | medium | high",
    leadId: "uuid, optional",
    conversationId: "uuid, optional",
  },
  safeParse(value) {
    if (!isRecord(value)) return issues(["input", "La entrada debe ser un objeto."]);
    const title = cleanString(value.title, 160);
    if (title.length < 2) return issues(["title", "La tarea necesita un titulo."]);
    const dueAt = cleanString(value.dueAt, 80) || null;
    if (dueAt && !isIsoDate(dueAt)) return issues(["dueAt", "La fecha no es valida."]);
    const leadId = optionalUuid(value.leadId, "leadId");
    if (!leadId.success) return leadId;
    const conversationId = optionalUuid(value.conversationId, "conversationId");
    if (!conversationId.success) return conversationId;
    const priority = cleanString(value.priority, 20) || "medium";
    if (!["low", "medium", "high"].includes(priority)) {
      return issues(["priority", "La prioridad debe ser low, medium o high."]);
    }
    return {
      success: true,
      data: {
        title,
        description: cleanString(value.description, 1600),
        dueAt,
        priority: priority as TaskInput["priority"],
        leadId: leadId.data,
        conversationId: conversationId.data,
      },
    };
  },
};

const leadNoteInputSchema: LumeniteSchema<LeadNoteInput> = {
  name: "AddLeadNoteInput",
  shape: { leadId: "uuid", content: "string, 2..2400" },
  safeParse(value) {
    if (!isRecord(value)) return issues(["input", "La entrada debe ser un objeto."]);
    const content = cleanString(value.content, 2400);
    if (!isUuid(value.leadId)) return issues(["leadId", "Selecciona un lead valido."]);
    if (content.length < 2) return issues(["content", "La nota no puede estar vacia."]);
    return { success: true, data: { leadId: String(value.leadId), content } };
  },
};

const responseDraftInputSchema: LumeniteSchema<ResponseDraftInput> = {
  name: "PrepareResponseInput",
  shape: {
    conversationId: "uuid",
    content: "string, 2..5000",
    channel: "chat | email | whatsapp | panel",
  },
  safeParse(value) {
    if (!isRecord(value)) return issues(["input", "La entrada debe ser un objeto."]);
    const content = cleanString(value.content, 5000);
    const channel = cleanString(value.channel, 20) || "chat";
    if (!isUuid(value.conversationId)) {
      return issues(["conversationId", "Selecciona una conversacion valida."]);
    }
    if (content.length < 2) return issues(["content", "El borrador no puede estar vacio."]);
    if (!["chat", "email", "whatsapp", "panel"].includes(channel)) {
      return issues(["channel", "El canal del borrador no es valido."]);
    }
    return {
      success: true,
      data: {
        conversationId: String(value.conversationId),
        content,
        channel: channel as ResponseDraftInput["channel"],
      },
    };
  },
};

const conversationTagInputSchema: LumeniteSchema<ConversationTagInput> = {
  name: "TagConversationInput",
  shape: { conversationId: "uuid", tag: "string, 1..40", color: "hex, optional" },
  safeParse(value) {
    if (!isRecord(value)) return issues(["input", "La entrada debe ser un objeto."]);
    const tag = cleanString(value.tag, 40).replace(/[^a-zA-Z0-9À-ÿ _-]/g, "");
    const color = cleanString(value.color, 16) || null;
    if (!isUuid(value.conversationId)) {
      return issues(["conversationId", "Selecciona una conversacion valida."]);
    }
    if (!tag) return issues(["tag", "La etiqueta no puede estar vacia."]);
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
      return issues(["color", "El color debe usar formato hexadecimal."]);
    }
    return {
      success: true,
      data: { conversationId: String(value.conversationId), tag, color },
    };
  },
};

const reminderInputSchema: LumeniteSchema<ReminderInput> = {
  name: "CreateReminderInput",
  shape: {
    title: "string, 2..160",
    note: "string, optional, max 1600",
    remindAt: "ISO datetime",
    resourceType: "general | lead | conversation | task",
    resourceId: "uuid, optional",
  },
  safeParse(value) {
    if (!isRecord(value)) return issues(["input", "La entrada debe ser un objeto."]);
    const title = cleanString(value.title, 160);
    const remindAt = cleanString(value.remindAt, 80);
    const resourceType = cleanString(value.resourceType, 24) || "general";
    const resourceId = optionalUuid(value.resourceId, "resourceId");
    if (!resourceId.success) return resourceId;
    if (title.length < 2) return issues(["title", "El recordatorio necesita un titulo."]);
    if (!isIsoDate(remindAt)) return issues(["remindAt", "Indica una fecha y hora validas."]);
    if (!["general", "lead", "conversation", "task"].includes(resourceType)) {
      return issues(["resourceType", "El tipo de recurso no es valido."]);
    }
    if (resourceType !== "general" && !resourceId.data) {
      return issues(["resourceId", "El recordatorio necesita el recurso relacionado."]);
    }
    return {
      success: true,
      data: {
        title,
        note: cleanString(value.note, 1600),
        remindAt: new Date(remindAt).toISOString(),
        resourceType: resourceType as ReminderInput["resourceType"],
        resourceId: resourceId.data,
      },
    };
  },
};

async function assertTenantResource(
  context: LumeniteExecutionContext,
  table: "leads" | "chats" | "lumenai_followup_tasks",
  id: string | null,
) {
  if (!id) return;
  const { data, error } = await context.admin
    .from(table)
    .select("id")
    .eq("id", id)
    .eq("business_id", context.businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.id) {
    const error = new Error("El recurso solicitado no pertenece al negocio activo.");
    error.name = "RESOURCE_NOT_FOUND";
    throw error;
  }
}

async function verifyEntity(
  context: LumeniteExecutionContext,
  table: string,
  output: EntityOutput,
): Promise<LumeniteVerificationResult> {
  const { data, error } = await context.admin
    .from(table)
    .select("id")
    .eq("id", output.id)
    .eq("business_id", context.businessId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return {
    verified: Boolean(data?.id),
    checkedAt: new Date().toISOString(),
    summary: data?.id ? "El registro interno existe y pertenece al negocio activo." : "No se encontro el registro creado.",
    evidence: { table, id: output.id, tenantMatched: Boolean(data?.id) },
  };
}

function undoCreatedEntity(table: string) {
  return async (
    context: LumeniteExecutionContext,
    undoPayload: Record<string, unknown>,
  ): Promise<LumeniteVerificationResult> => {
    const id = String(undoPayload.id ?? "");
    const created = undoPayload.created !== false;
    if (!isUuid(id)) throw new Error("El recibo no contiene un recurso reversible valido.");
    if (!created) {
      return {
        verified: true,
        checkedAt: new Date().toISOString(),
        summary: "El recurso ya existia antes de la accion y se conservo.",
        evidence: { table, id, removed: false, preserved: true },
      };
    }
    const { error } = await context.admin
      .from(table)
      .delete()
      .eq("id", id)
      .eq("business_id", context.businessId);
    if (error) throw new Error(error.message);
    const { data: remaining, error: verifyError } = await context.admin
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("business_id", context.businessId)
      .maybeSingle();
    if (verifyError) throw new Error(verifyError.message);
    return {
      verified: !remaining,
      checkedAt: new Date().toISOString(),
      summary: remaining ? "No se pudo retirar el recurso." : "El recurso creado fue retirado.",
      evidence: { table, id, removed: !remaining },
    };
  };
}

const commonPolicy = {
  provider: "lumenai_internal" as const,
  riskLevel: "low" as const,
  approvalMode: "policy" as const,
  supportsDryRun: true,
  supportsUndo: true,
  timeout: 8_000,
  retryPolicy: { maxAttempts: 1, backoffMs: 0, retryableCodes: [] },
};

function defineAction<TInput, TOutput = EntityOutput>(
  definition: LumeniteActionDefinition<TInput, TOutput>,
) {
  return definition;
}

export const LUMENITE_ACTION_REGISTRY = [
  defineAction<TaskInput>({
    ...commonPolicy,
    id: "internal.task.create",
    name: "Crear tarea",
    description: "Crea una tarea interna de seguimiento sin contactar a terceros.",
    category: "task",
    resourceType: "task",
    accessType: "create",
    inputSchema: taskInputSchema,
    outputSchema: entityOutputSchema("CreateTaskOutput"),
    requiredScopes: ["tasks:create"],
    redactionRules: [{ field: "description", strategy: "truncate", visibleCharacters: 160 }],
    async executor(context, input) {
      await assertTenantResource(context, "leads", input.leadId);
      await assertTenantResource(context, "chats", input.conversationId);
      const { data, error } = await context.admin
        .from("lumenai_followup_tasks")
        .insert({
          business_id: context.businessId,
          lead_id: input.leadId,
          chat_id: input.conversationId,
          title: input.title,
          message: input.description,
          due_at: input.dueAt,
          priority: input.priority,
          status: "pending",
          created_by_ai: true,
        })
        .select("id,title,status,created_at")
        .single();
      if (error) throw new Error(error.message);
      const output = {
        id: String(data.id),
        label: String(data.title),
        status: String(data.status),
        createdAt: String(data.created_at),
        created: true,
      };
      return { output, undoPayload: { id: output.id, created: true } };
    },
    verifier: (context, output) => verifyEntity(context, "lumenai_followup_tasks", output),
    undo: undoCreatedEntity("lumenai_followup_tasks"),
  }),
  defineAction<LeadNoteInput>({
    ...commonPolicy,
    id: "internal.lead.note.add",
    name: "Añadir nota al lead",
    description: "Guarda una nota interna vinculada a un lead del negocio.",
    category: "lead",
    resourceType: "lead_note",
    accessType: "create",
    inputSchema: leadNoteInputSchema,
    outputSchema: entityOutputSchema("AddLeadNoteOutput"),
    requiredScopes: ["leads:notes:create"],
    redactionRules: [{ field: "content", strategy: "truncate", visibleCharacters: 180 }],
    async executor(context, input) {
      await assertTenantResource(context, "leads", input.leadId);
      const { data, error } = await context.admin
        .from("lumenai_lead_notes")
        .insert({
          business_id: context.businessId,
          lead_id: input.leadId,
          content: input.content,
          source: "lumenite",
          created_by: context.userId,
        })
        .select("id,content,created_at")
        .single();
      if (error) throw new Error(error.message);
      const output = {
        id: String(data.id),
        label: cleanString(data.content, 80),
        status: "saved",
        createdAt: String(data.created_at),
        created: true,
      };
      return { output, undoPayload: { id: output.id, created: true } };
    },
    verifier: (context, output) => verifyEntity(context, "lumenai_lead_notes", output),
    undo: undoCreatedEntity("lumenai_lead_notes"),
  }),
  defineAction<ResponseDraftInput>({
    ...commonPolicy,
    id: "internal.response.prepare",
    name: "Preparar respuesta",
    description: "Guarda un borrador interno y no envia ningun mensaje.",
    category: "conversation",
    resourceType: "response_draft",
    accessType: "create",
    inputSchema: responseDraftInputSchema,
    outputSchema: entityOutputSchema("PrepareResponseOutput"),
    requiredScopes: ["conversations:drafts:create"],
    redactionRules: [{ field: "content", strategy: "truncate", visibleCharacters: 200 }],
    async executor(context, input) {
      await assertTenantResource(context, "chats", input.conversationId);
      const { data, error } = await context.admin
        .from("lumenai_response_drafts")
        .insert({
          business_id: context.businessId,
          chat_id: input.conversationId,
          content: input.content,
          channel: input.channel,
          status: "draft",
          created_by: context.userId,
        })
        .select("id,content,status,created_at")
        .single();
      if (error) throw new Error(error.message);
      const output = {
        id: String(data.id),
        label: cleanString(data.content, 80),
        status: String(data.status),
        createdAt: String(data.created_at),
        created: true,
      };
      return { output, undoPayload: { id: output.id, created: true } };
    },
    verifier: (context, output) => verifyEntity(context, "lumenai_response_drafts", output),
    undo: undoCreatedEntity("lumenai_response_drafts"),
  }),
  defineAction<ConversationTagInput>({
    ...commonPolicy,
    id: "internal.conversation.tag",
    name: "Etiquetar conversación",
    description: "Añade una etiqueta interna a una conversación existente.",
    category: "conversation",
    resourceType: "conversation_tag",
    accessType: "create",
    inputSchema: conversationTagInputSchema,
    outputSchema: entityOutputSchema("TagConversationOutput"),
    requiredScopes: ["conversations:tags:create"],
    redactionRules: [],
    async executor(context, input) {
      await assertTenantResource(context, "chats", input.conversationId);
      const existing = await context.admin
        .from("lumenai_conversation_tags")
        .select("id,tag,created_at")
        .eq("business_id", context.businessId)
        .eq("chat_id", input.conversationId)
        .eq("tag", input.tag)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data?.id) {
        const output = {
          id: String(existing.data.id),
          label: String(existing.data.tag),
          status: "already_present",
          createdAt: String(existing.data.created_at),
          created: false,
        };
        return { output, undoPayload: { id: output.id, created: false } };
      }
      const { data, error } = await context.admin
        .from("lumenai_conversation_tags")
        .insert({
          business_id: context.businessId,
          chat_id: input.conversationId,
          tag: input.tag,
          color: input.color,
          created_by: context.userId,
        })
        .select("id,tag,created_at")
        .single();
      if (error) throw new Error(error.message);
      const output = {
        id: String(data.id),
        label: String(data.tag),
        status: "tagged",
        createdAt: String(data.created_at),
        created: true,
      };
      return { output, undoPayload: { id: output.id, created: true } };
    },
    verifier: (context, output) => verifyEntity(context, "lumenai_conversation_tags", output),
    undo: undoCreatedEntity("lumenai_conversation_tags"),
  }),
  defineAction<ReminderInput>({
    ...commonPolicy,
    id: "internal.reminder.create",
    name: "Crear recordatorio",
    description: "Programa un recordatorio interno sin usar calendarios externos.",
    category: "reminder",
    resourceType: "reminder",
    accessType: "create",
    inputSchema: reminderInputSchema,
    outputSchema: entityOutputSchema("CreateReminderOutput"),
    requiredScopes: ["reminders:create"],
    redactionRules: [{ field: "note", strategy: "truncate", visibleCharacters: 160 }],
    async executor(context, input) {
      if (input.resourceType === "lead") {
        await assertTenantResource(context, "leads", input.resourceId);
      } else if (input.resourceType === "conversation") {
        await assertTenantResource(context, "chats", input.resourceId);
      } else if (input.resourceType === "task") {
        await assertTenantResource(context, "lumenai_followup_tasks", input.resourceId);
      }
      const { data, error } = await context.admin
        .from("lumenai_reminders")
        .insert({
          business_id: context.businessId,
          title: input.title,
          note: input.note,
          remind_at: input.remindAt,
          resource_type: input.resourceType,
          resource_id: input.resourceId,
          status: "scheduled",
          created_by: context.userId,
        })
        .select("id,title,status,created_at")
        .single();
      if (error) throw new Error(error.message);
      const output = {
        id: String(data.id),
        label: String(data.title),
        status: String(data.status),
        createdAt: String(data.created_at),
        created: true,
      };
      return { output, undoPayload: { id: output.id, created: true } };
    },
    verifier: (context, output) => verifyEntity(context, "lumenai_reminders", output),
    undo: undoCreatedEntity("lumenai_reminders"),
  }),
  defineAction<GmailDraftInput, GmailDraftOutput>({
    id: "external.gmail.draft.create",
    name: "Crear borrador en Gmail",
    description: "Crea un borrador verificable en Gmail. Esta capacidad nunca envia el correo.",
    category: "email",
    provider: "google_gmail",
    resourceType: "external_email_draft",
    accessType: "create",
    inputSchema: gmailDraftInputSchema,
    outputSchema: gmailDraftOutputSchema,
    requiredScopes: ["email:drafts:create"],
    riskLevel: "medium",
    approvalMode: "always",
    supportsDryRun: true,
    supportsUndo: true,
    timeout: 20_000,
    retryPolicy: { maxAttempts: 1, backoffMs: 0, retryableCodes: [] },
    redactionRules: [
      { field: "recipient", strategy: "mask", visibleCharacters: 3 },
      { field: "content", strategy: "truncate", visibleCharacters: 240 },
    ],
    async executor(context, input) {
      if (!context.integrationId) throw new Error("INTEGRATION_REQUIRED");
      const existing = await context.admin
        .from("lumenai_external_drafts")
        .select("id,external_id,external_message_id,external_url,recipient,subject,status,created_at")
        .eq("business_id", context.businessId)
        .eq("action_run_id", context.runId)
        .maybeSingle();
      if (existing.error) throw new Error(existing.error.message);
      if (existing.data?.external_id && ["created", "verified"].includes(String(existing.data.status))) {
        const output: GmailDraftOutput = {
          id: String(existing.data.id),
          draftId: String(existing.data.external_id),
          messageId: String(existing.data.external_message_id ?? ""),
          externalUrl: String(existing.data.external_url),
          recipient: String(existing.data.recipient),
          subject: String(existing.data.subject),
          status: String(existing.data.status) as GmailDraftOutput["status"],
          createdAt: String(existing.data.created_at),
        };
        return {
          output,
          externalReference: output.draftId,
          undoPayload: { integrationId: context.integrationId, draftId: output.draftId, recordId: output.id },
        };
      }
      const record = await context.admin
        .from("lumenai_external_drafts")
        .upsert({
          business_id: context.businessId,
          integration_id: context.integrationId,
          action_run_id: context.runId,
          requested_by: context.userId,
          provider: "google_gmail",
          recipient: input.recipient,
          subject: input.subject,
          content_preview: cleanString(input.content, 240),
          status: "preparing",
          error_code: null,
          error_message: null,
        }, { onConflict: "action_run_id" })
        .select("id,created_at")
        .single();
      if (record.error || !record.data?.id) throw new Error("DRAFT_RECEIPT_CREATE_FAILED");
      try {
        const draft = await createGoogleGmailDraft({
          admin: context.admin,
          businessId: context.businessId,
          integrationId: context.integrationId,
          recipient: input.recipient,
          subject: input.subject,
          content: input.content,
        });
        const saved = await context.admin
          .from("lumenai_external_drafts")
          .update({
            status: "created",
            external_id: draft.draftId,
            external_message_id: draft.messageId || null,
            external_url: draft.externalUrl,
            prepared_at: new Date().toISOString(),
          })
          .eq("id", record.data.id)
          .eq("business_id", context.businessId);
        if (saved.error) throw new Error("DRAFT_RECEIPT_UPDATE_FAILED");
        const output: GmailDraftOutput = {
          id: String(record.data.id),
          draftId: draft.draftId,
          messageId: draft.messageId,
          externalUrl: draft.externalUrl,
          recipient: input.recipient,
          subject: input.subject,
          status: "created",
          createdAt: String(record.data.created_at),
        };
        return {
          output,
          externalReference: draft.draftId,
          undoPayload: { integrationId: context.integrationId, draftId: draft.draftId, recordId: output.id },
        };
      } catch (error) {
        await context.admin
          .from("lumenai_external_drafts")
          .update({
            status: "failed",
            error_code: cleanString((error as { code?: unknown })?.code, 120) || "GOOGLE_DRAFT_CREATE_FAILED",
            error_message: error instanceof Error ? cleanString(error.message, 500) : "No se pudo crear el borrador.",
          })
          .eq("id", record.data.id)
          .eq("business_id", context.businessId);
        throw error;
      }
    },
    async verifier(context, output) {
      if (!context.integrationId) throw new Error("INTEGRATION_REQUIRED");
      const result = await verifyGoogleGmailDraft({
        admin: context.admin,
        businessId: context.businessId,
        integrationId: context.integrationId,
        draftId: output.draftId,
      });
      if (result.verified) {
        await Promise.all([
          context.admin
            .from("lumenai_external_drafts")
            .update({ status: "verified" })
            .eq("id", output.id)
            .eq("business_id", context.businessId),
          context.admin
            .from("lumenai_integrations")
            .update({ last_sync_at: result.checkedAt })
            .eq("id", context.integrationId)
            .eq("business_id", context.businessId),
        ]);
      }
      return {
        verified: result.verified,
        checkedAt: result.checkedAt,
        summary: result.verified ? "Google confirmo que el borrador existe y no fue enviado." : "Google no confirmo el borrador.",
        evidence: { provider: "google_gmail", draftId: output.draftId, sent: false },
      };
    },
    async undo(context, payload) {
      const integrationId = cleanString(payload.integrationId, 80);
      const draftId = cleanString(payload.draftId, 500);
      const recordId = cleanString(payload.recordId, 80);
      if (!isUuid(integrationId) || !draftId || !isUuid(recordId)) throw new Error("INVALID_DRAFT_UNDO_RECEIPT");
      const result = await deleteGoogleGmailDraft({
        admin: context.admin,
        businessId: context.businessId,
        integrationId,
        draftId,
      });
      await context.admin
        .from("lumenai_external_drafts")
        .update({ status: "reverted" })
        .eq("id", recordId)
        .eq("business_id", context.businessId);
      return {
        verified: result.verified,
        checkedAt: result.checkedAt,
        summary: result.alreadyMissing ? "El borrador ya no existia en Gmail." : "El borrador fue retirado de Gmail.",
        evidence: { provider: "google_gmail", draftId, removed: true },
      };
    },
  }),
] as const;

const ACTIONS_BY_ID = new Map<string, LumeniteActionDefinition<Record<string, unknown>, unknown>>(
  LUMENITE_ACTION_REGISTRY.map((definition) => [
    definition.id,
    definition as unknown as LumeniteActionDefinition<Record<string, unknown>, unknown>,
  ]),
);

if (LUMENITE_PHASE_ONE_CAPABILITIES.some((capability) => !ACTIONS_BY_ID.has(capability))) {
  throw new Error("LUMENITE_PHASE_ONE_REGISTRY_MISMATCH");
}

export function getActionDefinition(actionId: string) {
  return ACTIONS_BY_ID.get(actionId);
}

export function listActionNames() {
  return LUMENITE_ACTION_REGISTRY.map((definition) => definition.id);
}

export function publicActionCatalog() {
  return LUMENITE_ACTION_REGISTRY.map((definition) => ({
    id: definition.id,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    provider: definition.provider,
    resourceType: definition.resourceType,
    accessType: definition.accessType,
    inputShape: definition.inputSchema.shape,
    outputShape: definition.outputSchema.shape,
    requiredScopes: definition.requiredScopes,
    riskLevel: definition.riskLevel,
    approvalMode: definition.approvalMode,
    supportsDryRun: definition.supportsDryRun,
    supportsUndo: definition.supportsUndo,
    timeout: definition.timeout,
    retryPolicy: definition.retryPolicy,
  }));
}
