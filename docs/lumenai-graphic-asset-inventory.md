# Inventario maestro de iconos, imagenes y elementos graficos de LumenAI

Fecha de auditoria: 23 de julio de 2026
Producto: LumenAI Obsidian Intelligence OS
Alcance: codigo local, `public`, rutas App Router, metadata, autenticacion, onboarding, panel, widget, estados globales y documentacion.

## 1. Resultado ejecutivo

Esta auditoria no propone generar decoracion indiscriminada. Separa cuatro clases de recurso:

1. Interfaz que debe construirse con CSS, HTML, canvas o datos reales.
2. Acciones y estados que deben resolverse con Lucide.
3. Marca y modulos propios que necesitan SVG controlado.
4. Piezas editoriales o comerciales que justifican una imagen raster.

### Evidencia comprobada

| Evidencia | Resultado |
|---|---:|
| Paginas `page.tsx` | 27 |
| Endpoints `route.ts` | 57 |
| Componentes TS/TSX en `components` | 57 |
| Recursos dentro de `public` | 50 |
| Recursos visuales dentro de `public` | 49 |
| Favicon fuera de `public` | 1 |
| WebP | 32 |
| PNG | 11 |
| SVG | 6 |
| Recursos visuales referenciados por codigo | 24 |
| Recursos visuales sin referencia directa | 25 |
| Peso total de `public` | 10.29 MB |
| Peso de candidatos sin uso o heredados | 8.91 MB, 86.6% |
| Iconos Lucide importados, antes de depurar falsos positivos del parser | 124 nombres |
| Familias de email visual existentes | 0 |
| Manifest PWA | No existe |
| Apple Touch Icon / PWA 192 / PWA 512 / maskable | No existen |
| Open Graph y Twitter image dedicadas | No existen |
| `app/not-found.tsx` | No existe |
| Error global | Existe, pero usa la identidad verde anterior |

### Hallazgos de mayor impacto

- **P0 Marca:** no existe un sistema vectorial maestro completo. `public/brand/lumenai-logo.svg` es una estrella concentricamente recortada y no conserva por si solo los dos trazos ascendentes, la terminacion angular tipo L y la estrella de cuatro puntas exigidos.
- **P0 Descubrimiento:** la metadata raiz solo define `title` y `description` como `LumenAI`; no hay metadata comercial, OG, Twitter, manifest ni iconos PWA.
- **P0 Consistencia:** `app/global-error.tsx` todavia usa `#D7FF2F`, verde neon excluido por la direccion Obsidian.
- **P0 Confianza:** login funciona con Google, Magic Link, OTP, password y recuperacion, pero carece de marca vectorial final y de estados editoriales para cuenta suspendida, permisos y sesion vencida.
- **P1 Realidad del producto:** varios WebP de Calibration contienen texto ingles, numeros y pantallas ilustradas. Sirven como antecedentes, no como capturas reales de producto.
- **P1 Limpieza:** `lumenai-hero-card.webp` y `lumenai-section-hero.webp` son binariamente identicos.
- **P1 Plantilla:** `next.svg`, `vercel.svg`, `file.svg`, `globe.svg` y `window.svg` son restos del starter y no deben formar parte de la marca.
- **P1 Peso:** seis fondos PNG y el pack `gems` no tienen referencias en el producto actual. No se eliminan hasta revisar historial e importaciones externas.
- **P1 Accesibilidad:** existen imagenes con `alt=""` justificables por ser decorativas o avatares, pero falta una politica documentada y metadata grafica accesible.
- **P2 Sistema:** el panel ya usa una paleta activa correcta `#05070B`, `#00E5FF`, `#1B43FF`; los tokens globales antiguos aun declaran verde como acento base.

## 2. Taxonomia obligatoria

### Estados

| Estado | Uso |
|---|---|
| Existe y esta aprobado | Puede seguir en produccion sin rediseño visual inmediato. |
| Existe, pero debe actualizarse | Cumple una funcion, pero no la identidad, calidad o accesibilidad final. |
| Esta duplicado | Mismo binario o misma funcion sin justificacion. |
| Tiene mala calidad | Resolucion, compresion, texto incrustado o legibilidad insuficiente. |
| Utiliza una identidad anterior | Verde neon, simbolo anterior, plantilla o direccion visual abandonada. |
| Falta crear | No existe un recurso requerido por producto o comercializacion. |
| Puede resolverse con Lucide | No debe convertirse en asset propio. |
| Necesita SVG personalizado | Marca o concepto exclusivo que debe escalar limpiamente. |
| Necesita imagen generada | Fondo editorial, textura o composicion no representable con datos reales. |
| Necesita diseño editorial | Pieza con copy, jerarquia, logo y CTA; no debe generarse como imagen final con texto. |
| No es necesario | Duplicaria una interfaz generada por codigo o datos reales. |

### Prioridades

| Prioridad | Criterio |
|---|---|
| P0 | Bloquea publicacion, confianza, metadata, accesibilidad o identidad. |
| P1 | Obligatorio para pilotos, demo y presentacion comercial. |
| P2 | Mejora de coherencia, rendimiento o marketing posterior. |
| P3 | Material opcional o experimental. |

## 3. Direccion grafica aprobada

| Campo | Especificacion |
|---|---|
| Fondo maestro | `#05070B`, con superficies `#090D13`, `#0D1219` y `#10161E` |
| Primario | Cian `#00E5FF` |
| Secundario | Azul `#1B43FF` |
| Acento terciario | Violeta `#6C3BFF`, en proporcion menor |
| Excluido | Verde neon como identidad o CTA principal |
| Logo | Dos trazos ascendentes, terminacion angular L y estrella de cuatro puntas |
| Iconos UI | Lucide, trazo 1.75-2 px, sin glow |
| Iconos propios | SVG `currentColor`, grilla 24, variantes 16/20/24/32/48 |
| Fotografia | Solo cuando aporte contexto comercial real |
| Capturas | Producto real con datos demo aprobados; nunca dashboard inventado |
| Rasters | WebP o AVIF; PNG solo para transparencia o compatibilidad puntual |
| Movimiento | CSS/Lottie solo si comunica estado; alternativa `prefers-reduced-motion` |
| Texto en imagen | Prohibido en fondos y renders. El copy final se compone en HTML o diseño editorial. |

### Identidad de marca

La identidad definitiva parte del simbolo maestro, el wordmark y los lockups descritos en
`BR-LOGO-01`, `BR-LOGO-02` y `BR-LOGO-03`. Ningun raster existente se considera fuente
geometrica oficial. La guia debe fijar zona de seguridad, tamaño minimo, fondos permitidos,
monocromo e impresion antes de aprobar piezas comerciales.

### Animaciones de marca

La familia `BR-MOT-01` incluye loading, inicio del panel, publicacion, conexion y exito. Cada
animacion necesita una version estatica para `prefers-reduced-motion`; ninguna debe ejecutarse
de forma decorativa permanente ni alterar el tamaño del layout.

## 4. Inventario de recursos existentes

En las columnas `Prompt/implementacion`, `No generar` significa que la correccion debe hacerse mediante codigo, vector o captura real.

| ID | Categoria | Nombre y objetivo | Seccion | Estado | P | Dimensiones / proporcion / formato / fondo | Variantes | Archivo y ruta | Alt text | Prompt / implementacion | Dependencias y observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|
| EX-BR-001 | Logo | Simbolo circular raster anterior | Marca | Identidad anterior | P0 | 1002x790, 1.27:1, PNG alpha | Unica | `logo.png`, `public/brand/logo.png` | No usar en UI final | Reemplazar por SVG maestro | Circulo, tres trazos y proporciones no coinciden con geometria oficial |
| EX-BR-002 | Logo | Duplicado raster grande del simbolo anterior | Marca | Duplicado / identidad anterior | P0 | 1920x1607, 1.19:1, PNG alpha | Unica | `rlogo.png`, `public/brand/rlogo.png` | No usar | Eliminar tras migracion | Duplica la misma identidad antigua con mas peso |
| EX-BR-003 | Logo | Estrella concentrica usada en Calibration | Panel | Debe actualizarse | P0 | 128x128, 1:1, SVG, negro | Unica | `lumenai-logo.svg`, `public/brand/lumenai-logo.svg` | Simbolo de LumenAI | Redibujar SVG oficial | No contiene el lockup ni los dos trazos ascendentes completos |
| EX-BR-004 | Fondo marca | Esquina angular para banners | Marca | Existe, debe actualizarse | P2 | 2132x738, 2.89:1, WebP oscuro | Desktop | `lumenai-brand-corner-wide.webp`, `public/brand/...` | Fondo angular de LumenAI | Imagen generada; ver IMG-BRAND-01 | Sin referencia directa; evitar mantener variantes casi equivalentes |
| EX-BR-005 | Hero | Fondo oscuro organico usado en landing | Landing | Existe, aprobado temporal | P1 | 2132x738, 2.89:1, WebP oscuro | Desktop | `lumenai-brand-hero-dark.webp`, `public/brand/...` | Vista premium del panel LumenAI | Sustituir por captura real en P1 | Actualmente es fondo abstracto, no una vista verificable del producto |
| EX-BR-006 | Lockup raster | Wordmark con subtitulo incrustado | Marca | Debe actualizarse | P0 | 2132x738, 2.89:1, WebP oscuro | Desktop | `lumenai-brand-mark-wide.webp`, `public/brand/...` | LumenAI, AI Sales & Support System | Necesita SVG personalizado | Texto raster no escala ni sirve para fondo claro |
| EX-BR-007 | Fondo marca | Cintas de luz orbital | Marca | Debe actualizarse | P2 | 2132x738, 2.89:1, WebP oscuro | Desktop | `lumenai-brand-orbit-wide.webp`, `public/brand/...` | Fondo abstracto de LumenAI | Imagen generada | Sin uso; glow alto |
| EX-BR-008 | Fondo marca | Cinta angular de marca | Marca | Debe actualizarse | P2 | 2132x735, 2.90:1, WebP oscuro | Desktop | `lumenai-brand-ribbon-wide.webp`, `public/brand/...` | Fondo de cinta angular | Imagen generada | Sin uso; puede consolidarse con EX-BR-004 |
| EX-BR-009 | Fondo | Tarjeta editorial enmarcada | Panel | Existe, aprobado temporal | P2 | 1629x965, 1.69:1, WebP oscuro | Desktop | `lumenai-framed-wide-card.webp`, `public/brand/...` | Fondo enmarcado de LumenAI | CSS preferido | Usado por CSS; la geometria puede reproducirse sin raster |
| EX-BR-010 | Hero | Fondo organico generico | Marca | Duplicado | P1 | 2087x754, 2.77:1, WebP oscuro | Desktop | `lumenai-hero-card.webp`, `public/brand/...` | Fondo hero de LumenAI | No generar | Binariamente igual a EX-BR-015 |
| EX-BR-011 | Hero | Fondo ejecutivo fechado | Overview | Existe, debe actualizarse | P1 | 2087x754, 2.77:1, WebP oscuro | Desktop | `lumenai-executive-hero-20260603.webp`, `public/brand/...` | Fondo ejecutivo de LumenAI | Captura real o CSS | Usado en CSS; no muestra producto real |
| EX-BR-012 | Marca | Simbolo sobre haz de luz | Panel | Debe actualizarse | P0 | 2135x736, 2.90:1, WebP oscuro | Desktop | `lumenai-logo-beam-card.webp`, `public/brand/...` | Simbolo luminoso de LumenAI | SVG maestro + CSS | Usa simbolo angular mas cercano, pero es raster |
| EX-BR-013 | Fondo | Marca lateral del panel | Panel shell | Existe, aprobado temporal | P1 | 1606x979, 1.64:1, WebP oscuro | Desktop | `lumenai-panel-side-mark.webp`, `public/brand/...` | Marca lateral de LumenAI | SVG + CSS en P2 | Usado en CSS |
| EX-BR-014 | Fondo | Banner ondulado ancho | Marca | Debe actualizarse | P2 | 1440x520, 2.77:1, WebP oscuro | Desktop | `lumenai-wide-card.webp`, `public/brand/...` | Fondo ancho de LumenAI | Imagen generada | Sin referencia directa |
| EX-BR-015 | Hero | Hero de seccion generico | Panel | Duplicado | P1 | 2087x754, 2.77:1, WebP oscuro | Desktop | `lumenai-section-hero.webp`, `public/brand/...` | Fondo de seccion | No generar | Binariamente igual a EX-BR-010 |
| EX-BR-016 | Empty state | Estado vacio con texto ingles incrustado | Global | Mala calidad funcional | P1 | 1672x941, 16:9, WebP oscuro | Desktop | `lumenai-empty-state.webp`, `public/brand/...` | Estado sin datos | SVG/HTML, no raster con texto | Texto y CTA no localizables; se usa en CSS |
| EX-MD-001 | Modulo | Fondo generico 720 | Panel | Existe, aprobado temporal | P2 | 720x440, 1.64:1, WebP oscuro | Desktop | `lumenai-module-card.webp`, `public/brand/...` | Fondo de modulo | CSS o imagen generada | Uso CSS |
| EX-MD-002 | Modulo | Fondo generico 360 | Panel | Existe, aprobado temporal | P2 | 360x220, 1.64:1, WebP oscuro | Compacta | `lumenai-module-card-360.webp`, `public/brand/...` | Fondo compacto de modulo | CSS o imagen generada | Uso CSS |
| EX-MD-003 | Modulo | Fondo Autopilot | Config IA | Existe, debe actualizarse | P2 | 360x220, 1.64:1, WebP oscuro | Compacta | `lumenai-module-autopilot.webp`, `public/brand/...` | Fondo de Config IA | SVG propio + CSS | Diferencia semantica minima respecto al resto |
| EX-MD-004 | Modulo | Fondo Chat | Chat | Existe, debe actualizarse | P2 | 360x220, 1.64:1, WebP oscuro | Compacta | `lumenai-module-chat.webp`, `public/brand/...` | Fondo del modulo Chat | CSS | No necesita raster propio |
| EX-MD-005 | Modulo | Fondo Knowledge | Knowledge | Existe, debe actualizarse | P2 | 360x220, 1.64:1, WebP oscuro | Compacta | `lumenai-module-knowledge.webp`, `public/brand/...` | Fondo del modulo Knowledge | CSS | No necesita raster propio |
| EX-MD-006 | Modulo | Fondo Leads | Leads | Existe, debe actualizarse | P2 | 360x220, 1.64:1, WebP oscuro | Compacta | `lumenai-module-leads.webp`, `public/brand/...` | Fondo del modulo Leads | CSS | No necesita raster propio |
| EX-MD-007 | Modulo | Fondo Widget | Widget | Existe, debe actualizarse | P2 | 360x220, 1.64:1, WebP oscuro | Compacta | `lumenai-module-widget.webp`, `public/brand/...` | Fondo del modulo Widget | CSS | No necesita raster propio |
| EX-CA-001 | Calibration | Hero antiguo | Calibration | Identidad anterior de pantalla | P2 | 2171x724, 3:1, WebP oscuro | Desktop | `lumenai-calibration-center-hero.webp`, `public/brand/...` | Fondo de Calibration Studio | No generar | Conservado por CSS legado; el workspace nuevo ya no depende de este hero |
| EX-CA-002 | Calibration | Hero fechado mas reciente | Calibration | Existe, debe actualizarse | P2 | 2171x724, 3:1, WebP oscuro | Desktop | `lumenai-calibration-center-hero-20260614.webp`, `public/brand/...` | Fondo de Calibration Studio | No generar | Tiene texto ingles incrustado |
| EX-CA-003 | Calibration | Identidad ilustrada | Calibration | Debe actualizarse | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-identity.webp`, `public/brand/...` | Configuracion de identidad | Captura real | Muestra contenido ficticio y texto ingles |
| EX-CA-004 | Calibration | Personalidad ilustrada | Calibration | Debe actualizarse | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-personality.webp`, `public/brand/...` | Configuracion de personalidad | Captura real | Texto ingles incrustado |
| EX-CA-005 | Calibration | Guardrails ilustrados | Calibration | Debe actualizarse | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-guardrails.webp`, `public/brand/...` | Reglas y limites del asistente | Captura real | Texto ingles incrustado |
| EX-CA-006 | Calibration | Publicacion ilustrada | Calibration | Debe actualizarse | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-publish.webp`, `public/brand/...` | Publicacion de calibracion | Captura real | Boton y estado ficticios incrustados |
| EX-CA-007 | Calibration | Analitica de ventas ilustrada | Calibration | No es necesario | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-sales-intelligence.webp`, `public/brand/...` | Analitica de comportamiento comercial | Grafico por codigo | Incluye metrica `128` inventada |
| EX-CA-008 | Calibration | Preview ilustrado de widget | Calibration | Debe actualizarse | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-widget-preview.webp`, `public/brand/...` | Preview del widget | Captura real | El producto ya dispone de preview autenticado |
| EX-CA-009 | Calibration | Transcripcion ilustrada | Calibration | Debe actualizarse | P2 | 1604x980, 1.64:1, WebP oscuro | Desktop | `lumenai-calibration-audio-transcription.webp`, `public/brand/...` | Transcripcion de audio | Captura real o waveform CSS | Texto ingles incrustado |
| EX-CA-010 | Calibration | Flujo comercial ilustrado | Calibration | No es necesario | P2 | 2172x724, 3:1, WebP oscuro | Desktop | `lumenai-calibration-sales-flow.webp`, `public/brand/...` | Flujo de ventas | Diagrama SVG/HTML | Debe ser accesible y traducible |
| EX-LG-001 | Fondo legado | Ciudad monocroma | Sin uso | Identidad anterior | P2 | 1366x768, 16:9, PNG opaco | Desktop | `cc.png`, `public/backgrounds/cc.png` | No usar | Archivar tras validar historial | 890 KB, sin referencia |
| EX-LG-002 | Fondo legado | Ciudad nocturna | Sin uso | Identidad anterior | P2 | 1366x768, 16:9, PNG opaco | Desktop | `cici.png`, `public/backgrounds/cici.png` | No usar | Archivar | 463 KB, sin referencia |
| EX-LG-003 | Fondo legado | Logo en ciudad | Sin uso | Identidad anterior | P2 | 800x533, 3:2, JPEG dentro de PNG | Desktop | `dffound.png`, `public/backgrounds/dffound.png` | No usar | Eliminar tras aprobacion | Extension y contenido no coinciden |
| EX-LG-004 | Fondo legado | Logo en paisaje cristalino | Sin uso | Identidad anterior | P2 | 800x533, 3:2, JPEG dentro de PNG | Desktop | `ffound.png`, `public/backgrounds/ffound.png` | No usar | Eliminar tras aprobacion | Extension y contenido no coinciden |
| EX-LG-005 | Fondo legado | Metal liquido azul | Sin uso | Identidad anterior | P2 | 1366x768, 16:9, PNG opaco | Desktop | `Dis.png`, `public/backgrounds/Dis.png` | No usar | Archivar | 2.02 MB, sin referencia |
| EX-LG-006 | Fondo legado | Metal liquido claro | Sin uso | Identidad anterior | P2 | 1366x768, 16:9, PNG opaco | Desktop | `tt.png`, `public/backgrounds/tt.png` | No usar | Archivar | 1.70 MB, sin referencia |
| EX-GM-001 | Gem | Gema violeta vertical | Sin uso | Identidad anterior | P3 | 800x1200, 2:3, JPEG dentro de PNG | Vertical | `g1.png`, `public/gems/g1.png` | No usar | Eliminar tras aprobacion | Decorativa, sin funcion de producto |
| EX-GM-002 | Gem | Gema violeta grande | Sin uso | Mala calidad de peso | P3 | 1024x1536, 2:3, PNG opaco | Vertical | `g2.png`, `public/gems/g2.png` | No usar | Eliminar tras aprobacion | 1.64 MB, sin referencia |
| EX-GM-003 | Gem | Pliegue violeta derecho | Sin uso | Identidad anterior | P3 | 1211x804, 3:2, WebP alpha | Desktop | `sqd.webp`, `public/gems/sqd.webp` | No usar | Eliminar tras aprobacion | Decorativo |
| EX-GM-004 | Gem | Pliegue violeta izquierdo | Sin uso | Identidad anterior | P3 | 1211x804, 3:2, WebP alpha | Desktop | `sqi.webp`, `public/gems/sqi.webp` | No usar | Eliminar tras aprobacion | Decorativo |
| EX-GM-005 | Gem | Superficie violeta | Sin uso | Identidad anterior | P3 | 800x533, 3:2, JPEG dentro de PNG | Desktop | `costd.png`, `public/gems/costd.png` | No usar | Eliminar tras aprobacion | Extension y contenido no coinciden |
| EX-ST-001 | Starter | Icono archivo de Next starter | Sin uso | Identidad anterior | P1 | 16x16, 1:1, SVG claro/oscuro | Unica | `file.svg`, `public/file.svg` | No usar | Eliminar | Puede resolverse con `FileText` de Lucide |
| EX-ST-002 | Starter | Icono globo de Next starter | Sin uso | Identidad anterior | P1 | 16x16, 1:1, SVG | Unica | `globe.svg`, `public/globe.svg` | No usar | Eliminar | Puede resolverse con `Globe2` de Lucide |
| EX-ST-003 | Starter | Wordmark Next.js | Sin uso | Marca de tercero | P0 | viewBox 394x80, SVG | Unica | `next.svg`, `public/next.svg` | No usar | Eliminar | No debe aparecer en comunicacion |
| EX-ST-004 | Starter | Logo Vercel | Sin uso | Marca de tercero | P0 | viewBox 1155x1000, SVG | Unica | `vercel.svg`, `public/vercel.svg` | No usar | Eliminar | No debe incorporarse a material comercial |
| EX-ST-005 | Starter | Icono ventana | Sin uso | Identidad anterior | P1 | 16x16, 1:1, SVG | Unica | `window.svg`, `public/window.svg` | No usar | Eliminar | Puede resolverse con Lucide |
| EX-DG-001 | Favicon | Favicon actual heredado | Metadata | Debe actualizarse | P0 | ICO, 25.9 KB, 1:1 | 16, 32, 48 y 256 px; 32 bits | `favicon.ico`, `app/favicon.ico` | LumenAI | Generar desde simbolo maestro | Las cuatro entradas se verificaron leyendo el directorio ICO; debe reexportarse sin glow |

## 5. Inventario maestro de recursos requeridos

Cada fila representa una familia producible. Las variantes enumeradas son entregables o estados individuales y cuentan en el resumen.

| ID | Categoria | Objetivo / seccion | Estado | P | Dimensiones y proporcion | Formato / fondo | Variantes obligatorias | Archivo sugerido / ruta | Alt text | Implementacion / prompt | Dependencias / observaciones |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BR-LOGO-01 | Logo | Simbolo maestro de marca | Falta crear | P0 | Grilla 128, 1:1 | SVG transparente | Blanco, negro, cian, monocromo, claro, oscuro, compacto, impresion | `lumenai-logo-symbol-v1.svg`, `public/brand/logo/` | Simbolo de LumenAI | SVG personalizado | Dos trazos ascendentes, L angular, estrella de cuatro puntas |
| BR-LOGO-02 | Logo | Wordmark y lockups | Falta crear | P0 | Horizontal 6:1; vertical 4:5 | SVG transparente | Wordmark, horizontal, vertical, con subtitulo, sin subtitulo | `lumenai-logo-horizontal-dark-v1.svg`, `public/brand/logo/` | LumenAI, AI Sales & Support System | SVG personalizado | Derivado de BR-LOGO-01, sin rasterizar tipografia |
| BR-LOGO-03 | Guia | Zona de seguridad, minimo e impresion | Falta crear | P0 | A4 y 1920x1080 | PDF/SVG claro | Digital, impresion, bordado/monocromo | `lumenai-logo-usage-guide-v1.pdf`, `docs/brand/` | No aplica | Diseño editorial | Aprobar antes de producir el resto |
| BR-DIG-01 | Marca digital | Identidad del navegador y PWA | Falta crear | P0 | 16, 32, 48, 180, 192, 512; 1:1 | ICO/PNG/SVG, transparente/maskable | Favicon, Apple, PWA, maskable, pinned tab | `lumenai-favicon-32-v1.png`, `public/brand/icons/` | LumenAI | Exportacion del SVG maestro | Requiere manifest y metadata |
| BR-DIG-02 | Marca digital | Avatares y sharing | Falta crear | P0 | 512x512 y 1200x630 | PNG/WebP/SVG | Redes, GitHub, Vercel, email, OG logo, marca de agua, firma | `lumenai-avatar-social-v1.png`, `public/brand/` | LumenAI | SVG + diseño editorial | No usar marcas de terceros |
| BR-MOT-01 | Motion | Estados animados de marca | Falta crear | P1 | 128-512, 1:1 | Lottie/MP4/SVG, oscuro | Loading, panel start, publicar, conectar, exito, estatico reduced motion | `lumenai-motion-loading-v1.json`, `public/brand/motion/` | LumenAI cargando | Motion SVG/Lottie | No animacion decorativa continua |
| ICO-NAV-01 | Iconos UI | Navegacion global | Lucide + propios | P0 | 16/20/24/32/48, 1:1 | React/SVG, transparente | Inicio, Calibration, Config IA, Radar, Lumen Eye, Research, Growth, Twin, Campaigns, Knowledge, Chat, Leads, Widget, Settings, Color Mix, Health, notificaciones, buscar, command, workspace, perfil, soporte, logout | Ver `lumenai-icon-system.md` | Segun control | Lucide salvo modulos propios | Estado activo e inactivo |
| ICO-ACT-01 | Iconos UI | Acciones globales | Puede resolverse con Lucide | P0 | 16/20/24, 1:1 | React, `currentColor` | Crear, editar, eliminar, duplicar, guardar, publicar, despublicar, comparar, undo, redo, restore, rollback, refresh, retry, download, export, import, upload, copy, share, filter, sort, search, expand, collapse, external, more, close, confirm, cancel, preview, test, run, pause, archive, assign, send, human | Ver sistema de iconos | Segun accion | Lucide | No exportar archivos SVG duplicados |
| ICO-STATE-01 | Iconos UI | Estados globales | Puede resolverse con Lucide | P0 | 16/20/24, 1:1 | React, `currentColor` | Activo, inactivo, conectado, desconectado, sync, saving, saved, published, draft, pending, complete, error, warning, critical, blocked, no permission, online, offline, AI, review, stale, rollback | Ver sistema de iconos | Segun estado | Lucide + color semantico | Nunca depender solo de color |
| ICO-BRAND-01 | Iconos propios | Familia de modulos LumenAI | Falta crear | P1 | Grilla 24 y masters 48, 1:1 | SVG transparente | Lumenite, Eye, Twin, Radar, Config IA, Calibration, Knowledge, Growth, Research, Campaign, Health, signal, opportunity, snapshot, AI action, guardrail, takeover | `lumenai-icon-[modulo]-v1.svg`, `public/brand/icons/` | Nombre del modulo | SVG personalizado | Lineas ascendentes y estrella con moderacion |
| LAND-HERO-01 | Captura/producto | Hero principal de landing | Falta crear | P0 | 1600x1000 desktop; 750x1000 mobile | AVIF/WebP oscuro | Desktop, mobile, 2x | `lumenai-landing-product-hero-desktop-v1.avif`, `public/graphics/landing/` | Panel real de LumenAI | Captura real + composicion | Datos demo aprobados, sin PII |
| LAND-FLOW-01 | Diagrama | Conversacion a oportunidad | Falta crear | P1 | 1440x720, 2:1 | SVG/HTML transparente | Desktop, mobile | `lumenai-landing-conversion-flow-v1.svg`, `public/graphics/landing/` | Flujo de conversacion a oportunidad | SVG o codigo | No inventar metricas |
| LAND-MOD-01 | Capturas | Modulos publicos | Falta crear | P1 | 1440x900, 16:10 | WebP oscuro | Knowledge, Calibration, Config IA, Radar, Eye, Growth, Twin, Campaigns | `lumenai-landing-module-[name]-v1.webp`, `public/graphics/landing/` | Vista real del modulo | Capturas reales | Ocho variantes |
| LAND-SEC-01 | Ilustracion | Seguridad y privacidad | Falta crear | P1 | 1600x1000, 8:5 | WebP/SVG oscuro | Desktop, mobile | `lumenai-landing-security-v1.webp`, `public/graphics/landing/` | Controles de seguridad de LumenAI | Imagen generada, IMG-SEC-01 | Sin candados genericos excesivos |
| LAND-CMP-01 | Grafico | Antes/despues y casos de uso | Falta crear | P1 | 1440x900 y 1080x1350 | HTML/SVG/editorial | Por industria, CTA final | `lumenai-landing-use-case-[industry]-v1.svg`, `public/graphics/landing/` | Comparacion del flujo comercial | Codigo/diseño editorial | Solo datos demostrativos etiquetados |
| LAND-SHARE-01 | Social | OG, Twitter y enlace | Falta crear | P0 | 1200x630, 1.91:1 | PNG/WebP oscuro | OG, X, generic share | `lumenai-open-graph-home-v1.png`, `public/graphics/landing/` | LumenAI AI Sales & Support System | Diseño editorial | Copy editable fuera del fondo generado |
| AUTH-VIS-01 | Fondo | Panel visual izquierdo del login | Falta crear | P0 | 1600x1200, 4:3 | AVIF/WebP oscuro | Desktop, tablet, mobile crop | `lumenai-login-visual-desktop-v1.avif`, `public/graphics/auth/` | Fondo abstracto de acceso seguro | Imagen generada, IMG-AUTH-01 | Inspirado en referencia, sin copiar logos ni textos |
| AUTH-LOGO-01 | Marca | Logo del formulario | Falta crear | P0 | 24/32/48 | SVG transparente | Claro, oscuro | `lumenai-logo-compact-dark-v1.svg`, `public/brand/logo/` | LumenAI | BR-LOGO-01 | Sustituye la letra L actual |
| AUTH-ICON-01 | Iconos | Metodos y seguridad | Lucide / proveedor | P0 | 16/20/24 | React/SVG | Seguro, Google, Magic Link, password, OTP, recovery, protected session | Ver icon system | Segun accion | Lucide; Google oficial solo en boton Google | No crear imitacion del logo Google |
| AUTH-STATE-01 | Estados | Feedback de autenticacion | Falta integrar visualmente | P0 | 240-480, variable | HTML + Lucide; SVG solo para bloqueos | Email enviado, error, token vencido, rate limit, exito, suspendida, sin permisos | `lumenai-auth-state-[name]-v1.svg`, `public/states/` | Estado de acceso correspondiente | Codigo para estados comunes; SVG para suspendida/permisos | No requiere raster por cada error |
| ONB-STEP-01 | Onboarding | Iconos de diez pasos actuales | Lucide | P0 | 20/24 | React | Identidad, industria, servicios, precios, contacto, personalidad, marca, Knowledge, preview, confirmar | Ver icon system | Paso de onboarding | Lucide | Horarios esta dentro del flujo, no es paso independiente actual |
| ONB-STATE-01 | Onboarding | Progreso, upload, preview y exito | Falta completar | P1 | Responsive | HTML/Lucide/SVG | Progreso, ilustracion etapa, empty, upload, preview, final, IA, recomendaciones, mobile | `lumenai-onboarding-complete-v1.svg`, `public/graphics/onboarding/` | Configuracion inicial completada | Codigo + SVG puntual | No generar diez fondos pesados |
| SHELL-BRAND-01 | Panel shell | Marca y avatares | Falta completar | P0 | 20-64, 1:1/lockup | SVG + imagen subida | Sidebar expandida/contraida, workspace avatar, assistant avatar | `lumenai-panel-logo-compact-v1.svg`, `public/brand/logo/` | LumenAI | SVG + contenido del propietario | Avatar ya admite foto real desde Supabase |
| SHELL-STATE-01 | Panel shell | Sistema global de feedback | Falta crear | P0 | Responsive | HTML/CSS/Lucide | Active indicator, badges, dividers, command, notification center, loading, error, offline, maintenance, update | `lumenai-state-[name]-v1.svg`, `public/states/` solo cuando aplique | Estado del sistema | Mayormente codigo | No crear fondos para cada estado |
| OVER-CHART-01 | Visualizacion | KPIs, funnel y tendencias | Existe en codigo / completar | P0 | Responsive | HTML/SVG/canvas | KPIs, funnel, conversations, leads, knowledge, widget, activity, channels, trends, alerts, recommendations, feed, report | No archivo raster | Grafico de actividad de LumenAI | Codigo con datos reales | Estados sin datos obligatorios |
| OVER-STATE-01 | Estado | Overview sin datos/actividad/saludable | Falta unificar | P1 | 480x320 max | HTML/Lucide/SVG | Sin datos, sin actividad, saludable | `lumenai-overview-empty-v1.svg`, `public/states/` | No hay actividad disponible | SVG personalizado simple | No usar dashboard generado |
| CAL-ICON-01 | Calibration | Navegacion y estados internos | Existe con Lucide / completar | P0 | 16/20 | React | Health, spectrum, identity, personality, tone, sales, objections, tests, promises, guardrails, escalation, widget, lab, draft, published, compare, autosave, publish, rollback, presets | Ver icon system | Segun control | Lucide + icono propio Calibration | Workspace nuevo ya cubre gran parte |
| CAL-VIS-01 | Calibration | Personalidades y estados editoriales | Falta crear | P2 | 800x800 / 1200x675 | SVG/WebP oscuro | Personalidades, incompleto, listo, publicado | `lumenai-calibration-personality-[name]-v1.svg`, `public/graphics/calibration/` | Personalidad del asistente | SVG, no retrato humano falso | Primero validar necesidad con usuarios |
| CFG-ICON-01 | Config IA | Riesgo, diff, ejecucion y rollback | Existe parcialmente | P0 | 16/20/24 | React/SVG | Lumenite, prompt, plan, low/medium/high, irreversible, diff, execution, progress, snapshot, rollback, history, success, failure, confirm, AI cost, empty | Ver icon system | Segun estado | Lucide + SVG Lumenite | Riesgo siempre con texto |
| KB-ICON-01 | Knowledge | Tipos, estados y pipeline documental | Existe parcialmente | P0 | 16/20/24 | React | Library, document, PDF, DOCX, website, text, FAQ, products, services, pricing, payments, policies, hours, contact, verified, contradiction, unanswered, draft, published, history, extraction, processing, empty, error | Ver icon system | Segun recurso | Lucide | Upload PDF/DOCX real aun requiere confirmar soporte funcional |
| CHAT-ICON-01 | Chat | Conversacion y takeover | Existe parcialmente | P0 | 16/20/24 | React | Conversation, unread, lead, customer, AI, human, takeover, attachment, audio, send, suggested, AI summary, priority, archive, close, send error, empty, selected, typing, connected | Ver icon system | Segun accion | Lucide + SVG takeover opcional | Widget posee SVG manual duplicado que debe migrarse |
| LEAD-ICON-01 | Leads | Pipeline y score | Existe parcialmente | P0 | 16/20/24 | React | Cold, warm, hot, score, stage, kanban, table, source, chat, owner, next action, note, reminder, export, empty, converted, lost, empty pipeline | Ver icon system | Segun estado | Lucide + color/texto | Temperatura no debe depender solo del color |
| WDG-BRAND-01 | Widget | Launcher, logo, avatar y canales | Existe parcialmente | P0 | 24-96, 1:1 | SVG/imagen usuario | Closed/open, logo, avatar, online/offline, messages, quick actions, WhatsApp, email, audio, human, lead, privacy, consent, error, reconnect, minimize, close, notification | `lumenai-widget-avatar-default-v1.webp`, `public/graphics/widget/` | Asistente de LumenAI | Lucide/SVG + foto del propietario | No incluir logo WhatsApp sin respetar guia de marca |
| WDG-PREV-01 | Captura | Preview e instalacion | Falta crear | P1 | 1440x900, 768x1024, 390x844 | WebP | Desktop, tablet, mobile, success/failure, WordPress, Shopify, Webflow, Wix, HTML/Next | `lumenai-widget-preview-desktop-v1.webp`, `public/graphics/widget/` | Widget instalado en un sitio | Captura real + diseño editorial | Nueve variantes |
| RAD-ICON-01 | Radar | Señales ejecutivas | Existe parcialmente | P0 | 16/20/24 | React/SVG | Pulse, signal, urgency, source, confidence, impact, action, timeline, market, internal, empty, updating, source error | Ver icon system | Segun estado | Lucide + SVG Radar | No fingir actividad |
| EYE-MAP-01 | Visualizacion | Globo, mapa y actividad geografica | Existe en cobe / completar | P0 | Responsive 1:1/16:9 | Canvas + SVG fallback | Globe, 2D map, Chile, nodes, connections, region, feed, severity, alert, real activity, empty, loading, mobile | Sin raster principal | Mapa de actividad agregada | Codigo con datos reales | El codigo ya evita nodos aleatorios; falta fallback 2D |
| RES-ICON-01 | Research | Fuentes, jobs y evidencia | Existe parcialmente | P1 | 16/20/24 | React | Source, job, finding, evidence, confidence, report, empty, progress | Ver icon system | Segun recurso | Lucide | Confidence con valor y etiqueta |
| GRO-ICON-01 | Growth | Oportunidades y playbooks | Existe parcialmente | P1 | 16/20/24 | React | Opportunity, impact, urgency, playbook, follow-up, result, empty | Ver icon system | Segun recurso | Lucide + SVG Opportunity opcional | Datos reales |
| TWN-ICON-01 | Business Twin | Simulacion y comparacion | Existe parcialmente | P1 | 16/20/24 | React/SVG | Twin, scenario, simulation, compare, risk, opportunity, prediction, actual result, room, empty | Ver icon system | Segun recurso | Lucide + SVG Twin | Prediccion debe rotularse como simulacion |
| CMP-ICON-01 | Campaigns | Campañas y produccion | Existe parcialmente | P1 | 16/20/24 | React | Campaign, asset, variant, audience, channel, calendar, experiment, task, draft, approved, running, complete, empty | Ver icon system | Segun recurso | Lucide | No generar marcas de canales no integrados |
| SET-ICON-01 | Settings | Categorias y upload | Existe parcialmente | P0 | 16/20/24 | React | Business, brand, assistant, channels, security, data, integrations, users, preferences, upload, preview | Ver icon system | Segun categoria | Lucide | La UI actual se centra en widget; faltan categorias completas |
| CLR-ICON-01 | Color Mix | Tema y contraste | Existe parcialmente | P1 | 16/20/24 | React | Palette, preset, contrast, accessibility, preview, reset, draft, published | Ver icon system | Segun control | Lucide + swatches CSS | Colores se muestran con swatches, no iconos |
| HLT-ICON-01 | System Health | Servicios y severidad | Existe parcialmente | P0 | 16/20/24 | React | Auth, Supabase, RLS, Storage, Widget, Groq, Knowledge, APIs, variables, snapshot, incident, healthy, warning, critical, repair, retry | Ver icon system | Segun servicio | Lucide + logotipos solo si son necesarios | Nunca exponer secretos |
| GST-STATE-01 | Estados globales | Paginas y operaciones limite | Falta crear | P0 | Responsive | HTML/CSS/Lucide/SVG | 404, 500, offline, maintenance, suspended, no plan, no permission, expired, deleted, success, critical, destructive, loading, empty, no search, no filter, first setup, update | `lumenai-state-[name]-v1.svg`, `public/states/` | Mensaje del estado | Codigo; SVG solo para cuatro estados editoriales | Familia visual unica |
| EML-SYS-01 | Email | Sistema transaccional | Falta crear | P0 | 600px ancho | HTML email + PNG/SVG compatible | Header, logo, Magic Link, OTP, recovery, welcome, invite, lead, human request, critical, weekly, publish, integration failure, footer, social, signature | `emails/lumenai-[type].tsx`; assets en `public/email/` | Segun email | Diseño HTML, no imagen completa | No existe proveedor/template en repo |
| MKT-SOC-01 | Marketing | Pack de redes | Falta crear | P1 | Ver documento marketing | Diseño editorial | Instagram, Facebook, LinkedIn, X, YouTube, TikTok | `lumenai-[network]-[campaign]-v1.*`, `public/social/` | Segun pieza | Diseño editorial | No hornear copy con IA generativa |
| MKT-LCH-01 | Marketing | Campaña de lanzamiento | Falta crear | P1 | 1:1, 4:5, 9:16, 1.91:1 | Diseño editorial | 17 flyers/carruseles/anuncios solicitados | `lumenai-launch-[topic]-[ratio]-v1.*`, `public/marketing/` | Segun pieza | Diseño editorial | Sin testimonios ni cifras inventadas |
| MKT-SAL-01 | Ventas | Kit comercial e inversion | Falta crear | P1 | A4, 16:9, 1.91:1 | PDF/PPTX/PNG/SVG | One-pager, deck, ecosystem, roadmap, model, competitive, mockups, pricing, use case, case study, proposal, signature, meeting, QR | `lumenai-sales-[asset]-v1.*`, `public/marketing/` | Segun pieza | Diseño editorial + capturas reales | Caso de exito requiere evidencia real |
| CAP-REAL-01 | Capturas | Biblioteca de producto real | Falta crear | P1 | 1440x900 desktop; 390x844 mobile | WebP/PNG | Landing, login, onboarding, overview, calibration, Config IA, Knowledge, Chat, Leads, Widget, Radar, Eye, Research, Growth, Twin, Campaigns, Health | `lumenai-[route]-screenshot-[viewport]-v1.webp`, `public/mockups/` | Captura de [seccion] | Captura autenticada | Ocultar PII y usar demo estable |

## 6. Plan de capturas reales

| ID | Ruta | Resolucion | Datos demo necesarios | Estado | Uso | Privacidad | Variantes |
|---|---|---:|---|---|---|---|---|
| CAP-01 | `/` | 1440x900 | Ninguno | Hero y primer pliegue | Landing/OG | No aplica | Desktop/mobile |
| CAP-02 | `/login` | 1440x900 | Ninguno | Formulario inicial | Ventas/documentacion | Ocultar email | Desktop/mobile |
| CAP-03 | `/onboarding` | 1440x900 | Cuenta demo | Marca y preview | Onboarding comercial | Email ficticio aprobado | Desktop/mobile |
| CAP-04 | `/panel/overview` | 1440x900 | Conversaciones y leads demo | Saludable con actividad | Landing/deck | Sin PII | Desktop/mobile |
| CAP-05 | `/panel/calibration` | 1440x900 | Draft completo y version publicada | Bento + compare | Landing/deck | Sin prompts sensibles | Desktop/tablet/mobile |
| CAP-06 | `/panel/autoconfig` | 1440x900 | Plan seguro preparado | Diff antes de ejecutar | Deck | Ocultar secretos | Desktop/mobile |
| CAP-07 | `/panel/knowledge` | 1440x900 | FAQ, servicios y politicas demo | Biblioteca publicada | Landing/deck | Datos ficticios etiquetados | Desktop/mobile |
| CAP-08 | `/panel/chat` | 1440x900 | Conversacion demo consentida | Chat seleccionado | Ventas | Anonimizar contacto | Desktop/mobile |
| CAP-09 | `/panel/leads` | 1440x900 | Pipeline demo | Tabla/kanban | Ventas | Anonimizar contacto | Desktop/mobile |
| CAP-10 | `/panel/widget` y `/widget/[key]` | 1440x900 y 390x844 | Config demo | Widget abierto | Landing/install | Sin PII | Desktop/tablet/mobile |
| CAP-11 | `/panel/radar` | 1440x900 | Señales trazables | Feed real/demo rotulado | Deck | Ocultar fuentes privadas | Desktop/mobile |
| CAP-12 | `/panel/lumen-eye` | 1440x900 | Agregados geograficos | Chile seleccionado | Deck | Sin coordenadas personales | Desktop/mobile |
| CAP-13 | `/panel/research` | 1440x900 | Fuente y finding demo | Reporte finalizado | Deck | Fuente publicable | Desktop/mobile |
| CAP-14 | `/panel/growth` | 1440x900 | Oportunidad demo | Playbook preparado | Deck | Sin contacto | Desktop/mobile |
| CAP-15 | `/panel/twin` | 1440x900 | Dos escenarios demo | Comparacion | Deck | Rotular simulacion | Desktop/mobile |
| CAP-16 | `/panel/campaigns` | 1440x900 | Campaña demo | Aprobacion pendiente | Deck | Sin marcas de terceros | Desktop/mobile |
| CAP-17 | `/panel/system-health` | 1440x900 | Servicios verificados | Saludable | Seguridad/demo | Redactar variables | Desktop/mobile |

## 7. Estructura objetivo de archivos

```text
public/
|-- brand/
|   |-- logo/
|   |-- icons/
|   `-- motion/
|-- graphics/
|   |-- landing/
|   |-- auth/
|   |-- onboarding/
|   |-- overview/
|   |-- calibration/
|   |-- config-ai/
|   |-- knowledge/
|   |-- chat/
|   |-- leads/
|   |-- widget/
|   |-- radar/
|   |-- lumen-eye/
|   |-- research/
|   |-- growth/
|   |-- twin/
|   |-- campaigns/
|   |-- settings/
|   `-- health/
|-- states/
|-- social/
|-- marketing/
|-- email/
`-- mockups/
```

No se debe mover ningun archivo existente antes de:

1. Buscar su ruta completa y basename en codigo y documentos.
2. Confirmar imports dinamicos o referencias externas.
3. Migrar referencias.
4. Ejecutar build.
5. Verificar capturas.
6. Eliminar en un commit separado.

## 8. Convencion de nombres

```text
lumenai-[seccion]-[elemento]-[variante]-[version].[formato]
```

Reglas:

- Minusculas y guiones.
- Sin fechas salvo una razon editorial verificable.
- `v1`, `v2` para cambios visuales incompatibles.
- `desktop`, `tablet`, `mobile` solo si el encuadre cambia.
- `dark`, `light`, `mono`, `maskable` cuando son variantes reales.
- Capturas con viewport, por ejemplo `lumenai-calibration-screenshot-desktop-v1.webp`.
- Prohibidos `image1`, `final-final`, `new-logo` y `copy-2`.

## 9. Conteo de produccion

El conteo distingue **familias** de archivos de sus **variantes**.

| Categoria | Existentes auditados | Familias nuevas/corregidas | Variantes estimadas | P dominante |
|---|---:|---:|---:|---|
| Logo y marca digital | 12 | 6 | 31 | P0 |
| Motion de marca | 0 | 1 | 6 | P1 |
| Iconos UI Lucide | 124 imports brutos | 3 familias | 91 estados/acciones | P0 |
| Iconos propios de LumenAI | 0 como familia coherente | 1 | 18 x 2 estados | P1 |
| Landing | 1 usada | 6 | 21 | P0/P1 |
| Login y auth | 0 assets dedicados | 4 | 18 | P0 |
| Onboarding | 0 assets dedicados | 2 | 18 | P1 |
| Panel shell y estados | 2 fondos usados | 2 | 17 | P0 |
| Overview y Calibration | 11 ilustraciones legacy | 4 | 28 | P0/P1 |
| Modulos operativos e inteligencia | 5 fondos genericos | 12 | 118 iconos/estados | P0/P1 |
| Email | 0 | 1 sistema | 16 templates/fragmentos | P0 |
| Marketing y social | 0 | 3 packs | 51 piezas | P1 |
| Capturas reales | 0 biblioteca formal | 1 plan | 34 minimo | P1 |
| **Total estimado** | **50 visuales incluyendo favicon** | **46 familias** | **aprox. 449 variantes** | |

Este total no significa generar 449 imagenes. Aproximadamente 65% son iconos Lucide, componentes HTML, estados o capturas; no son archivos raster nuevos.

## 10. Prioridades resumidas

### P0 para produccion

1. Aprobar y vectorizar simbolo, wordmark y lockups.
2. Exportar favicon, Apple, PWA, maskable y pinned tab.
3. Completar metadata, OG, Twitter y manifest.
4. Sustituir verde neon del error global y tokens antiguos.
5. Aplicar logo final a landing, login, sidebar, Calibration, widget y email.
6. Unificar 404/500/offline/permisos/sesion vencida.
7. Mantener acciones comunes en Lucide.
8. Crear sistema base de email transaccional.
9. Capturar landing, login y overview reales.

### P1 para pilotos y presentacion

1. Pack de 18 iconos propios.
2. Visual dedicado del login en tres encuadres.
3. Capturas reales de los 17 recorridos.
4. OG y kit social inicial.
5. One-pager, pitch cover, ecosistema, roadmap y mockups.
6. Estados de onboarding, overview, widget y Calibration.
7. Sustituir ilustraciones con metricas o copy ficticio.

### P2 para marketing posterior

1. Consolidar fondos de modulos en CSS.
2. Crear casos por industria cuando exista copy validado.
3. Expandir flyers, carruseles y fondos de reunion.
4. Limpiar archivos legacy tras una migracion verificada.

### P3 opcional

1. Motion avanzado no funcional.
2. Fondos editoriales alternativos.
3. Piezas de eventos o campañas no programadas.

## 11. Reemplazar, consolidar y eliminar

### Deben reemplazarse

- `public/brand/logo.png`
- `public/brand/rlogo.png`
- `public/brand/lumenai-logo.svg`
- `public/brand/lumenai-brand-mark-wide.webp`
- `app/favicon.ico`
- Los WebP de Calibration con texto o numeros incrustados
- `public/brand/lumenai-empty-state.webp`
- El tratamiento verde de `app/global-error.tsx`

### Duplicados

- `public/brand/lumenai-hero-card.webp`
- `public/brand/lumenai-section-hero.webp`

Ambos poseen el mismo SHA-256:

```text
20919AC7ACE8539DBB69FD249E41A38D5E3397D047EDAB231CD272F9D9201D83
```

### Candidatos a eliminar despues de migrar

- `public/file.svg`
- `public/globe.svg`
- `public/next.svg`
- `public/vercel.svg`
- `public/window.svg`
- `public/backgrounds/*`
- `public/gems/*`
- Una de las dos copias hero duplicadas
- Rasters de logo anteriores

### No deben generarse como imagen

- KPIs, funnels, timelines, charts y espectros.
- Globo, mapa, nodos o actividad geografica.
- Conversaciones, leads y tablas.
- Diff, historial, rollback y progreso.
- Formularios, campos, botones y badges.
- Iconos cubiertos por Lucide.
- Screenshots de dashboards ficticios.
- Texto de flyers como parte de una imagen generada.

## 12. Primer paquete grafico recomendado

**Paquete 01: Brand and Trust Foundation**

| Orden | Entregable | Resultado |
|---:|---|---|
| 1 | Simbolo maestro SVG | Fuente unica de geometria |
| 2 | Wordmark y lockups | Marca consistente en producto y ventas |
| 3 | Guia de uso | Zona, minimo, color, fondo e impresion |
| 4 | Favicon/PWA/avatar | Identidad digital completa |
| 5 | Login visual desktop/tablet/mobile | Entrada de producto coherente con la referencia |
| 6 | OG home + OG login/demo | Compartir enlaces profesionalmente |
| 7 | Estado global 404/500/offline | Confianza en situaciones limite |
| 8 | Capturas reales landing/login/overview/calibration/widget | Base para marketing sin ficcion |

No debe producirse el paquete de flyers antes de aprobar los puntos 1-4 y disponer de las capturas del punto 8.

## 13. Criterio de cierre

La auditoria se considera ejecutable cuando cada nuevo recurso:

- Tiene propietario de diseño.
- Tiene estado y prioridad.
- Tiene medidas y formato.
- Tiene ruta y nombre final.
- Tiene alt text o se declara decorativo.
- Tiene origen: Lucide, SVG, CSS, captura, imagen o editorial.
- No muestra marcas de terceros sin autorizacion.
- No contiene datos, testimonios o resultados inventados.
- Se comprueba en modo oscuro, claro cuando aplique, mobile y reduced motion.
- Se integra y verifica antes de eliminar su antecedente.
