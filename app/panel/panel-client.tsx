// app/panel/panel-client.tsx
"use client";

export default function PanelClient({ userId }: { userId: string }) {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>✅ Panel OK</h1>
      <p>
        <b>UserId:</b> {userId}
      </p>
      <p>Si ves esto, el login + cookies ya están funcionando.</p>
    </main>
  );
}