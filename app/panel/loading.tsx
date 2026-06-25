export default function PanelLoading() {
  return (
    <div
      className="min-h-screen bg-[#04060b] p-4 text-white md:p-5"
      style={{ colorScheme: "dark" }}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[82px_minmax(0,1fr)]">
        <div className="hidden h-[calc(100vh-32px)] rounded-[18px] border border-white/[0.06] bg-white/[0.025] md:block" />

        <main className="min-w-0 overflow-hidden rounded-[16px] border border-white/[0.055] bg-white/[0.018]">
          <header className="border-b border-white/[0.045] px-5 py-5 md:px-6">
            <div className="h-3 w-20 rounded-full bg-white/[0.06]" />
            <div className="mt-4 h-8 w-48 rounded-full bg-white/[0.08]" />
            <div className="mt-4 h-4 max-w-[620px] rounded-full bg-white/[0.045]" />
          </header>

          <div className="grid gap-4 px-5 py-5 md:px-6 md:py-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-36 rounded-[16px] border border-white/[0.045] bg-white/[0.018]"
                />
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
              <div className="h-72 rounded-[16px] border border-white/[0.045] bg-white/[0.018]" />
              <div className="h-72 rounded-[16px] border border-white/[0.045] bg-white/[0.018]" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
