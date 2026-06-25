Actúa como desarrollador senior frontend/full-stack especializado en Next.js App Router, Supabase, rendimiento UI, WebGL, CSS premium y arquitectura SaaS.

Estamos trabajando en LumenAI, un SaaS de atención al cliente/ventas con IA para empresas y pymes. El objetivo del panel es verse premium, negro/glass, con fondo animado tipo orbit/estrellas fugaces inspirado en animated-shader-hero, pero el sistema debe sentirse muy fluido, rápido y profesional.

Contexto actual del proyecto:
- Stack: Next.js App Router + Supabase + TypeScript.
- El panel principal vive en /panel.
- Rutas existentes: overview, knowledge, chat, leads, widget, settings, calibration.
- El shell del panel está en:
  app/panel/_components/PanelShell.tsx
- La sidebar está en:
  app/panel/_components/AnimatedSidebar.tsx
- El fondo WebGL está en:
  app/components/ui/panel-background.tsx
- La calibración está en:
  app/panel/calibration/studio.tsx
- Estilos globales:
  app/globals.css
- Overview:
  app/panel/overview/page.tsx

Estado visual actual:
- Ya conseguimos que el fondo WebGL se vea mejor y vaya más fluido.
- Ya optimizamos parte de PanelShell y AnimatedSidebar para que no se sienta tan pesado.
- Aun así, queremos mejorar objetivamente:
  1. Más FPS.
  2. Navegación más fluida.
  3. Menos lag al mover mouse.
  4. Menos re-renderizados.
  5. Mejor adaptación visual a colores del cliente.
  6. Mantener el diseño premium, no simplificarlo demasiado.

Reglas visuales obligatorias:
- Mantener estética LumenAI premium:
  negro profundo, glass limpio, bordes luminosos sutiles, sombras elegantes, look enterprise.
- No convertir el panel en algo básico.
- El fondo debe conservar estrellas/recorridos luminosos visibles.
- El fondo, sidebar, botones, cards y elementos destacados deben adaptarse a los colores elegidos por el cliente.
- Las variables principales son:
  --lmn-accent
  --lmn-accent-2
  --lmn-accent-rgb
  --lmn-accent-2-rgb
- El evento para actualizar colores dinámicamente es:
  lumen-theme:update

Objetivo técnico principal:
Optimizar rendimiento y fluidez sin perder diseño.

Revisa especialmente:
1. app/components/ui/panel-background.tsx
   - Optimizar DPR.
   - Mantener 60 FPS cuando sea posible.
   - Pausar en pestaña oculta.
   - Evitar lecturas excesivas de getComputedStyle.
   - Mantener colores dinámicos.
   - Mantener estrellas visibles.
   - No hacer el shader demasiado pesado.

2. app/panel/_components/PanelShell.tsx
   - Reducir capas innecesarias.
   - Evitar backdrop-filter pesado si no aporta.
   - Mantener look glass.
   - Mantener z-index correcto.
   - Evitar que el fondo tape contenido.
   - Asegurar que PanelBackground esté fijo y el contenido encima.

3. app/panel/_components/AnimatedSidebar.tsx
   - Evitar animar layout global.
   - No hacer que el panel completo se recalculе al expandir sidebar.
   - Evitar transiciones de width que afecten toda la grilla.
   - Si se usa width, que sea dentro de un contenedor fijo que no mueva el contenido.
   - Mantener sidebar bonita, con colores dinámicos, hover premium y buena legibilidad.
   - Evitar framer-motion si no es necesario para desktop.
   - Mobile puede ser simple pero limpio.

4. app/panel/calibration/studio.tsx
   - Revisar si al cambiar colores se actualizan variables CSS.
   - Cuando el usuario cambie primaryColor / gradientFrom / gradientTo, disparar lumen-theme:update.
   - Evitar que cada cambio de slider o color haga renders enormes innecesarios.
   - Mantener autosave con debounce.
   - No romper guardado/publicación.

5. app/globals.css
   - Buscar filtros, sombras, blur y animaciones globales pesadas.
   - Reducir lo objetivamente innecesario.
   - Mantener tokens shadcn/LumenAI.
   - No romper estilos existentes.

6. app/panel/overview/page.tsx
   - Revisar polling/refresco.
   - Si refresca muy seguido, pausarlo cuando la pestaña no está visible.
   - Evitar renders innecesarios.

Tareas concretas:
1. Inspecciona los archivos mencionados.
2. Identifica cuellos reales de rendimiento.
3. Aplica mejoras seguras y concretas.
4. Conserva el diseño premium.
5. Asegura que todo siga usando colores dinámicos del cliente.
6. No rompas rutas existentes.
7. No cambies auth ni Supabase salvo que sea estrictamente necesario.
8. No inventes arquitectura nueva.
9. No borres funcionalidades.
10. Después de editar, explícame:
   - qué archivos cambiaste,
   - qué problema corregiste,
   - por qué mejora FPS/fluidez,
   - qué debo probar manualmente.

Prioridad de trabajo:
Primero optimiza:
1. AnimatedSidebar.tsx
2. PanelShell.tsx
3. panel-background.tsx

Luego revisa:
4. calibration/studio.tsx
5. overview/page.tsx
6. globals.css

Importante:
El resultado debe sentirse como una app SaaS premium real, no como una demo pesada. Queremos un panel hermoso, rápido, usable y preparado para vender LumenAI a clientes e inversionistas.

Antes de hacer cambios grandes, revisa el código actual. Si encuentras algo riesgoso, propón el cambio antes. Si los cambios son seguros, aplícalos directamente.

Al terminar, ejecuta si es posible:
npm run lint
npm run build

Si falla, reporta el error exacto y corrige lo que corresponda.