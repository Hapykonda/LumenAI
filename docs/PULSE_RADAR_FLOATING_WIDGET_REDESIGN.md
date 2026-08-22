# Informe de entrega: Pulse Radar flotante

Fecha de revisión: 23 de julio de 2026  
Alcance: widget flotante global de Pulse Radar dentro del panel autenticado  
Estado: listo para revisión local, sin publicación a producción

## 1. Resumen ejecutivo

El Pulse Radar flotante fue reconstruido como una interfaz contextual, modular y orientada a señales reales. El componente continúa ocupando la esquina inferior derecha del panel, pero ya no se comporta como un botón decorativo ni como una tarjeta que se abre por rutina. Ahora dispone de:

- Launcher ligero con logo LumenAI, anillo de salud y señal real sin leer.
- Burbuja proactiva limitada por frecuencia, sesión, estado de lectura y contexto de la interfaz.
- Panel abierto cargado de forma diferida.
- Máquina de estados tipada.
- Catálogo central de 23 expresiones y emojis controlados.
- Mensajes estructurados sin HTML arbitrario.
- Énfasis seguro con subrayado, highlight, métrica y warning.
- Lectura real de Pulse Radar y System Health.
- Conversación contextual con fallback determinista.
- Acciones registradas que solo navegan a rutas internas permitidas.
- Persistencia local exclusiva para identificadores y preferencias no sensibles.
- Movimiento contenido y soporte de reducción de movimiento.

No se modificó intencionalmente la página funcional `/panel/radar`. Este trabajo reemplaza únicamente el widget flotante montado por `PanelShell`.

## 2. Diagnóstico del componente anterior

El componente real encontrado fue `PanelInsightsAssistant`, montado globalmente dentro de `PanelShell`. Antes del rediseño presentaba estas limitaciones:

- Concentraba la presentación y buena parte de la lógica en un solo componente.
- Dependía de múltiples booleanos en lugar de una máquina de estados explícita.
- Utilizaba una apertura automática diaria que podía resultar invasiva.
- Mantenía una consulta periódica cada 45 segundos.
- No tenía compositor conversacional.
- No integraba el endpoint real de System Health.
- No disponía de historial estructurado, typing auténtico ni cancelación.
- No controlaba con precisión frecuencia, snooze, seen y dismissed.
- Empleaba el emoji como señal visual principal en vez de la identidad oficial.
- No tenía un contrato único para expresiones, énfasis y acciones.

La API anterior ya contenía una base valiosa: obtenía un snapshot autenticado del negocio y construía métricas y recomendaciones a partir de datos existentes. Esa fuente se conservó y se convirtió en el centro del nuevo contrato.

## 3. Arquitectura implementada

```text
PanelShell
└── PanelInsightsAssistant
    └── PulseRadarWidget
        ├── PulseRadarLauncher
        │   ├── PulseRadarMark
        │   ├── HealthRing
        │   └── UnreadSignal
        ├── ProactiveInsightBubble
        └── PulseRadarPanel (lazy)
            ├── Header
            ├── SystemHealthBar
            ├── ContextSummary
            ├── MessageStream
            │   ├── SafeMessageBody
            │   └── TypingState
            ├── SuggestedActions
            ├── RadarComposer
            └── Footer
```

Responsabilidades:

- `PulseRadarWidget`: orquestación, carga, eventos, persistencia, conversación y máquina de estados.
- `PulseRadarLauncher`: estado compacto, accesibilidad, salud y señal no leída.
- `ProactiveInsightBubble`: teaser contextual con revisar, visto, recordar y silenciar.
- `PulseRadarPanel`: interfaz abierta, contexto, salud, stream, sugerencias y compositor.
- `PulseRadarMark`: símbolo SVG propio basado en los dos trazos ascendentes, terminación angular y estrella.
- `SafeMessageBody`: renderer de texto y énfasis sin `dangerouslySetInnerHTML`.
- `state-machine.ts`: transiciones de estado y superficie.
- `expression-catalog.ts`: fuente única de tono, emojis y comportamiento visual.
- `types.ts`: contrato compartido entre servidor y cliente.

## 4. Máquina de estados

Estados implementados:

| Estado | Uso |
| --- | --- |
| `closed` | Launcher estable sin novedad. |
| `teaser` | Burbuja proactiva visible. |
| `unread` | Existe una señal real no leída. |
| `opening` | Transición de apertura. |
| `idle` | Panel abierto y disponible. |
| `listening` | Pregunta aceptada y preparación de contexto. |
| `thinking` | Request real en curso. |
| `streaming` | Reservado para transporte streaming real. |
| `insight` | Respuesta o señal informativa visible. |
| `action_ready` | La respuesta ofrece una acción registrada. |
| `success` | Acción contextual completada. |
| `warning` | Señal de advertencia. |
| `critical` | Señal crítica. |
| `error` | Fallo recuperable. |
| `offline` | API no disponible o conexión interrumpida. |
| `closing` | Transición de cierre. |

El reducer también controla la superficie `closed`, `teaser` o `panel`, el número de señales no leídas y el identificador de la operación. Así se evitan combinaciones contradictorias de booleanos.

## 5. Identidad visual

La interfaz sigue el lenguaje “LumenAI Obsidian Intelligence OS”:

- Fondo obsidiana y superficies grafito.
- Bordes finos y radios máximos de 8 px.
- Cian dinámico mediante `--lmn-accent-rgb`.
- Violeta secundario mediante `--lmn-accent-2-rgb`.
- Texto blanco suave y sombras amplias contenidas.
- Glass limitado a teaser y panel flotante.
- Logo sin rostro caricaturesco ni deformaciones.

El launcher tiene 58 px en escritorio y 52 px en móvil. El panel mide como máximo 424 px y se adapta a `100svh`, `safe-area-inset-*` y pantallas desde 390 px.

El `z-index` del widget es 70: suficiente para permanecer sobre el contenido normal del panel y deliberadamente inferior a las capas modales de la aplicación.

## 6. Expresiones y emojis

El catálogo tipado contiene:

`neutral`, `greeting`, `curious`, `analyzing`, `thinking`, `writing`, `discovery`, `opportunity`, `good_news`, `celebration`, `recommendation`, `important`, `warning`, `urgent`, `critical`, `reassuring`, `empathetic`, `no_data`, `waiting`, `offline`, `error`, `recovering` y `action_complete`.

Cada expresión define:

- Etiqueta.
- Lista limitada de emojis.
- Tono semántico.
- Animación del núcleo.
- Modo de acento.
- Modo decorativo.
- Fallback con reducción de movimiento.

Las decoraciones se limitan a dos emojis. No aparecen en mensajes críticos, usan `aria-hidden`, no reciben eventos del puntero, no tienen loops y se ocultan cuando el sistema solicita reducción de movimiento.

## 7. Mensajes y seguridad de contenido

El contrato `PulseRadarInsight` incluye:

- ID.
- Tipo y severidad enumerados.
- Expresión registrada.
- Título y cuerpo de texto.
- Emojis limitados.
- Énfasis estructurado.
- Fuente interna.
- Confianza opcional.
- Acciones registradas.
- Fecha, expiración y lectura.

El backend limpia y limita todos los textos. El cliente:

- No usa HTML entregado por el modelo.
- No usa `dangerouslySetInnerHTML`.
- Comprueba que cada énfasis exista literalmente en el cuerpo.
- Ignora rangos inválidos o superpuestos.
- Limita acciones, emojis, mensajes e historial renderizado.
- Rechaza URLs externas y rutas internas no registradas.

La IA solo puede devolver identificadores de acciones que el servidor ya registró a partir de señales reales. Las rutas se resuelven en el servidor y ninguna acción destructiva se ejecuta desde el widget.

## 8. Fuentes de datos reales

Pulse Radar utiliza el snapshot autenticado del negocio:

- Configuración y estado del widget.
- Calibración publicada.
- Datos de contacto configurados.
- Knowledge publicado.
- Leads.
- Chats.
- Mensajes.
- Chats sin leer.
- Leads calientes.
- Oportunidades abiertas.
- Campañas activas.
- Actividad de las últimas 24 horas.

Las recomendaciones deterministas se crean exclusivamente desde esas señales. Groq, cuando está configurado, puede redactar el briefing sobre ese contexto; si no está disponible o devuelve un payload inválido, se utiliza el fallback determinista.

La interfaz no genera números aleatorios ni presenta datos de demostración como reales.

## 9. System Health

El panel consulta `/api/panel/system-health` junto con Pulse Radar. Muestra:

- Estado general.
- Porcentaje.
- Última comprobación.
- Advertencias.
- Errores críticos.
- Hasta ocho checks con detalle seguro.
- Acceso a la página completa de System Health.

Fórmula documentada:

```text
porcentaje = checks con estado ready / checks totales
```

No se muestran secretos ni valores de variables. Si Health falla o el payload no es válido, el widget conserva el resto de Pulse Radar y presenta salud desconocida.

## 10. Eventos proactivos

No existe `setInterval`. La actualización ocurre:

- Al montar el panel autenticado.
- Al cambiar de sección.
- Al recuperar foco si los datos tienen al menos cinco minutos.
- Al volver la pestaña a estado visible si los datos están vencidos.
- Con el evento `lumenai:pulse-refresh`.
- Por actualización manual.

El evento `lumenai:pulse-open` permite abrir el mismo widget desde otras áreas sin crear una segunda instancia.

Una burbuja solo aparece cuando:

- Existe una señal real no vista ni descartada.
- La preferencia proactiva está activa.
- No existe modal, formulario crítico o publicación activa.
- El usuario no está escribiendo en un input, textarea o select.
- No está activa la ventana de snooze.
- Han pasado 15 minutos desde la última burbuja informativa.

Una señal crítica realmente nueva puede ignorar el límite temporal. La burbuja no secuestra el foco.

## 11. Persistencia

Se guarda únicamente información no sensible:

- IDs de señales vistas.
- IDs de señales descartadas.
- Fecha de última burbuja.
- Fecha de última apertura.
- Fecha de snooze.
- Preferencia proactiva de la sesión.

Los conjuntos se limitan a 100 IDs. Los cuerpos, métricas, clientes y mensajes empresariales permanecen en memoria y no se guardan en `localStorage`.

Para sincronización entre dispositivos todavía se requiere persistencia autenticada en backend.

## 12. Conversación y escritura

El compositor:

- Acepta hasta 600 caracteres.
- Usa la sección actual como contexto.
- Muestra typing únicamente durante una operación real.
- No demora intencionalmente una respuesta recibida.
- Permite cancelar mediante `AbortController`.
- Maneja timeout a los 12 segundos.
- Muestra error recuperable y reintento.

El endpoint actual no transmite tokens por streaming. Por ello se implementó el comportamiento correcto para este caso: typing mientras se espera y respuesta completa al llegar. El estado `streaming` está preparado en el contrato para una futura API de transporte progresivo, sin simularlo.

No se implementaron adjuntos porque el endpoint no ofrece soporte real para ellos.

## 13. Accesibilidad

- Launcher con nombre accesible específico por estado.
- Tooltip nativo y etiqueta visible al hover/focus.
- Contraste semántico acompañado por texto e iconos.
- `aria-live="polite"` para mensajes.
- Descripción completa del estado de salud.
- Navegación por teclado.
- Foco visible.
- Escape para cerrar.
- Foco inicial en el título al abrir.
- Retorno de foco al launcher al cerrar.
- Botones para cerrar teaser y detener generación.
- Decoraciones con `aria-hidden`.
- Respeto a `prefers-reduced-motion`.
- Launcher táctil mayor de 48 px.

## 14. Rendimiento

- Panel abierto mediante `next/dynamic` con `ssr: false`.
- SVG y CSS para el launcher; sin Canvas o WebGL.
- Sin animaciones decorativas costosas cuando está cerrado.
- Loops solo durante typing o análisis real.
- Historial en memoria limitado a 20 mensajes.
- Render limitado a 16 mensajes.
- Requests anteriores cancelados antes de iniciar otros.
- Timers y listeners limpiados al desmontar.
- Datos actualizados por eventos y caducidad, no por polling.
- Requests de Radar y Health ejecutados en paralelo.

## 15. Estados de error cubiertos

- Falta de conexión.
- Timeout.
- Payload inválido.
- Sesión vencida.
- Permiso insuficiente.
- Health no disponible.
- Cancelación de conversación.
- Acción contextual fallida.
- Ruta de acción no autorizada.
- Respuesta de IA inválida.

Los errores se convierten en mensajes operativos y no exponen trazas ni detalles internos.

## 16. Archivos del rediseño

Nuevos:

- `app/panel/_components/pulse-radar/PulseRadarWidget.tsx`
- `app/panel/_components/pulse-radar/PulseRadarLauncher.tsx`
- `app/panel/_components/pulse-radar/PulseRadarMark.tsx`
- `app/panel/_components/pulse-radar/ProactiveInsightBubble.tsx`
- `app/panel/_components/pulse-radar/PulseRadarPanel.tsx`
- `app/panel/_components/pulse-radar/SafeMessageBody.tsx`
- `app/panel/_components/pulse-radar/state-machine.ts`
- `app/panel/_components/pulse-radar/pulse-radar-widget.module.css`
- `lib/pulse-radar/types.ts`
- `lib/pulse-radar/expression-catalog.ts`
- `app/api/panel/pulse-assistant/route.ts`
- `app/api/panel/pulse-radar/_lib.ts`

Reemplazado como punto de montaje:

- `app/panel/_components/PanelInsightsAssistant.tsx`

No se modificó intencionalmente:

- `app/panel/radar/page.tsx`
- `.env.local`

El repositorio ya contenía numerosos cambios del usuario y archivos sin seguimiento antes de esta tarea. No fueron revertidos, formateados ni incluidos en el alcance del Radar flotante.

## 17. Resultado de pruebas

| Prueba | Resultado |
| --- | --- |
| ESLint del alcance Pulse Radar | Aprobado, 0 errores y 0 warnings. |
| `npx tsc --noEmit` | Aprobado. |
| `npm run build` | Aprobado con Next.js 16.2.11. |
| `npm run lint` completo | Aprobado, 0 errores; 211 warnings preexistentes fuera del alcance. |
| Compilación de rutas Pulse | `/api/panel/pulse-radar` y `/api/panel/pulse-assistant` incluidas. |
| Protección sin sesión | Radar, assistant y System Health responden 401. |
| Consola de login local | Sin errores ni warnings observados. |
| Página `/panel/radar` | No alterada por este rediseño. |
| Temporizadores periódicos | No existen en el nuevo widget. |
| Sonido automático | No existe. |
| HTML de IA | No se renderiza. |
| URLs externas de IA | Rechazadas. |

`git diff --stat` del worktree completo al cierre:

```text
62 files changed, 10743 insertions(+), 8355 deletions(-)
```

Ese total incluye el rediseño general y numerosos cambios previos del usuario. Git no incluye archivos nuevos sin seguimiento en ese resumen; por ello no debe interpretarse como el tamaño aislado del trabajo de Pulse Radar.

Cobertura funcional revisada en código:

- Launcher normal, analizando, unread, warning, critical y offline.
- Punto verde vinculado exclusivamente a una señal real no leída.
- Teaser, cerrar, marcar visto, recordar y silenciar.
- Abrir, cerrar, Escape y retorno de foco.
- Salud, mensaje, énfasis, emojis, typing, timeout y error.
- Acciones internas, cambio de sección, reduced motion y persistencia.
- Layout de escritorio, móvil, safe area y límites de overflow.

## 18. QA visual y capturas

El navegador local disponible no tiene una sesión autenticada del panel. La ruta `/panel/overview` redirige correctamente al login y las tres APIs protegidas responden 401. No se falsificó una sesión, no se inspeccionaron secretos y no se inyectaron señales de prueba.

Por esta razón no fue posible capturar de forma honesta dentro de esta ejecución:

- Launcher autenticado.
- Señal verde real.
- Teaser con una señal empresarial.
- Panel abierto.
- Typing.
- Salud autenticada.
- Estados warning y error dentro del panel.
- Vista móvil del widget real.

Estas capturas constituyen la única parte pendiente de QA y requieren iniciar sesión en el navegador local con un negocio que tenga datos. El build, los contratos, el CSS responsive y los estados sí quedaron verificados estáticamente.

## 19. Funciones que requieren backend adicional

- Persistencia de seen, dismissed, unread y snooze entre dispositivos.
- Historial conversacional persistente.
- Feedback útil/no útil por mensaje.
- Streaming real por SSE o transporte equivalente.
- Eventos push en tiempo real para evitar incluso la recarga por foco.
- Acciones operativas con confirmación y auditoría, más allá de navegación.
- Adjuntos con almacenamiento, permisos y análisis.
- Preferencias de animación y proactividad por usuario en base de datos.
- Fuente de severidad histórica para detectar “cambio de severidad”.

Estas funciones no se simularon.

## 20. Criterio de aceptación

El resultado conserva al Pulse Radar como widget compacto y lo convierte en una presencia operativa:

- Observa datos reales.
- Piensa durante requests reales.
- Responde de forma contextual.
- Reacciona con estados semánticos.
- Se expresa con un catálogo controlado.
- Destaca información sin HTML arbitrario.
- Expone salud real.
- Advierte y celebra de forma proporcionada.
- Recomienda acciones internas seguras.
- Permanece visible cuando está cerrado sin resultar invasivo.

No se realizó despliegue, commit, push ni publicación a producción.
