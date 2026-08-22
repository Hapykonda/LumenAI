# Informe completo del sistema LumenAI

## 1. Proposito del informe

Este documento describe de forma completa, profesional y teorica el sistema LumenAI en su estado actual. Su objetivo es ordenar la vision general del producto, explicar cada parte del sistema desde el login hasta los modulos de inteligencia, definir que se busca lograr visual y funcionalmente en cada categoria, identificar lo que ya existe y dejar claro que elementos faltan por integrar para llevar la plataforma a un nivel mas solido, comercial y enterprise.

Actualizacion tecnica del 23 de julio de 2026:

- Perfil visual unificado entre onboarding, Settings, Widget y cabecera del panel.
- Seleccion, recorte, zoom y optimizacion de fotografia a WebP 640 x 640.
- Publicacion inmediata del avatar y eliminacion controlada del asset anterior.
- Validacion de formato, peso, URL y pertenencia del archivo al negocio.
- Next.js actualizado a 16.2.11, React a 19.2.8 y Supabase JS a 2.110.8.
- Modos de generacion etiquetados como IA, reglas sobre datos reales u origen no registrado.
- Heroes oscuros con luces en movimiento y respeto por reduced motion.

El informe esta pensado como una guia de producto, diseno, arquitectura y evolucion. No se limita a describir pantallas: tambien explica la intencion estrategica de cada modulo, el rol que cumple dentro del negocio, la experiencia que debe percibir el usuario y las mejoras necesarias para que LumenAI se convierta en un sistema operativo comercial basado en inteligencia artificial.

## 2. Resumen ejecutivo

LumenAI es una plataforma SaaS orientada a atencion, ventas, soporte, inteligencia comercial y automatizacion para negocios. Su propuesta central es transformar cada conversacion con clientes en informacion accionable: respuestas mas precisas, leads medibles, oportunidades comerciales, campanas, conocimiento del negocio, decisiones simuladas y acciones recomendadas por IA.

El sistema no debe percibirse como un simple chatbot. La vision correcta es presentarlo como un centro de comando comercial: una consola premium donde el dueno o equipo del negocio puede configurar la identidad de su asistente, instalar un widget en su sitio, alimentar una base de conocimiento, revisar conversaciones, convertir conversaciones en leads, detectar oportunidades y usar modulos inteligentes para decidir que hacer despues.

La experiencia actual ya contiene una base amplia:

- Landing publica.
- Login profesional con magic link, codigo OTP, password y Google OAuth.
- Onboarding para crear negocio.
- Panel privado con navegacion por categorias.
- Overview operativo.
- Calibration Studio.
- Config AI / Autoconfig.
- Knowledge.
- Chat.
- Leads.
- Widget.
- Settings.
- Radar Ejecutivo.
- Lumen Eye.
- Research Engine.
- Growth.
- Business Twin.
- Campaigns.
- Color Mix.
- System Health.
- Widget publico embebible.
- APIs privadas y publicas.
- Integracion con Supabase.
- Esquema de datos para negocios, perfiles, chats, mensajes, leads, conocimiento, configuracion, actividad, auditoria, inteligencia, oportunidades, campanas, research y simulaciones.

La direccion visual del sistema apunta a una estetica premium tipo "obsidian command center": fondo negro profundo, paneles translucidos, bordes sutiles, iluminacion controlada, acentos dinamicos segun la marca del negocio y una sensacion de software serio, vivo y sofisticado. La interfaz debe comunicar precision, confianza, inteligencia y control.

Lo que falta no es solamente "mas pantallas". Faltan integraciones y capas de producto que hagan que el sistema pase de estar funcional a estar listo para escalar: roles de equipo, permisos, facturacion, CRM, email, WhatsApp, automatizaciones reales, analitica profunda, observabilidad, pruebas end-to-end, seguridad productiva, gestion de datos, documentos en Knowledge, trabajos programados y un sistema mas completo de deployment y monitoreo.

## 3. Vision general del producto

LumenAI busca ser una plataforma de inteligencia operativa para negocios. Su funcion principal es conectar tres mundos que normalmente estan separados:

1. La atencion al cliente.
2. La gestion comercial.
3. La toma de decisiones con IA.

En la practica, esto significa que un negocio puede instalar un asistente en su sitio web, ensenarle informacion real del negocio, controlar como responde, revisar conversaciones, detectar leads y convertir todo ese movimiento en aprendizaje y acciones.

El sistema debe transmitir una idea muy clara: cada interaccion deja de ser un mensaje aislado y se convierte en un activo del negocio. Una pregunta de un cliente puede crear un lead. Un lead puede revelar una oportunidad. Una oportunidad puede transformarse en una campana. Una campana puede alimentar el aprendizaje del negocio. Y todo esto debe verse desde un panel central, no como herramientas sueltas.

## 4. Propuesta de valor

La propuesta de valor de LumenAI se puede resumir asi:

LumenAI convierte conversaciones en ventas, soporte, aprendizaje y decisiones medibles.

Sus beneficios principales son:

- Centralizar la atencion comercial desde un widget publico.
- Permitir que el negocio configure su asistente sin depender de programadores.
- Mantener una base de conocimiento viva y publicada.
- Capturar leads desde conversaciones reales.
- Analizar el estado del negocio desde un panel ejecutivo.
- Proponer mejoras de configuracion con IA.
- Detectar oportunidades comerciales.
- Simular decisiones antes de aplicarlas.
- Crear campanas y mensajes comerciales.
- Verificar la salud tecnica y operativa del sistema.

El producto debe posicionarse como una herramienta para negocios que quieren vender mejor, responder mas rapido y operar con una inteligencia comercial propia.

## 5. Arquitectura conceptual del sistema

El sistema puede entenderse en cinco capas:

### 5.1 Capa publica

Incluye la landing, el login, el onboarding y el widget publico. Es la primera impresion del producto y tambien el punto donde los clientes finales interactuan con el asistente del negocio.

### 5.2 Capa privada del panel

Incluye todas las rutas bajo el panel. Es la consola de operacion donde el dueno o equipo del negocio configura, revisa, decide y publica cambios.

### 5.3 Capa de inteligencia

Incluye Radar, Lumen Eye, Research, Growth, Business Twin, Campaigns y agentes internos de IA. Esta capa interpreta informacion y propone acciones.

### 5.4 Capa de datos

Incluye Supabase, tablas de negocios, perfiles, widget, knowledge, chats, mensajes, leads, auditoria, actividad, oportunidades, campanas, research, simulaciones y almacenamiento de assets.

### 5.5 Capa de seguridad y operacion

Incluye autenticacion, sesiones, RLS, service role en servidor, auditoria, snapshots, action runs, health checks, deployment y futuras integraciones enterprise.

## 6. Mapa general de navegacion

La navegacion del panel esta organizada en cuatro grandes categorias:

### Principal

- Inicio / Overview.
- Calibracion.
- Config AI.

Esta categoria responde a la pregunta: como esta el negocio y como se configura la IA principal.

### Inteligencia

- Radar.
- Lumen Eye.
- Research.
- Growth.
- Business Twin.
- Campaigns.
- Knowledge.

Esta categoria responde a la pregunta: que esta aprendiendo el sistema, que oportunidades existen y que decisiones deberian tomarse.

### Operacion

- Chat.
- Leads.
- Widget.

Esta categoria responde a la pregunta: que esta pasando con los clientes reales, las conversaciones, los contactos y la instalacion publica.

### Sistema

- Settings.
- Color Mix.
- Health.

Esta categoria responde a la pregunta: como se ve, como se identifica, como se instala y que tan sano esta el sistema.

## 7. Experiencia completa del usuario

### 7.1 Entrada publica

El usuario llega a LumenAI desde la landing. La landing presenta el producto como una herramienta para convertir conversaciones en ventas, soporte y oportunidades medibles. Su rol es explicar el valor central sin abrumar: widget, Knowledge, Config AI, Radar Ejecutivo, Leads, Chat y Calibracion.

Visualmente, la landing debe sentirse clara, comercial y moderna. No debe parecer una demo generica de IA. Debe comunicar que el sistema ya esta pensado para negocios reales.

### 7.2 Login

El login es una de las piezas mas importantes porque define la percepcion de confianza. Actualmente el sistema ofrece acceso mediante magic link, codigo OTP, password y Google OAuth. Tambien maneja errores comunes de autenticacion, como token vencido, credenciales incorrectas, limite de solicitudes y email no confirmado.

La vision del login es que se perciba como una puerta segura a una consola comercial. No es un formulario cualquiera. Debe decirle al usuario: aqui entra un equipo a operar informacion sensible, clientes, conversaciones y ventas.

Elementos que ya existen:

- Pantalla oscura premium.
- Copy de acceso seguro para equipos comerciales.
- Acceso por email.
- Codigo de verificacion.
- Acceso por password.
- Google OAuth.
- Persistencia de sesion.
- Manejo de errores.

Lo que deberia reforzarse:

- Recuperacion de password mas visible si aplica.
- Mensajes de seguridad y privacidad.
- Estado de carga mas claro durante OAuth.
- Soporte visual para marca LumenAI consistente con el panel.
- Enlace a terminos, privacidad y soporte.

### 7.3 Onboarding

Despues del login, el usuario nuevo debe crear su negocio. El onboarding actual funciona como un wizard de diez pasos y captura identidad, industria, servicios, precios, pagos, contacto, personalidad, marca, Knowledge, preview y confirmacion.

La vision del onboarding es convertir un registro frio en una primera configuracion real del negocio. Desde este punto, LumenAI deberia empezar a construir la identidad comercial de la empresa.

Elementos que ya existen:

- Verificacion de usuario autenticado.
- Redireccion si el usuario ya tiene negocio.
- Creacion de negocio.
- Asociacion de perfil con business_id.
- Creacion inicial de widget_settings.
- Generacion de public_key.
- Wizard profesional de diez pasos.
- Guardado local del progreso.
- Creacion de borradores iniciales de Knowledge.
- Preview del widget durante la configuracion.
- Carga, recorte y optimizacion de la foto del asistente.

Lo que falta:

- Carga inicial de documentos.
- Plantillas mas profundas por industria.
- Validacion semantica de calidad de los datos.
- Explicacion legal y de privacidad antes de importar fuentes sensibles.
- Reanudacion del upload local si la sesion se interrumpe.

### 7.4 Entrada al panel

Cuando el usuario entra al panel, debe sentir que llego a un centro de control. La navegacion lateral agrupa las areas del sistema y el contenido principal se presenta en un contenedor amplio, oscuro y premium.

El panel no debe sentirse como una coleccion de paginas aisladas. Cada modulo debe reforzar la idea de que todo forma parte de una misma inteligencia comercial.

### 7.5 Perfil del propietario

El sistema separa ahora dos identidades que antes compartian la misma fotografia:

- Perfil interno del propietario: nombre, cargo, bio, rol, correo y foto de cuenta.
- Perfil publico del asistente: nombre, avatar, saludo, tono y branding visible en el widget.

El propietario puede abrir `Settings > Mi perfil`, elegir una fotografia local, recortarla, aplicar zoom y publicarla optimizada a WebP 640 x 640. La cabecera y la navegacion lateral se actualizan inmediatamente sin recargar la pagina.

La informacion estructurada se guarda dentro de `profiles.metadata`, respetando los datos existentes de la cuenta. Las imagenes se almacenan en el bucket publico `lumenai-profile-assets`, con limite de 2 MB, tipos PNG/JPG/WebP y rutas aisladas por el identificador del usuario. Subida y eliminacion solo se ejecutan desde endpoints autenticados del servidor.

Esta separacion evita que cambiar la fotografia privada del dueño altere el avatar que ven los clientes en el widget.

## 8. Identidad visual global

La vision visual del sistema es una consola premium de inteligencia operativa. El concepto principal es "obsidian command center": negro profundo, vidrio sutil, luz controlada y una interfaz seria.

Principios visuales:

- Fondo negro profundo como base.
- Paneles con efecto glass sobrio.
- Bordes finos con luz tenue.
- Acentos dinamicos segun la marca del cliente.
- Animaciones sutiles, no decoracion excesiva.
- Alta legibilidad.
- Jerarquia visual clara.
- Sensacion de producto enterprise.
- Menos marketing, mas operacion.
- No abusar de gradientes fuertes.
- No llenar la interfaz de tarjetas innecesarias.

El sistema debe verse como una herramienta viva, pero no saturada. La IA debe sentirse integrada al flujo, no como un adorno.

## 9. Panel Shell y navegacion

El Panel Shell es la estructura principal del sistema privado. Aplica el tema visual, contiene la barra lateral, centra el contenido y mantiene coherencia entre modulos.

Elementos actuales:

- Sidebar fija en escritorio.
- Sidebar movil con overlay.
- Grupos de navegacion.
- Tema dinamico mediante variables CSS.
- Acentos primarios y secundarios.
- Integracion con evento de actualizacion de tema.
- PanelInsightsAssistant como asistente contextual.

Vision funcional:

El shell debe ser el marco estable del producto. Aunque cada modulo tenga su propia personalidad, el usuario debe sentir continuidad. La navegacion debe permitir entender rapidamente donde esta: Principal, Inteligencia, Operacion o Sistema.

Vision visual:

La barra lateral debe parecer una consola de precision. Iconos claros, estados activos evidentes, separacion limpia entre categorias y una estetica oscura coherente.

Lo que falta o puede mejorar:

- Estados de permisos por modulo.
- Notificaciones o badges segun actividad real.
- Buscador global de modulos, leads o conversaciones.
- Preferencias por usuario.
- Mejor soporte para multiples negocios o cambio de workspace.

## 10. Landing publica

La landing actual presenta LumenAI como una plataforma para convertir conversaciones en ventas, soporte y oportunidades medibles.

Rol dentro del sistema:

La landing vende la promesa. No opera el negocio, pero prepara al usuario para entender que LumenAI no es solo un widget. Es un sistema completo.

Elementos que presenta:

- Widget.
- Knowledge.
- Config AI.
- Radar Ejecutivo.
- Leads.
- Chat.
- Calibracion.
- Estado de preparacion del sistema.

Vision visual:

Debe ser limpia, sofisticada y directa. La landing puede ser mas clara y comercial que el panel, pero debe mantener una conexion con la estetica premium de LumenAI.

Mejoras pendientes:

- Casos de uso por industria.
- Seccion de precios.
- Testimonios o prueba social.
- Seguridad y privacidad.
- Comparacion antes/despues.
- CTA mas fuerte hacia demo o registro.
- Visual real del panel y widget.

## 11. Login profesional

El login debe ser tratado como una pantalla de producto, no como una pieza secundaria.

Objetivo:

Permitir acceso seguro y transmitir que LumenAI maneja informacion comercial sensible.

Capacidades actuales:

- Magic link.
- Codigo OTP.
- Acceso por password.
- Google OAuth.
- Persistencia de sesion.
- Manejo de errores de Supabase.
- Redireccion posterior al acceso.

Vision visual:

Oscuro, seguro, elegante, con movimiento sutil. Debe sentirse como la entrada a una consola privada.

Lo que se busca lograr:

- Confianza inmediata.
- Percepcion de seguridad.
- Cero friccion para entrar.
- Claridad cuando ocurre un error.
- Sensacion de marca premium.

Faltantes:

- Recuperacion y cambio de password plenamente visible.
- Politicas legales enlazadas.
- Mensaje de proteccion de datos.
- Control de invitaciones para equipos.
- Estados de cuenta suspendida, sin plan o sin permisos.

## 12. Onboarding del negocio

Objetivo:

Crear la entidad principal del sistema: el negocio.

Datos actuales:

- Nombre del negocio.
- Industria.
- Tono.
- Productos y servicios.
- Precios y condiciones.
- Metodos de pago.
- Email, WhatsApp y horario.
- Nombre y personalidad del asistente.
- Foto recortada por el dueno del panel.
- Colores de marca.
- Knowledge inicial en estado draft.
- Public key.
- Relacion con profile.
- Configuracion inicial de widget.

Vision:

El onboarding debe construir la primera version del negocio digital dentro de LumenAI. No solo debe crear un registro en base de datos. Debe dejar listo un primer asistente usable.

Experiencia ideal:

- Preguntar que vende el negocio.
- Preguntar horarios.
- Preguntar canales de contacto.
- Preguntar tono.
- Preguntar formas de pago.
- Subir logo y foto del asistente.
- Sugerir configuracion inicial.
- Mostrar preview del widget.
- Confirmar instalacion o dejarla pendiente.

Faltantes:

- Validacion de calidad de datos.
- Carga inicial de documentos.
- Seleccion de industria con plantillas.
- Estado de completitud persistido en base de datos.
- Configuracion multinegocio.

## 13. Overview / Inicio

El Overview es el tablero principal del negocio. Debe responder rapidamente que esta pasando, que esta funcionando y que requiere atencion.

Rol dentro del sistema:

Ser el centro de mando operativo. El usuario no deberia entrar al panel y preguntarse que hacer. El Overview debe darle contexto, metricas y proximas acciones.

Elementos actuales:

- Lectura de chats.
- Lectura de leads.
- Lectura de Knowledge.
- Lectura de widget_settings.
- Lectura de mensajes.
- Metricas principales.
- Embudo comercial.
- Canales de entrada.
- Estado de Knowledge publicado.
- Modulos conectados al panel.

Vision funcional:

El Overview debe mostrar salud comercial, volumen de conversaciones, leads nuevos, Knowledge disponible, actividad reciente y alertas accionables.

Vision visual:

Debe parecer una sala de control: resumen claro, bloques compactos, indicadores vivos, jerarquia sobria y nada de decoracion innecesaria.

Faltantes:

- Comparativas por periodo.
- Conversion rate real.
- Ingresos atribuidos.
- Alertas priorizadas.
- Acciones recomendadas desde cada metrica.
- Filtros por fecha.
- Exportacion de reportes.

## 14. Calibration Studio

Calibration es uno de los modulos mas importantes del producto porque define como la IA piensa, vende, responde y protege la experiencia del cliente.

Objetivo:

Permitir que el negocio configure la personalidad, reglas, identidad, tono, objeciones, promesas, limites y acciones del asistente antes de publicarlo.

Elementos actuales:

- Identidad que el cliente debe sentir.
- Marca y asistente.
- Brief narrado.
- Valores de marca.
- Personalidad guardable.
- Mezcla de comportamiento.
- Reglas de respuesta.
- Biblioteca de personalidades.
- Notas de personalidad.
- Arquitectura psicologica de ventas.
- Sistema de decision.
- Objeciones y pruebas.
- Promesas y cierre.
- Reglas que protegen la experiencia.
- Lenguaje permitido.
- Escalado y limites.
- Saludo y acciones del widget.
- Color del asistente.
- Revision final.
- Estado del Studio.
- Publicacion.
- Preview publico.

Vision funcional:

Calibration debe ser el lugar donde se transforma una IA generica en un representante comercial alineado con la marca. El usuario debe poder decidir si su asistente sera cercano, tecnico, consultivo, ejecutivo, empatico o directo.

Vision visual:

Debe sentirse como un estudio de direccion de IA. No como un formulario largo. Cada seccion debe representar una dimension de comportamiento del asistente.

Lo que ya esta bien encaminado:

- Separacion entre draft y publicacion.
- Enfoque en identidad, reglas y personalidad.
- Capacidad de preview.
- Pensamiento comercial profundo.

Faltantes:

- Tests conversacionales antes de publicar.
- Versionado visual de calibraciones.
- Comparacion entre draft y publicado.
- Plantillas por industria.
- Recomendaciones automaticas basadas en chats reales.
- Historial de cambios y responsable.
- Alertas cuando la calibracion contradice Knowledge.

## 15. Config AI / Autoconfig

Config AI es el modulo donde la IA ayuda a configurar y modificar el sistema de forma guiada.

Objetivo:

Permitir que el usuario pida cambios en lenguaje natural, recibir un plan, ejecutar acciones seguras y, cuando sea posible, revertir cambios.

Elementos actuales:

- Planificacion de acciones.
- Ejecucion.
- Rollback.
- Snapshots de configuracion.
- Action runs.
- Auditoria.
- Acciones sobre Knowledge, widget, calibration, business, leads, growth, campaigns, twin, radar y sistema.
- Clasificacion de riesgo.

Vision funcional:

Config AI debe ser un copiloto operativo del negocio. El usuario deberia poder decir: "agrega este servicio", "cambia el tono", "prepara una campana", "mejora el widget", "crea una regla" o "actualiza los precios", y el sistema debe responder con un plan entendible antes de ejecutar.

Vision visual:

Debe parecer una consola de control asistida por IA. La interfaz debe diferenciar claramente entre propuesta, impacto, riesgo, accion y resultado.

Faltantes:

- Permisos por tipo de accion.
- Confirmaciones diferenciadas para acciones de alto riesgo.
- Mejor UI de historial de ejecuciones.
- Explicacion de cambios antes/despues.
- Integracion con notificaciones.
- Reglas de aprobacion por rol.
- Cost tracking de operaciones IA.

## 16. Knowledge

Knowledge es la memoria comercial del sistema. Sin Knowledge, el asistente puede sonar bien, pero no necesariamente responder correctamente sobre el negocio.

Objetivo:

Permitir que el negocio cargue, edite, publique y revise informacion clave: servicios, precios, preguntas frecuentes, politicas, pagos, contacto, horarios y datos de transferencia.

Elementos actuales:

- Contenido del negocio.
- Publicacion de informacion.
- Estado de salud de Knowledge.
- Checklist de servicios, precios, FAQ, politicas, pagos y contacto.
- Preview del contexto publicado.
- Datos de transferencia.
- Canales de cierre.
- Horario de atencion.

Vision funcional:

Knowledge debe ser la fuente de verdad del asistente. Todo lo que el widget responde sobre el negocio deberia venir de ahi o estar alineado con esa memoria.

Vision visual:

Debe sentirse como una biblioteca comercial viva. No debe ser solo un editor de texto. Debe mostrar completitud, calidad, riesgos y contenido publicado.

Faltantes:

- Carga de documentos.
- Extraccion automatica de contenido desde PDF, DOCX, sitios web o archivos.
- Versionado de conocimiento.
- Busqueda semantica / embeddings si se busca mayor precision.
- Deteccion de contradicciones.
- Historial de publicacion.
- Aprobacion editorial.
- Plantillas por industria.
- Medicion de preguntas sin respuesta.

## 17. Chat

Chat es el inbox comercial del sistema.

Objetivo:

Permitir revisar conversaciones iniciadas desde el widget, entender que pidio cada cliente, responder cuando sea necesario y detectar oportunidades de venta o soporte.

Elementos actuales:

- Listado de conversaciones.
- Detalle por conversacion.
- Mensajes.
- Estados de lectura.
- Respuesta manual.
- Relacion con leads.
- Human takeover o solicitud humana.
- Busqueda y estados vacios.

Vision funcional:

Chat debe ser un inbox de ventas y soporte, no solamente un visor de mensajes. Debe ayudar a priorizar conversaciones importantes, detectar intencion, mostrar contexto y permitir intervenir rapido.

Vision visual:

Debe ser denso pero claro. Un operador deberia poder trabajar muchas conversaciones sin cansarse. El diseno debe favorecer lectura, prioridad y accion.

Faltantes:

- Etiquetas manuales.
- Asignacion a miembros de equipo.
- SLA o tiempos de respuesta.
- Notificaciones.
- Resumen IA por conversacion.
- Sugerencias de respuesta.
- Filtros avanzados.
- Archivar/cerrar conversaciones.
- Integracion con WhatsApp, email o CRM.

## 18. Leads

Leads es el pipeline comercial derivado de las conversaciones.

Objetivo:

Gestionar oportunidades detectadas por LumenAI: contacto, intencion, score, conversacion asociada y estado.

Elementos actuales:

- Pipeline comercial.
- Leads capturados.
- Intencion.
- Score.
- Estado.
- Relacion con conversacion.
- Acciones de gestion.

Vision funcional:

Leads debe convertir la atencion en ventas medibles. Cada lead deberia tener trazabilidad: de que conversacion viene, que pidio, que tan caliente esta, que falta hacer y cual es el proximo paso.

Vision visual:

Debe parecer una herramienta comercial, clara y accionable. El usuario debe poder distinguir leads urgentes, leads frios y oportunidades abiertas.

Faltantes:

- Pipeline Kanban.
- Etapas personalizables.
- Recordatorios.
- Asignacion por vendedor.
- Integracion CRM.
- Notas internas.
- Historial de contacto.
- Automatizaciones de follow-up.
- Medicion de conversion.
- Exportacion CSV.

## 19. Widget privado / instalacion

El modulo Widget del panel permite instalar y controlar el asistente publico.

Objetivo:

Permitir que el negocio copie el script, pruebe el widget, configure su estado, revise la preview publica y controle elementos visibles como avatar, logo, colores, posicion y saludo.

Elementos actuales:

- Script de instalacion.
- URL directa.
- HTML de prueba.
- Iframe de preview.
- Avatar visible.
- Logo de marca.
- Upload de assets.
- Control de activacion.
- Posicion del widget.
- Estado publicado.
- Reglas de experiencia.
- Pasos de instalacion.
- Checks de instalacion.

Vision funcional:

Widget debe reducir al minimo la friccion de instalacion. El usuario debe entender que copiar, donde pegarlo y como verificar que funciona.

Vision visual:

Debe comunicar precision tecnica sin intimidar. Codigo claro, preview real y estado de instalacion evidente.

Faltantes:

- Validacion automatica de instalacion en dominio real.
- Allowed origins por dominio con UI completa.
- Version del script.
- Guia por plataforma: Shopify, WordPress, Webflow, Wix, sitios custom.
- Estado de ultima conexion.
- Analitica de carga del widget.
- Prueba conversacional integrada.
- Control de cache/publicacion.

## 20. Widget publico

El widget publico es la cara visible de LumenAI para los clientes finales del negocio.

Objetivo:

Atender visitantes, responder preguntas, capturar datos, generar conversaciones y crear leads cuando detecte intencion comercial.

Capacidades actuales:

- Configuracion publica por key.
- Lectura de settings publicados.
- Greeting.
- Nombre del asistente.
- Colores.
- Fuente.
- Acciones rapidas.
- WhatsApp/email.
- Avatar/logo.
- Posicion.
- Calibration.
- Creacion de chats.
- Guardado de mensajes.
- Respuestas estructuradas.
- Captura de leads.
- Solicitud de humano.
- Transcripcion de audio.
- Rate limiting por clave publica.
- Configuracion publica sin exponer business_id.
- Avatar sincronizado con onboarding, Settings y Widget.

Vision funcional:

El widget debe sentirse como un asistente comercial de la marca, no como un bot externo. Debe responder con claridad, capturar oportunidades y escalar cuando no pueda resolver.

Vision visual:

Debe ser compacto, elegante, rapido y alineado con la marca del cliente. La foto que decida el dueno del panel debe poder ser parte central de la identidad visual del asistente.

Faltantes:

- Estados offline/online.
- Mensajes proactivos.
- Consentimiento de privacidad.
- Proteccion avanzada contra abuso y bots.
- Medicion de satisfaccion.
- Widget multicanal.
- Personalizacion avanzada de copy.

## 21. Settings

Settings define la identidad principal del negocio y parte importante de la experiencia visual del widget.

Objetivo:

Permitir editar estado general, mensaje inicial, foto de perfil, colorimetria, tipografia, posicion del widget, instalacion y preview.

Elementos actuales:

- Estado general.
- Mensaje inicial.
- Foto del perfil.
- Colorimetria.
- Tipografia.
- Posicion del widget.
- Instalacion.
- Preview avanzado.
- Vista previa.
- Guardado via API de widget.
- Recorte, encuadre y zoom de fotografia.
- Conversion optimizada a WebP 640 x 640.
- Validacion de formatos y limite de 2 MB.
- Eliminacion del asset anterior despues de publicar.
- Sincronizacion visual con la cabecera del panel.
- Presets de color y preview desktop/mobile.

Vision funcional:

Settings debe ser el lugar donde el dueno controla la presencia publica de su asistente. Aqui se decide como se presenta el sistema ante clientes.

Vision visual:

Debe sentirse como un panel de marca: ordenado, visual, con previews inmediatos y controles claros.

Faltantes:

- Recorte no cuadrado especifico para logotipos horizontales.
- Historial y restauracion de imagenes anteriores.
- Diferenciar claramente configuracion privada, draft y publicado.
- Preferencias por usuario.

## 22. Radar Ejecutivo

Radar es el modulo de lectura ejecutiva.

Objetivo:

Concentrar actividad, senales internas, contexto de mercado y acciones recomendadas para que el negocio actue antes de perder oportunidades.

Elementos actuales:

- Pulse Radar.
- Actividad.
- Senales internas.
- Contexto de mercado.
- Acciones recomendadas.
- Refresh.
- Integracion con market data y otros modulos.

Vision funcional:

Radar debe responder: que esta pasando y que deberia mirar ahora el negocio. Es un modulo de priorizacion.

Vision visual:

Debe sentirse como una pantalla ejecutiva: pocas cosas, muy importantes, con jerarquia y decision.

Faltantes:

- Ranking de urgencia.
- Explicacion de origen de cada senal.
- Acciones directas.
- Periodos comparativos.
- Alertas automatizadas.
- Integraciones externas de mercado.
- Cron jobs o actualizaciones programadas.

## 23. Lumen Eye

Lumen Eye observa el estado vivo del sistema.

Objetivo:

Unir senales, actividad geografica aproximada, oportunidades y alertas para dar una vision viva del negocio.

Elementos actuales:

- Senales importantes.
- Casos para evaluar.
- Resumen IA.
- Acciones.
- Refresh.
- Conexion con oportunidades y actividad.

Vision funcional:

Lumen Eye debe funcionar como una capa de observacion continua. Si Radar prioriza, Lumen Eye observa.

Vision visual:

Debe sentirse como un ojo inteligente sobre el negocio: actividad, senales, movimientos y focos de atencion.

Faltantes:

- Mapa real o visualizacion geografica.
- Feed de eventos vivo.
- Filtros por severidad.
- Alertas configurables.
- Integraciones con analytics.
- Explicabilidad por senal.

## 24. Research Engine

Research Engine investiga informacion interna y externa para alimentar decisiones.

Objetivo:

Analizar mercado, competidores, conversaciones, oportunidades y senales internas; despues decidir que debe enviarse a Radar, Lumen Eye, Growth, Campaigns o Config AI.

Elementos actuales:

- Findings.
- Reportes.
- Mercado.
- Jobs recientes.
- Fuentes.
- Jobs de research.
- Acciones sobre findings.
- Reportes generados.

Vision funcional:

Research debe ser el laboratorio de investigacion comercial. No solo mira datos: produce hallazgos accionables.

Vision visual:

Debe parecer un centro de investigacion, con hallazgos, fuentes, reportes y estado de ejecucion.

Faltantes:

- Fuentes externas reales configurables.
- Scheduling de investigaciones.
- Resumen ejecutivo descargable.
- Validacion de fuentes.
- Clasificacion por confianza.
- Envio automatizado a modulos destino.
- Historial comparativo.

## 25. Growth

Growth detecta oportunidades comerciales a partir de leads, chats y mensajes.

Objetivo:

Encontrar patrones de venta, oportunidades de seguimiento, necesidades repetidas y acciones que puedan aumentar conversion.

Elementos actuales:

- Motor de oportunidades.
- Analisis de leads/chats/mensajes.
- Oportunidades.
- Playbooks.
- Follow-up tasks.
- Acciones preparadas.

Vision funcional:

Growth debe transformar datos operativos en crecimiento comercial. Debe decir: aqui hay una oportunidad, este lead esta caliente, este mensaje se repite, esta oferta podria funcionar.

Vision visual:

Debe sentirse como un laboratorio de oportunidades: tarjetas claras, impacto estimado, evidencia y accion sugerida.

Faltantes:

- Priorizacion por impacto/urgencia.
- Estimacion de ingresos.
- A/B testing.
- Automatizaciones de follow-up.
- Integracion con campanas.
- Medicion de resultados despues de ejecutar.
- Owner o responsable por oportunidad.

## 26. Business Twin

Business Twin es el gemelo comercial del negocio.

Objetivo:

Simular decisiones antes de aplicarlas, mostrando impacto esperado, riesgos, oportunidades y recomendacion.

Elementos actuales:

- Escenarios.
- Simulaciones.
- Reportes.
- Impacto esperado.
- Riesgos.
- Oportunidades.
- Recomendacion.
- Acciones de decision.

Vision funcional:

Business Twin debe permitir preguntar "que pasaria si..." antes de hacer cambios comerciales. Por ejemplo: subir precios, cambiar tono, lanzar oferta, modificar horarios o enfocar otra audiencia.

Vision visual:

Debe sentirse como una sala de simulacion. El usuario debe ver hipotesis, consecuencias y recomendaciones con claridad.

Faltantes:

- Comparacion entre escenarios.
- Simulaciones basadas en datos historicos mas profundos.
- Confidence score.
- Guardado de escenarios favoritos.
- Relacion directa con campanas y Config AI.
- Seguimiento de resultado real vs prediccion.

## 27. Campaigns

Campaigns convierte ideas comerciales en campanas, assets, tareas y experimentos.

Objetivo:

Ayudar al negocio a construir mensajes, ofertas, pruebas y acciones comerciales sin salir de la plataforma.

Elementos actuales:

- Estudio de campanas.
- Campanas.
- Assets.
- Tareas.
- Experimentos.
- Generacion.
- Acciones por campana.
- Estado vacio para crear primera campana.

Vision funcional:

Campaigns debe tomar oportunidades detectadas por Growth, findings de Research o decisiones de Twin y convertirlas en ejecucion comercial.

Vision visual:

Debe sentirse como un estudio de produccion comercial: ideas, mensajes, variantes, tareas y estado.

Faltantes:

- Integracion con email marketing.
- Integracion con WhatsApp.
- Integracion con Meta/Google Ads.
- Calendario de campanas.
- Presupuestos.
- Resultados y atribucion.
- Libreria de assets.
- Workflow de aprobacion.

## 28. Color Mix

Color Mix controla la iluminacion y coherencia visual del panel.

Objetivo:

Permitir mezclar colores principales y aplicarlos de forma coherente a secciones del sistema.

Elementos actuales:

- Control de luces del panel.
- Aplicacion de colores dinamicos.
- Relacion con variables CSS globales.

Vision funcional:

Color Mix debe servir para personalizar la sensacion visual sin romper la consistencia del producto.

Vision visual:

Debe ser una herramienta elegante de direccion visual, no un selector de colores basico.

Faltantes:

- Presets por estilo.
- Validacion de contraste.
- Preview por modulo.
- Reset a tema recomendado.
- Guardado por negocio y por usuario.
- Guia visual de accesibilidad.

## 29. System Health

System Health verifica la salud operativa.

Objetivo:

Revisar autenticacion, Supabase, widget, Knowledge, snapshots, action runs y llaves del servidor.

Elementos actuales:

- Health operativo.
- Checks criticos.
- Warnings.
- Ready state.
- Verificacion de componentes clave.

Vision funcional:

Health debe ser la sala de diagnostico. Cuando algo falla, el usuario o equipo tecnico debe saber donde mirar.

Vision visual:

Debe ser claro, tecnico y accionable. Rojo para critico, amarillo para advertencia, verde para listo, sin exceso visual.

Faltantes:

- Logs visibles por categoria.
- Historial de incidentes.
- Integracion con alertas.
- Estado de APIs externas.
- Test de widget publico.
- Test de RLS.
- Test de storage.
- Recomendaciones automaticas de reparacion.

## 30. Motor IA y agentes Lumenite

LumenAI tiene una arquitectura de agentes orientada a dominios especificos. Esto permite que la IA no actue como una sola entidad generica, sino como especialistas por area.

Agentes actuales:

- Configurator Agent: ayuda en Config AI a modificar Knowledge, widget, calibration, marca, contacto y reglas.
- Widget Support Agent: responde en el widget publico y captura leads.
- Executive Panel Agent: interpreta el Overview.
- Radar Agent: analiza Radar.
- Growth Engine Agent: detecta oportunidades.
- Business Twin Agent: simula decisiones.
- Campaign Studio Agent: trabaja sobre campanas.
- Knowledge Architect Agent: ayuda con la memoria comercial.
- System QA Agent: revisa salud del sistema.

Vision:

Los agentes deben convertirse en una red coordinada de inteligencia comercial. Cada uno entiende su territorio, pero todos se alimentan del mismo negocio.

Faltantes:

- Orquestacion mas visible entre agentes.
- Explicacion al usuario sobre que agente actuo.
- Cost tracking por agente.
- Evaluaciones de calidad.
- Modo seguro para acciones sensibles.
- Registro completo de prompts, decisiones y resultados.
- Politicas de privacidad por agente.

## 31. Acciones, snapshots y rollback

El sistema incluye una base importante para acciones controladas.

Elementos actuales:

- Registry de acciones.
- Riesgo por accion.
- Snapshots de configuracion.
- Action runs.
- Rollback cuando aplica.
- Audit logs.

Vision:

LumenAI debe permitir que la IA actue, pero con control. El usuario debe saber que va a cambiar, por que, que riesgo tiene y como revertirlo.

Faltantes:

- UI completa de auditoria.
- Comparacion visual de snapshots.
- Permisos por rol.
- Aprobacion en dos pasos.
- Bloqueo de acciones criticas sin confirmacion.
- Politicas de retencion de logs.

## 32. Base de datos y entidades principales

El sistema se apoya en Supabase y tiene un modelo de datos amplio.

Entidades centrales:

- businesses: negocio principal.
- profiles: usuario/perfil y relacion con negocio.
- widget_settings: configuracion del widget.
- business_kb: base de conocimiento.
- chats: conversaciones.
- chat_messages: mensajes.
- leads: oportunidades/contactos comerciales.

Entidades operativas:

- lumenai_activity_events.
- lumenai_assistant_logs.
- lumenai_automation_rules.
- lumenai_integrations.
- lumenai_audit_log.

Entidades de configuracion y seguridad:

- lumenai_config_snapshots.
- lumenai_action_runs.

Entidades de mercado e inteligencia:

- market_feeds.
- market_items.
- market_signals.

Entidades de Growth:

- lumenai_opportunities.
- lumenai_growth_playbooks.
- lumenai_followup_tasks.
- lumenai_signal_events.

Entidades de Campaigns:

- lumenai_campaigns.
- lumenai_campaign_assets.
- lumenai_campaign_tasks.
- lumenai_campaign_experiments.

Entidades de Business Twin:

- lumenai_business_snapshots.
- lumenai_business_scenarios.
- lumenai_simulation_reports.
- lumenai_decision_actions.

Entidades de Research:

- lumenai_research_sources.
- lumenai_research_jobs.
- lumenai_research_findings.
- lumenai_research_reports.

Storage:

- lumenai-widget-assets para imagenes del widget, avatar y logo.

Vision:

La base de datos esta pensada para que el sistema no sea solo conversacional. Esta preparada para operar negocio, inteligencia, historial, auditoria, campanas y decisiones.

Faltantes:

- Politicas de retencion de datos.
- Exportacion y eliminacion por usuario.
- Auditoria visual para administradores.
- Indices y optimizacion revisados en produccion.
- Backups y recovery documentados.
- Multi-tenant enterprise con roles mas finos.

## 33. APIs principales

El sistema contiene APIs privadas para panel y APIs publicas para el widget.

APIs de autenticacion:

- Persistencia de sesion.
- Callback OAuth.
- Confirmacion de auth.

APIs publicas del widget:

- Configuracion publica del widget.
- Chat publico.
- Mensajes del widget.
- Transcripcion.

APIs privadas del panel:

- Overview.
- Widget settings.
- Upload de assets.
- Chats.
- Mensajes.
- Leads.
- Autoconfig.
- Calibration.
- Lumenite actions.
- Growth.
- Campaigns.
- Twin.
- Research.
- Radar.
- Lumen Eye.
- System Health.

Vision:

Las APIs deben mantener separacion clara entre lo publico y lo privado. El widget necesita acceso limitado y seguro. El panel necesita APIs autenticadas y auditables.

Faltantes:

- Rate limiting.
- Abuse protection.
- API versioning.
- Observabilidad por endpoint.
- Tests automatizados.
- Documentacion interna.
- Validacion estricta de payloads en todos los endpoints.
- Monitoreo de latencia.

## 34. Seguridad

La seguridad es critica porque el sistema maneja clientes, conversaciones, datos comerciales y configuraciones publicas.

Elementos actuales:

- Supabase Auth.
- Sesiones persistidas.
- Uso de service role solo en servidor.
- RLS en tablas expuestas.
- Politicas por acceso a business_id.
- Separacion entre APIs publicas y privadas.
- Validacion de assets para imagenes.
- Limite de tamano para upload.

Vision:

LumenAI debe operar con seguridad de producto serio. Cada usuario solo debe ver sus negocios, cada accion sensible debe auditarse y el widget no debe exponer datos privados.

Faltantes:

- Roles y permisos por equipo.
- Auditoria visible.
- MFA opcional.
- Proteccion contra abuso del widget.
- Politicas legales.
- Consentimiento de usuarios finales.
- Revision completa de RLS.
- Pentest interno antes de produccion amplia.
- Rate limits por IP/business.

## 35. Rendimiento

El rendimiento es parte central de la experiencia. Un panel premium que se siente lento pierde credibilidad.

Objetivo:

Mantener una interfaz fluida, rapida, sin lag de mouse, sin re-renders innecesarios y con animaciones controladas.

Elementos ya considerados:

- Sidebar memoizada.
- Tema por variables CSS.
- Separacion de shell y contenido.
- Enfoque en optimizacion de FPS.
- Cuidado con fondos animados.
- Avatares normalizados a WebP de 640 x 640.
- Rutas de imagen con nombre unico para evitar cache obsoleta.
- Next.js 16.2.11 con mejoras de arranque y render.
- React 19.2.8.
- Eliminacion de una dependencia CLI que estaba incluida en produccion.
- Animaciones desactivables mediante prefers-reduced-motion.

Vision:

El sistema debe sentirse vivo pero ligero. Las animaciones deben mejorar la percepcion, no competir con el trabajo.

Faltantes:

- Medicion real de performance.
- Profiling de React.
- Lighthouse regular.
- Lazy loading por modulo.
- Virtualizacion en listas grandes.
- Reduccion de renders en dashboards.
- Cache de datos.
- Estados skeleton consistentes.
- Monitoreo de web vitals.
- Revision de las alertas transitivas que dependen de parches posteriores de Next.js.

## 36. Experiencia visual por categoria

### Principal

Debe verse como control central: estado, configuracion y direccion de la IA.

### Inteligencia

Debe verse como capa analitica: senales, oportunidades, investigaciones, simulaciones y campanas.

### Operacion

Debe verse como trabajo diario: conversaciones, leads, instalacion y seguimiento.

### Sistema

Debe verse como configuracion tecnica y visual: identidad, color, salud, seguridad y estado.

La clave es que todas las categorias compartan lenguaje visual, pero cada una tenga una intencion clara.

## 37. Que ya tiene el sistema

El sistema ya tiene una base muy amplia:

- Producto SaaS estructurado.
- Rutas publicas y privadas.
- Login profesional.
- Onboarding funcional.
- Panel con navegacion modular.
- Tema visual premium.
- Widget embebible.
- Configuracion de widget.
- Foto/avatar de asistente.
- Knowledge.
- Chat.
- Leads.
- Calibration Studio.
- Config AI.
- Radar.
- Lumen Eye.
- Research.
- Growth.
- Business Twin.
- Campaigns.
- Color Mix.
- System Health.
- Supabase como backend.
- Storage de assets.
- RLS.
- APIs publicas y privadas.
- Agentes IA por dominio.
- Snapshots, action runs y auditoria.
- Base para automatizaciones.

Esto significa que LumenAI ya no es una idea simple: es una plataforma con estructura real de producto.

## 38. Que falta integrar

Los faltantes mas importantes se agrupan por area.

### Producto y negocio

- Planes y facturacion.
- Gestion de suscripciones.
- Limites por plan.
- Multiples negocios por usuario.
- Invitacion de miembros de equipo.
- Roles: owner, admin, agent, viewer.
- Permisos por modulo.
- Centro de ayuda.
- Pagina de terminos y privacidad.

### Operacion comercial

- Pipeline Kanban.
- Asignacion de leads.
- Recordatorios.
- Notificaciones.
- Integracion CRM.
- Exportacion de leads.
- Historial comercial por contacto.

### Canales

- WhatsApp real.
- Email real.
- SMS si aplica.
- Meta/Instagram.
- Calendario/booking.
- Integracion con formularios externos.

### Knowledge

- Carga de documentos.
- Scraping controlado de sitio web.
- Embeddings/busqueda semantica.
- Deteccion de contradicciones.
- Versionado.
- Aprobaciones.

### IA y automatizacion

- Evaluaciones de calidad de respuestas.
- Registro de costos por agente.
- Model routing.
- Fallbacks.
- Cron jobs.
- Automatizaciones programadas.
- Aprobaciones para acciones sensibles.

### Seguridad

- MFA.
- Rate limiting.
- Abuse protection.
- Auditoria visible.
- Politicas de datos.
- Consentimiento del visitante.
- Revision completa de RLS.

### Observabilidad

- Logs por modulo.
- Error tracking.
- Web analytics.
- Speed insights.
- Health checks programados.
- Alertas internas.

### Diseno y UX

- Unificacion completa de estilo obsidian.
- Mobile polish.
- Estados vacios mas accionables.
- Skeletons consistentes.
- Previews responsive.
- Accesibilidad.
- Validacion de contraste.

### Testing y produccion

- Tests unitarios.
- Tests de integracion.
- E2E login-onboarding-widget-chat-lead.
- QA visual con screenshots.
- Smoke tests.
- Checklist automatizado pre-deploy.
- Documentacion tecnica.

## 39. Roadmap recomendado

### Fase 1: Consolidacion del nucleo

- Unificar onboarding.
- Pulir login.
- Fortalecer Settings y Widget.
- Revisar Knowledge.
- Mejorar Chat y Leads.
- Asegurar RLS y auth.
- Agregar tests criticos.

### Fase 2: Operacion comercial real

- Pipeline Kanban.
- Asignacion de leads.
- Notificaciones.
- Exportacion.
- Resumen IA por conversacion.
- Acciones recomendadas en Overview.

### Fase 3: Inteligencia accionable

- Mejorar Radar, Lumen Eye, Growth, Twin y Research.
- Conectar oportunidades con campanas.
- Crear reportes ejecutivos.
- Agregar scheduling.
- Medir impacto de acciones.

### Fase 4: Integraciones

- WhatsApp.
- Email.
- CRM.
- Calendario.
- Ads/campaign platforms.
- Webhooks.
- Marketplace o integraciones configurables.

### Fase 5: Enterprise readiness

- Roles y permisos.
- Auditoria avanzada.
- MFA.
- Billing.
- Observabilidad.
- SLA.
- Gestion de datos.
- Seguridad legal y cumplimiento.

## 40. Vision final del sistema

La vision final de LumenAI debe ser esta:

LumenAI es el sistema operativo comercial inteligente de un negocio. Atiende clientes, aprende del negocio, captura oportunidades, recomienda acciones, simula decisiones y convierte la actividad diaria en crecimiento medible.

Visualmente, debe presentarse como una consola premium de inteligencia: oscura, precisa, sobria, viva y profundamente profesional. Funcionalmente, debe comportarse como un equipo comercial aumentado por IA: responde, escucha, detecta, organiza, recomienda y actua con permiso.

El mayor valor del sistema esta en la conexion entre modulos. El widget genera conversaciones. Las conversaciones generan leads. Los leads alimentan Growth. Growth alimenta Campaigns. Research entrega contexto. Twin simula decisiones. Config AI aplica cambios. Calibration define comportamiento. Knowledge asegura precision. Overview y Radar muestran el estado del negocio. Health protege la operacion.

Esa es la historia completa que el sistema debe contar: no una herramienta aislada, sino una inteligencia comercial integrada de punta a punta.

## 41. Cierre profesional

El sistema LumenAI ya posee una estructura avanzada para convertirse en una plataforma comercial de alto valor. Tiene una base tecnica amplia, una direccion visual clara, una arquitectura de datos preparada para crecimiento y una vision de IA distribuida por modulos.

El siguiente salto no consiste solo en agregar mas funciones, sino en consolidar la experiencia completa: hacer que cada modulo se sienta conectado, que cada accion tenga trazabilidad, que cada dato tenga utilidad y que cada pantalla comunique la misma promesa de producto.

La meta es que el dueno del panel no sienta que esta configurando un chatbot, sino que esta construyendo el cerebro comercial digital de su negocio.
