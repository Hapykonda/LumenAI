# Prompts de generacion de imagen para LumenAI

Version: 1.0
Fecha: 23 de julio de 2026
Uso: ChatGPT Image Generation
Estado: prompts listos; no se han generado los archivos.

## 1. Alcance

Esta biblioteca solo incluye recursos raster que aportan valor editorial. No incluye:

- Logo, wordmark o iconos propios: deben ser SVG diseñados con geometria controlada.
- Iconos de acciones y estados: deben usar Lucide.
- Dashboards y capturas de producto: deben capturarse desde LumenAI.
- Mapas, globos, charts, funnels y timelines: deben renderizarse mediante codigo y datos reales.
- Flyers finales: el fondo puede generarse, pero copy, logo, CTA y precio se componen editorialmente.
- Emails completos: deben ser HTML.
- Estados comunes: deben ser HTML/CSS/Lucide.

## 2. Direccion visual comun

Incluir este bloque conceptual en todos los prompts:

```text
LumenAI Obsidian Intelligence OS, premium enterprise AI sales and support product, deep obsidian black #05070B, controlled cyan #00E5FF and electric blue #1B43FF, violet #6C3BFF used sparingly, precise angular geometry inspired by two ascending strokes, an angular L termination and a four-point star, restrained technical grain, high contrast, sophisticated B2B software identity, clean negative space, sharp edges, no excessive glow.
```

### Restricciones globales

```text
No readable text, no letters, no logos, no trademarks, no customer names, no testimonials, no prices, no fake metrics, no fake dashboard screenshots, no random activity nodes, no green neon, no orange/brown palette, no generic robot, no humanoid android, no stock-photo office team, no bokeh, no floating decorative orbs, no glass card UI, no watermarks, no third-party brand marks.
```

## 3. Login y autenticacion

### IMG-AUTH-01 - Visual principal desktop

Archivo: `public/graphics/auth/lumenai-login-visual-desktop-v1.avif`
Medida: 1600x1200 px
Proporcion: 4:3
Fondo: oscuro
Objetivo: ocupar el panel editorial izquierdo del login y transmitir acceso seguro, inteligencia disponible y continuidad operativa.

```text
Create a 1600 x 1200 desktop editorial background for the left side of the LumenAI login experience.

Type of resource: premium authentication hero background.
Section: login and authentication.
Objective: communicate a secure always-available AI sales and support workspace without depicting a literal dashboard.
Composition: a calm obsidian field with the brightest controlled cyan-blue intelligence texture concentrated in the lower-right third; keep the upper-left area dark and clean for a compact navigation lockup; keep the lower-left and center-left areas readable for a large headline and two lines of supporting copy. The composition may suggest a distant field of organized signals, but never show individual user markers or activity dots.
Subject: abstract machine intelligence represented by fine directional light, subtle depth and angular motion derived from two ascending strokes and an angular L termination. Do not draw the actual logo.
Palette: #05070B, #090D13, #00E5FF, #1B43FF and a restrained trace of #6C3BFF.
Materials: matte obsidian, fine technical grain, deep atmospheric blue, no glossy chrome.
Lighting: subtle volumetric cyan-blue light from the lower-right edge, soft falloff, high readability, no bloom around the entire frame.
Text space: preserve at least 42% clean negative space on the left and 22% at the top.
Aspect ratio: 4:3.
Final use: responsive split-screen login.
Avoid: readable text, logos, fake interfaces, glass panels, cards, people, robots, city skylines, particle storms, green neon, excessive glow, bokeh or lens flare.
Output filename: lumenai-login-visual-desktop-v1.avif.
```

### IMG-AUTH-02 - Visual tablet

Archivo: `public/graphics/auth/lumenai-login-visual-tablet-v1.avif`
Medida: 1536x1024 px
Proporcion: 3:2

```text
Create a 1536 x 1024 tablet crop companion to the LumenAI login visual.

Type: authentication background.
Section: login tablet.
Objective: preserve brand atmosphere behind or above a compact login form.
Composition: horizontally balanced obsidian scene; concentrated cyan-blue intelligence texture on the right 35%; center remains dark enough for UI overlap; no important feature within 120 px of any edge.
Subject: precise abstract directional signal, two ascending trajectories and a restrained four-point light event implied through illumination, not a logo.
Palette and materials: matte obsidian #05070B, cyan #00E5FF, blue #1B43FF, minimal violet, fine technical grain.
Lighting: low and controlled.
Text/UI space: center-left 55% clear.
Aspect ratio: 3:2.
Restrictions: no text, no logo, no dashboard, no people, no cards, no green, no random particles, no excessive glow.
Output filename: lumenai-login-visual-tablet-v1.avif.
```

### IMG-AUTH-03 - Visual mobile

Archivo: `public/graphics/auth/lumenai-login-visual-mobile-v1.avif`
Medida: 1080x1920 px
Proporcion: 9:16

```text
Create a 1080 x 1920 mobile background for LumenAI authentication.

Type: vertical authentication background.
Objective: add a quiet brand signal behind the mobile login without competing with form controls.
Composition: mostly black upper 65%; a restrained cyan-blue directional light emerges from the lower-right corner and turns upward; preserve the center 70% with very low detail for form readability.
Subject: abstract enterprise AI signal based on two ascending strokes and an angular L trajectory, without reproducing a logo.
Palette: obsidian black, cyan and electric blue, violet under 8%.
Materials: matte, lightly textured, no reflective chrome.
Lighting: edge lighting only, no full-frame glow.
Text space: top-center and center completely calm.
Aspect ratio: 9:16.
Avoid: text, logo, faces, robots, interface cards, floating shapes, green neon, particles, bokeh, fake data.
Output filename: lumenai-login-visual-mobile-v1.avif.
```

## 4. Asistente y avatar

### IMG-AVATAR-01 - Avatar default del asistente

Archivo: `public/graphics/widget/lumenai-widget-avatar-default-v1.webp`
Medida: 1024x1024 px
Proporcion: 1:1
Fondo: oscuro, recorte circular seguro

```text
Create a 1024 x 1024 default avatar for a LumenAI sales and support assistant.

Type: product avatar.
Section: widget, onboarding and panel profile fallback.
Objective: provide a trustworthy branded default before the business owner uploads a custom photo.
Composition: centered abstract intelligence portrait with a generous circular safe area; simple enough to remain legible at 32 px; dark outer background; one clear focal mark.
Subject: non-human abstract assistant identity made from two upward precision lines converging toward a small four-point cyan light. It must feel capable and calm, not like a robot face.
Palette: #05070B, #00E5FF, #1B43FF, subtle white highlight, violet under 5%.
Materials: matte digital surface, crisp vector-like edges even though the output is raster.
Lighting: restrained central rim light.
Text space: none required.
Aspect ratio: 1:1.
Restrictions: no human face, no robot, no eyes, no helmet, no letters, no actual LumenAI logo, no text, no green, no heavy glow.
Output filename: lumenai-widget-avatar-default-v1.webp.
```

### IMG-AVATAR-02 - Avatar social background

Archivo: `public/brand/lumenai-avatar-social-background-v1.webp`
Medida: 1200x1200 px

```text
Create a 1200 x 1200 background plate for the official LumenAI social avatar.

Type: brand background plate; the approved vector logo will be added later.
Objective: provide depth behind the official symbol across social networks.
Composition: centered dark obsidian field, subtle angular cyan-blue light entering from bottom-left and exiting top-right, clean central 60% for a vector logo overlay.
Palette: #05070B, #00E5FF, #1B43FF, minimal violet.
Materials: matte obsidian with fine technical grain.
Lighting: restrained edge light.
Aspect ratio: 1:1.
Avoid: any logo, letters, text, icons, particles, bokeh, green neon, bright corners that reduce logo contrast.
Output filename: lumenai-avatar-social-background-v1.webp.
```

## 5. Landing y seguridad

### IMG-SEC-01 - Seguridad y privacidad

Archivo: `public/graphics/landing/lumenai-landing-security-v1.avif`
Medida: 1600x1000 px
Proporcion: 8:5

```text
Create a 1600 x 1000 premium security and privacy illustration for LumenAI.

Type: landing section illustration.
Section: security, governance and system health.
Objective: communicate authentication, row-level data protection, controlled actions, redacted secrets and auditability without using a generic padlock hero.
Composition: an abstract protected core built from precise nested angular boundaries; three clean evidence paths enter, are validated and continue upward; right side contains the protected core, left 42% remains clean for HTML copy.
Subject: controlled data boundaries, audit trail and permission layers expressed as architectural lines and matte surfaces.
Palette: obsidian #05070B, cyan #00E5FF, blue #1B43FF, white highlights, violet under 6%; amber only as a tiny warning signal.
Materials: matte graphite, etched technical lines, no glass.
Lighting: controlled cyan rim light, subtle and directional.
Text space: left 42%.
Aspect ratio: 8:5.
Restrictions: no readable text, no literal dashboard, no customer data, no keys, no code snippets, no generic oversized padlock, no green neon, no third-party logos.
Output filename: lumenai-landing-security-v1.avif.
```

### IMG-LAND-01 - Fondo de modulos

Archivo: `public/graphics/landing/lumenai-landing-modules-background-v1.avif`
Medida: 1920x1080 px

```text
Create a 1920 x 1080 background for the LumenAI modules section.

Type: section background behind real product cards.
Objective: unify multiple real module screenshots without competing with them.
Composition: nearly black field; subtle technical banding and two restrained angular blue-cyan traces at the far left and far right; center 75% low contrast and detail-free.
Subject: invisible connected intelligence infrastructure, not a UI.
Palette: #05070B, #090D13, #00E5FF at low opacity, #1B43FF, violet under 4%.
Materials: matte obsidian, fine grain.
Lighting: minimal edge light.
Text space: center and upper-left.
Aspect ratio: 16:9.
Restrictions: no cards, no text, no diagrams, no logos, no glowing blobs, no particles, no green.
Output filename: lumenai-landing-modules-background-v1.avif.
```

### IMG-LAND-02 - Fondo CTA final

Archivo: `public/graphics/landing/lumenai-landing-cta-background-v1.avif`
Medida: 1920x960 px
Proporcion: 2:1

```text
Create a 1920 x 960 final call-to-action background for LumenAI.

Type: landing CTA background.
Objective: end the page with confidence and forward direction while leaving all copy and buttons as HTML.
Composition: deep obsidian stage; two clean ascending cyan-blue paths begin outside the lower-left frame and converge near a small four-point light in the upper-right third; leave the center-left 55% clean.
Subject: controlled progress from conversation to opportunity, expressed abstractly.
Palette: black, cyan, electric blue, restrained violet.
Materials: matte, lightly textured, crisp.
Lighting: focused on one destination point; no overall bloom.
Text space: left-center 55%.
Aspect ratio: 2:1.
Restrictions: no logo, text, buttons, cards, dashboards, people, robots, random particles, green neon.
Output filename: lumenai-landing-cta-background-v1.avif.
```

## 6. Onboarding

### IMG-ONB-01 - Finalizacion

Archivo: `public/graphics/onboarding/lumenai-onboarding-complete-v1.webp`
Medida: 1200x900 px
Proporcion: 4:3

```text
Create a 1200 x 900 completion illustration for LumenAI onboarding.

Type: restrained product completion visual.
Section: onboarding final step.
Objective: communicate that business identity, knowledge, assistant behavior and widget are connected and ready for review.
Composition: four abstract modules represented by simple matte planes converge into one precise upward cyan signal; keep the left 40% clean for title and CTA; no interface screenshot.
Subject: connected configuration becoming one operational assistant.
Palette: #05070B, cyan, blue and minimal violet.
Materials: matte obsidian, etched lines, no glass cards.
Lighting: a single controlled success highlight.
Text space: left 40%.
Aspect ratio: 4:3.
Restrictions: no text, no checkmark baked into the art, no fireworks, no confetti, no people, no robots, no green, no fake dashboard.
Output filename: lumenai-onboarding-complete-v1.webp.
```

## 7. Estados editoriales

Los estados 404, 500, offline, sin permisos y cuenta suspendida deben construirse principalmente con HTML y SVG. Si se decide usar raster, solo se generan dos fondos reutilizables.

### IMG-STATE-01 - Estado de interrupcion

Archivo: `public/states/lumenai-state-interruption-background-v1.webp`
Medida: 1200x900 px

```text
Create a 1200 x 900 reusable background for LumenAI interruption states such as maintenance, offline or temporary failure.

Type: global state background.
Objective: suggest a paused signal without implying data loss or catastrophe.
Composition: almost black field; one precise cyan-blue path stops before a small gap and resumes faintly beyond it; keep center-left clear for HTML title, explanation and retry action.
Palette: obsidian, muted cyan, deep blue, neutral gray; no red unless added by UI.
Materials: matte and minimal.
Lighting: low.
Text space: left-center 55%.
Aspect ratio: 4:3.
Restrictions: no text, no error codes, no icons, no broken robot, no dramatic explosion, no green, no cards.
Output filename: lumenai-state-interruption-background-v1.webp.
```

### IMG-STATE-02 - Acceso restringido

Archivo: `public/states/lumenai-state-access-restricted-background-v1.webp`
Medida: 1200x900 px

```text
Create a 1200 x 900 reusable background for LumenAI restricted-access states.

Type: account suspended or insufficient permissions state background.
Objective: communicate a controlled boundary, not punishment.
Composition: dark architectural boundary with one clear route ending at a precise closed gate on the right; left half remains empty for explanation and support CTA.
Palette: obsidian, muted blue, restrained cyan, a tiny neutral amber detail.
Materials: matte graphite, clean technical lines.
Lighting: subtle edge light.
Text space: left 50%.
Aspect ratio: 4:3.
Restrictions: no padlock icon, no police imagery, no people, no text, no red alarm glow, no green neon.
Output filename: lumenai-state-access-restricted-background-v1.webp.
```

## 8. Fondos comerciales sin texto

Estos fondos no son piezas finales. Diseño debe añadir logo, copy, captura, CTA y disclaimers.

### IMG-MKT-01 - Lanzamiento

Archivo: `public/marketing/lumenai-launch-background-portrait-v1.webp`
Medida: 1080x1350 px
Proporcion: 4:5

```text
Create a 1080 x 1350 no-copy campaign background for the launch of LumenAI.

Type: editorial marketing background.
Objective: support a launch headline, product screenshot and CTA added later by a designer.
Composition: deep obsidian background; precise cyan-blue ascending geometry anchored to the lower-right; clear upper-left 48% for headline; clear lower-left strip for CTA; central-right space for a real product screenshot overlay.
Subject: forward operational intelligence, expressed abstractly.
Palette: #05070B, #00E5FF, #1B43FF, #6C3BFF under 10%.
Materials: matte, technical grain.
Lighting: restrained edge light.
Text space: upper-left and lower-left.
Aspect ratio: 4:5.
Restrictions: no text, logo, mockup, dashboard, people, robots, particles, green, excessive glow.
Output filename: lumenai-launch-background-portrait-v1.webp.
```

### IMG-MKT-02 - Lanzamiento story/reel

Archivo: `public/marketing/lumenai-launch-background-story-v1.webp`
Medida: 1080x1920 px

```text
Create a 1080 x 1920 no-copy vertical launch background for LumenAI stories and reel covers.

Type: social marketing background.
Objective: leave safe space for a short headline, real mobile product screenshot and CTA.
Composition: black upper third with quiet cyan edge; product-safe opening in middle; strong but controlled ascending blue geometry in lower third; keep 250 px top and bottom free of critical details.
Palette and materials: LumenAI Obsidian palette, matte, precise.
Lighting: one directional cyan-blue source.
Text space: upper-center and bottom-center safe areas.
Aspect ratio: 9:16.
Restrictions: no text, logo, UI, people, particles, bokeh, green neon, overexposure.
Output filename: lumenai-launch-background-story-v1.webp.
```

### IMG-MKT-03 - Modulos

Archivo: `public/marketing/lumenai-modules-background-portrait-v1.webp`
Medida: 1080x1350 px

```text
Create a 1080 x 1350 no-copy editorial background for presenting LumenAI modules.

Type: marketing carousel background.
Objective: hold a grid of real product captures and module icons added later.
Composition: obsidian canvas with a very subtle structural grid; six quiet anchor zones suggested only by lighting, not cards; headline-safe area at top 25%; bottom area clean for pagination or CTA.
Palette: black, cyan and electric blue with minimal violet.
Materials: matte technical surface.
Lighting: low, evenly controlled.
Text space: top and bottom.
Aspect ratio: 4:5.
Restrictions: no cards, no icons, no text, no dashboards, no random nodes, no green, no excessive glow.
Output filename: lumenai-modules-background-portrait-v1.webp.
```

### IMG-MKT-04 - Seguridad comercial

Archivo: `public/marketing/lumenai-security-background-portrait-v1.webp`
Medida: 1080x1350 px

```text
Create a 1080 x 1350 no-copy editorial background for a LumenAI security campaign.

Type: social and sales background.
Objective: support verified security claims and a real System Health screenshot.
Composition: protected angular core in lower-right; three evidence paths; dark clean upper-left for headline; center clear for screenshot.
Palette: obsidian, cyan, blue, neutral white, tiny amber accent.
Materials: matte graphite and etched lines.
Lighting: controlled.
Text space: upper-left and lower-left.
Aspect ratio: 4:5.
Restrictions: no text, no padlock, no secrets, no code, no fake compliance badges, no green neon, no third-party logos.
Output filename: lumenai-security-background-portrait-v1.webp.
```

### IMG-MKT-05 - Demo / piloto

Archivo: `public/marketing/lumenai-demo-background-landscape-v1.webp`
Medida: 1200x630 px

```text
Create a 1200 x 630 no-copy background for a LumenAI demo or pilot invitation.

Type: link preview and campaign background.
Objective: frame a real product capture and a concise CTA.
Composition: dark left 45% for headline and CTA; right 50% prepared for a real product screenshot; one restrained cyan-blue ascending line connects both areas.
Palette: Obsidian, cyan, blue, minimal violet.
Materials: matte and precise.
Lighting: subtle.
Text space: left 45%.
Aspect ratio: 1.91:1.
Restrictions: no text, no logos, no dashboard, no people, no mock device, no particles, no green.
Output filename: lumenai-demo-background-landscape-v1.webp.
```

### IMG-MKT-06 - Precios

Archivo: `public/marketing/lumenai-pricing-background-portrait-v1.webp`
Medida: 1080x1350 px

```text
Create a 1080 x 1350 subtle no-copy background for an editorial LumenAI pricing sheet.

Type: pricing campaign background.
Objective: support a real pricing table added in design software without reducing readability.
Composition: 82% nearly flat obsidian; one thin cyan-blue angular accent along the right edge; top 20% clear for title; center entirely quiet for pricing cards.
Palette: #05070B, low-opacity cyan and blue.
Materials: matte, almost flat.
Lighting: minimal edge light.
Text space: entire center.
Aspect ratio: 4:5.
Restrictions: no text, no numbers, no currency, no cards, no badges, no green, no decorative blobs.
Output filename: lumenai-pricing-background-portrait-v1.webp.
```

## 9. Reuniones y presentaciones

### IMG-MTG-01 - Fondo para reuniones

Archivo: `public/marketing/lumenai-meeting-background-v1.webp`
Medida: 1920x1080 px

```text
Create a 1920 x 1080 professional video-meeting background for LumenAI.

Type: branded meeting background plate.
Objective: provide a quiet premium environment where a person remains clearly visible; the approved logo will be added later.
Composition: dark obsidian wall-like field; subtle cyan-blue angular light at far right; clean central 65% for a speaker; bottom-left safe space for a small vector lockup; no fake room or furniture.
Palette: obsidian, cyan, blue, minimal violet.
Materials: matte acoustic surface, very fine grain.
Lighting: soft and even, no bright halo behind the speaker.
Text space: bottom-left only.
Aspect ratio: 16:9.
Restrictions: no logo, text, office furniture, windows, city, people, particles, bokeh, green neon.
Output filename: lumenai-meeting-background-v1.webp.
```

### IMG-DECK-01 - Portada de pitch

Archivo: `public/marketing/lumenai-pitch-cover-background-v1.webp`
Medida: 1920x1080 px

```text
Create a 1920 x 1080 no-copy pitch deck cover background for LumenAI.

Type: investor and sales presentation cover.
Objective: support the approved logo, product category, date and presenter details added later.
Composition: confident obsidian stage; two ascending cyan-blue precision lines emerge from bottom-left and terminate near a restrained four-point light in upper-right; left-center 55% clean for title; no UI.
Palette: #05070B, #00E5FF, #1B43FF, #6C3BFF under 8%.
Materials: matte graphite, technical grain.
Lighting: sharp directional edge light, no bloom.
Text space: left-center 55%.
Aspect ratio: 16:9.
Restrictions: no text, letters, logo, dashboard, people, robots, particles, green.
Output filename: lumenai-pitch-cover-background-v1.webp.
```

## 10. Headers digitales

### IMG-HDR-01 - LinkedIn Company

Archivo: `public/social/lumenai-linkedin-company-banner-background-v1.webp`
Medida: 4200x700 px

```text
Create a 4200 x 700 no-copy background for the LumenAI LinkedIn Company Page.

Type: ultra-wide company banner.
Objective: support the approved wordmark and a short category statement added later.
Composition: center-safe obsidian field; restrained cyan-blue ascending geometry on far right; left 48% and central vertical band clean; avoid details near edges and lower-right.
Palette and materials: LumenAI Obsidian, matte.
Lighting: low and controlled.
Text space: left-center.
Aspect ratio: 6:1.
Restrictions: no text, logo, people, UI, particles, green, excessive glow.
Output filename: lumenai-linkedin-company-banner-background-v1.webp.
```

### IMG-HDR-02 - X header

Archivo: `public/social/lumenai-x-header-background-v1.webp`
Medida: 1500x500 px

```text
Create a 1500 x 500 no-copy X profile header background for LumenAI.

Type: social header.
Objective: frame the approved wordmark while tolerating top and bottom cropping.
Composition: quiet center band; cyan-blue geometry confined to the right third; left-bottom area remains calm because the profile avatar may overlap; no critical details within 60 px of top or bottom.
Palette: Obsidian, cyan, blue, minimal violet.
Materials: matte technical grain.
Lighting: restrained.
Text space: center-left.
Aspect ratio: 3:1.
Restrictions: no text, logo, people, UI, green, particles or bright border.
Output filename: lumenai-x-header-background-v1.webp.
```

### IMG-HDR-03 - YouTube banner

Archivo: `public/social/lumenai-youtube-banner-background-v1.webp`
Medida: 2560x1440 px

```text
Create a 2560 x 1440 no-copy YouTube channel banner background for LumenAI.

Type: multi-device channel banner.
Objective: support an approved centered lockup and category line within the safe area.
Composition: detailed but restrained cyan-blue brand geometry only in the television outer area; central 1235 x 338 area remains dark, calm and high contrast; no important detail near edges.
Palette: Obsidian, cyan, blue and minimal violet.
Materials: matte and precise.
Lighting: edge-focused.
Text space: exact central safe zone.
Aspect ratio: 16:9.
Restrictions: no text, logo, dashboard, people, robots, random particles, green.
Output filename: lumenai-youtube-banner-background-v1.webp.
```

## 11. Variantes por industria

No deben producirse hasta aprobar una industria, un mensaje y un caso de uso. La generacion solo aporta contexto secundario; el producto real sigue siendo protagonista.

### IMG-IND-BASE - Plantilla adaptable

Archivo base: `public/marketing/lumenai-industry-[industry]-background-v1.webp`
Medida: 1600x1000 px

```text
Create a 1600 x 1000 contextual background for a LumenAI [INDUSTRY] use case.

Type: industry marketing background.
Objective: provide subtle, truthful context for [INDUSTRY] while leaving room for a real LumenAI screenshot and verified copy.
Composition: [SPECIFIC REAL ENVIRONMENTAL CUE] occupies only the far-right 30%; left and center remain a clean obsidian field for product content; no people unless a documented campaign specifically requires them.
Subject: one recognizable but non-branded [INDUSTRY OBJECT OR ENVIRONMENT], treated abstractly and professionally.
Palette: LumenAI Obsidian with cyan and blue accents; preserve realistic material colors at low saturation.
Materials: matte, premium, real-world.
Lighting: restrained cyan-blue edge integration.
Text space: left 45%.
Aspect ratio: 8:5.
Restrictions: no text, logos, customer brands, uniforms with marks, fake metrics, medical claims, financial claims, people, robots, green neon or generic sci-fi interface.
Output filename: lumenai-industry-[industry]-background-v1.webp.
```

Variables permitidas inicialmente:

| Industria | Contexto permitido | Evitar |
|---|---|---|
| Servicios profesionales | Mesa limpia, documento y canal de consulta | Personas de stock y firmas legales falsas |
| Ecommerce | Paquete neutro y flujo de pedido | Marcas, precios o productos copiados |
| Educacion | Material de aprendizaje abstracto | Menores identificables y diplomas falsos |
| Salud privada | Entorno clinico abstracto y no diagnostico | Pacientes, anatomia, claims medicos |
| Inmobiliaria | Arquitectura neutra | Propiedades o logos de agencias reales |
| Agencias/consultoras | Brief y flujo de aprobacion | Logos de clientes y awards |

## 12. QA de cada imagen generada

| Control | Criterio |
|---|---|
| Marca | No dibuja ni deforma el logo |
| Paleta | Cian/azul principal; violeta secundario; sin verde neon |
| Texto | No contiene texto generado |
| Datos | No contiene numeros, charts ni dashboards ficticios |
| Terceros | No contiene logos o marcas |
| Composicion | Respeta zona de copy y recortes |
| Calidad | Sin artefactos, anatomias ni lineas rotas |
| Rendimiento | Export WebP/AVIF optimizado |
| Accesibilidad | Cuenta con alt text o se marca decorativa |
| Mobile | Existe crop dedicado cuando el foco cambia |
| Reduced motion | La pieza estatica no depende de una animacion |
| Nombre | Cumple convencion y version |

## 13. Orden de generacion recomendado

1. IMG-AUTH-01, IMG-AUTH-02 e IMG-AUTH-03.
2. IMG-AVATAR-01.
3. IMG-SEC-01.
4. IMG-LAND-01 e IMG-LAND-02.
5. IMG-STATE-01 e IMG-STATE-02.
6. IMG-MKT-01, IMG-MKT-02 e IMG-MKT-05.
7. IMG-DECK-01 e IMG-MTG-01.
8. Headers de redes.
9. Resto del pack comercial.
10. Industrias solo bajo brief aprobado.

Antes del paso 6 deben existir el logo final y las primeras capturas reales del producto.
