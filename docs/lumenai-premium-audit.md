# Auditoria inicial: LumenAI Obsidian Intelligence OS

Fecha: 2026-08-08

## Resumen

El proyecto ya contenia una plataforma funcional extensa, una direccion visual
oscura y varios componentes premium. El problema principal era la coexistencia
de muchas iteraciones visuales sin una ultima capa canonica. La auditoria se
realizo antes de modificar contratos, rutas o datos.

## Mapa de experiencia

### Area publica

- `/`: presentacion del producto.
- `/login`: Google, magic link, OTP y contrasena.
- `/onboarding`: configuracion inicial del negocio.
- `/support`: soporte.
- `/legal/privacy` y `/legal/terms`: informacion legal.

### Producto autenticado

- `/panel/overview`: centro de mando.
- `/panel/calibration`: calibracion y publicacion.
- `/panel/autoconfig`: Config IA conversacional.
- `/panel/radar`: senales ejecutivas.
- `/panel/lumen-eye`: observacion unificada.
- `/panel/research`: fuentes, hallazgos e informes.
- `/panel/growth`: oportunidades y playbooks.
- `/panel/twin`: escenarios y simulaciones.
- `/panel/campaigns`: campanas y activos.
- `/panel/knowledge`: memoria del negocio.
- `/panel/chat` y `/panel/chat/[id]`: inbox y conversacion.
- `/panel/leads`: pipeline comercial.
- `/panel/widget`: configuracion e instalacion.
- `/panel/settings`: perfil y preferencias.
- `/panel/color-mix`: apariencia.
- `/panel/system-health`: salud del sistema.

### Runtime publico

- `/widget/[key]`: widget publicado por negocio.

## Funcionalidades protegidas

- Supabase Auth y cookies de sesion.
- Resolucion del negocio activo.
- Perfil del propietario y avatar en Storage.
- Tema dinamico por workspace.
- Lectura y escritura de chats, mensajes, leads y Knowledge.
- Configuracion, recursos y publicacion del widget.
- Borrador, publicacion y versionado de Calibration.
- Plan, ejecucion, snapshots y rollback de Config IA.
- Radar, Lumen Eye y Pulse Radar.
- Research, Growth, Campaigns y Business Twin.
- Estados de salud, integraciones y auditoria.
- Groq y contexto de negocio.

## Sistema visual encontrado

- Canvas oscuro con acentos cian, azul y violeta.
- Luces animadas reutilizables para heroes.
- Lucide como familia principal de iconos.
- Primitivas `GlassCard`, `ActionButton`, `StatusBadge`, `PageShell`,
  `PanelSectionHeader` y `ObsidianSurface`.
- Loaders y skeletons por seccion.
- Shell con sidebar, topbar y Pulse Radar.
- Tema dinamico mediante variables CSS.

## Inconsistencias detectadas

### Prioridad alta

1. `app/globals.css` acumula mas de 15.000 lineas y numerosas redefiniciones de
   tokens, superficies y geometria.
2. El login, sidebar y loader mostraban una letra `L` en lugar del logo oficial.
3. `public/brand/lumenai-logo.svg` no representa el activo oficial entregado.
4. Overview mostraba `Ingresos MTD: $0` sin una fuente de ingresos conectada.
5. Overview contenia cadenas con codificacion rota.

### Prioridad media

1. Radios, gradientes y sombras variaban entre modulos.
2. Varios estados dependian de color sin un icono universal.
3. La topbar afirmaba `Sistema verificado` sin consultar Health.
4. El sidebar movil y la topbar podian duplicar contexto.
5. El contenido estaba limitado a 1136 px en pantallas operativas grandes.
6. Pulse Radar se importaba en el bundle inicial del shell.

### Prioridad de evolucion

1. Algunas pantallas antiguas aun usan estilos locales en lugar de primitivas.
2. No todas las tablas tienen una transformacion especifica a lista movil.
3. Los graficos necesitan una auditoria de teclado por modulo.
4. El modo claro requiere QA visual completo.
5. El CSS historico debe reducirse por bloques despues de comparar todas las
   rutas autenticadas con datos reales.

## Correcciones implementadas

- Capa canonica `app/lumenai-obsidian.css` con color, superficies, geometria,
  movimiento, responsive, focus y reduced motion.
- Componente oficial `LumenLogo` y variantes optimizadas.
- Iconos de aplicacion derivados del activo oficial.
- Sidebar de escritorio reestructurado y desplazable.
- Drawer movil con focus trap, Escape, restauracion de foco y scroll lock.
- Topbar con contexto, busqueda, salud, senales, Pulse Radar y perfil.
- Login consolidado sin Border Beam ni shimmer permanente.
- Targets tactiles de 44 px en login movil.
- `StatusBadge` con icono y texto.
- Loader con marca y Signal Trace.
- Pulse Radar cargado dinamicamente.
- Rate limiter del widget persistente durante recargas de modulo en Node.
- Overview sin metrica de ingresos inventada.
- Overview con fuente, ultima actualizacion y refresco manual.
- Correccion de cadenas danadas en Overview.
- Eliminacion de un bloque completo de Overview que no se renderizaba y de sus
  imports visuales asociados.
- `content-visibility` para contenido operativo inferior.

## Validacion visual realizada

- Login escritorio: 1440 x 1000.
- Login movil: 390 x 844.
- Login minimo: 360 x 800.
- Sin overflow horizontal.
- Sin botones vacios.
- Sin errores ni warnings de consola en login.
- Capturas guardadas en `docs/screenshots`.

## Validacion tecnica final

| Validacion | Resultado |
| --- | --- |
| Contrato de entorno | Correcto, sin imprimir secretos |
| TypeScript | Correcto, 0 errores |
| ESLint completo | Correcto, 0 errores y 210 warnings historicos |
| Smoke publico | Correcto |
| Login | 200 |
| Widget shell | 200 |
| Redireccion de panel sin sesion | 307 |
| Rate limit del widget | 429 observado bajo carga concurrente |
| Build de produccion | Correcto |
| Paginas estaticas generadas | 31/31 |

## Limitacion de QA autenticado

El middleware protege `/panel/:path*` y la sesion local del navegador de QA no
esta autenticada. La redireccion a `/login?e=no_session` funciona correctamente.
No se usaron credenciales ficticias ni se altero el middleware para producir
capturas del panel.

La consulta de smoke no encontro una `public_key` activa en Supabase, por lo que
el flujo de chat real del widget se omitio de forma explicita. El shell, la
proteccion de rutas y el rate limit si fueron verificados.

## Pendientes reales

1. Activar o conectar un proyecto Supabase con un negocio y `public_key` validos
   para probar conversaciones reales de extremo a extremo.
2. Ejecutar QA visual autenticado de las 16 secciones con datos reales.
3. Resolver progresivamente los 210 warnings historicos de lint; no bloquean el
   build y no se introdujeron errores nuevos.
4. Reducir `app/globals.css` por bloques despues de comparar cada ruta; una
   eliminacion masiva sin sesion real pondria en riesgo estilos funcionales.
5. Validar modo claro y lectores de pantalla con una matriz manual completa.

## Orden de evolucion recomendado

1. Foundations y marca.
2. Shell, navegacion y estados universales.
3. Login y Overview.
4. Calibration y Config IA.
5. Chat, Leads, Knowledge y Widget.
6. Radar, Lumen Eye, Research, Growth, Twin y Campaigns.
7. Settings, Appearance y System Health.
8. Limpieza comparada de CSS historico.
9. QA autenticado con datos reales en todos los breakpoints.
