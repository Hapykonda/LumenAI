"use client";

import React, {
  createContext,
  memo,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  isPanelActive,
  PANEL_NAV_GROUP_LABELS,
  type NavGroup,
  type NavItem,
} from "./panel-nav";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

const GROUP_ORDER: NavGroup[] = ["center", "builder", "operation", "system"];

const SidebarContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

function useSidebar() {
  const ctx = useContext(SidebarContext);

  if (!ctx) {
    throw new Error("SidebarContext missing");
  }

  return ctx;
}

export function AnimatedSidebar({
  links,
  brand,
  subline,
  rightSlot,
}: {
  links: NavItem[];
  brand: string;
  subline?: string;
  rightSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const contextValue = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <SidebarContext.Provider value={contextValue}>
      <DesktopSidebar
        brand={brand}
        subline={subline}
        links={links}
        rightSlot={rightSlot}
      />

      <MobileSidebar
        brand={brand}
        subline={subline}
        links={links}
        rightSlot={rightSlot}
      />
    </SidebarContext.Provider>
  );
}

function groupLinks(links: NavItem[]) {
  return GROUP_ORDER.map((group) => ({
    group,
    label: PANEL_NAV_GROUP_LABELS[group],
    items: links.filter((item) => (item.group || "center") === group),
  })).filter((group) => group.items.length > 0);
}

function DesktopSidebar({
  links,
  brand,
  subline,
  rightSlot,
}: {
  links: NavItem[];
  brand: string;
  subline?: string;
  rightSlot?: React.ReactNode;
}) {
  const { open: _open } = useSidebar();
  void _open;
  const open = true;
  const pathname = usePathname() || "";
  const grouped = useMemo(() => groupLinks(links), [links]);
  const openSidebar = useCallback(() => {}, []);
  const closeSidebar = useCallback(() => {}, []);
  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLElement>) => {
      const nextTarget = event.relatedTarget as Node | null;
      if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
        closeSidebar();
      }
    },
    [closeSidebar]
  );

  return (
    <aside
      className="relative z-40 hidden h-screen w-[252px] shrink-0 overflow-visible md:flex"
    >
      <div
        className="fixed left-0 top-0 h-screen"
        onMouseEnter={openSidebar}
        onMouseLeave={closeSidebar}
        onFocus={openSidebar}
        onBlur={handleBlur}
        style={{
          width: 252,
          transition: "none",
        }}
      >
        <div
          className="apex-panel lmn-sidebar-scroll absolute inset-0 overflow-y-auto overflow-x-hidden border px-3 py-3"
          style={{
            position: "absolute",
            inset: 0,
            height: "100%",
            maxHeight: "100vh",
            overflowY: "auto",
            overflowX: "hidden",
            overscrollBehavior: "contain",
            touchAction: "pan-y",
            borderColor: open
              ? `rgba(${accentA}, .16)`
              : "rgba(255,255,255,.055)",
            background: `
              linear-gradient(180deg, rgba(255,255,255,.014), rgba(255,255,255,.002)),
              linear-gradient(135deg, rgba(${accentA}, .024), transparent 42%),
              linear-gradient(315deg, rgba(${accentB}, .016), transparent 46%),
              #000
            `,
            boxShadow: open
              ? `0 14px 30px rgba(0,0,0,.44), 0 0 14px rgba(${accentA}, .024), inset 0 1px 0 rgba(255,255,255,.024)`
              : "0 10px 22px rgba(0,0,0,.36), inset 0 1px 0 rgba(255,255,255,.018)",
            backdropFilter: "none",
            WebkitBackdropFilter: "none",
            contain: "layout paint style",
            transform: "translateZ(0)",
          }}
        >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              linear-gradient(90deg, rgba(255,255,255,.008), transparent 18%, transparent 78%, rgba(255,255,255,.006)),
              radial-gradient(circle at 24% 10%, rgba(${accentA}, .020), transparent 34%),
              radial-gradient(circle at 80% 22%, rgba(${accentB}, .014), transparent 36%)
            `,
            opacity: open ? 0.76 : 0.48,
            transition: "opacity 160ms ease",
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${accentA}, .42), rgba(${accentB}, .34), transparent)`,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-5 left-0 w-px"
          style={{
            background: `linear-gradient(180deg, transparent, rgba(${accentA}, .65), rgba(${accentB}, .38), transparent)`,
            boxShadow: `0 0 12px rgba(${accentA}, .35)`,
          }}
        />

        <div className="relative flex min-h-full w-full flex-col">
          <div
            className="shrink-0 border-b px-1 pb-4 pt-1"
            style={{ borderColor: "rgba(255,255,255,.055)" }}
          >
            <div className="flex items-center gap-3">
              <div
                className="apex-cut lmn-sidebar-brand-mark relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden border text-sm font-extrabold text-white"
                style={{
                  borderColor: `rgba(${accentA}, .24)`,
                  background: `
                    radial-gradient(circle at 30% 20%, rgba(255,255,255,.075), transparent 34%),
                    linear-gradient(135deg, rgba(${accentA}, .18), rgba(${accentB}, .10)),
                    #020305
                  `,
                  boxShadow: `0 0 14px rgba(${accentA}, .055), inset 0 1px 0 rgba(255,255,255,.048)`,
                }}
                title={brand}
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,.16), transparent 42%)",
                  }}
                />
                <span className="relative">L</span>
              </div>

              <div
                className="min-w-0 flex-1"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "translateX(0)" : "translateX(-8px)",
                  transition: "opacity 120ms ease, transform 120ms ease",
                  pointerEvents: open ? "auto" : "none",
                }}
              >
                <div className="lmn-sidebar-brand-title truncate whitespace-nowrap text-[15px] font-semibold tracking-tight text-white">
                  {brand}
                </div>

                {subline ? (
                  <div className="lmn-sidebar-brand-subline truncate text-xs text-white/48">{subline}</div>
                ) : null}
              </div>
            </div>

            {rightSlot ? (
              <div
                className="mt-3"
                style={{
                  opacity: open ? 1 : 0,
                  transform: open ? "translateY(0)" : "translateY(-5px)",
                  transition: "opacity 120ms ease, transform 120ms ease",
                  pointerEvents: open ? "auto" : "none",
                }}
              >
                {rightSlot}
              </div>
            ) : null}
          </div>

          <nav
            className="mt-3 grid gap-4 px-1 pb-4 pr-1"
            aria-label="Navegacion principal"
          >
            {grouped.map((group) => (
              <div key={group.group} className="grid gap-1.5">
                <div
                  className="px-2 pb-1 pt-1 text-[11px] font-medium text-white/34"
                  style={{
                    opacity: open ? 1 : 0,
                    transform: open ? "translateX(0)" : "translateX(-8px)",
                    transition: "opacity 120ms ease, transform 120ms ease",
                  }}
                >
                  {group.label}
                </div>

                <div className="grid gap-1">
                  {group.items.map((item) => {
                    const active = isPanelActive(pathname, item.href);

                    return (
                      <SidebarLink
                        key={item.href}
                        item={item}
                        active={active}
                        open={open}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="min-h-3 shrink-0" aria-hidden="true" />
        </div>
      </div>
      </div>
    </aside>
  );
}

const SidebarLink = memo(function SidebarLink({
  item,
  active,
  open,
}: {
  item: NavItem;
  active: boolean;
  open: boolean;
}) {
  return (
    <Link
      href={item.href}
      prefetch={false}
      title={`${item.label} -> ${item.href}`}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      data-href={item.href}
      data-active={active ? "true" : undefined}
      className={cn(
        "apex-cut group relative flex min-h-[44px] items-center overflow-hidden border",
        open ? "gap-2.5 px-2.5" : "justify-center px-3"
      )}
      style={
        active
          ? {
              borderColor: `rgba(${accentA}, .28)`,
              background: `
                linear-gradient(135deg, rgba(${accentA}, .085), rgba(${accentB}, .045)),
                radial-gradient(circle at 20% 20%, rgba(255,255,255,.014), transparent 42%),
                #020305
              `,
              boxShadow: `0 0 14px rgba(${accentA}, .035), inset 0 0 0 1px rgba(255,255,255,.016)`,
              transition:
                "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
            }
          : {
              borderColor: "rgba(255,255,255,0)",
              background: "rgba(255,255,255,0)",
              transition:
                "background 140ms ease, border-color 140ms ease, box-shadow 140ms ease",
            }
      }
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{
          background: `
            linear-gradient(135deg, rgba(${accentA}, .060), rgba(${accentB}, .036)),
            radial-gradient(circle at 22% 22%, rgba(255,255,255,.026), transparent 38%)
          `,
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.028)",
        }}
      />

      {active ? (
        <span
          className="absolute inset-y-3 left-0 w-[2px]"
          style={{
            background: `linear-gradient(180deg, rgba(${accentA}, 1), rgba(${accentB}, 1))`,
            boxShadow: `0 0 12px rgba(${accentA}, .48)`,
          }}
        />
      ) : null}

      <span
        className={cn(
          "apex-cut relative z-[1] flex h-7 w-7 shrink-0 items-center justify-center",
          active ? "text-white" : "text-white/76 group-hover:text-white"
        )}
        style={
          active
            ? {
                background: `linear-gradient(135deg, rgba(${accentA}, .11), rgba(${accentB}, .060)), #000`,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,.032)",
              }
            : {
                transition: "color 140ms ease",
              }
        }
      >
        {item.icon}
      </span>

      <div
        className="min-w-0 flex-1 overflow-hidden"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "translateX(0)" : "translateX(-8px)",
          transition: "opacity 120ms ease, transform 120ms ease",
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="min-w-0">
          <div
            className={cn(
              "lmn-nav-label truncate whitespace-nowrap text-[13px] font-medium leading-5",
              active ? "text-white" : "text-white/84 group-hover:text-white"
            )}
          >
            {item.label}
          </div>

          {item.desc ? (
            <div className="lmn-nav-desc truncate whitespace-nowrap text-[11px] leading-4 text-white/42">
              {item.desc}
            </div>
          ) : null}
        </div>
      </div>

      {!open ? (
        <span
          className="apex-cut pointer-events-none absolute left-[64px] z-50 hidden whitespace-nowrap border px-3 py-2 text-xs font-medium text-white opacity-0 shadow-xl transition-opacity duration-150 group-hover:block group-hover:opacity-100"
          style={{
            borderColor: `rgba(${accentA}, .20)`,
            background: "rgba(8,11,18,.96)",
            boxShadow: `0 14px 30px rgba(0,0,0,.35), 0 0 18px rgba(${accentA}, .08)`,
          }}
        >
          {item.label}
        </span>
      ) : null}
    </Link>
  );
});

function MobileSidebar({
  links,
  brand,
  subline,
  rightSlot,
}: {
  links: NavItem[];
  brand: string;
  subline?: string;
  rightSlot?: React.ReactNode;
}) {
  const { open, setOpen } = useSidebar();
  const pathname = usePathname() || "";
  const grouped = useMemo(() => groupLinks(links), [links]);

  return (
    <>
      <div
        className="apex-panel sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{
          borderColor: "rgba(255,255,255,.055)",
          background: `
            linear-gradient(180deg, rgba(0,0,0,.96), rgba(0,0,0,.88)),
            radial-gradient(circle at 18% 0%, rgba(${accentA}, .045), transparent 36%)
          `,
          boxShadow: "0 10px 24px rgba(0,0,0,.34)",
          backdropFilter: "none",
          WebkitBackdropFilter: "none",
        }}
      >
        <button
          type="button"
          className="apex-cut inline-flex h-10 w-10 items-center justify-center border bg-white/[0.035]"
          style={{ borderColor: "rgba(255,255,255,.08)" }}
          onClick={() => setOpen((value) => !value)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-white/88" />
        </button>

        <div className="flex items-center gap-2">
          <div
            className="apex-cut flex h-9 w-9 items-center justify-center border text-xs font-extrabold text-white"
            style={{
              borderColor: `rgba(${accentA}, .22)`,
              background: `linear-gradient(135deg, rgba(${accentA}, .24), rgba(${accentB}, .16))`,
              boxShadow: `0 0 16px rgba(${accentA}, .12)`,
            }}
          >
            L
          </div>

          <div>
            <div className="lmn-sidebar-brand-title text-sm font-semibold text-white">{brand}</div>
            {subline ? (
              <div className="lmn-sidebar-brand-subline text-[11px] leading-none text-white/44">{subline}</div>
            ) : null}
          </div>
        </div>

        <div>{rightSlot}</div>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] overflow-y-auto p-6 md:hidden"
          style={{
            background: `
              linear-gradient(180deg, rgba(5,7,11,.92), rgba(5,7,11,.88)),
              radial-gradient(circle at 18% 8%, rgba(${accentA}, .12), transparent 36%),
              radial-gradient(circle at 86% 16%, rgba(${accentB}, .090), transparent 40%)
            `,
          }}
        >
          <button
            type="button"
            className="apex-cut absolute right-5 top-5 inline-flex h-10 w-10 items-center justify-center border bg-white/[0.04]"
            style={{ borderColor: "rgba(255,255,255,.08)" }}
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
          >
            <X className="h-5 w-5 text-white/88" />
          </button>

          <div className="mt-10">
            <div className="text-lg font-semibold text-white">{brand}</div>

            {subline ? (
              <div className="text-sm text-white/52">{subline}</div>
            ) : null}

            <div className="mt-6 grid gap-5">
              {grouped.map((group) => (
                <div key={group.group} className="grid gap-2">
                  <div className="px-1 text-[10px] uppercase tracking-[0.2em] text-white/30">
                    {group.label}
                  </div>

                  <div className="grid gap-2">
                    {group.items.map((item) => {
                      const active = isPanelActive(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
                          data-href={item.href}
                          data-active={active ? "true" : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className="apex-cut relative flex items-center gap-3 overflow-hidden border px-3 py-3"
                          style={
                            active
                              ? {
                                  borderColor: `rgba(${accentA}, .28)`,
                                  background: `linear-gradient(135deg, rgba(${accentA}, .14), rgba(${accentB}, .095))`,
                                  boxShadow: `0 0 18px rgba(${accentA}, .07)`,
                                }
                              : {
                                  borderColor: "rgba(255,255,255,.070)",
                                  background: "rgba(255,255,255,.026)",
                                }
                          }
                        >
                          {active ? (
                            <span
                              className="absolute inset-y-3 left-0 w-[2px]"
                              style={{
                                background: `linear-gradient(180deg, rgba(${accentA}, 1), rgba(${accentB}, 1))`,
                                boxShadow: `0 0 10px rgba(${accentA}, .36)`,
                              }}
                            />
                          ) : null}

                          <span className={cn(active ? "text-white" : "text-white/76")}>
                            {item.icon}
                          </span>

                          <div className="min-w-0">
                            <div className="lmn-nav-label text-sm font-medium text-white">
                              {item.label}
                            </div>

                            {item.desc ? (
                              <div className="lmn-nav-desc text-[11px] text-white/44">
                                {item.desc}
                              </div>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
