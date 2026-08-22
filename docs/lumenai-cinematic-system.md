# LumenAI Cinematic System

## 1. Objetivo

El motion de LumenAI explica cambios de estado. No adorna procesos ni retrasa respuestas reales. La interfaz permanece sobria, oscura y empresarial.

## 2. Vocabulario

| Nombre | Significado | Implementación base |
| --- | --- | --- |
| Lumen Beam | Confirmación de análisis o ejecución | Trazo inferior durante estado activo |
| Signal Trace | Señal que avanza hacia una acción | `lmn-signal-trace` |
| Orbital Focus | Foco sobre un elemento importante | Contorno parcial, uso puntual |
| Starline Reveal | Entrada breve de marca | Logo y loading |
| Plan Assembly | Aparición progresiva de pasos | Timeline de Lumenite |
| Permission Lock | Espera de autorización | Borde warning sin loop |
| Execution Beam | Capacidad autorizada en curso | Barrido del panel de ejecución |
| Verification Sweep | Comprobación posterior | `lmn-verification-sweep` |
| Success Star | Resultado confirmado | `lmn-success-star`, una vez |
| Rollback Trace | Reversión verificada | `lmn-rollback-trace`, una vez |

## 3. Tiempos canónicos

| Interacción | Token | Duración |
| --- | --- | --- |
| Press | `--lmn-motion-press` | 100 ms |
| Hover | `--lmn-motion-hover` | 140 ms |
| Popover | `--lmn-motion-popover` | 190 ms |
| Panel | `--lmn-motion-panel` | 280 ms |
| Modal | `--lmn-motion-modal` | 300 ms |
| Ruta | `--lmn-motion-route` | 360 ms |
| Cinemática | `--lmn-motion-cinematic` | 900 ms |

## 4. Reglas

- Animar `transform` y `opacity` preferentemente.
- Un loop sólo puede existir mientras un proceso real está cargando, ejecutando, verificando o reconectando.
- Success y rollback se reproducen una vez.
- Approval pendiente usa contorno estático; no genera urgencia falsa.
- No hay partículas, fireflies, bokeh ni sonido automático.
- No se inventan porcentajes ni duraciones de backend.
- `prefers-reduced-motion` elimina trazos, barridos y giros.

## 5. Estados conectados

El componente `LumenSystemState` conecta la semántica de loading, offline, degraded, approval, executing, verifying, success, cancelled y reverted con icono, texto y motion. El color nunca es la única señal.

## 6. QA

- Confirmar que el estado anunciado coincide con la respuesta del servidor.
- Revisar ausencia de layout shift.
- Validar teclado y lector de pantalla durante actualizaciones.
- Medir que el motion no bloquee controles.
- Inspeccionar desktop y mobile con reduced motion activado y desactivado.

