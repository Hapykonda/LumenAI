"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Loader2,
  Mail,
  Palette,
  ShieldCheck,
  Sparkles,
  Store,
  Upload,
  WalletCards,
  X,
} from "lucide-react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import { AnimatedHeroLights } from "@/components/ui/animated-hero-lights";
import {
  deleteWidgetAsset,
  publishWidgetAvatar,
  uploadWidgetAsset,
  validateWidgetImage,
} from "@/lib/widget-assets-client";

type FormState = {
  businessName: string;
  industry: string;
  products: string;
  pricing: string;
  payments: string;
  contactEmail: string;
  whatsapp: string;
  hours: string;
  assistantName: string;
  tone: string;
  avatarUrl: string;
  primaryColor: string;
  secondaryColor: string;
  initialKnowledge: string;
};

type DraftState = {
  form: FormState;
  step: number;
};

const STORAGE_KEY = "lumenai:onboarding:wizard:v1";

const defaultForm: FormState = {
  businessName: "",
  industry: "",
  products: "",
  pricing: "",
  payments: "",
  contactEmail: "",
  whatsapp: "",
  hours: "",
  assistantName: "LumenAI",
  tone: "Profesional, claro y humano",
  avatarUrl: "",
  primaryColor: "#00E5FF",
  secondaryColor: "#1B43FF",
  initialKnowledge: "",
};

const steps = [
  { title: "Identidad", icon: Store },
  { title: "Industria", icon: Sparkles },
  { title: "Servicios", icon: BrainCircuit },
  { title: "Precios", icon: WalletCards },
  { title: "Contacto", icon: Mail },
  { title: "Personalidad", icon: Bot },
  { title: "Marca", icon: Palette },
  { title: "Knowledge", icon: BrainCircuit },
  { title: "Preview", icon: ImageIcon },
  { title: "Confirmar", icon: ShieldCheck },
];

function loadDraft(): DraftState {
  if (typeof window === "undefined") {
    return { form: defaultForm, step: 0 };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { form: defaultForm, step: 0 };
    const parsed = JSON.parse(raw) as Partial<DraftState>;
    return {
      form: { ...defaultForm, ...(parsed.form ?? {}) },
      step: Math.max(0, Math.min(steps.length - 1, Number(parsed.step ?? 0))),
    };
  } catch {
    return { form: defaultForm, step: 0 };
  }
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo crear el negocio.";
}

export default function OnboardingClient({ email }: { email: string }) {
  const router = useRouter();
  const draft = useMemo(() => loadDraft(), []);
  const [form, setForm] = useState<FormState>(draft.form);
  const [step, setStep] = useState(draft.step);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const completion = useMemo(() => {
    const fields: Array<keyof FormState> = [
      "businessName",
      "industry",
      "products",
      "pricing",
      "payments",
      "contactEmail",
      "hours",
      "assistantName",
      "tone",
      "initialKnowledge",
    ];
    const filled = fields.filter((key) => form[key].trim()).length;
    return Math.round((filled / fields.length) * 100);
  }, [form]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, step }));
  }, [form, step]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    if (err) setErr(null);
  }

  function canContinue(currentStep = step) {
    if (currentStep === 0 && !form.businessName.trim()) {
      return "Escribe el nombre del negocio.";
    }
    return null;
  }

  function goNext() {
    const validation = canContinue();
    if (validation) {
      setErr(validation);
      return;
    }
    setStep((value) => Math.min(steps.length - 1, value + 1));
  }

  function goBack() {
    setErr(null);
    setStep((value) => Math.max(0, value - 1));
  }

  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setErr(null);

    const validation = canContinue(0);
    if (validation) {
      setErr(validation);
      setStep(0);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(String(json?.error ?? "No se pudo crear el negocio."));
      }

      if (avatarFile) {
        const asset = await uploadWidgetAsset(avatarFile, "avatar");

        try {
          await publishWidgetAvatar(asset.url);
        } catch (avatarError) {
          await deleteWidgetAsset(asset.url).catch(() => {});
          throw avatarError;
        }
      }

      window.localStorage.removeItem(STORAGE_KEY);
      router.replace("/panel");
    } catch (error) {
      setErr(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  const CurrentIcon = steps[step]?.icon ?? Store;

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-[#05070B] px-4 py-6 text-white md:px-6">
      <a className="lmn-skip-link" href="#onboarding-form">
        Ir a la configuración
      </a>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 520px at 12% 10%, rgba(0,229,255,.14), transparent 60%), radial-gradient(760px 520px at 90% 78%, rgba(27,67,255,.12), transparent 62%), linear-gradient(180deg,#05070B,#030408)",
        }}
      />
      <AnimatedHeroLights intensity="low" className="opacity-65" />
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,.065) 1px, transparent 1px), linear-gradient(180deg, rgba(255,255,255,.05) 1px, transparent 1px)",
          backgroundSize: "88px 88px",
          maskImage: "radial-gradient(circle at 50% 20%, black, transparent 72%)",
        }}
      />

      <form
        id="onboarding-form"
        tabIndex={-1}
        onSubmit={submit}
        aria-busy={loading}
        className="relative z-10 mx-auto grid max-w-7xl gap-5 lg:grid-cols-[320px_minmax(0,1fr)_360px]"
      >
        <aside className="rounded-[12px] border border-white/[0.07] bg-white/[0.035] p-4 shadow-[0_22px_70px_rgba(0,0,0,.32)] backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-[8px] border border-cyan-200/14 bg-cyan-300/[0.08]">
              <CurrentIcon className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <div className="text-sm font-black">LumenAI</div>
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/36">
                AI Sales & Support System
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-black text-white/46">
              <span>Configuracion inicial</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.07]">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#00E5FF,#1B43FF)]"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <nav className="mt-6 grid gap-2" aria-label="Pasos de onboarding">
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = index === step;
              const done = index < step;
              return (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    const validation = index > step ? canContinue() : null;
                    if (validation) {
                      setErr(validation);
                      return;
                    }
                    setStep(index);
                  }}
                  className={`grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3 rounded-[8px] border p-2.5 text-left transition ${
                    active
                      ? "border-cyan-200/22 bg-cyan-300/[0.08] text-white"
                      : "border-white/[0.055] bg-black/18 text-white/54 hover:text-white"
                  }`}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[7px] bg-white/[0.04]">
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{item.title}</span>
                    <span className="block text-[11px] text-white/32">Paso {index + 1}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="rounded-[14px] border border-white/[0.07] bg-[#080B12]/86 p-5 shadow-[0_28px_90px_rgba(0,0,0,.42)] backdrop-blur-xl md:p-7">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100/44">
                Paso {step + 1} de {steps.length}
              </div>
              <h1 className="mt-2 text-4xl font-black tracking-[-0.055em]">
                {steps[step]?.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/52">
                {step === 9
                  ? "Revisa lo que se guardara. Los datos extendidos quedan como borradores editables en el panel."
                  : "Completa lo que tengas disponible. Solo el nombre del negocio es obligatorio para crear el workspace."}
              </p>
            </div>
            <div className="rounded-[8px] border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-xs text-white/46">
              Acceso: <span className="font-bold text-white/72">{email || "sesion activa"}</span>
            </div>
          </div>

          <div className="mt-7 min-h-[440px]">
            {step === 0 ? (
              <StepGrid>
                <Field
                  label="Nombre del negocio *"
                  value={form.businessName}
                  onChange={(value) => update("businessName", value)}
                  placeholder="Ej: LumenAI Studio"
                />
                <Textarea
                  label="Descripcion breve"
                  value={form.initialKnowledge}
                  onChange={(value) => update("initialKnowledge", value)}
                  placeholder="Que vende, a quien atiende y que deberia saber la IA desde el inicio."
                />
              </StepGrid>
            ) : null}

            {step === 1 ? (
              <StepGrid>
                <Field
                  label="Industria o rubro"
                  value={form.industry}
                  onChange={(value) => update("industry", value)}
                  placeholder="Ej: Agencia web, ecommerce, salud privada"
                />
                <InfoBlock
                  title="Uso en el sistema"
                  text="El rubro ayuda a orientar tono, ejemplos, oportunidades y recomendaciones. No reemplaza Knowledge."
                />
              </StepGrid>
            ) : null}

            {step === 2 ? (
              <StepGrid>
                <Textarea
                  label="Productos y servicios"
                  value={form.products}
                  onChange={(value) => update("products", value)}
                  placeholder="Lista servicios, paquetes, productos principales o categorias."
                />
              </StepGrid>
            ) : null}

            {step === 3 ? (
              <StepGrid>
                <Textarea
                  label="Precios o rangos"
                  value={form.pricing}
                  onChange={(value) => update("pricing", value)}
                  placeholder="Indica precios publicados, rangos o aclara si se cotiza caso a caso."
                />
                <Textarea
                  label="Pagos y condiciones"
                  value={form.payments}
                  onChange={(value) => update("payments", value)}
                  placeholder="Metodos de pago, transferencias, cuotas, politicas o anticipos."
                />
              </StepGrid>
            ) : null}

            {step === 4 ? (
              <StepGrid>
                <Field
                  label="Email del negocio"
                  value={form.contactEmail}
                  onChange={(value) => update("contactEmail", value)}
                  placeholder="contacto@empresa.com"
                />
                <Field
                  label="WhatsApp"
                  value={form.whatsapp}
                  onChange={(value) => update("whatsapp", value)}
                  placeholder="+56 9 1234 5678"
                />
                <Field
                  label="Horario"
                  value={form.hours}
                  onChange={(value) => update("hours", value)}
                  placeholder="Lun a Vie 09:00-18:00"
                />
              </StepGrid>
            ) : null}

            {step === 5 ? (
              <StepGrid>
                <Field
                  label="Nombre del asistente"
                  value={form.assistantName}
                  onChange={(value) => update("assistantName", value)}
                  placeholder="LumenAI"
                />
                <Textarea
                  label="Personalidad y tono"
                  value={form.tone}
                  onChange={(value) => update("tone", value)}
                  placeholder="Ej: profesional, consultivo, cercano, directo, sin presionar."
                />
              </StepGrid>
            ) : null}

            {step === 6 ? (
              <StepGrid>
                <div className="grid gap-3 rounded-[8px] border border-white/[0.07] bg-black/20 p-4">
                  <div className="flex items-center gap-4">
                    <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border border-cyan-200/18 bg-cyan-300/[0.06] text-xl font-black text-cyan-100">
                      {avatarPreview || form.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarPreview || form.avatarUrl}
                          alt="Foto seleccionada para el perfil"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (form.assistantName || form.businessName || "L").slice(0, 1)
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-white">Foto del perfil</div>
                      <p className="mt-1 text-xs leading-5 text-white/46">
                        El dueño del panel decide la imagen que verán los clientes.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] border border-cyan-200/16 bg-cyan-300/[0.07] px-3 text-xs font-black text-white transition hover:border-cyan-200/28">
                      <Upload className="h-4 w-4" />
                      Elegir y recortar
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.currentTarget.files?.[0] ?? null;
                          event.currentTarget.value = "";
                          const validation = file ? validateWidgetImage(file) : null;

                          if (validation) {
                            setErr(validation);
                            return;
                          }

                          setCropFile(file);
                        }}
                      />
                    </label>

                    {avatarFile || avatarPreview ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview("");
                        }}
                        className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-white/[0.08] bg-white/[0.025] px-3 text-xs font-black text-white/68 transition hover:text-white"
                      >
                        <X className="h-4 w-4" />
                        Quitar
                      </button>
                    ) : null}
                  </div>
                </div>

                <Field
                  label="URL de avatar o foto"
                  value={form.avatarUrl}
                  onChange={(value) => {
                    update("avatarUrl", value);
                    if (value.trim()) {
                      setAvatarFile(null);
                      setAvatarPreview("");
                    }
                  }}
                  placeholder="https://..."
                />
                <ColorField
                  label="Color principal"
                  value={form.primaryColor}
                  onChange={(value) => update("primaryColor", value)}
                />
                <ColorField
                  label="Color secundario"
                  value={form.secondaryColor}
                  onChange={(value) => update("secondaryColor", value)}
                />
                <InfoBlock
                  title="Identidad conectada"
                  text="La foto elegida se publicará en Settings, Widget y en la cabecera del panel. Después podrás cambiarla o retirarla."
                />
              </StepGrid>
            ) : null}

            {step === 7 ? (
              <StepGrid>
                <Textarea
                  label="Knowledge inicial"
                  value={form.initialKnowledge}
                  onChange={(value) => update("initialKnowledge", value)}
                  placeholder="Preguntas frecuentes, reglas, garantias, politicas, procesos o informacion critica."
                />
                <InfoBlock
                  title="Estado"
                  text="Este contenido se guarda como borrador. Debes revisarlo y publicarlo desde Knowledge antes de que sea fuente definitiva del widget."
                />
              </StepGrid>
            ) : null}

            {step === 8 ? (
              <WidgetPreview form={form} avatarPreview={avatarPreview} />
            ) : null}

            {step === 9 ? (
              <div className="grid gap-3">
                <Summary label="Negocio" value={form.businessName} />
                <Summary label="Industria" value={form.industry || "Pendiente"} />
                <Summary label="Asistente" value={form.assistantName || "LumenAI"} />
                <Summary label="Tono" value={form.tone || "Pendiente"} />
                <Summary label="Contacto" value={form.contactEmail || form.whatsapp || "Pendiente"} />
                <Summary label="Knowledge" value={form.initialKnowledge || form.products || "Borrador pendiente"} />
              </div>
            ) : null}
          </div>

          {err ? (
            <div className="mt-4 rounded-[8px] border border-red-300/16 bg-red-500/10 p-3 text-sm leading-6 text-red-100" role="alert">
              {err}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 0 || loading}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] border border-white/[0.07] bg-white/[0.025] px-4 text-sm font-black text-white/62 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>

            <div className="flex flex-col gap-3 sm:flex-row">
              {step > 0 && step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center rounded-[8px] px-4 text-sm font-black text-white/46 transition hover:bg-white/[0.025] hover:text-white"
                >
                  Omitir por ahora
                </button>
              ) : null}

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#00E5FF,#1B43FF)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5"
                >
                  Continuar
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[8px] bg-[linear-gradient(135deg,#00E5FF,#1B43FF)] px-5 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {loading ? "Creando negocio..." : "Crear negocio y entrar"}
                </button>
              )}
            </div>
          </div>
        </section>

        <aside className="rounded-[12px] border border-white/[0.07] bg-white/[0.035] p-4 shadow-[0_22px_70px_rgba(0,0,0,.32)] backdrop-blur-xl">
          <div className="text-[11px] font-black uppercase tracking-[0.18em] text-white/36">
            Preview operativo
          </div>
          <WidgetPreview form={form} avatarPreview={avatarPreview} compact />

          <div className="mt-5 grid gap-3">
            <MiniCheck icon={<Store className="h-4 w-4" />} text="Crea business y evita duplicados por usuario." />
            <MiniCheck icon={<Bot className="h-4 w-4" />} text="Crea widget_settings con public_key." />
            <MiniCheck icon={<BrainCircuit className="h-4 w-4" />} text="Guarda Knowledge inicial como borrador." />
            <MiniCheck icon={<Clock3 className="h-4 w-4" />} text="Progreso local hasta completar el setup." />
          </div>
        </aside>
      </form>
      </main>

      {cropFile ? (
        <ImageCropDialog
          file={cropFile}
          title="Encuadrar foto inicial"
          onCancel={() => setCropFile(null)}
          onConfirm={(croppedFile) => {
            setAvatarFile(croppedFile);
            setAvatarPreview(URL.createObjectURL(croppedFile));
            update("avatarUrl", "");
            setCropFile(null);
          }}
        />
      ) : null}
    </>
  );
}

function StepGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4">{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-white/66">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 rounded-[8px] border border-white/[0.07] bg-black/24 px-3 text-sm text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/24"
      />
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-white/66">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={7}
        className="min-h-[160px] resize-y rounded-[8px] border border-white/[0.07] bg-black/24 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-white/24 focus:border-cyan-200/24"
      />
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-black text-white/66">{label}</span>
      <span className="grid grid-cols-[48px_minmax(0,1fr)] gap-3">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-12 rounded-[8px] border border-white/[0.08] bg-black/24 p-1"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 rounded-[8px] border border-white/[0.07] bg-black/24 px-3 text-sm font-black text-white outline-none transition focus:border-cyan-200/24"
        />
      </span>
    </label>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[8px] border border-cyan-200/12 bg-cyan-300/[0.055] p-4 text-sm leading-6 text-cyan-50/74">
      <strong className="block text-white">{title}</strong>
      <span className="mt-1 block">{text}</span>
    </div>
  );
}

function WidgetPreview({
  form,
  avatarPreview,
  compact,
}: {
  form: FormState;
  avatarPreview?: string;
  compact?: boolean;
}) {
  const avatarUrl = avatarPreview || form.avatarUrl;

  return (
    <div
      className={`mt-4 overflow-hidden rounded-[12px] border border-white/[0.08] bg-black/32 ${
        compact ? "" : "max-w-xl"
      }`}
      style={{
        boxShadow: `0 0 0 1px ${form.primaryColor}24, 0 18px 42px rgba(0,0,0,.24)`,
      }}
    >
      <div
        className="flex items-center gap-3 border-b border-white/[0.07] p-4"
        style={{
          background: `linear-gradient(135deg, ${form.primaryColor}22, ${form.secondaryColor}18)`,
        }}
      >
        <div
          className="grid h-11 w-11 place-items-center overflow-hidden rounded-[8px] border border-white/[0.12] bg-black/30 text-sm font-black"
          style={{ color: form.primaryColor }}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            (form.assistantName || form.businessName || "L").slice(0, 1)
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">
            {form.businessName || "Tu negocio"}
          </div>
          <div className="truncate text-xs text-white/44">
            Asistente: {form.assistantName || "LumenAI"}
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="max-w-[86%] rounded-[10px] border border-white/[0.07] bg-white/[0.045] p-3 text-sm leading-6 text-white/74">
          Hola, soy {form.assistantName || "LumenAI"}. Te ayudo con{" "}
          {form.businessName || "tu negocio"}.
        </div>
        <div className="ml-auto max-w-[82%] rounded-[10px] p-3 text-sm font-bold text-[#05070B]" style={{ background: form.primaryColor }}>
          Quiero conocer servicios y precios.
        </div>
        <div className="max-w-[90%] rounded-[10px] border border-white/[0.07] bg-white/[0.045] p-3 text-sm leading-6 text-white/68">
          {form.products
            ? "Ya tengo un borrador de servicios para responder con mas precision."
            : "Cuando completes Knowledge, respondere con datos publicados del negocio."}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-[8px] border border-white/[0.06] bg-white/[0.025] p-3">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-white/34">{label}</span>
      <span className="text-sm font-bold text-white/72">{value}</span>
    </div>
  );
}

function MiniCheck({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex gap-3 rounded-[8px] border border-white/[0.06] bg-black/18 p-3 text-sm leading-6 text-white/52">
      <span className="mt-1 text-cyan-100/78">{icon}</span>
      <span>{text}</span>
    </div>
  );
}
