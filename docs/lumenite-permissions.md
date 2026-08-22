# Permisos de Lumenite

## 1. Principio de seguridad

La autenticacion identifica al usuario, pero no autoriza una accion. Cada decision combina negocio activo, membresia, rol, capacidad, recurso, tipo de acceso, integracion, horario, limites, caducidad, riesgo y aprobacion humana.

Las decisiones se toman en el servidor. La interfaz no puede elevar permisos y la IA no puede crear, modificar ni revocar politicas.

## 2. Niveles de autonomia

| Nivel | Nombre | Comportamiento |
| --- | --- | --- |
| 0 | Observar | Puede mostrar informacion autorizada; no prepara ni ejecuta. |
| 1 | Asesorar | Explica y recomienda; no crea un plan ejecutable. |
| 2 | Preparar | Crea planes o borradores; nunca ejecuta. |
| 3 | Ejecutar con aprobacion | Requiere una aprobacion humana vigente antes de cada ejecucion. |
| 4 | Autonomia limitada | Solo autoejecuta acciones low risk con una politica explicita, limites validos y `allows_auto_execute=true`. |

El nivel 5 no existe en el producto actual. No se presenta en la interfaz ni se acepta en la API.

## 3. Modelo de politica

Una politica puede limitarse mediante:

- Usuario o rol sujeto.
- Capacidad registrada y tipo de recurso.
- Integracion concreta del negocio.
- Accesos `read`, `create`, `update`, `send`, `publish`, `delete`, `export`, `manage`, `approve` y `execute`.
- Maximo de operaciones por hora y por dia.
- Dias, intervalo horario y zona horaria IANA; se admiten turnos que cruzan medianoche.
- Fecha de expiracion.
- Aprobacion obligatoria, autoejecucion y disponibilidad de undo.

La politica lleva `revision` para control de concurrencia optimista. Solo owner y admin con `permissions:manage` pueden crearla, editarla o revocarla.

## 4. Evaluacion

La evaluacion es fail closed. Se rechaza cuando falta membresia activa, la politica esta revocada o expirada, el recurso o integracion no coinciden, la accion cae fuera del horario, se supera un limite o falta un acceso requerido.

El motor prioriza la politica activa mas especifica y registra la decision en el plan. La politica se vuelve a evaluar inmediatamente antes de ejecutar; una aprobacion anterior no conserva un derecho revocado.

## 5. Aprobaciones

Las aprobaciones caducan por defecto en 24 horas y son exclusivas por run pendiente. El inbox separa:

- Pendientes.
- Aprobadas.
- Rechazadas.
- Caducadas.
- Ejecutadas.
- Fallidas.
- Revertidas.

Cada elemento muestra solicitante, negocio, riesgo, integracion, politica, version del plan, datos propuestos, resultado, errores y disponibilidad de undo.

Las acciones disponibles son aprobar y ejecutar, rechazar, solicitar cambios, cancelar y deshacer. Solo `permissions:manage` puede aprobar, rechazar o solicitar cambios.

## 6. Planes inmutables

Solicitar cambios no edita el plan aprobado. Crea una version nueva mediante `root_plan_id`, `parent_plan_id` y `version`; marca la anterior como `superseded`, invalida su aprobacion y exige una aprobacion humana nueva.

Si el planificador no puede convertir el comentario en parametros estructurados validos, conserva el payload anterior como propuesta visible. Ese plan no se autoejecuta.

## 7. Revocacion inmediata

Revocar una politica:

- La desactiva y conserva motivo, actor y momento.
- Cancela runs pendientes que aun no han empezado.
- Marca sus aprobaciones pendientes como caducadas.
- Señala runs en ejecucion o verificacion para detenerse.
- Intenta undo seguro cuando una accion reversible ya produjo un efecto.
- Registra toda la secuencia en auditoria.

Las cinco acciones actuales son sincronas y reversibles. La interrupcion durante ejecucion es cooperativa: se comprueba la revocacion en los puntos seguros del pipeline y se intenta compensar cualquier efecto ya creado.

## 8. Registro permitido

| Capacidad | Recurso | Acceso | Riesgo | Undo |
| --- | --- | --- | --- | --- |
| `internal.task.create` | Task | create | Low | Si |
| `internal.lead.note.add` | Lead note | create | Low | Si |
| `internal.response.prepare` | Response draft | create | Low | Si |
| `internal.conversation.tag` | Conversation tag | create | Low | Si |
| `internal.reminder.create` | Reminder | create | Low | Si |

No hay acciones externas, pagos, cambios de permisos, publicaciones ni borrados masivos.

## 9. Interfaces

- `/panel/permissions`: editor completo y versionado de politicas.
- `/panel/approvals`: inbox de aprobaciones y su historial.
- `/api/panel/lumenite/policies`: consulta, alta, edicion y revocacion.
- `/api/panel/lumenite/action-runs`: consulta y decisiones sobre runs.

## 10. Evidencia reproducible

`npm run test:permissions` valida que solo owner/admin gestionan politicas, que el nivel 3 exige aprobacion, que una solicitud de cambios conserva la version anterior, que la revocacion invalida trabajo pendiente, que el inbox conserva historial y que el nivel 4 respeta limites horarios y diarios.
