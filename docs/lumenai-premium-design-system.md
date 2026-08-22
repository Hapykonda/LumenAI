# LumenAI Premium Design System

> La implementación canónica de estados operativos vive en `components/ui/lumen-system-state.tsx`; el vocabulario temporal y sus reglas están documentados en `docs/lumenai-cinematic-system.md`.

## 1. Proposito

LumenAI Obsidian Intelligence OS es el sistema visual y de interaccion para la
plataforma comercial de LumenAI. Su objetivo es ayudar al usuario a comprender
que ocurre, que requiere atencion y que accion puede ejecutar con seguridad.

La interfaz representa una compania tecnologica madura. Debe sentirse precisa,
confiable y activa, sin adoptar codigos visuales de videojuegos, criptomonedas o
ciencia ficcion exagerada.

## 2. Principios

1. **Comprension antes que decoracion.** La luz, el movimiento y la profundidad
   deben explicar estado, jerarquia o continuidad.
2. **Datos antes que promesas.** Ninguna metrica se presenta como real sin fuente.
3. **Una accion primaria por contexto.** Las alternativas se subordinan de forma
   visible y las acciones destructivas se separan.
4. **Complejidad progresiva.** El primer nivel muestra lo esencial; detalles,
   filtros y analitica avanzada permanecen disponibles sin saturar.
5. **Continuidad operacional.** Cargar, guardar, sincronizar, publicar y fallar
   tienen estados legibles y recuperables.
6. **Identidad consistente.** Marca, iconos, superficies, copy y movimiento usan
   un mismo lenguaje desde el login hasta el widget.

## 3. Marca

El activo fuente oficial es `public/brand/rlogo.png`. No se redibuja, sustituye
ni simplifica con una letra o un icono de terceros.

Variantes derivadas del activo oficial:

| Archivo | Uso |
| --- | --- |
| `public/brand/lumenai-mark.webp` | Isotipo de interfaz, 256 px |
| `public/brand/lumenai-mark-128.png` | Superficies de alta densidad |
| `public/brand/lumenai-mark-64.png` | Icono compacto |
| `public/brand/lumenai-mark-32.png` | Navegacion reducida |
| `app/icon.png` | Icono del producto |
| `app/apple-icon.png` | Acceso guardado en dispositivos Apple |

`components/brand/lumen-logo.tsx` es el unico componente autorizado para el
lockup de marca dentro de la aplicacion. Admite tamanos, modo compacto, sublinea
y animacion sobria para carga.

## 4. Color semantico

Los tokens dinamicos `--lmn-accent-rgb` y `--lmn-accent-2-rgb` se conservan para
permitir personalizacion controlada por el propietario.

| Token | Valor base | Funcion |
| --- | --- | --- |
| Obsidian 950 | `#050608` | Canvas principal |
| Obsidian 900 | `#080A0F` | Workspace |
| Graphite 850 | `#0C0F15` | Superficie funcional |
| Graphite 800 | `#11151D` | Superficie secundaria |
| Elevated | `#151A24` | Flotantes y paneles superiores |
| Text primary | `#F5F7FA` | Informacion principal |
| Text secondary | `#A8B0BE` | Explicacion y contexto |
| Text muted | `#7D8796` | Metadatos secundarios |
| Intelligence | `#5EEBFF` | Actividad, seleccion y analisis |
| Electric blue | `#3B82F6` | Continuidad y acciones relacionadas |
| Generative AI | `#8B5CF6` | Capacidades generativas o calibracion |
| Success | `#43E6A0` | Exito, salud o disponibilidad real |
| Warning | `#F5C96A` | Requiere revision |
| Critical | `#FF6B7A` | Error, riesgo o accion destructiva |
| Information | `#63B3FF` | Estado informativo |

El negro y el grafito ocupan la mayor parte de la interfaz. Los acentos se usan
en seleccion, estado y acciones, nunca como relleno dominante de todas las
tarjetas.

## 5. Superficies

### Nivel 0: Canvas

Fondo oscuro estable. Puede contener dos luces radiales de baja intensidad para
separar planos, pero no particulas permanentes ni canvas animado.

### Nivel 1: Workspace

Area de trabajo conectada al shell. Se separa mediante borde, ritmo y contraste,
no mediante un contenedor flotante decorativo.

### Nivel 2: Panel

Tarjetas funcionales, modulos, tablas y formularios. Usan borde de 1 px, radio
maximo de 8 px, sombra oscura moderada y una sola capa de profundidad.

### Nivel 3: Inteligencia flotante

Pulse Radar, menus, drawer movil, resultados de busqueda y dialogos. Utilizan
`--lmn-surface-3`, borde reforzado y sombra `--lmn-shadow-card`.

No se colocan tarjetas dentro de tarjetas. Una region enmarcada debe representar
una unidad funcional real.

## 6. Tipografia

La pila principal prioriza Geist cuando esta disponible y cae en fuentes de
sistema. La jerarquia se basa en peso, tamano y espacio; no usa letter spacing
negativo.

| Nivel | Uso |
| --- | --- |
| Display | Identidad de acceso o una experiencia editorial excepcional |
| H1 | Nombre inequívoco de la seccion |
| H2 | Agrupacion operacional |
| H3 | Modulo o herramienta |
| Body | Explicacion, instrucciones y contenido |
| Label | Campo, filtro, categoria o accion |
| Mono data | IDs, timestamps y valores tecnicos comparables |

Los numeros comparables deben usar cifras tabulares. El estilo mono no se aplica
a parrafos ni a navegacion.

## 7. Geometria y espaciado

- Inputs y botones: 8 px.
- Tarjetas funcionales: 8 px.
- Paneles estructurales: 8 px.
- Lockup o contenedor de marca: 8 px.
- Pills: solo estados, filtros y etiquetas.
- Objetivo tactil minimo: 44 x 44 px.
- Separacion base: 4, 8, 12, 16, 20, 24 y 32 px.

## 8. Movimiento

Tokens:

| Accion | Duracion |
| --- | --- |
| Hover | 140 ms |
| Popover | 190 ms |
| Panel o drawer | 280 ms |
| Revelado excepcional | 700 a 1100 ms |

Curvas:

- Entrada: `cubic-bezier(0.16, 1, 0.3, 1)`.
- Salida: `cubic-bezier(0.4, 0, 1, 1)`.

Motivos permitidos:

- **Lumen Beam:** confirmacion breve al completar un analisis.
- **Signal Trace:** desplazamiento lineal de una senal entre estados.
- **Orbital Focus:** enfasis temporal sobre una prioridad.
- **Starline Reveal:** trazo de marca para carga o publicacion.

`prefers-reduced-motion` reduce estos motivos a fades breves y elimina bucles.

## 9. Iconografia

La familia funcional es Lucide. Los tamanos base son 16, 18, 20 y 24 px. Los
iconos ambiguos incluyen tooltip o nombre accesible. Los botones criticos nunca
dependen de un icono sin `aria-label`.

El logo no pertenece a la iconografia funcional y no puede reemplazarse por un
icono Lucide.

## 10. Estados universales

| Estado | Icono y color | Mensaje esperado |
| --- | --- | --- |
| Disponible | Check, verde | Funcion operativa y verificada |
| Sincronizando | Activity, cian | Fuente y proceso en curso |
| Analizando | Activity, violeta | IA procesando informacion real |
| Requiere atencion | Alert, amarillo | Causa y accion recomendada |
| Correcto | Check, verde | Resultado completado |
| Degradado | Alert, amarillo | Servicio parcial y efecto |
| Critico | X, rojo | Fallo, impacto y recuperacion |
| Desconectado | X, neutro/rojo | Integracion perdida y reconexion |
| Sin informacion | Dashed circle, gris | Fuente vacia y siguiente paso |
| Sin permisos | Lock, gris | Recurso bloqueado y rol necesario |

`StatusBadge` siempre combina texto e icono. El color nunca es la unica senal.

## 11. Componentes compartidos

- `LumenLogo`: marca y loader.
- `ActionButton` y `LumenButton`: variantes primaria, secundaria, ghost, sutil,
  destructiva e icono.
- `StatusBadge`: estado textual con icono semantico.
- `ObsidianSurface`: niveles quiet, default, strong y ambient.
- `GlassCard`: compatibilidad con modulos existentes; la capa canonica reduce
  gradientes y glassmorphism.
- `PageShell`: contexto, titulo, descripcion y acciones.
- `PanelSectionHeader`: encabezado operativo o hero controlado.
- `LumenEmptyState`: ausencia de informacion con explicacion y accion.
- `LumenLoadingScreen`: carga global con marca, mensaje real y skeleton.
- `PulseRadarWidget`: inteligencia flotante de nivel 3.

## 12. Shell del producto

### Escritorio

La navegacion de 248 px permanece estable y desplazable. Organiza modulos en
Principal, Inteligencia, Operacion y Sistema. El estado activo combina indicador,
fondo, icono y `aria-current`.

La topbar indica producto, seccion, workspace, estado del sistema, busqueda,
senales, Pulse Radar y perfil. El contenido admite hasta 1440 px para conservar
densidad en pantallas grandes.

### Movil

La navegacion se transforma en header compacto y drawer. El drawer bloquea el
scroll del fondo, atrapa el foco, cierra con Escape y conserva todas las rutas.
Pulse Radar y perfil permanecen accesibles sin cubrir el contenido.

## 13. Vision por area

### Login

Debe comunicar seguridad, control y valor operacional antes de pedir datos. Los
metodos Google, magic link, OTP y contrasena mantienen una jerarquia clara. El
feedback de error o exito aparece inline y asociado al flujo.

### Onboarding

Debe convertir la configuracion del negocio en una secuencia corta y reversible:
identidad, oferta, contacto, Knowledge, asistente, apariencia y revision final.
Siempre debe indicar paso, guardado y consecuencia de continuar.

### Inicio

Centro de mando con resumen ejecutivo, prioridades, salud, modulos, actividad,
analitica progresiva, riesgos y acciones. Cada metrica debe indicar fuente,
periodo o ultima actualizacion. No se muestran ingresos sin una fuente real.

### Calibracion

Estudio para definir identidad, personalidad, ventas, guardrails, flujo y
publicacion. Debe distinguir borrador, version publicada, cambios pendientes,
validacion, timestamp y rollback.

### Config IA

Consola conversacional para proponer cambios. Debe mostrar plan, alcance,
permisos, confirmacion, ejecucion, resultado y auditoria. Nunca ejecuta una
accion destructiva solo por texto ambiguo.

### Radar

Lectura ejecutiva de senales reales. Prioriza novedad, impacto, evidencia y
siguiente accion. Una senal puede descartarse, investigarse o convertirse en
trabajo, conservando trazabilidad.

### Lumen Eye

Vista unificada de conversaciones, leads, oportunidades y eventos. Su objetivo
es responder que esta cambiando en el negocio y por que merece atencion.

### Research

Motor de fuentes, ejecuciones, hallazgos e informes. Debe separar fuente,
evidencia, confianza, estado de revision y destino del hallazgo.

### Growth

Convierte evidencia en oportunidades y playbooks. Debe evitar promesas vagas y
mostrar potencial, esfuerzo, riesgo, responsable y accion disponible.

### Business Twin

Simula decisiones sin presentarlas como predicciones ciertas. Debe mostrar
supuestos, escenario base, cambios, resultado, nivel de confianza y limites.

### Campaigns

Organiza campanas, activos, tareas y experimentos. La generacion con IA produce
borradores revisables; publicar exige resumen, confirmacion y resultado.

### Knowledge

Memoria del negocio para servicios, precios, politicas, pagos, contacto, FAQ y
horarios. Debe distinguir borrador y publicado, validar contenido y explicar
como afecta al asistente.

### Chat

Inbox de conversaciones reales con estado, lectura, takeover humano, envio,
pausa y relacion con leads. El detalle conserva contexto y evita perder el
estado al navegar.

### Leads

Pipeline comercial con contacto, intencion, score, fuente, estado y conversacion
original. Los filtros deben ser escaneables y las acciones confirmar su efecto.

### Widget

Configuracion del canal publico, identidad del asistente, recursos, contacto,
instalacion y vista previa. Publicar debe mostrar version y estado real.

### Ajustes y perfil

Gestiona identidad del propietario, foto elegida por el dueno, rol, workspace,
preferencias y tema. El avatar del propietario permanece separado del avatar del
asistente publico.

### Apariencia

Controla base, acento primario, acento secundario y modo. Debe ofrecer vista
previa, contraste valido y restauracion de valores recomendados.

### Salud del sistema

Consolida autenticacion, Supabase, Knowledge, widget, snapshots, acciones e
integraciones. Cada comprobacion explica estado, impacto y recuperacion.

### Pulse Radar flotante

Asistente contextual siempre accesible, pero no invasivo. Puede mostrar una
recomendacion breve y abrir un panel de detalle. Nunca tapa acciones criticas ni
monta todos sus paneles ocultos al cargar.

### Widget publico

Debe ser rapido, legible y coherente con la configuracion publicada del negocio.
No hereda controles administrativos ni revela informacion privada del panel.

## 14. Datos y confianza

Toda metrica debe responder:

1. Que representa.
2. Que periodo cubre.
3. Cual es su fuente.
4. Cuando se actualizo.
5. Que accion permite.

Los estados sin datos no se sustituyen por ceros decorativos. Un cero solo se
muestra cuando la consulta real confirma ese valor.

## 15. Responsive

Anchos de control: 360, 390, 768, 1024, 1280, 1440 y 1920 px.

- 360/390: una columna, targets de 44 px, tablas convertidas a listas.
- 768: drawer movil y contenido en una o dos columnas segun prioridad.
- 1024: sidebar estable y railes secundarios controlados.
- 1280/1440: densidad operativa completa.
- 1920: ancho maximo de contenido; no estirar lineas de lectura.

## 16. Accesibilidad

- WCAG 2.2 AA como objetivo minimo.
- Focus visible en enlaces, botones, inputs y navegacion.
- Labels persistentes y errores comprensibles.
- `aria-live` para sincronizacion, guardado y errores relevantes.
- Dialogos con foco atrapado, Escape y restauracion de foco.
- Estados con icono y texto.
- Graficos con nombre accesible y resumen alternativo.
- Movimiento reducido sin perdida de informacion.

## 17. Rendimiento

- No se incorporan nuevas dependencias para efectos visuales.
- El logo pequeno pasa de 647 KB a 15 KB en WebP.
- Pulse Radar se carga en un chunk dinamico.
- Overview elimina componentes e imports que no formaban parte del render.
- Las secciones inferiores usan `content-visibility` cuando es seguro.
- Cobe ya se carga de forma dinamica en Overview.
- Los efectos usan `transform` y `opacity`.
- No se usan particulas ni canvas de fondo permanente.
- Las imagenes de producto se sirven mediante `next/image`.

## 18. Errores que deben evitarse

- Sustituir el logo por una letra.
- Gradiente diferente en cada tarjeta.
- Glow sobre parrafos o tablas.
- Boton visible sin accion.
- Datos inventados o porcentajes de progreso simulados.
- Punto de color sin etiqueta.
- Toast para cada guardado.
- Sidebar de escritorio comprimido en movil.
- Texto de bajo contraste para aparentar sofisticacion.
- Animacion permanente para captar atencion.
- Reescritura de contratos Supabase o Groq por motivos visuales.

## 19. Implementacion canonica

La capa final vive en `app/lumenai-obsidian.css`, importada despues de
`app/globals.css`. Esta posicion permite consolidar el sistema actual sin borrar
estilos funcionales de modulos que todavia evolucionan.

Las nuevas pantallas deben usar primero componentes compartidos. Los estilos
locales solo se justifican cuando representan una interaccion propia del modulo.
