# LumenAI

LumenAI es un SaaS de atencion, ventas y soporte con IA para PYMES y empresas.
Centraliza widget publico, Knowledge, conversaciones, leads, calibracion, Config IA
y Radar Ejecutivo en un panel operativo.

## Stack

- Next.js App Router
- React
- TypeScript
- Supabase
- Vercel
- CSS/Tailwind con sistema visual propio

## Modulos principales

- `/` landing publica
- `/login` autenticacion
- `/onboarding` alta inicial de negocio
- `/panel/overview` centro de mando
- `/panel/autoconfig` Config IA con LumenAI
- `/panel/calibration` studio de calibracion
- `/panel/knowledge` memoria operativa del negocio
- `/panel/chat` inbox de conversaciones
- `/panel/leads` mini CRM
- `/panel/widget` instalacion y configuracion del widget
- `/panel/settings` personalizacion
- `/widget/[key]` widget publico

## Variables requeridas

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY` como fallback si sigue activo
- `GROQ_AUTOCONFIG_API_KEY`
- `GROQ_PANEL_API_KEY`
- `GROQ_WIDGET_API_KEY` si el widget usa key dedicada

No exponer `SUPABASE_SERVICE_ROLE_KEY` ni claves de IA en cliente.

## Desarrollo local

```bash
npm install
npm run dev
```

## Validacion

```bash
npx tsc --noEmit
npm run lint -- --quiet
npm run build
```

Smoke test:

```bash
npm run start -- -p 3002
npm run test:smoke
```

Si usas otro puerto:

```bash
$env:LUMENAI_TEST_URL="http://127.0.0.1:3000"; npm run test:smoke
```

## Supabase

Las migraciones en `supabase/migrations` crean la base operativa:

- negocios y perfiles
- widget settings
- Knowledge
- chats y mensajes
- leads
- automatizaciones
- audit log
- snapshots/rollback de Config IA
- action runs
- market feeds/items para Radar persistente

Aplicar migraciones antes de QA productivo.

## QA recomendado

1. Entrar con cuenta real.
2. Completar onboarding si aplica.
3. Crear Knowledge de servicios/precios/pagos.
4. Pedir a Config IA: `Agrega el servicio Web Profesional, precio $69.990 CLP, pago por transferencia, horario lunes a viernes.`
5. Verificar que Knowledge, pagos y horario se actualicen.
6. Aplicar propuesta si corresponde.
7. Publicar calibracion.
8. Abrir widget publico.
9. Preguntar precios, horarios y pedir humano.
10. Confirmar chat, mensajes y lead en Supabase.

