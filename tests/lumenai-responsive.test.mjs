import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

function read(file) {
  return fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
}

function jpegSize(file) {
  const data = fs.readFileSync(new URL(`../${file}`, import.meta.url));
  assert.equal(data.readUInt16BE(0), 0xffd8);
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`JPEG dimensions not found for ${file}`);
}

test("the shell keeps tablet navigation fluid until the desktop breakpoint", () => {
  const shell = read("app/panel/_components/PanelShell.tsx");
  const css = read("app/lumenai-obsidian.css");
  assert.match(shell, /lmn-panel-grid/);
  assert.match(css, /@media \(min-width: 768px\) and \(max-width: 1023px\)/);
  assert.match(css, /\.lmn-panel-grid[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
  assert.match(css, /\.lmn-desktop-sidebar[\s\S]*display:\s*none !important/);
  assert.match(css, /\.lmn-mobile-header[\s\S]*display:\s*flex !important/);
});

test("mobile heroes and Radar use genuinely shrinkable columns", () => {
  const css = read("app/lumenai-obsidian.css");
  assert.match(css, /\.lmn-section-hero[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /\.lmn-pulse-command-grid[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /\.lmn-pulse-command-center\s*\{[\s\S]*display:\s*block/);
  assert.match(css, /\.lmn-pulse-command-center > \.lmn-animated-hero-lights[\s\S]*position:\s*absolute !important/);
});

test("chat preserves the composer and scrolls message history", () => {
  const css = read("app/lumenai-obsidian.css");
  assert.match(css, /\.lmn-chat-detail-layout[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\) !important/);
  assert.match(css, /\.lmn-chat-conversation-card[\s\S]*height:\s*calc\(100dvh - 272px\) !important/);
  assert.match(css, /\.lmn-chat-message-stream[\s\S]*max-height:\s*none !important/);
  assert.match(css, /\.lmn-chat-send-button[\s\S]*width:\s*100% !important/);
});

test("mobile navigation and forms are not covered by floating Pulse", () => {
  const css = read("app/lumenai-obsidian.css");
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*aside\[aria-label="Pulse Radar"\][\s\S]*display:\s*none/);
});

test("critical breakpoint screenshots cover every declared viewport", () => {
  for (const [file, width, height] of [
    ["360-chat.jpg", 360, 800],
    ["390-calibration.jpg", 390, 844],
    ["768-overview.jpg", 768, 1024],
    ["1024-chat.jpg", 1024, 768],
    ["1280-radar.jpg", 1280, 800],
    ["1440-overview.jpg", 1440, 900],
    ["1920-settings.jpg", 1920, 1080],
  ]) {
    const capture = jpegSize(`docs/evidence/responsive/${file}`);
    assert.ok(capture.width >= width - 12 && capture.width <= width);
    assert.ok(capture.height >= Math.min(height, 760));
  }
});
