export default function PanelBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 h-screen w-screen overflow-hidden"
      style={{
        pointerEvents: "none",
        background: `
          radial-gradient(circle at 14% 0%, rgba(var(--lmn-accent-rgb, 0,178,255), .038), transparent 40%),
          radial-gradient(circle at 88% 8%, rgba(var(--lmn-accent-2-rgb, 91,108,255), .026), transparent 44%),
          linear-gradient(180deg, #000 0%, #010102 52%, #000 100%)
        `,
        zIndex: 0,
        contain: "strict",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          pointerEvents: "none",
          background: `
            linear-gradient(135deg, rgba(255,255,255,.010), transparent 24%),
            linear-gradient(180deg, transparent 0%, rgba(0,0,0,.32) 58%, rgba(0,0,0,.82) 100%)
          `,
          opacity: 0.86,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          pointerEvents: "none",
          background:
            "radial-gradient(circle at 50% 42%, transparent 0%, rgba(0,0,0,.26) 50%, rgba(0,0,0,.78) 100%)",
        }}
      />
    </div>
  );
}
