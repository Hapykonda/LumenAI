import OnboardingForm from "./OnboardingForm";

export default function OnboardingPage() {
  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Crear tu negocio</h1>
      <p style={{ opacity: 0.85, marginBottom: 18 }}>
        Antes de entrar al panel, necesitamos estos datos para configurar tu LumenAI.
      </p>

      <OnboardingForm />
    </main>
  );
}
