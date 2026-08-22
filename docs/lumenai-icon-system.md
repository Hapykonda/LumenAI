# Sistema maestro de iconos de LumenAI

Version: 1.0
Fecha: 23 de julio de 2026
Biblioteca base instalada: `lucide-react@^0.577.0`

## 1. Objetivo

LumenAI debe usar un sistema de iconos predecible, sobrio y accesible. La regla es simple:

- **Lucide** para acciones, navegacion convencional, archivos, estados y canales genericos.
- **SVG personalizado** solo para marca, Lumenite y modulos que necesiten reconocimiento propio.
- **CSS/HTML** para swatches, indicadores, progreso, charts y visualizaciones de datos.
- **Logotipo oficial del proveedor** solo cuando una accion representa expresamente a ese proveedor, por ejemplo Google OAuth.

No se debe copiar un icono Lucide a un archivo SVG local. Se importa desde `lucide-react` y se controla mediante `size`, `strokeWidth`, `currentColor` y CSS.

## 2. Auditoria actual

- El codigo importa aproximadamente 124 nombres desde `lucide-react`; el parser bruto tambien detecta algunos tipos y hooks incluidos accidentalmente en bloques multilinea.
- La navegacion principal ya usa Lucide correctamente en `app/panel/_components/panel-nav.tsx`.
- El widget mantiene ocho SVG manuales en `app/widget/_components/icons.tsx`: copiar, expandir, contraer, mas, cerrar, enviar, microfono y detener. Todos tienen equivalente Lucide y deben migrarse.
- El simbolo mostrado en `public/brand/lumenai-logo.svg` no representa el sistema completo de marca solicitado.
- No existe una carpeta de iconos propios versionados.

## 3. Especificacion visual

| Propiedad | Regla |
|---|---|
| Grilla maestra | 24x24 |
| Tamaños UI | 16, 20 y 24 px |
| Tamaños de marca | 16, 20, 24, 32 y 48 px |
| Stroke base | 1.85 px |
| Stroke compacto 16 px | 2 px |
| Linecap / linejoin | `round` |
| Color | `currentColor` |
| Area tactil minima | 40x40 px |
| Radio de boton | 6-8 px |
| Glow | Prohibido en el propio SVG |
| Active | Cian/azul y fondo CSS sutil |
| Inactive | Blanco con 48-64% de opacidad |
| Disabled | 30-38% de opacidad, sin ser el unico indicador |
| Danger | Rojo semantico y label explicito |
| Warning | Ambar semantico y label explicito |
| Reduced motion | Rotaciones/pulsos se desactivan |

## 4. Navegacion global

| Funcion | Decision | Icono Lucide / asset | Estado actual | P | Observacion |
|---|---|---|---|---|---|
| Inicio | Lucide | `LayoutDashboard` | Integrado | P0 | Mantener |
| Calibration | Icono propio + fallback | `SlidersHorizontal` / `lumenai-icon-calibration-v1.svg` | Fallback integrado | P1 | Propio cuando se apruebe la familia |
| Config IA | Icono propio + fallback | `WandSparkles` / `lumenai-icon-config-ai-v1.svg` | Fallback integrado | P1 | No usar un robot |
| Radar | Icono propio + fallback | `Radar` / `lumenai-icon-pulse-radar-v1.svg` | Actualmente `Newspaper` | P1 | Cambiar fallback a `Radar` |
| Lumen Eye | Icono propio | `lumenai-icon-lumen-eye-v1.svg` | Fallback `Eye` | P1 | Concepto exclusivo |
| Research | Lucide | `Search` o `BookOpenCheck` | Integrado con `Search` | P0 | `BookOpenCheck` para reportes |
| Growth | Icono propio + fallback | `TrendingUp` / `lumenai-icon-growth-v1.svg` | Integrado | P1 | Propio opcional |
| Business Twin | Icono propio | `lumenai-icon-business-twin-v1.svg` | Fallback `GitBranch` | P1 | Dos planos conectados |
| Campaigns | Lucide | `Megaphone` | Integrado | P0 | Mantener |
| Knowledge | Icono propio + fallback | `BrainCircuit` / `lumenai-icon-knowledge-v1.svg` | Integrado | P1 | Propio opcional |
| Chat | Lucide | `MessagesSquare` | Integrado | P0 | Mantener |
| Leads | Lucide | `UsersRound` | Integrado | P0 | Mantener |
| Widget | Lucide | `BotMessageSquare` | Integrado | P0 | Mantener |
| Settings | Lucide | `Settings` | Usa `Palette` | P0 | Corregir semantica |
| Color Mix | Lucide + swatch | `Paintbrush` | Integrado | P0 | La muestra de color es CSS |
| System Health | Icono propio + fallback | `HeartPulse` / `lumenai-icon-system-health-v1.svg` | Integrado | P1 | Mantener fallback |
| Notificaciones | Lucide | `Bell` | Integrado | P0 | Badge con texto accesible |
| Buscador | Lucide | `Search` | Integrado | P0 | Mantener |
| Command palette | Lucide | `Command` | Parcial | P1 | El icono no sustituye el shortcut textual |
| Workspace | Lucide | `PanelsTopLeft` | Falta | P1 | No usar logo de empresa como control |
| Perfil | Lucide / foto real | `UserCircle2` | Integrado | P0 | Mostrar foto del propietario si existe |
| Soporte | Lucide | `LifeBuoy` | Falta en shell | P1 | Ruta `/support` existe |
| Cerrar sesion | Lucide | `LogOut` | Revisar sidebar | P0 | Accion textual y confirmacion si hay cambios |

## 5. Acciones

| Accion | Lucide | Label accesible obligatorio | Estado | P |
|---|---|---|---|---|
| Crear | `Plus` | Crear [objeto] | Disponible | P0 |
| Editar | `Pencil` | Editar [objeto] | Estandarizar | P0 |
| Eliminar | `Trash2` | Eliminar [objeto] | Disponible | P0 |
| Duplicar | `CopyPlus` | Duplicar [objeto] | Falta unificar | P1 |
| Guardar | `Save` | Guardar cambios | Disponible | P0 |
| Publicar | `Rocket` | Publicar version | Disponible | P0 |
| Despublicar | `CircleOff` | Despublicar version | Falta | P1 |
| Comparar | `FileDiff` | Comparar versiones | Integrado en Calibration | P0 |
| Deshacer | `Undo2` | Deshacer ultimo cambio | Integrado | P0 |
| Rehacer | `Redo2` | Rehacer cambio | Falta | P1 |
| Restaurar | `RotateCcw` | Restaurar valores | Parcial | P0 |
| Rollback | `History` + label | Volver al snapshot [fecha] | Parcial | P0 |
| Actualizar | `RefreshCw` | Actualizar datos | Disponible | P0 |
| Reintentar | `RefreshCw` | Reintentar operacion | Disponible | P0 |
| Descargar | `Download` | Descargar [archivo] | Falta unificar | P1 |
| Exportar | `FileDown` | Exportar [formato] | Parcial | P1 |
| Importar | `FileUp` | Importar archivo | Falta | P1 |
| Subir | `Upload` | Subir archivo | Disponible | P0 |
| Copiar | `Copy` | Copiar [dato] | Disponible | P0 |
| Compartir | `Share2` | Compartir [recurso] | Falta | P1 |
| Filtrar | `ListFilter` | Filtrar resultados | Parcial | P0 |
| Ordenar | `ArrowUpDown` | Ordenar por [criterio] | Falta unificar | P0 |
| Buscar | `Search` | Buscar | Disponible | P0 |
| Expandir | `Maximize2` | Expandir vista | Disponible/manual | P0 |
| Contraer | `Minimize2` | Contraer vista | Manual en widget | P0 |
| Abrir externa | `ExternalLink` | Abrir en nueva ventana | Disponible | P0 |
| Mas opciones | `Ellipsis` | Mas opciones | Disponible/manual | P0 |
| Cerrar | `X` | Cerrar [dialogo] | Disponible/manual | P0 |
| Confirmar | `Check` | Confirmar | Disponible | P0 |
| Cancelar | `X` | Cancelar | Disponible | P0 |
| Previsualizar | `Eye` | Previsualizar | Disponible | P0 |
| Probar | `FlaskConical` | Ejecutar prueba | Falta unificar | P1 |
| Ejecutar | `Play` | Ejecutar [accion] | Parcial | P0 |
| Pausar | `Pause` | Pausar [proceso] | Disponible | P0 |
| Archivar | `Archive` | Archivar [objeto] | Falta unificar | P1 |
| Asignar | `UserPlus` | Asignar responsable | Falta | P1 |
| Enviar | `Send` | Enviar mensaje | Disponible/manual | P0 |
| Solicitar humano | `Hand` | Solicitar atencion humana | Falta familia | P0 |

### Reglas para acciones destructivas

- `Trash2`, `CircleOff` y rollback nunca aparecen sin texto en una confirmacion.
- La accion principal destructiva usa rojo semantico, no cian.
- La confirmacion debe describir impacto y posibilidad de revertir.
- Un icono de historial no significa rollback por si solo; el label debe decir la version o fecha.

## 6. Estados

| Estado | Lucide / componente | Color semantico | Tratamiento | P |
|---|---|---|---|---|
| Activo | `CheckCircle2` | Cian o success | Icono + label | P0 |
| Inactivo | `Circle` | Neutral | Icono + label | P0 |
| Conectado | `PlugZap` | Success | Icono + texto | P0 |
| Desconectado | `Unplug` | Danger/neutral | Icono + causa | P0 |
| Sincronizando | `RefreshCw` | Cian | Giro limitado | P0 |
| Guardando | `LoaderCircle` | Cian | Giro + “Guardando” | P0 |
| Guardado | `Check` | Success | Texto temporal | P0 |
| Publicado | `BadgeCheck` | Success/cian | Badge | P0 |
| Draft | `FilePenLine` | Neutral | Badge “Borrador” | P0 |
| Pendiente | `Clock3` | Warning | Icono + label | P0 |
| Completado | `CheckCircle2` | Success | Icono + label | P0 |
| Error | `CircleX` | Danger | Mensaje accionable | P0 |
| Advertencia | `TriangleAlert` | Warning | Mensaje accionable | P0 |
| Critico | `ShieldAlert` | Danger | Mensaje + escalamiento | P0 |
| Bloqueado | `LockKeyhole` | Danger/neutral | Explicar motivo | P0 |
| Sin permisos | `ShieldX` | Danger | Explicar rol requerido | P0 |
| Online | `Wifi` | Success | Label visible | P0 |
| Offline | `WifiOff` | Neutral/danger | Persistente | P0 |
| IA analizando | Icono Lumenite + `LoaderCircle` | Cian/violeta | Motion breve | P0 |
| Requiere revision | `ScanSearch` | Warning | Badge + CTA | P0 |
| Datos desactualizados | `ClockAlert` | Warning | Mostrar timestamp | P0 |
| Rollback disponible | `History` | Cian | Mostrar snapshot | P0 |

## 7. Iconos propios de LumenAI

Los siguientes conceptos justifican SVG propio porque son nombres del producto o acciones diferenciales. No deben parecer una coleccion de logotipos inconexos.

| ID | Icono | Concepto geometrico | Variantes | Archivo | P |
|---|---|---|---|---|---|
| BI-01 | Lumenite | Estrella de cuatro puntas sostenida por dos trazos ascendentes | Active/inactive/mono | `lumenai-icon-lumenite-v1.svg` | P0 |
| BI-02 | Lumen Eye | Ojo angular cuyo brillo central es la estrella | Active/inactive | `lumenai-icon-lumen-eye-v1.svg` | P1 |
| BI-03 | Business Twin | Dos perfiles L espejados unidos por un nodo | Active/inactive | `lumenai-icon-business-twin-v1.svg` | P1 |
| BI-04 | Pulse Radar | Dos arcos y una señal ascendente, sin antena generica | Active/inactive | `lumenai-icon-pulse-radar-v1.svg` | P1 |
| BI-05 | Config IA | Dos controles conectados a una estrella de accion | Active/inactive | `lumenai-icon-config-ai-v1.svg` | P1 |
| BI-06 | Calibration Studio | Dial abierto con dos trazos ascendentes | Active/inactive | `lumenai-icon-calibration-v1.svg` | P1 |
| BI-07 | Knowledge Intelligence | Tres nodos-documento convergen en estrella | Active/inactive | `lumenai-icon-knowledge-v1.svg` | P1 |
| BI-08 | Growth Engine | Trazo ascendente angular con punto de oportunidad | Active/inactive | `lumenai-icon-growth-v1.svg` | P1 |
| BI-09 | Research Engine | Lupa angular con estrella/evidencia | Active/inactive | `lumenai-icon-research-v1.svg` | P1 |
| BI-10 | Campaign Studio | Haz de salida segmentado en variantes | Active/inactive | `lumenai-icon-campaigns-v1.svg` | P1 |
| BI-11 | System Health | Pulso que termina en estrella estable | Active/inactive | `lumenai-icon-system-health-v1.svg` | P1 |
| BI-12 | Signal node | Nodo con doble trazo de propagacion | Active/inactive | `lumenai-icon-signal-v1.svg` | P1 |
| BI-13 | Opportunity | Diamante abierto con ascenso interno | Active/inactive | `lumenai-icon-opportunity-v1.svg` | P1 |
| BI-14 | Snapshot | Marco angular con punto temporal | Active/inactive | `lumenai-icon-snapshot-v1.svg` | P1 |
| BI-15 | AI action | Estrella con vector direccional controlado | Active/inactive | `lumenai-icon-ai-action-v1.svg` | P1 |
| BI-16 | Guardrail | Dos limites paralelos protegen un nodo | Active/inactive | `lumenai-icon-guardrail-v1.svg` | P1 |
| BI-17 | Human takeover | Mano abstracta sobre burbuja, sin figura humana | Active/inactive | `lumenai-icon-human-takeover-v1.svg` | P1 |
| BI-18 | LumenAI master | Geometria oficial completa | Full/compact/mono | `lumenai-logo-symbol-v1.svg` | P0 |

### Restricciones de la familia propia

- La estrella aparece una sola vez por icono.
- No usar circulos de glow en el SVG.
- El icono debe entenderse en monocromo a 16 px.
- No incorporar texto ni iniciales.
- No crear perspectiva 3D.
- Mantener una masa visual equivalente a Lucide.
- Los strokes no se expanden hasta la fase de exportacion para impresion.

## 8. Archivos y Knowledge

| Recurso | Decision |
|---|---|
| Documento generico | `FileText` |
| PDF | `FileType2` + label PDF |
| DOCX | `FileText` + label DOCX |
| Sitio web | `Globe2` |
| Texto pegado | `Text` |
| FAQ | `MessageCircleQuestion` |
| Productos | `Package` |
| Servicios | `BriefcaseBusiness` |
| Precios | `BadgeDollarSign` |
| Pagos | `WalletCards` |
| Politicas | `ScrollText` |
| Horarios | `CalendarClock` |
| Contacto | `Contact` |
| Fuente verificada | `BadgeCheck` |
| Contradiccion | `GitCompareArrows` |
| Pregunta sin respuesta | `CircleHelp` |
| Extraccion | `ScanText` |
| Procesamiento | `LoaderCircle` |

Los formatos se distinguen siempre con label textual. El icono no debe ser la unica fuente de informacion.

## 9. Chat, leads y widget

### Chat

| Concepto | Icono |
|---|---|
| Conversacion | `MessageSquareText` |
| No leido | Badge CSS + `Circle` |
| Lead | `UserRoundSearch` |
| Cliente | `UserRoundCheck` |
| IA | `Bot` hasta aprobar BI-01 |
| Operador humano | `Headset` |
| Takeover | BI-17 o `Hand` |
| Adjunto | `Paperclip` |
| Audio | `Mic` |
| Respuesta sugerida | `WandSparkles` |
| Resumen IA | `ListCollapse` |
| Prioridad | `Flag` |
| Escribiendo | Tres puntos animados CSS con reduced motion |

### Leads

| Concepto | Icono / componente |
|---|---|
| Frio, tibio, caliente | `Thermometer` + label; color secundario |
| Score | `Gauge` |
| Etapa | `Milestone` |
| Kanban | `Columns3` |
| Tabla | `Table2` |
| Fuente | `Waypoints` |
| Responsable | `UserRoundCog` |
| Proxima accion | `ListTodo` |
| Nota | `StickyNote` |
| Recordatorio | `BellRing` |
| Convertido | `Trophy` o `CircleCheckBig` |
| Perdido | `CircleMinus` |

### Widget

Migracion directa de SVG manual:

| Componente actual | Sustitucion Lucide |
|---|---|
| `CopyIcon` | `Copy` |
| `ExpandIcon` | `Maximize2` |
| `ShrinkIcon` | `Minimize2` |
| `MoreIcon` | `Ellipsis` |
| `CloseIcon` | `X` |
| `SendIcon` | `Send` |
| `MicIcon` | `Mic` |
| `StopIcon` | `Square` o `CircleStop` |

## 10. Canales y marcas de terceros

- Google OAuth debe usar el recurso oficial suministrado por Google, no una letra `G` improvisada en la version final.
- WhatsApp, Shopify, Webflow, Wix, WordPress, Supabase, Groq y otros proveedores solo usan su marca en contextos de integracion reales.
- No recolorear logotipos de terceros fuera de sus guias.
- Para navegacion interna generica se prefiere Lucide.
- Los logos de terceros no forman parte del lockup LumenAI.

## 11. Accesibilidad

1. Botones solo icono requieren `aria-label`.
2. Tooltips describen iconos no familiares, nunca sustituyen el nombre accesible.
3. Estados combinan icono, texto y color.
4. Iconos decorativos usan `aria-hidden="true"`.
5. Logos enlazados a inicio incluyen nombre accesible `LumenAI`.
6. Loader anuncia `aria-live="polite"` cuando bloquea una tarea.
7. Error critico usa `role="alert"` solo cuando aparece dinamicamente.
8. El tamaño visible puede ser 16 px, pero el objetivo tactil debe medir al menos 40 px.

## 12. Estructura e implementacion

```text
components/
`-- icons/
    |-- lumen-icon.tsx
    |-- lumen-brand-icon.tsx
    `-- index.ts

public/
`-- brand/
    `-- icons/
        |-- lumenai-icon-lumenite-v1.svg
        |-- lumenai-icon-lumen-eye-v1.svg
        |-- lumenai-icon-business-twin-v1.svg
        `-- ...
```

Los SVG propios deben envolverse en un componente que:

- Acepte `size`, `className`, `title` y `aria-hidden`.
- Use `currentColor`.
- No inyecte IDs globales.
- No incluya filtros, bitmaps ni scripts.
- Pueda renderizarse en servidor.

## 13. QA de iconos

Cada icono propio se aprueba con esta matriz:

| Prueba | Criterio |
|---|---|
| 16 px | Concepto reconocible, sin cierre de espacios |
| 24 px | Alineacion con Lucide |
| 48 px | Geometria limpia |
| Monocromo | No depende del gradiente |
| Dark/light | Contraste AA del control completo |
| Active/inactive | Diferencia visible sin cambiar la geometria |
| Reduced motion | Ninguna perdida de significado |
| Export SVG | Sin metadata, fuentes, raster ni paths invisibles |

## 14. Orden de produccion

1. BR-LOGO-01: simbolo maestro.
2. BI-01: Lumenite.
3. BI-02, BI-03, BI-04, BI-05, BI-06.
4. Resto de iconos de modulo.
5. Iconos de concepto BI-12 a BI-17.
6. Migracion de SVG manuales del widget a Lucide.
7. Correccion semantica de Settings y Radar.
8. QA en sidebar expandida/contraida, topbar, mobile y widget.
