# LumenAI

LumenAI es un sistema empresarial inteligente para PYMES y compañías en
crecimiento. Su experiencia se organiza en once responsabilidades claras y una
infraestructura interna invisible para el usuario.

## Arquitectura definitiva

La navegación autenticada expone exactamente diez pilares operativos:

1. Overview — centro de mando del negocio.
2. Calibration — Brand Intelligence y Brand Constitution.
3. Config AI — configuración del sistema mediante lenguaje natural.
4. Lumen Eye — inteligencia interna del negocio.
5. Pulse Radar — AI Chief of Staff, recomendaciones y seguimiento.
6. Research — inteligencia externa con fuentes y evidencia.
7. Widget — Customer Experience Studio.
8. Chats — centro omnicanal de conversaciones.
9. Knowledge — memoria estructurada del negocio.
10. Interface — espacio visual personal del propietario.

Access es el pilar 11 y cubre login, identidad, organización, perfiles, roles y
onboarding. Aparece antes de entrar o dentro de la administración de cuenta, no
como una entrada adicional de la barra lateral.

Antes de crear una pantalla nueva se comprueba si la capacidad pertenece a uno
de estos pilares. Growth, campañas, leads, aprobaciones, simulación e
integraciones se presentan como vistas contextuales dentro de su pilar. Action
OS, Guardian, Supabase, el router de modelos y las evaluaciones son
infraestructura interna.

## Rutas principales

- `/`, `/login`, `/subscriptions` y `/onboarding`: experiencia pública y Access.
- `/panel/overview`: Business Command Center.
- `/panel/calibration`: identidad, comportamiento y simulación de marca.
- `/panel/autoconfig`: Config AI y construcción contextual de campañas.
- `/panel/lumen-eye`: rendimiento, embudos y oportunidades internas.
- `/panel/radar`: Pulse Radar y acciones recomendadas.
- `/panel/research`: mercado, competencia y tendencias externas.
- `/panel/widget`: diseño, instalación y experiencias del asistente público.
- `/panel/chat`: conversaciones y filtro de leads.
- `/panel/knowledge`: productos, servicios, políticas y Knowledge Health.
- `/panel/interface`: tema, densidad, movimiento, operador y conexiones.
- `/panel/access`: perfil, permisos y seguridad.
- `/widget/[key]`: widget público.

Las rutas históricas se redirigen al pilar que ahora es responsable de esa
capacidad, por lo que se conservan enlaces antiguos sin duplicar navegación.

## Groq

Groq se configura únicamente en el servidor. Cada pilar tiene una variable
dedicada para aislar límites, observabilidad y rotación de secretos:

- `GROQ_CALIBRATION_API_KEY`
- `GROQ_CONFIG_AI_API_KEY`
- `GROQ_LUMEN_EYE_API_KEY`
- `GROQ_PULSE_API_KEY`
- `GROQ_RESEARCH_API_KEY`
- `GROQ_WIDGET_API_KEY`
- `GROQ_CHATS_API_KEY`
- `GROQ_KNOWLEDGE_API_KEY`
- `GROQ_INTERFACE_API_KEY`
- `GROQ_OVERVIEW_API_KEY`
- `GROQ_ACCESS_API_KEY`

Cada clave admite su variable `*_MODEL` correspondiente. `GROQ_API_KEY` puede
usarse como fallback controlado en desarrollo. Ninguna clave Groq usa el prefijo
`NEXT_PUBLIC_` ni se guarda en Git.

## Variables base

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- las once claves Groq server-only descritas arriba

Revisa el contrato completo en `.env.example` y ejecútalo con:

```bash
npm run check:env
```

## Desarrollo y validación

```bash
npm install
npm run dev
```

Antes de publicar:

```bash
npx tsc --noEmit
npm run lint
node --test tests/*.test.mjs
npm run audit:a11y
npm run build
npm run audit:performance
```

## Supabase

Supabase es Data Core, no un módulo de usuario. Las migraciones en
`supabase/migrations` administran Auth, negocios, perfiles, RLS, Knowledge,
widget, chats, leads contextuales, memoria, eventos, auditoría y Action OS.

Las migraciones deben probarse en una rama aislada antes de promoverlas a
producción. Nunca se debe exponer `SUPABASE_SERVICE_ROLE_KEY` en el navegador.

## Membresías

La experiencia comercial vende membresías Start, Business y Scale usando
capacidades empresariales: negocios, usuarios, canales, conversaciones,
integraciones, automatización, historial, Research, análisis, autonomía y
soporte. Tokens, créditos de IA y costos por modelo son detalles internos y no
forman parte de la interfaz comercial.
