export type LumenitePermissionScope =
  | "knowledge:write"
  | "widget:write"
  | "calibration:write"
  | "business:write"
  | "leads:write"
  | "growth:write"
  | "campaigns:write"
  | "twin:write"
  | "radar:write"
  | "system:write";

export type LumeniteActionDefinition = {
  actionName: string;
  description: string;
  permissionScope: LumenitePermissionScope;
  risk: "low" | "medium" | "high";
  rollback: boolean;
};

export const LUMENITE_ACTION_REGISTRY: LumeniteActionDefinition[] = [
  { actionName: "create_kb_item", description: "Crear item de Knowledge.", permissionScope: "knowledge:write", risk: "low", rollback: true },
  { actionName: "update_kb_item", description: "Actualizar item de Knowledge.", permissionScope: "knowledge:write", risk: "medium", rollback: true },
  { actionName: "delete_kb_item", description: "Eliminar item de Knowledge.", permissionScope: "knowledge:write", risk: "high", rollback: false },
  { actionName: "publish_kb_item", description: "Publicar item de Knowledge.", permissionScope: "knowledge:write", risk: "medium", rollback: true },
  { actionName: "unpublish_kb_item", description: "Despublicar item de Knowledge.", permissionScope: "knowledge:write", risk: "medium", rollback: true },
  { actionName: "suggest_kb_item", description: "Crear sugerencia de Knowledge.", permissionScope: "knowledge:write", risk: "low", rollback: true },
  { actionName: "update_widget_settings", description: "Actualizar configuracion del widget.", permissionScope: "widget:write", risk: "medium", rollback: true },
  { actionName: "update_widget_greeting", description: "Actualizar greeting del widget.", permissionScope: "widget:write", risk: "low", rollback: true },
  { actionName: "update_widget_colors", description: "Actualizar colores del widget.", permissionScope: "widget:write", risk: "low", rollback: true },
  { actionName: "update_widget_contact", description: "Actualizar contacto del widget.", permissionScope: "widget:write", risk: "medium", rollback: true },
  { actionName: "update_widget_cta", description: "Actualizar CTA del widget.", permissionScope: "widget:write", risk: "low", rollback: true },
  { actionName: "update_widget_position", description: "Actualizar posicion del widget.", permissionScope: "widget:write", risk: "low", rollback: true },
  { actionName: "update_widget_avatar", description: "Actualizar avatar o logo del widget.", permissionScope: "widget:write", risk: "low", rollback: true },
  { actionName: "update_calibration_draft", description: "Actualizar borrador de calibracion.", permissionScope: "calibration:write", risk: "medium", rollback: true },
  { actionName: "publish_calibration", description: "Publicar calibracion.", permissionScope: "calibration:write", risk: "high", rollback: true },
  { actionName: "add_objection", description: "Agregar objecion comercial.", permissionScope: "calibration:write", risk: "low", rollback: true },
  { actionName: "update_sales_strategy", description: "Actualizar estrategia comercial.", permissionScope: "calibration:write", risk: "medium", rollback: true },
  { actionName: "update_tone", description: "Actualizar tono.", permissionScope: "calibration:write", risk: "low", rollback: true },
  { actionName: "update_guardrails", description: "Actualizar reglas de seguridad.", permissionScope: "calibration:write", risk: "medium", rollback: true },
  { actionName: "update_quick_actions", description: "Actualizar acciones rapidas.", permissionScope: "calibration:write", risk: "low", rollback: true },
  { actionName: "update_business_profile", description: "Actualizar perfil del negocio.", permissionScope: "business:write", risk: "medium", rollback: true },
  { actionName: "update_contact_data", description: "Actualizar datos de contacto.", permissionScope: "business:write", risk: "medium", rollback: true },
  { actionName: "update_business_hours", description: "Actualizar horarios.", permissionScope: "business:write", risk: "medium", rollback: true },
  { actionName: "update_brand_colors", description: "Actualizar colores de marca.", permissionScope: "business:write", risk: "low", rollback: true },
  { actionName: "update_lead_status", description: "Actualizar estado de lead.", permissionScope: "leads:write", risk: "low", rollback: true },
  { actionName: "create_followup_task", description: "Crear tarea de seguimiento.", permissionScope: "leads:write", risk: "low", rollback: true },
  { actionName: "create_manual_lead", description: "Crear lead manual.", permissionScope: "leads:write", risk: "low", rollback: true },
  { actionName: "attach_note_to_lead", description: "Adjuntar nota a lead.", permissionScope: "leads:write", risk: "low", rollback: true },
  { actionName: "create_opportunity", description: "Crear oportunidad comercial.", permissionScope: "growth:write", risk: "low", rollback: true },
  { actionName: "update_opportunity_status", description: "Actualizar oportunidad.", permissionScope: "growth:write", risk: "low", rollback: true },
  { actionName: "generate_followup_message", description: "Generar mensaje de seguimiento.", permissionScope: "growth:write", risk: "low", rollback: false },
  { actionName: "create_growth_playbook", description: "Crear playbook comercial.", permissionScope: "growth:write", risk: "medium", rollback: true },
  { actionName: "create_campaign", description: "Crear campana.", permissionScope: "campaigns:write", risk: "medium", rollback: true },
  { actionName: "create_campaign_asset", description: "Crear asset de campana.", permissionScope: "campaigns:write", risk: "low", rollback: true },
  { actionName: "create_campaign_task", description: "Crear tarea de campana.", permissionScope: "campaigns:write", risk: "low", rollback: true },
  { actionName: "send_campaign_to_config_ia_as_prompt", description: "Preparar prompt para Config IA.", permissionScope: "campaigns:write", risk: "low", rollback: false },
  { actionName: "create_business_scenario", description: "Crear escenario del Business Twin.", permissionScope: "twin:write", risk: "low", rollback: true },
  { actionName: "create_simulation_report", description: "Crear reporte de simulacion.", permissionScope: "twin:write", risk: "low", rollback: true },
  { actionName: "send_recommendation_to_config_ia", description: "Preparar recomendacion para Config IA.", permissionScope: "twin:write", risk: "low", rollback: false },
  { actionName: "create_market_feed", description: "Crear fuente de mercado.", permissionScope: "radar:write", risk: "medium", rollback: true },
  { actionName: "refresh_market_items", description: "Actualizar items de mercado.", permissionScope: "radar:write", risk: "low", rollback: false },
  { actionName: "create_market_signal", description: "Crear senal ejecutiva.", permissionScope: "radar:write", risk: "low", rollback: true },
  { actionName: "generate_executive_summary", description: "Generar resumen ejecutivo.", permissionScope: "radar:write", risk: "low", rollback: false },
  { actionName: "create_config_snapshot", description: "Crear snapshot de configuracion.", permissionScope: "system:write", risk: "low", rollback: false },
  { actionName: "rollback_last_config", description: "Revertir ultimo snapshot.", permissionScope: "system:write", risk: "high", rollback: false },
  { actionName: "create_audit_log", description: "Registrar auditoria.", permissionScope: "system:write", risk: "low", rollback: false },
  { actionName: "create_action_run", description: "Registrar ejecucion de accion.", permissionScope: "system:write", risk: "low", rollback: false },
];

export function getActionDefinition(actionName: string) {
  return LUMENITE_ACTION_REGISTRY.find((action) => action.actionName === actionName);
}

export function listActionNames() {
  return LUMENITE_ACTION_REGISTRY.map((action) => action.actionName);
}
