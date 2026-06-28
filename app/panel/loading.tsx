export default function PanelLoading() {
  return (
    <div
      className="min-h-screen p-4 text-[var(--lmn-text)] md:p-5"
      style={{
        background:
          "radial-gradient(760px 480px at 86% 8%, rgba(var(--lmn-accent-rgb), .10), transparent 58%), var(--lmn-bg)",
      }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[82px_minmax(0,1fr)]">
        <div className="hidden h-[calc(100vh-32px)] rounded-[18px] border border-[var(--lmn-border)] bg-[var(--lmn-surface)] md:block" />

        <main className="min-w-0 overflow-hidden rounded-[18px] border border-[var(--lmn-border)] bg-[var(--lmn-surface)] shadow-[var(--lmn-shadow-card)]">
          <header className="border-b border-[var(--lmn-border)] px-5 py-5 md:px-6">
            <div className="h-3 w-20 rounded-full bg-[var(--lmn-surface-3)]" />
            <div className="mt-4 h-8 w-48 rounded-full bg-[var(--lmn-surface-3)]" />
            <div className="mt-4 h-4 max-w-[620px] rounded-full bg-[var(--lmn-surface-3)]" />
          </header>

          <div className="grid gap-4 px-5 py-5 md:px-6 md:py-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 rounded-[16px] border border-[var(--lmn-border)] bg-[var(--lmn-surface-2)]"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="h-72 rounded-[16px] border border-[var(--lmn-border)] bg-[var(--lmn-surface-2)]" />
              <div className="h-72 rounded-[16px] border border-[var(--lmn-border)] bg-[var(--lmn-surface-2)]" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
