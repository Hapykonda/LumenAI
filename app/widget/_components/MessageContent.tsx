"use client";

import React from "react";

type Block =
  | { type: "hr" }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "quote"; text: string }
  | { type: "note"; kind: "ok" | "warn" | "info"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "kv"; rows: Array<{ k: string; v: string; isPrice?: boolean }> }
  | { type: "p"; text: string };

function isUrl(token: string) {
  return /^https?:\/\/\S+$/i.test(token);
}

function isKeyPhrase(s: string) {
  const t = s.trim();
  if (!t) return false;
  const words = t.split(/\s+/).filter(Boolean);
  return t.length <= 34 && words.length <= 5;
}

function looksLikePrice(v: string) {
  const s = v.trim();
  return /\$\s?[\d.,]+/.test(s) || /\bclp\b/i.test(s) || /\busd\b/i.test(s) || /\beur\b/i.test(s);
}

function looksLikePriceOnly(line: string) {
  const s = line.trim();
  return /^(\$|clp|usd|eur)\s*[\d.,]+/i.test(s);
}

function normalizeKey(rawKey: string) {
  return rawKey
    .trim()
    .replace(/^(-|\u2022)\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function parseNoteLine(line: string) {
  const m = line.match(/^(✅|⚠️|ℹ️|💡)\s+(.+)$/);
  if (!m) return null;
  const icon = m[1];
  const text = m[2].trim();
  const kind: "ok" | "warn" | "info" = icon === "✅" ? "ok" : icon === "⚠️" ? "warn" : "info";
  return { kind, text };
}

type KvParse = { row: { k: string; v: string; isPrice?: boolean }; consume: number } | null;

function parseKvRow(lines: string[], idx: number): KvParse {
  const t = (lines[idx] ?? "").trim();
  const next = (lines[idx + 1] ?? "").trim();

  if (!t) return null;

  const bulletPriceSameLine = t.match(/^(?:-|\u2022)\s*(.+?)\s+(\$[\d.,]+.*)$/);
  if (bulletPriceSameLine) {
    const k = normalizeKey(bulletPriceSameLine[1]);
    const v = bulletPriceSameLine[2].trim();
    return { row: { k, v, isPrice: true }, consume: 1 };
  }

  const keyValue = t.match(/^(.{2,80}?):\s+(.+)$/);
  if (keyValue) {
    const k = normalizeKey(keyValue[1]);
    const v = keyValue[2].trim();
    const isPrice = looksLikePrice(v);
    const words = k.split(/\s+/).filter(Boolean).length;
    if (!isPrice && (k.length > 40 || words > 8)) return null;
    return { row: { k, v, isPrice }, consume: 1 };
  }

  const keyOnly = t.match(/^(.{2,80}?):\s*$/);
  if (keyOnly && next) {
    const k = normalizeKey(keyOnly[1]);
    const v = next;
    const isPrice = looksLikePrice(v) || looksLikePriceOnly(v);
    const words = k.split(/\s+/).filter(Boolean).length;
    if (!isPrice && (k.length > 40 || words > 8)) return null;
    return { row: { k, v, isPrice }, consume: 2 };
  }

  if (next && looksLikePriceOnly(next) && t.length <= 80 && !/[?¿]$/.test(t)) {
    const k = normalizeKey(t);
    const v = next;
    return { row: { k, v, isPrice: true }, consume: 2 };
  }

  return null;
}

function renderInline(text: string) {
  const urlParts = text.split(/(https?:\/\/[^\s]+)/g);

  return urlParts.map((part, i) => {
    if (isUrl(part)) {
      return (
        <a key={`u-${i}`} href={part} target="_blank" rel="noreferrer" className="lmn-link" title={part}>
          {part}
        </a>
      );
    }

    const tokens = part.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);

    return (
      <React.Fragment key={`t-${i}`}>
        {tokens.map((tk, j) => {
          const isBold = tk.startsWith("**") && tk.endsWith("**") && tk.length >= 4;
          if (isBold) {
            const inner = tk.slice(2, -2);
            const keyish = isKeyPhrase(inner);
            return (
              <strong key={`b-${j}`} className={keyish ? "lmn-strongKey" : "lmn-strong"}>
                {inner}
              </strong>
            );
          }

          const isCode = tk.startsWith("`") && tk.endsWith("`") && tk.length >= 2;
          if (isCode) {
            return (
              <code key={`c-${j}`} className="lmn-inlineCode">
                {tk.slice(1, -1)}
              </code>
            );
          }

          return <React.Fragment key={`p-${j}`}>{tk}</React.Fragment>;
        })}
      </React.Fragment>
    );
  });
}

function parseTextToBlocks(block: string): Block[] {
  const lines = block.replace(/\r/g, "").split("\n");
  const out: Block[] = [];

  const bulletRe = /^(-|\u2022)\s+/;
  const orderedRe = /^\d+[.)]\s+/;

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const t = raw.trim();

    if (!t) {
      i++;
      continue;
    }

    if (t === "---") {
      out.push({ type: "hr" });
      i++;
      continue;
    }

    if (t.startsWith("## ")) {
      out.push({ type: "h2", text: t.slice(3).trim() });
      i++;
      continue;
    }

    if (t.startsWith("### ")) {
      out.push({ type: "h3", text: t.slice(4).trim() });
      i++;
      continue;
    }

    if (t.startsWith("> ")) {
      const q: string[] = [];
      while (i < lines.length) {
        const tt = (lines[i] ?? "").trim();
        if (!tt.startsWith("> ")) break;
        q.push(tt.slice(2));
        i++;
      }
      out.push({ type: "quote", text: q.join("\n") });
      continue;
    }

    const firstNote = parseNoteLine(t);
    if (firstNote) {
      const parts: string[] = [firstNote.text];
      const kind = firstNote.kind;
      i++;
      while (i < lines.length) {
        const tt = (lines[i] ?? "").trim();
        const nn = parseNoteLine(tt);
        if (!nn) break;
        parts.push(nn.text);
        i++;
      }
      out.push({ type: "note", kind, text: parts.join("\n") });
      continue;
    }

    const first = parseKvRow(lines, i);
    if (first) {
      const rows = [first.row];
      i += first.consume;

      while (i < lines.length) {
        const nxt = parseKvRow(lines, i);
        if (!nxt) break;
        rows.push(nxt.row);
        i += nxt.consume;
      }

      const hasPrice = rows.some((r) => r.isPrice);
      if (rows.length >= 2 || hasPrice) out.push({ type: "kv", rows });
      else out.push({ type: "p", text: `${rows[0].k}: ${rows[0].v}` });
      continue;
    }

    if (bulletRe.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const tt = (lines[i] ?? "").trim();
        if (!bulletRe.test(tt)) break;
        items.push(tt.replace(bulletRe, "").trim());
        i++;
      }
      out.push({ type: "ul", items });
      continue;
    }

    if (orderedRe.test(t)) {
      const items: string[] = [];
      while (i < lines.length) {
        const tt = (lines[i] ?? "").trim();
        if (!orderedRe.test(tt)) break;
        items.push(tt.replace(orderedRe, "").trim());
        i++;
      }
      out.push({ type: "ol", items });
      continue;
    }

    const p: string[] = [raw];
    i++;
    while (i < lines.length) {
      const nxt = lines[i] ?? "";
      const nt = nxt.trim();
      if (!nt) break;
      if (nt === "---") break;
      if (nt.startsWith("## ") || nt.startsWith("### ")) break;
      if (nt.startsWith("> ")) break;
      if (bulletRe.test(nt) || orderedRe.test(nt)) break;
      if (parseNoteLine(nt)) break;
      if (parseKvRow(lines, i)) break;
      p.push(nxt);
      i++;
    }
    out.push({ type: "p", text: p.join("\n").trim() });
  }

  return out;
}

function renderParagraph(text: string, className: string, key: string, highlightQuestion?: boolean) {
  const lines = text.split("\n");
  const lastIdx = lines.length - 1;

  return (
    <div key={key} className={className}>
      {lines.map((ln, i) => {
        const isLast = i === lastIdx;
        const isQ = highlightQuestion && isLast && /[?¿]\s*$/.test(ln.trim());
        return (
          <div key={`${key}-l${i}`} className={isQ ? "lmn-question" : undefined}>
            {renderInline(ln)}
          </div>
        );
      })}
    </div>
  );
}

function renderBlocks(blocks: Block[]) {
  const hasH2 = blocks.some((b) => b.type === "h2");
  let leadApplied = false;

  return blocks.map((b, idx) => {
    const isLastBlock = idx === blocks.length - 1;

    if (b.type === "hr") return <hr key={`hr-${idx}`} className="lmn-hr" />;

    if (b.type === "h2") {
      return (
        <div key={`h2-${idx}`} className="lmn-h2Wrap">
          <div className="lmn-h2">{renderInline(b.text)}</div>
          <div className="lmn-h2Line" aria-hidden="true" />
        </div>
      );
    }

    if (b.type === "h3") {
      return (
        <div key={`h3-${idx}`} className="lmn-h3">
          {renderInline(b.text)}
        </div>
      );
    }

    if (b.type === "quote") {
      return (
        <div key={`q-${idx}`} className="lmn-quote">
          {b.text.split("\n").map((ln, i) => (
            <div key={`q-${idx}-${i}`} className="lmn-p">
              {renderInline(ln)}
            </div>
          ))}
        </div>
      );
    }

    if (b.type === "note") {
      const cls = b.kind === "ok" ? "lmn-note lmn-noteOk" : b.kind === "warn" ? "lmn-note lmn-noteWarn" : "lmn-note";
      return (
        <div key={`n-${idx}`} className={cls}>
          {b.text.split("\n").map((ln, i) => (
            <div key={`n-${idx}-${i}`} className="lmn-p">
              {renderInline(ln)}
            </div>
          ))}
        </div>
      );
    }

    if (b.type === "kv") {
      return (
        <div key={`kv-${idx}`} className="lmn-kv">
          <div className="lmn-kvHairline" aria-hidden="true" />
          {b.rows.map((r, k) => (
            <div key={`kvr-${idx}-${k}`} className="lmn-kvRow">
              <div className="lmn-kvKey">{renderInline(r.k)}</div>
              <div className={r.isPrice ? "lmn-kvVal lmn-kvPrice" : "lmn-kvVal"}>{renderInline(r.v)}</div>
            </div>
          ))}
        </div>
      );
    }

    if (b.type === "ul") {
      return (
        <ul key={`ul-${idx}`} className="lmn-ul">
          {b.items.map((it, k) => (
            <li key={`li-${idx}-${k}`} className="lmn-li">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    }

    if (b.type === "ol") {
      return (
        <ol key={`ol-${idx}`} className="lmn-ol">
          {b.items.map((it, k) => (
            <li key={`oli-${idx}-${k}`} className="lmn-li">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
    }

    let cls = "lmn-p";
    if (!hasH2 && !leadApplied) {
      cls = "lmn-p lmn-lead";
      leadApplied = true;
    }

    if (b.type === "p") {
      return renderParagraph(b.text, cls, `p-${idx}`, isLastBlock);
    }

    return null;
  });
}

function splitGreetingForRender(text: string) {
  const raw = String(text ?? "").replace(/\r/g, "");
  const lines = raw.split("\n");
  const firstIdx = lines.findIndex((l) => l.trim().length > 0);
  if (firstIdx === -1) return { title: "", body: "" };
  const title = (lines[firstIdx] ?? "").trim();
  const body = lines.slice(firstIdx + 1).join("\n").trim();
  return { title, body };
}

function hasMarkdownTitle(text: string) {
  return /(^|\n)##\s+\S/.test(text);
}

function stripInlineMarks(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^[-\u2022]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim()
    .replace(/[.:;,-]+$/g, "");
}

function isTitleCandidate(text: string) {
  const clean = stripInlineMarks(text);
  const words = clean.split(/\s+/).filter(Boolean);

  return (
    clean.length >= 3 &&
    clean.length <= 72 &&
    words.length <= 9 &&
    !/^https?:\/\//i.test(clean) &&
    !/[?Â¿!]\s*$/.test(text.trim())
  );
}

function inferAnswerTitle(text: string) {
  const lower = text.toLowerCase();

  if (/\b(horario|hora|abierto|cerrado|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b/.test(lower)) {
    return "Horarios de atencion";
  }

  if (/\b(precio|valor|plan|cotizar|cotizacion|cotización|pago|descuento|usd|clp|eur)\b|\$\s?\d/.test(lower)) {
    return "Resumen comercial";
  }

  if (/\b(agenda|agendar|cita|reunion|reunión|demo|llamada|whatsapp|contacto)\b/.test(lower)) {
    return "Siguiente paso";
  }

  if (/\b(servicio|producto|incluye|ofrecen|solucion|solución)\b/.test(lower)) {
    return "Servicios disponibles";
  }

  if (/\b(no se|no tengo|falta|necesito|dato|informacion|información)\b/.test(lower)) {
    return "Informacion necesaria";
  }

  return "Respuesta clara";
}

function splitAnswerForRender(text: string) {
  const raw = String(text ?? "").replace(/\r/g, "").trim();

  if (!raw || hasMarkdownTitle(raw)) return { title: "", body: raw };

  const lines = raw.split("\n");
  const firstIdx = lines.findIndex((line) => line.trim().length > 0);
  if (firstIdx === -1) return { title: "", body: "" };

  const first = lines[firstIdx] ?? "";
  const title = stripInlineMarks(first);
  const body = lines.slice(firstIdx + 1).join("\n").trim();

  if (body && isTitleCandidate(first)) {
    return { title, body };
  }

  return { title: inferAnswerTitle(raw), body: raw };
}

export default function MessageContent({
  text,
  onCopy,
  variant = "default",
}: {
  text: string;
  onCopy: (s: string) => void;
  variant?: "default" | "greeting";
}) {
  const raw = String(text ?? "");

  if (variant === "greeting") {
    const { title, body } = splitGreetingForRender(raw);
    const safeTitle = title || "BIENVENIDO";

    const chunks = body.split(/```/g);

    return (
      <div className="lmn-greetWrap">
        <div className="lmn-greetTitle">{renderInline(safeTitle)}</div>

        <div className="lmn-greetBody">
          <div className="lmn-rich">
            {chunks.map((chunk, idx) => {
              const isCode = idx % 2 === 1;

              if (!isCode) {
                const blocks = parseTextToBlocks(chunk);
                return <React.Fragment key={idx}>{renderBlocks(blocks)}</React.Fragment>;
              }

              const lines = chunk.split("\n");
              const maybeLang = (lines[0] || "").trim();
              const isLang = maybeLang && maybeLang.length <= 18 && /^[a-z0-9+\-#]+$/i.test(maybeLang);

              const code = isLang ? lines.slice(1).join("\n") : chunk;
              const lang = isLang ? maybeLang : "";
              const codeText = String(code ?? "").replace(/\n$/, "");

              return (
                <div key={idx} className="lmn-codeBlock">
                  <div className="lmn-codeTop">
                    <div className="lmn-codeLang">{lang ? lang.toUpperCase() : "CODE"}</div>
                    <button className="lmn-codeCopy" onClick={() => onCopy(codeText)} title="Copiar código">
                      Copiar
                    </button>
                  </div>
                  <pre className="lmn-codePre">
                    <code>{codeText}</code>
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const answer = splitAnswerForRender(raw);
  const chunks = answer.body.split(/```/g);

  return (
    <div className={answer.title ? "lmn-rich lmn-answerWrap" : "lmn-rich"}>
      {answer.title ? (
        <div className="lmn-answerHeader">
          <div className="lmn-answerKicker">LumenAI</div>
          <div className="lmn-answerTitle">{renderInline(answer.title)}</div>
        </div>
      ) : null}

      {chunks.map((chunk, idx) => {
        const isCode = idx % 2 === 1;

        if (!isCode) {
          const blocks = parseTextToBlocks(chunk);
          return <React.Fragment key={idx}>{renderBlocks(blocks)}</React.Fragment>;
        }

        const lines = chunk.split("\n");
        const maybeLang = (lines[0] || "").trim();
        const isLang = maybeLang && maybeLang.length <= 18 && /^[a-z0-9+\-#]+$/i.test(maybeLang);

        const code = isLang ? lines.slice(1).join("\n") : chunk;
        const lang = isLang ? maybeLang : "";
        const codeText = String(code ?? "").replace(/\n$/, "");

        return (
          <div key={idx} className="lmn-codeBlock">
            <div className="lmn-codeTop">
              <div className="lmn-codeLang">{lang ? lang.toUpperCase() : "CODE"}</div>
              <button className="lmn-codeCopy" onClick={() => onCopy(codeText)} title="Copiar código">
                Copiar
              </button>
            </div>
            <pre className="lmn-codePre">
              <code>{codeText}</code>
            </pre>
          </div>
        );
      })}
    </div>
  );
}
