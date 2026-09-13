# LumenAI · Editorial release · 12 septiembre 2026

## Base recuperada

El equipo local estaba en `f4c9632`. Se recuperó `3350dae` de `origin/codex/lumenai-final` y se creó la rama `codex/lumenai-editorial-release`. Los commits `16e4e9e` y `60828b4`, mencionados en la conversación anterior, no estaban disponibles en el repositorio ni en los respaldos locales inspeccionados. Esta entrega continúa desde el código recuperable y la referencia visual de acceso aprobada.

## Cambios

- Acceso reconstruido con composición 54/46: imagen oscura y formulario blanco frío. Vista móvil apilada desde 800 px.
- Fondo corporativo de luz azul y marca blanca transparente integrados en los recursos del proyecto.
- Cabeceras compartidas de los once pilares con identidad editorial y operador seleccionado. Se retiraron cifras de muestra y etiquetas de actividad que no provenían de datos del negocio.
- Acceso directo a Access en la navegación principal.
- Portada y membresías con controles rectos, texto más legible y superficies sin desenfoque.
- Selección de Start, Business y Scale corregida; conserva compatibilidad con enlaces antiguos.
- Valores predeterminados de la interfaz actualizados; se conservan preferencias guardadas del usuario.
- Archivos de entorno, pruebas y evidencias excluidos del paquete de publicación.

## Especificación visual

| Elemento | Valor |
|---|---|
| Negro | `#05080D` |
| Blanco frío | `#F4F6F7` |
| Cobalto | `#1477FF` |
| Luz azul | `#72BAFF` |
| Navegación lateral | 210 px en escritorio |
| Barra superior | 78 px; 60 px en móvil |
| Margen del contenido | 28 px escritorio; 12 px móvil |
| Formularios | 52 px de alto; radio 2 px |
| Texto | 16 px cuerpo; 13–14 px controles; 10–12 px metadatos |
| Titulares del panel | 28–47 px; peso 500; interlineado 1.05 |
| Movimiento | Interacciones cortas; reducción de movimiento respetada |

## Validación

- Compilación de producción aprobada.
- TypeScript y ESLint aprobados.
- 57 pruebas aprobadas.
- Auditorías de accesibilidad y presupuesto de rendimiento sin hallazgos.
- Login observado en navegador a tamaño escritorio y 390 px. La selección de Business aparece en el formulario.
- Las pantallas protegidas requieren una sesión para validar su presentación con datos reales.
- Publicación no confirmada todavía: Vercel CLI no tenía sesión iniciada y el equipo conectado no tenía proyectos.
- La configuración local supera el contrato de entorno; faltan claves específicas de varios agentes y configuración de Gmail. Su disponibilidad real debe verificarse antes de declarar completo el servicio.

## Recursos visuales

### Ampliación del 13 de septiembre: operadores y banners

Se retiraron 33 fondos antiguos de `public/brand` y `public/brand/studio`; las 63 expresiones transparentes de los siete operadores se conservan. Todas las referencias del producto apuntan a los recursos nuevos.

| Recurso nuevo | Resolución real | Aplicación |
|---|---|---|
| `cobalt-folds.png` | 1983 × 793 px | Cabeceras de configuración, conocimiento, conversaciones, acceso y póster de planes |
| `signal-horizon.png` | 1672 × 941 px | Radar, investigación, Lumen Eye, guías y banners oscuros |
| `frosted-blue.png` | 1672 × 941 px | Superficies editoriales claras y vista previa de operadores |

Los fondos no contienen texto ni datos dibujados: la tipografía permanece en HTML. Next Image adapta las imágenes de contenido al dispositivo; los fondos CSS reutilizan los originales. Las imágenes no se describen como 4K porque las dimensiones entregadas por el generador son las indicadas arriba.

| Presencia | Tamaño de personaje | Regla |
|---|---|---|
| Cabecera de módulo | 152 px escritorio / 112 px móvil | Integrado sobre el fondo, separado del texto |
| Asistente flotante del panel | 68 px dentro de un botón de 76 px | Sin caja; indicador de salud pequeño y etiqueta al enfocar |
| Presentación interactiva | 240 px escritorio / 184 px móvil | Siete operadores, nueve expresiones, fondo claro u oscuro |
| Tutorial | 230 px, adaptado en móvil | Mismo horizonte de marca, sin retícula ni marcos decorativos |
| Widget público | 52 px | Se retira el marco del operador; el avatar personalizado conserva su tratamiento |

El estado de reposo no tiene animación continua. Celebración y alegría realizan dos movimientos de 3 px; se desactivan con la preferencia de movimiento reducido del sistema o del propietario. El nombre del operador seleccionado aparece también en la acción de consulta de cada cabecera.

Validación visual: componentes reales de las once cabeceras y el lanzador montados temporalmente sin datos empresariales, revisados a 390, 768 y 1440 px, sin desbordamiento horizontal ni personajes recortados. El montaje temporal se eliminó antes de publicar. Esto no equivale a una prueba autenticada con datos reales.

La portada permite comprobar las siete selecciones y nueve expresiones. Se comprobaron las siete selecciones en navegador, cambios de expresión y ambos fondos; sin errores de consola durante esa revisión. Los 63 recursos de expresiones están cubiertos por las pruebas existentes.

Dirección de los nuevos fondos: pliegues escultóricos cobalto sobre negro con espacio negativo a la izquierda; vidrio óptico vertical y luz azul sobre blanco frío; horizonte negro con un haz de luz azul contenido. Sin interfaces falsas, cifras, personas, marcas de agua ni texto integrado en las imágenes.

Generados con la herramienta integrada de imágenes:

- `public/brand/editorial/lumenai-light-ribbon.png`: luz orgánica azul y blanca sobre negro, composición 3:2 con espacio negativo para texto.
- `public/brand/editorial/lumenai-mark-transparent.png`: variante sin fondo del símbolo existente.

Prompt del fondo: “Near black #05080D background, flowing fine luminous silk ribbons of icy white #F4F6F7 and pale electric cobalt blue #72BAFF / #1477FF, elegant organic S curves around one tiny luminous white orb. Finely grained cinematic light, black negative space on the left. No text, logo, interface, watermark or border.”

Prompt de marca: “Isolate the existing white LumenAI logo onto a genuinely transparent background. Preserve the angular L and four-point star, remove black background and glow, crisp white edges, no redesign, no text or extra shapes.”
