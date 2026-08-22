# LumenAI Production Readiness

## 1. Estado de esta entrega

| Gate | Estado | Evidencia |
| --- | --- | --- |
| Hito 0, auditoría | Completo en código | Arquitectura, riesgos y mapa documentados |
| Hardening crítico | Listo para migrar | RPC de conocimiento cerrada a `anon` y `authenticated` |
| Hito 1, fundación visual | Completo en alcance | Tokens, shell, estados, motion, responsive y reduced motion |
| Hito 2, Lumenite | Completo en código | Cinco acciones, plan, autorización, ejecución, verificación y recibo |
| TypeScript | Superado | `npx tsc --noEmit` y chequeo del build correctos |
| Lint | Superado con deuda conocida | 0 errores; 210 warnings históricos fuera del alcance |
| Unit/contract tests | Superado | Action OS 10/10; fundación visual 3/3 |
| Build | Superado | Next.js 16.2.11 compiló y generó 32 páginas estáticas |
| Smoke | Superado | Login, widget, redirect de panel y rate limit correctos |
| Responsive público | Superado | Sin overflow ni logs en 360, 390, 768, 1024, 1280, 1440 y 1920 px |
| Supabase real | Bloqueado por entorno | Migraciones no aplicadas todavía |
| E2E autenticado | Pendiente | Requiere sesión y base con migraciones |
| Capturas públicas | Completo | Login desktop y mobile sin PII |

## 2. Bloqueadores de producción

1. Aplicar `20260809044217_lumenite_action_os_foundation.sql` y `20260809055032_harden_business_knowledge_function.sql`.
2. Ejecutar lint/advisors de Supabase contra la base real.
3. Probar aislamiento entre dos negocios.
4. Ejecutar el flujo completo de las cinco acciones con sesión auténtica.
5. Confirmar rollback y estados parciales con datos reales.
6. Capturar responsive autenticado sin PII.
7. Resolver o aceptar formalmente las advertencias históricas del lint.

## 3. Checklist de seguridad

- [x] `service_role` sólo en módulos de servidor.
- [x] Action OS no usa `user_metadata` para autorización.
- [x] Ejecución por `runId`, no por nombre de acción del cliente.
- [x] Entrada y salida validadas.
- [x] Idempotencia persistida.
- [x] Aprobación y auditoría persistidas.
- [x] RLS definida para nuevas tablas.
- [x] RPC de conocimiento revocada a roles de navegador.
- [ ] Advisors ejecutados contra la base desplegada.
- [ ] Pruebas RLS multitenant reales.

## 4. Checklist de experiencia

- [x] Pulse Radar y Lumenite separados semánticamente.
- [x] Skip navigation y foco visible.
- [x] Estados universales con texto e icono.
- [x] Motion reducido soportado.
- [x] Controles táctiles principales de 44 px.
- [x] Datos técnicos bajo divulgación progresiva.
- [ ] Auditoría WCAG 2.2 AA completa con herramientas y lector de pantalla.
- [ ] Capturas autenticadas en 360, 390, 768, 1024, 1280, 1440 y 1920 px.

Capturas verificadas de esta entrega:

- `docs/screenshots/login-desktop-1270x841.png`.
- `docs/screenshots/login-mobile-390x844.png`.

La captura desktop refleja el viewport solicitado de 1280x720 y el área completa exportada por el navegador integrado. La captura autenticada de Lumenite permanece pendiente; no se añadió un bypass de sesión.

## 5. Comandos de release

```bash
npx tsc --noEmit
npm run lint
npm run test:action-os
npm run test:foundation
npm run test:smoke
npm run build
npx supabase db lint --linked --fail-on error
```

## 6. Rollback

- Código: revertir únicamente el commit del hito en una rama de feature.
- Acción Lumenite: usar rollback por `runId` cuando `undo_status=available`.
- Base: preparar migración compensatoria; no editar migraciones ya aplicadas.
- RPC de conocimiento: no reabrir a `anon`; si el widget falla, corregir su ruta de servidor.

## 7. Release

No promover a producción hasta cerrar los bloqueadores de Supabase y E2E. No se añadieron integraciones externas, no se hizo push y no se creó Pull Request durante esta entrega.
