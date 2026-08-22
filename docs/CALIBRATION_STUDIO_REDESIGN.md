# Calibration Studio: rediseño definitivo

Fecha de implementación: 23 de julio de 2026  
Ruta: `/panel/calibration`  
Estado: implementado y listo para revisión autenticada local  
Publicación a producción: no realizada

## 1. Diagnóstico del diseño anterior

La implementación anterior ya contenía una base funcional amplia, pero la experiencia principal estaba organizada como una secuencia vertical de bloques:

- Hero superior con acciones de recarga y publicación.
- Centro de comandos introductorio.
- Panel de readiness independiente.
- Rail horizontal de cinco etapas.
- Editor largo dividido entre contenido principal y preview lateral.
- Barra inferior genérica de guardado.

La lógica era útil, pero la presentación dificultaba comprender rápidamente la salud de la calibración, el comportamiento actual, las diferencias con producción y las áreas pendientes. También duplicaba información entre hero, command center, readiness, preview y save bar.

## 2. Arquitectura visual aplicada

La nueva interfaz adopta la densidad y jerarquía de la referencia sin copiar su contenido médico ni su color verde:

```text
CalibrationWorkspace
├── CalibrationRail
├── StudioToolbar
├── EditorialHeader
├── CalibrationBento
│   ├── HealthCard
│   ├── BehaviorSpectrumCard
│   ├── PublicationProgressCard
│   ├── BrandIdentityCard
│   ├── ConversationLabCard
│   └── GuardrailsCard
├── EditorDrawer
├── CompareDialog
├── PreviewDialog
├── PublishDialog
└── PublishDock
```

En escritorio se utiliza un grid de doce columnas:

- Primera franja: `3 / 6 / 3`.
- Segunda franja: `4 / 5 / 3`.
- El espectro de comportamiento ocupa la posición visual dominante.
- La navegación interna mantiene diez dimensiones sin reemplazar la sidebar global.

En tablet el rail se convierte en navegación horizontal y el bento pasa a dos columnas. En móvil se utiliza una sola columna, toolbar compacta, drawers a pantalla completa y dock persistente.

## 3. Componentes creados

### `workspace.tsx`

Contiene componentes separados por responsabilidad:

- `CalibrationRail`
- `StudioToolbar`
- `EditorialHeader`
- `HealthCard`
- `BehaviorSpectrumCard`
- `PublicationProgressCard`
- `BrandIdentityCard`
- `ConversationLabCard`
- `GuardrailsCard`
- `CompareDialog`
- `PreviewDialog`
- `PublishDialog`
- `EditorDrawer`
- `PublishDock`
- `CalibrationWorkspaceSkeleton`
- `CalibrationWorkspaceState`

### `workspace.module.css`

Define el sistema visual encapsulado:

- Fondo `#05070A`.
- Superficies `#090D13`, `#0D1219` y `#10161E`.
- Acentos derivados de `--lmn-accent-rgb` y `--lmn-accent-2-rgb`.
- Bordes de baja opacidad.
- Radios controlados entre 7 y 16 px.
- Responsive para escritorio, tablet y móvil.
- Focus visible y reduced motion.
- Skeleton equivalente a la composición final.

## 4. Funciones conservadas

Se mantienen los contratos y capacidades existentes:

- Lectura de `draft_settings`.
- Lectura de `published_settings`.
- Autosave con debounce.
- Guardado manual desde el editor detallado.
- Publicación mediante `/api/panel/calibration/publish`.
- Presets psicológicos.
- Mezcla de personalidad.
- Perfiles de personalidad guardados.
- Identidad y brand brief.
- Ventas y objeciones.
- Promesas.
- Lexicon permitido y prohibido.
- Guardrails.
- Escalamiento.
- Horarios.
- Greeting.
- Quick actions.
- Colores dinámicos del asistente.
- Preview del widget.
- Transcripción de audio.
- Persistencia en Supabase.
- Aplicación del tema dinámico al panel.

Los editores existentes no fueron eliminados. Ahora se muestran dentro de un drawer contextual para evitar presentar todos los controles simultáneamente.

## 5. Funciones mejoradas

### Deshacer

Cada edición registra una versión local limitada. La toolbar permite restaurar el cambio anterior sin recargar la página.

### Descartar cambios

El dock permite regresar al último borrador guardado. No borra la versión publicada.

### Comparar draft y publicado

El modal de comparación muestra:

- Número real de campos diferentes.
- Fecha de publicación.
- Porcentaje por dimensión en draft.
- Porcentaje por dimensión publicada.

### Validación previa a publicar

Antes de publicar se presenta:

- Salud general.
- Número de cambios.
- Dimensiones incompletas.
- Advertencias.
- Confirmación explícita.

La publicación guarda primero el borrador. Si ese guardado falla, la publicación se detiene.

### Preview conversacional seguro

El laboratorio usa `/api/widget/chat` con `preview: true`.

Este modo:

- Requiere una sesión propietaria válida.
- Comprueba que la public key pertenece al negocio de la sesión.
- Utiliza `draft_settings`.
- No crea chats.
- No crea mensajes persistentes.
- No crea leads.
- No consume el rate limit público.
- Devuelve trazabilidad limitada y segura.

La trazabilidad incluye:

- Reglas de personalidad y venta incorporadas al prompt.
- Confirmación de inclusión de Knowledge.
- Objeción detectada.
- Guardrails activados.

No expone el contenido completo de Knowledge ni reglas internas sensibles.

## 6. Datos reales utilizados

Las métricas se derivan directamente del documento de calibración:

- Salud: señales reales de readiness.
- Reglas activas: reglas de personalidad configuradas.
- Objeciones: opciones activas de `objectionHandling`.
- Guardrails: reglas `dontDo`, frases prohibidas y escalamiento.
- Diferencias: comparación recursiva entre draft y published.
- Espectro: valores reales de `personality.mix`, `sales.proactivity` y `sales.closing`.
- Identidad: tagline, valores, diferenciación y `howToSound`.
- Publicación: `compiled.updatedAt` y metadata del endpoint.
- Preview: public key real del negocio.

No se agregaron métricas comerciales inventadas.

## 7. Estados implementados

- Skeleton inicial equivalente al layout.
- Cargando datos.
- Guardando.
- Guardado.
- Cambios pendientes.
- Error de autosave.
- Sin negocio activo.
- Sin permiso.
- Sin configuración publicada.
- Validación previa.
- Publicando.
- Publicación correcta.
- Error de publicación.
- Preview disponible.
- Preview sin public key.
- Preview no autorizado.
- Timeout del laboratorio.
- Error del laboratorio.
- Reintento.
- Drawer abierto y cerrado con `Escape`.

## 8. Accesibilidad

- Navegación del rail con teclado y flechas.
- `aria-label` en botones de icono.
- `aria-current` para la sección activa.
- `aria-live` para autosave, publicación y laboratorio.
- Focus visible.
- Estados con icono y texto, no solo color.
- Contraste sobre superficies Obsidian.
- Controles táctiles ampliados en móvil.
- Respeto de `prefers-reduced-motion`.

## 9. Rendimiento

- No se añadieron dependencias.
- No se usa WebGL.
- No hay animaciones continuas de fondo.
- Las métricas y diferencias se memoizan.
- El laboratorio no realiza solicitudes hasta que el usuario ejecuta una prueba.
- El iframe de preview se monta únicamente al abrir el modal.
- El autosave mantiene debounce de 1.2 segundos.
- Las solicitudes tienen timeout.
- Los cambios pequeños no recargan la página.
- Se eliminó la antigua capa visual duplicada del Studio.

## 10. Archivos modificados

- `app/panel/calibration/studio.tsx`
- `app/panel/calibration/loading.tsx`
- `app/panel/calibration/workspace.tsx`
- `app/panel/calibration/workspace.module.css`
- `app/api/widget/chat/route.ts`

## 11. Verificación ejecutada

### ESLint focalizado

Resultado: 0 errores y 0 advertencias en los archivos modificados.

### ESLint global

Resultado: 0 errores y 211 advertencias heredadas en otras áreas del repositorio.

### TypeScript

Comando: `npx tsc --noEmit`  
Resultado: correcto.

### Build

Comando: `npm run build`  
Resultado: correcto con Next.js `16.2.11`; 29 páginas estáticas generadas y rutas dinámicas compiladas.

### Smoke

- Login: `200`.
- Widget shell: `200`.
- Redirección del panel sin sesión: `307`.
- Configuración pública de Supabase: correcta.
- Respuesta estructurada del widget: correcta.
- Rate limiting: correcto.
- Preview sin sesión: `403`.

## 12. Capturas y validación autenticada

El navegador de verificación disponible no tiene una sesión propietaria activa. La protección del panel redirige correctamente a `/login`.

No se deshabilitó la autenticación, no se crearon usuarios temporales y no se fabricaron datos para obtener capturas. Las capturas de escritorio, tablet y móvil deben realizarse después de iniciar sesión con una cuenta propietaria en el navegador de pruebas.

## 13. Riesgos y dependencias

- La calidad de la respuesta conversacional depende de Groq y del contenido real de Knowledge.
- La trazabilidad confirma el contexto incluido, pero no pretende atribuir cada frase generada a una fuente exacta.
- El repositorio contiene numerosos cambios previos no relacionados; no se creó commit ni se publicó.
- Las advertencias globales heredadas continúan fuera del alcance de este rediseño.
- Falta la pasada visual autenticada final para capturas y ajustes de precisión sobre datos reales.
