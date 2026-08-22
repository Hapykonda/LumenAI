# Pulse Radar y Lumenite

## 1. Responsabilidades

Pulse Radar detecta y explica senales basadas en datos del negocio. Lumenite prepara, autoriza, ejecuta, verifica y revierte acciones. Pulse no ejecuta por su cuenta y Lumenite no puede declarar resuelta una senal sin un run persistido.

## 2. Deteccion persistente

Cada senal guarda:

- Negocio y clave estable del detector.
- Tipo, severidad, titulo y descripcion.
- Evidencia estructurada con las metricas usadas.
- Fuente y ruta de inspeccion.
- Periodo analizado y ultima actualizacion.
- Capacidad e input interno recomendados.
- Estado del lifecycle.
- Plan, run, error, verificacion y recibo asociados.
- Viewed, dismissed, snoozed y reverted con sus timestamps.

La tabla `lumenai_pulse_signals` permite lectura al miembro activo del tenant. Insert, update y delete desde el navegador estan revocados; las mutaciones pasan por una API autenticada y auditada.

## 3. Estados

`new`, `viewed`, `action_prepared`, `awaiting_approval`, `executing`, `resolved`, `partially_resolved`, `failed`, `reverted` y `dismissed`.

Snooze no inventa un estado adicional: conserva el estado visible y utiliza `snoozed_until`.

## 4. Handoff

1. Pulse persiste la senal y muestra evidencia.
2. El usuario selecciona Preparar con Lumenite.
3. El servidor recibe `signal_id`, recupera capacidad e input desde la base de datos y crea un plan idempotente.
4. Plan y run guardan el mismo `signal_id`.
5. Una politica de nivel 3 deja la senal `awaiting_approval`.
6. Ejecutar cambia Pulse a `executing`.
7. Solo una verificacion positiva produce `resolved`.
8. Un resultado parcial produce `partially_resolved`; un fallo produce `failed` con error.
9. Undo verificado produce `reverted` y conserva el recibo anterior.
10. Retry limpia los enlaces del intento cerrado, incrementa el intento y crea un plan inmutable nuevo.

Un doble clic en Preparar devuelve el plan/run ya enlazado. No crea una segunda accion.

## 5. Interfaz

El radar completo y el widget flotante consumen la misma coleccion persistida. Ambos muestran fuente, periodo, estado y enlace a Lumenite. El radar completo agrega evidencia numerica, snooze y dismiss.

El flotante:

- Solo anuncia como nueva una senal persistida con estado `new`.
- Mantiene frequency cap local como proteccion de UX.
- Persiste viewed, dismissed y snoozed en servidor.
- Se inhibe ante dialogos modales, publicaciones, formularios criticos o un campo activo.
- Respeta `prefers-reduced-motion`.

## 6. Auditoria

Se registran `pulse.signal.view`, `pulse.signal.snooze`, `pulse.signal.dismiss`, `pulse.signal.action_prepared` y `pulse.signal.retried`, ademas de los eventos del plan, ejecucion, fallo y undo de Lumenite.

## 7. Verificacion

`npm run test:pulse-lumenite` demuestra con usuarios y negocios aislados:

- Persistencia de evidencia, fuente y periodo.
- Lectura A y bloqueo B; mutacion directa del navegador bloqueada.
- Viewed, snoozed y dismissed auditados.
- Prepare idempotente y approval gate.
- Ejecucion resuelta con recibo real.
- Refresh sin perdida de estado.
- Undo sincronizado como reverted.
- Retry mediante un plan nuevo.
- Recurso eliminado antes de ejecutar produce failed y nunca resolved.
- Limpieza total de fixtures.
