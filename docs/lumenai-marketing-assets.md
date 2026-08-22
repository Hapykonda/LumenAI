# Plan maestro de activos comerciales de LumenAI

Version: 1.0
Fecha: 23 de julio de 2026
Estado actual: no existe un kit comercial versionado dentro del repositorio.

## 1. Principios

1. La marca se aprueba antes de producir campañas.
2. Los dashboards de producto se capturan desde LumenAI; no se generan con IA.
3. El texto, logo, CTA, precio y disclaimer se componen editorialmente.
4. La generacion de imagen solo produce fondos o sujetos sin texto.
5. No se inventan empresas, testimonios, clientes, metricas, premios ni resultados.
6. Todo asset tiene un master editable y una exportacion optimizada.
7. Los archivos finales siguen:

```text
lumenai-[canal]-[campaña]-[tema]-[proporcion]-v1.[formato]
```

## 2. Fuentes de dimensiones verificadas

Las medidas de plataformas cambian. Esta especificacion se reviso contra documentacion oficial en julio de 2026:

- [Facebook Help: Page profile and cover dimensions](https://www.facebook.com/help/125379114252045/)
- [LinkedIn Help: Page image specifications](https://www.linkedin.com/help/learning/answer/a563309)
- [X Help: profile and header sizes](https://help.x.com/en/managing-your-account/common-issues-when-uploading-profile-photo)
- [YouTube Help: channel banner guidance](https://support.google.com/youtube/answer/10456525/change-your-youtube-channel-name-and-profile-picture-computer?co=GENIE.Platform%3DAndroid&hl=en-ES)

Antes de cada campaña pagada se debe confirmar la especificacion dentro del administrador de anuncios del canal.

## 3. Matriz de redes sociales

| ID | Canal / pieza | Master de produccion | Proporcion | Formato | Zona segura | Estado | P | Archivo sugerido |
|---|---|---:|---:|---|---|---|---|---|
| SOC-IG-01 | Instagram post | 1080x1080 | 1:1 | PNG/JPG | 96 px perimetro | Falta | P1 | `lumenai-instagram-launch-square-v1.png` |
| SOC-IG-02 | Instagram portrait | 1080x1350 | 4:5 | PNG/JPG | 96 px lateral, 120 px vertical | Falta | P1 | `lumenai-instagram-launch-portrait-v1.png` |
| SOC-IG-03 | Instagram Story | 1080x1920 | 9:16 | PNG/JPG/MP4 | Centro 1080x1420; evitar 250 px arriba/abajo | Falta | P1 | `lumenai-instagram-launch-story-v1.png` |
| SOC-IG-04 | Instagram Reel cover | 1080x1920 | 9:16 | PNG/JPG | Titulo central seguro para recorte de grid | Falta | P1 | `lumenai-instagram-reel-cover-v1.png` |
| SOC-FB-01 | Facebook post/link | 1200x630 | 1.91:1 | PNG/JPG | Centro, poco texto | Falta | P1 | `lumenai-facebook-launch-post-v1.png` |
| SOC-FB-02 | Facebook Page cover | 1640x624 master; export 851x315 | 2.63:1 | JPG sRGB/PNG | Evitar lateral izquierdo; revisar recorte 16:9 | Falta | P1 | `lumenai-facebook-company-cover-v1.jpg` |
| SOC-LI-01 | LinkedIn post con URL | 1200x627 | 1.91:1 | PNG/JPG | 72 px perimetro | Falta | P1 | `lumenai-linkedin-launch-post-v1.png` |
| SOC-LI-02 | LinkedIn Company banner | 4200x700 | 6:1 | JPG/PNG, max 3 MB | Centro; evitar bordes y esquina inferior derecha | Falta | P1 | `lumenai-linkedin-company-banner-v1.jpg` |
| SOC-X-01 | X post | 1600x900 | 16:9 | PNG/JPG | 80 px perimetro | Falta | P1 | `lumenai-x-launch-post-v1.png` |
| SOC-X-02 | X header | 1500x500 | 3:1 | PNG/JPG | Evitar 60 px arriba/abajo y zona de avatar | Falta | P1 | `lumenai-x-header-v1.png` |
| SOC-YT-01 | YouTube thumbnail | 1280x720 | 16:9 | JPG/PNG, <2 MB recomendado | Rostro/producto y titulo en centro | Falta | P1 | `lumenai-youtube-product-demo-thumbnail-v1.jpg` |
| SOC-YT-02 | YouTube banner | 2560x1440 | 16:9 | JPG/PNG, <=6 MB | 1235x338 centrado al usar minimo; master center-safe | Falta | P1 | `lumenai-youtube-channel-banner-v1.jpg` |
| SOC-TT-01 | TikTok cover | 1080x1920 | 9:16 | PNG/JPG | Contenido central; validar recorte de perfil | Falta | P2 | `lumenai-tiktok-demo-cover-v1.png` |

### Variantes de cada master

- `dark`: variante principal Obsidian.
- `light`: solo cuando el canal o documento requiera fondo claro.
- `no-copy`: fondo/sujeto sin texto para reutilizar.
- `es`: copy español.
- `en`: solo despues de aprobar traduccion profesional.

## 4. Arquitectura de campaña de lanzamiento

### Fase 1: explicar el producto

| ID | Pieza | Mensaje | Visual principal | Formatos | P |
|---|---|---|---|---|---|
| LCH-01 | Flyer de lanzamiento | LumenAI ya esta disponible para pilotos | Logo + captura real overview | 1:1, 4:5, 9:16, 1.91:1 | P1 |
| LCH-02 | Que es LumenAI | Sistema de ventas y soporte, no solo chatbot | Ecosistema de modulos | 4:5, carrusel, PDF | P1 |
| LCH-03 | Beneficios | Atencion, memoria, leads y control | Cuatro beneficios con iconos | 4:5, 9:16 | P1 |
| LCH-04 | Modulos | Vista del sistema conectado | Capturas reales de seis modulos | Carrusel, 16:9 | P1 |
| LCH-05 | Atencion 24/7 | Disponibilidad del widget con limites claros | Widget real + estado online | 4:5, 9:16 | P1 |
| LCH-06 | Captacion de leads | Conversacion a oportunidad trazable | Flujo SVG | 4:5, 1.91:1 | P1 |

### Fase 2: diferenciales

| ID | Pieza | Mensaje | Visual principal | Formatos | P |
|---|---|---|---|---|---|
| LCH-07 | Config IA | Cambios controlados con diff y rollback | Captura real | 4:5, 16:9 | P1 |
| LCH-08 | Lumen Eye | Contexto geografico agregado sin inventar actividad | Captura real del globo | 4:5, 16:9 | P1 |
| LCH-09 | Business Twin | Simular antes de ejecutar | Comparacion de escenarios real | 4:5, 16:9 | P1 |
| LCH-10 | Seguridad | Auth, RLS, almacenamiento y trazabilidad | Diagrama + captura Health | 4:5, PDF | P1 |
| LCH-11 | Calibration | Control del comportamiento del asistente | Captura del bento | 4:5, 16:9 | P1 |
| LCH-12 | Knowledge | Respuestas con memoria del negocio | Captura biblioteca | 4:5, 16:9 | P1 |

### Fase 3: conversion

| ID | Pieza | Mensaje | Visual principal | Formatos | P |
|---|---|---|---|---|---|
| LCH-13 | Precios | Planes reales aprobados | Tabla editorial, nunca imagen generada | 4:5, PDF, web | P0 cuando existan precios |
| LCH-14 | Demo | Reserva o solicita acceso | Captura real + CTA | 1:1, 4:5, 9:16 | P1 |
| LCH-15 | Contacto | Canal comercial verificable | Logo, URL y QR | 1:1, firma, A4 | P1 |
| LCH-16 | Registro | Crear acceso seguro | Login real | 1.91:1, 4:5 | P1 |
| LCH-17 | Lista de espera | Captura de interes | Login/landing, solo si existe flujo real | 1.91:1, 4:5 | P2 |
| LCH-18 | Pilotos | Convocatoria con condiciones claras | Producto + criterios | 4:5, PDF | P1 |
| LCH-19 | Story con CTA | Mensaje breve de demo | Producto en mobile | 9:16 | P1 |
| LCH-20 | Carrusel Instagram | Problema, sistema, flujo, modulos, CTA | 7-9 slides | 1080x1350 | P1 |

## 5. Carrusel maestro de Instagram

| Slide | Contenido | Visual | Restriccion |
|---:|---|---|---|
| 1 | `LumenAI` + categoria literal | Logo y producto real | No promesa grandilocuente |
| 2 | Problema operativo | Conversaciones dispersas | Sin cifras inventadas |
| 3 | Sistema conectado | Diagrama de modulos | SVG, no dashboard IA |
| 4 | Widget y Chat | Captura real | Anonimizar contactos |
| 5 | Knowledge y Calibration | Capturas reales | Sin datos sensibles |
| 6 | Leads y Growth | Captura real | Demo rotulada |
| 7 | Config IA y rollback | Diff real | No mostrar secretos |
| 8 | Seguridad y control | System Health | Redactar variables |
| 9 | CTA | Solicitar demo/piloto | URL y QR verificables |

## 6. Ventas e inversion

| ID | Activo | Medida / formato | Contenido minimo | Estado | P |
|---|---|---|---|---|---|
| SAL-01 | One-pager | A4, PDF | Problema, solucion, modulos, flujo, piloto, contacto | Falta | P1 |
| SAL-02 | Portada pitch deck | 1920x1080, PPTX/PDF | Logo, categoria, fecha, contacto | Falta | P1 |
| SAL-03 | Diagrama ecosistema | 1920x1080, SVG | Widget, Knowledge, Calibration, operaciones e inteligencia | Falta | P1 |
| SAL-04 | Roadmap visual | 1920x1080, SVG | Entregado, piloto, integraciones, escala | Falta | P1 |
| SAL-05 | Business model | 1920x1080, SVG | Segmentos, propuesta, ingresos y costes aprobados | Falta | P1 |
| SAL-06 | Comparativa competitiva | 1920x1080, tabla | Criterios verificables y fuentes | Falta | P1 |
| SAL-07 | Mockup panel | 2400x1600, WebP/PNG | Captura real en dispositivo sobrio | Falta | P1 |
| SAL-08 | Mockup widget | 1600x1200, WebP/PNG | Widget real desktop/mobile | Falta | P1 |
| SAL-09 | Hoja de precios | A4/PDF + web | Planes, limites, impuestos y CTA | Bloqueada por pricing | P0 |
| SAL-10 | Caso de uso | A4/PDF | Contexto, flujo, configuracion y resultado esperado | Falta | P1 |
| SAL-11 | Caso de exito | A4/PDF | Cliente autorizado, metodologia, resultados y cita aprobada | No crear sin evidencia | P3 |
| SAL-12 | Propuesta comercial | A4/PDF/DOCX | Alcance, entregables, calendario, precio, terminos | Falta | P1 |
| SAL-13 | Firma de email | 600x160 max, HTML | Nombre, rol, logo, URL, contacto | Falta | P1 |
| SAL-14 | Banner de presentacion | 1920x480, PNG | Marca y categoria | Falta | P2 |
| SAL-15 | Fondo de reuniones | 1920x1080, PNG/JPG | Marca discreta y espacio libre | Falta | P2 |
| SAL-16 | QR hacia demo | SVG + PNG 1024 | URL de demo verificable y fallback textual | Falta | P1 |

### Estructura recomendada del pitch deck

1. LumenAI, categoria y vision.
2. Problema operacional.
3. Solucion y flujo.
4. Producto real.
5. Modulos.
6. Caso de uso.
7. Seguridad y gobernanza.
8. Modelo comercial.
9. Roadmap.
10. Piloto y CTA.

La diapositiva de traccion solo se incorpora cuando existan cifras trazables.

## 7. Material de producto para landing y demos

| ID | Activo | Resolucion | Origen | Uso |
|---|---|---:|---|---|
| PRD-01 | Landing hero | 1600x1000 | Captura/composicion real | Primer viewport |
| PRD-02 | Panel overview | 1440x900 | Captura autenticada | Landing y pitch |
| PRD-03 | Widget desktop | 1440x900 | Captura real | Landing |
| PRD-04 | Widget mobile | 390x844 | Captura real | Landing y social |
| PRD-05 | Calibration | 1440x900 | Captura real | Landing y pitch |
| PRD-06 | Config IA diff | 1440x900 | Captura real | Pitch |
| PRD-07 | Knowledge | 1440x900 | Captura real | Landing |
| PRD-08 | Lead pipeline | 1440x900 | Captura real | Landing y ventas |
| PRD-09 | Lumen Eye | 1440x900 | Captura real | Pitch |
| PRD-10 | System Health | 1440x900 | Captura redactada | Seguridad |

## 8. Emails y notificaciones

No existe una carpeta ni una dependencia de envio/template de email en el repositorio. Primero se define el sistema, despues se integra un proveedor.

| ID | Template | Objetivo | CTA | Visual | P |
|---|---|---|---|---|---|
| EML-01 | Magic Link | Entrar de forma segura | Abrir LumenAI | Logo + escudo Lucide | P0 |
| EML-02 | OTP | Verificar codigo | Copiar codigo | Codigo HTML grande | P0 |
| EML-03 | Recuperacion | Cambiar password | Recuperar acceso | Logo + KeyRound | P0 |
| EML-04 | Bienvenida | Confirmar alta | Configurar negocio | Logo + pasos | P1 |
| EML-05 | Invitacion | Unirse al workspace | Aceptar invitacion | Avatar workspace | P1 |
| EML-06 | Lead nuevo | Avisar oportunidad | Abrir lead | Score y fuente por HTML | P1 |
| EML-07 | Solicitud humana | Atender takeover | Abrir chat | Hand/Headset | P0 |
| EML-08 | Alerta critica | Informar incidente | Abrir Health | ShieldAlert | P0 |
| EML-09 | Reporte semanal | Resumir actividad | Abrir Overview | KPIs HTML | P1 |
| EML-10 | Publicacion correcta | Confirmar calibracion | Ver version | BadgeCheck | P1 |
| EML-11 | Integracion fallida | Pedir reparacion | Revisar Settings | Unplug | P0 |
| EML-12 | Sesion / seguridad | Avisar evento sensible | Revisar cuenta | ShieldCheck | P0 |

### Componentes de email

- Header de 600 px.
- Logo de 120-160 px.
- Preheader accesible.
- Boton primario HTML.
- Bloque de codigo OTP seleccionable.
- Footer legal.
- Firma.
- Iconos sociales solo para perfiles existentes.
- Modo oscuro progresivo; nunca texto blanco horneado en una imagen.

## 9. Mockups y capturas

### Flujo de produccion

1. Preparar cuenta `demo` con datos ficticios aprobados.
2. Desactivar PII y secretos.
3. Fijar viewport, escala 100% y zona horaria.
4. Capturar PNG sin compresion.
5. Recortar sin ocultar navegacion relevante.
6. Exportar WebP/AVIF para web.
7. Conservar master PNG fuera del bundle si pesa demasiado.
8. Versionar cuando cambie significativamente la UI.

### No hacer

- No generar dashboards mediante IA.
- No insertar cifras de ventas no verificadas.
- No usar logos de clientes sin permiso.
- No superponer marcos de dispositivo que oculten la interfaz.
- No mostrar tokens, emails reales, telefonos, prompts privados o coordenadas personales.

## 10. Sistema editorial

| Elemento | Regla |
|---|---|
| Titular | 6-10 palabras, literal y verificable |
| Subtitulo | Una propuesta concreta |
| CTA | Una accion |
| Logo | Lockup aprobado, sin glow |
| Color | Obsidian + cian/azul; violeta secundario |
| Cards | Radio <=8 px cuando sean UI |
| Captura | Debe ser el foco, no un adorno pequeño |
| Iconos | Lucide o familia propia aprobada |
| Tipografia | Misma familia que el producto o fuente comercial aprobada |
| Datos | Reales o claramente rotulados como demostracion |

## 11. Orden de produccion

### Sprint comercial 01

1. Logo y lockups finales.
2. Avatar y banners de perfiles.
3. Capturas PRD-01 a PRD-05.
4. LCH-01, LCH-02, LCH-06 y LCH-14.
5. One-pager.
6. Portada y diagrama del pitch deck.
7. Firma de email.

### Sprint comercial 02

1. Capturas PRD-06 a PRD-10.
2. Carrusel de nueve slides.
3. Flyers de diferenciales.
4. Deck completo.
5. Propuesta comercial y caso de uso.

### Sprint comercial 03

1. Variantes por industria.
2. YouTube/TikTok.
3. Fondo de reuniones.
4. Caso de exito solo con evidencia.

## 12. Checklist de aprobacion

- [ ] Logo aprobado.
- [ ] Copy aprobado.
- [ ] CTA y URL funcionales.
- [ ] Datos y claims verificados.
- [ ] Sin marcas de terceros no autorizadas.
- [ ] Contraste revisado.
- [ ] Zona segura revisada en mobile.
- [ ] Peso optimizado.
- [ ] Alt text redactado.
- [ ] Master editable archivado.
- [ ] Nombre y version correctos.
- [ ] Fecha de revision de especificacion del canal registrada.
