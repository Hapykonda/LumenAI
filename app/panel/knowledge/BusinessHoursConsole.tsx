"use client";

import { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  CalendarX2,
  Info,
  Moon,
  Sparkles,
  SunMedium,
} from "lucide-react";
import { Calendar } from "@/components/calendar";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LumenNumberButton } from "../_components/enterprise/LumenNumberButton";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DayHours = { open: boolean; from: string; to: string };
type SpecialDateRule = { closed: boolean; reason?: string };
type BusinessHours = Record<DayKey, DayHours> & {
  closedDates?: Record<string, SpecialDateRule>;
};

const dayOrder: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const dayLabel: Record<DayKey, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miercoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sabado",
  sun: "Domingo",
};

const shortDayLabel: Record<DayKey, string> = {
  mon: "Lun",
  tue: "Mar",
  wed: "Mie",
  thu: "Jue",
  fri: "Vie",
  sat: "Sab",
  sun: "Dom",
};

const presets = [
  {
    id: "commercial",
    label: "Horario oficina",
    description: "Lun a vie, 09:00 a 18:00",
  },
  {
    id: "extended",
    label: "Atencion extendida",
    description: "Todos los dias, 09:00 a 21:00",
  },
  {
    id: "local",
    label: "Local con sabado",
    description: "Lun a sab, cierre temprano",
  },
] as const;

function getTodayKey() {
  const jsDay = new Date().getDay();
  return dayOrder[(jsDay + 6) % 7];
}

function applyPresetPatch(
  mode: (typeof presets)[number]["id"],
  day: DayKey
): DayHours {
  if (mode === "extended") {
    return { open: true, from: "09:00", to: "21:00" };
  }

  if (mode === "local") {
    const weekend = day === "sat" || day === "sun";
    return {
      open: day !== "sun",
      from: weekend ? "10:00" : "09:00",
      to: weekend ? "14:00" : "19:00",
    };
  }

  return {
    open: day !== "sat" && day !== "sun",
    from: "09:00",
    to: "18:00",
  };
}

function formatRange(day: DayHours) {
  return day.open ? `${day.from} - ${day.to}` : "Cerrado";
}

function dateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function clientPreview(
  selectedDay: DayHours,
  selectedSpecial: SpecialDateRule | null
) {
  if (selectedSpecial?.closed) {
    return `Ese dia no atenderemos${selectedSpecial.reason ? ` por ${selectedSpecial.reason}` : ""}. Dejame tu nombre y contacto para responderte apenas volvamos.`;
  }

  if (selectedDay.open) {
    return `Ese dia atendemos de ${selectedDay.from} a ${selectedDay.to}. Si me dejas tu consulta, puedo ayudarte ahora y el equipo confirma dentro del horario.`;
  }

  return `Ese dia estamos fuera de horario. Puedo tomar tus datos y dejar el seguimiento listo para el proximo dia habil.`;
}

export function BusinessHoursConsole({
  hours,
  saving,
  onChange,
  onClosedDateChange,
}: {
  hours: BusinessHours;
  saving?: boolean;
  onChange(day: DayKey, patch: Partial<DayHours>): void;
  onClosedDateChange?(dateKey: string, patch: SpecialDateRule | null): void;
}) {
  const todayKey = getTodayKey();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    () => new Date()
  );
  const [reasonDraft, setReasonDraft] = useState(
    () => hours.closedDates?.[dateKey(new Date())]?.reason ?? ""
  );
  const selectedDayKey = selectedDate
    ? dayOrder[(selectedDate.getDay() + 6) % 7]
    : todayKey;
  const selectedDateKey = selectedDate ? dateKey(selectedDate) : dateKey(new Date());
  const selectedDay = hours[selectedDayKey];
  const selectedSpecial = hours.closedDates?.[selectedDateKey] ?? null;

  const closedDates = useMemo(
    () =>
      Object.entries(hours.closedDates ?? {})
        .filter(([, rule]) => rule?.closed)
        .sort(([a], [b]) => a.localeCompare(b)),
    [hours.closedDates]
  );

  const openDays = useMemo(
    () => dayOrder.filter((day) => hours[day].open).length,
    [hours]
  );

  const activePercent = Math.round((openDays / 7) * 100);

  const nextOpen = useMemo(() => {
    const now = new Date();

    for (let offset = 0; offset < 14; offset += 1) {
      const probe = new Date(now);
      probe.setDate(now.getDate() + offset);

      const key = dayOrder[(probe.getDay() + 6) % 7];
      const probeDateKey = dateKey(probe);
      const day = hours[key];

      if (hours.closedDates?.[probeDateKey]?.closed) continue;
      if (!day?.open) continue;

      return offset === 0 ? `Hoy ${day.from}` : `${dayLabel[key]} ${day.from}`;
    }

    return "Sin horario activo";
  }, [hours]);

  function applyPreset(mode: (typeof presets)[number]["id"]) {
    dayOrder.forEach((day) => {
      onChange(day, applyPresetPatch(mode, day));
    });
  }

  function saveSelectedClosure() {
    onClosedDateChange?.(selectedDateKey, {
      closed: true,
      reason: reasonDraft.trim() || "Dia sin atencion",
    });
  }

  function selectDate(date: Date | undefined) {
    if (!date) return;

    setSelectedDate(date);
    setReasonDraft(hours.closedDates?.[dateKey(date)]?.reason ?? "");
  }

  return (
    <section className="apex-panel overflow-hidden p-5 md:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/38">
            <CalendarClock className="h-3.5 w-3.5" />
            Disponibilidad
          </div>
          <h3 className="mt-2 text-2xl font-black leading-tight text-white">
            Horario de atencion
          </h3>
          <p className="mt-2 max-w-[620px] text-sm leading-6 text-white/50">
            Define dias activos, cierres especiales y como debe responder LumenAI cuando un cliente pregunta por disponibilidad.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="lmn-schedule-ring relative grid h-[64px] w-[64px] place-items-center"
            style={{
              background: `conic-gradient(rgb(var(--lmn-accent-rgb, 0, 140, 255)) ${activePercent * 3.6}deg, rgba(255,255,255,.075) 0deg)`,
            }}
          >
            <div className="absolute inset-[5px] rounded-full border border-white/[0.070] bg-black/55" />
            <div className="relative text-center text-[12px] font-black leading-none text-white">
              {openDays}/7
              <div className="mt-1 text-[8px] uppercase tracking-[0.18em] text-white/38">
                dias
              </div>
            </div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="text-xs font-black text-white">{activePercent}% operativo</div>
            <div className="mt-1 text-xs text-white/42">Carga activa del calendario</div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="apex-cut border border-white/[0.070] bg-black/14 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
            <div>
              <div className="text-sm font-black text-white">Semana operativa</div>
              <div className="mt-1 text-xs leading-5 text-white/42">
                Cambios compactos, legibles y listos para guardar.
              </div>
            </div>
            <div className="apex-pill border border-white/[0.080] bg-white/[0.030] px-3 py-2 text-xs font-black text-white/62">
              Proxima apertura: {nextOpen}
            </div>
          </div>

          <div className="grid gap-2">
            {dayOrder.map((day) => {
              const dayHours = hours[day];

              return (
                <div
                  key={day}
                  className="apex-cut grid gap-3 border border-white/[0.055] bg-white/[0.018] p-3 lg:grid-cols-[88px_minmax(0,1fr)_minmax(0,1fr)_118px] lg:items-end"
                >
                  <div className="flex items-center justify-between gap-3 lg:block">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                        {shortDayLabel[day]}
                      </div>
                      <div className="mt-1 text-sm font-black text-white">
                        {dayLabel[day]}
                      </div>
                    </div>
                    <div className="lg:mt-3">
                      <span
                        className="inline-flex h-2 w-2 rounded-full"
                        style={{
                          background: dayHours.open
                            ? "rgb(66, 230, 166)"
                            : "rgba(255,255,255,.24)",
                          boxShadow: dayHours.open
                            ? "0 0 14px rgba(66,230,166,.36)"
                            : "none",
                        }}
                      />
                    </div>
                  </div>

                  <label className="grid gap-1.5">
                    <span className="text-[11px] font-semibold text-white/48">
                      Desde
                    </span>
                    <input
                      type="time"
                      value={dayHours.from}
                      disabled={!dayHours.open || saving}
                      onChange={(event) => onChange(day, { from: event.target.value })}
                      className="h-10 min-w-0 rounded-[8px] border border-white/[0.070] bg-black/22 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/20 disabled:opacity-40"
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="text-[11px] font-semibold text-white/48">
                      Hasta
                    </span>
                    <input
                      type="time"
                      value={dayHours.to}
                      disabled={!dayHours.open || saving}
                      onChange={(event) => onChange(day, { to: event.target.value })}
                      className="h-10 min-w-0 rounded-[8px] border border-white/[0.070] bg-black/22 px-3 text-sm font-semibold text-white outline-none transition focus:border-white/20 disabled:opacity-40"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onChange(day, { open: !dayHours.open })}
                    className="apex-button inline-flex h-10 items-center justify-center gap-2 border px-3 text-xs font-black text-white transition hover:bg-white/[0.045] disabled:opacity-45"
                    style={{
                      borderColor: dayHours.open
                        ? "rgba(64, 220, 160, .22)"
                        : "rgba(255,255,255,.075)",
                      background: dayHours.open
                        ? "rgba(64, 220, 160, .070)"
                        : "rgba(255,255,255,.022)",
                    }}
                  >
                    {dayHours.open ? (
                      <SunMedium className="h-3.5 w-3.5" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" />
                    )}
                    {dayHours.open ? "Abierto" : "Cerrado"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="grid min-w-0 content-start gap-3">
          <div className="apex-cut border border-white/[0.070] bg-white/[0.026] p-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <Sparkles className="h-4 w-4 text-white/60" />
              Respuesta de LumenAI
            </div>
            <p className="mt-3 text-sm leading-6 text-white/58">
              {clientPreview(selectedDay, selectedSpecial)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs font-bold text-white/40">
              <Info className="h-3.5 w-3.5" />
              Preview para {selectedDateKey}
            </div>
          </div>

          <div className="apex-cut border border-white/[0.070] bg-white/[0.026] p-4">
            <div className="flex items-center gap-2 text-sm font-black text-white">
              <BriefcaseBusiness className="h-4 w-4 text-white/60" />
              Presets profesionales
            </div>
            <div className="mt-3 grid gap-2">
              {presets.map((preset, index) => (
                <LumenNumberButton
                  key={preset.id}
                  count={index + 1}
                  disabled={saving}
                  onClick={() => applyPreset(preset.id)}
                  className="h-auto w-full justify-start px-3 py-3 text-left"
                >
                  <span className="grid gap-1">
                    <span className="block text-sm font-black text-white">
                      {preset.label}
                    </span>
                    <span className="block text-xs leading-5 text-white/42">
                      {preset.description}
                    </span>
                  </span>
                </LumenNumberButton>
              ))}
            </div>
          </div>

          <div className="apex-cut border border-white/[0.070] bg-white/[0.026] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-white">
                  Calendario de cierres
                </div>
                <p className="mt-1 text-xs leading-5 text-white/42">
                  Marca feriados, vacaciones o dias sin atencion.
                </p>
              </div>
              <div className="apex-pill shrink-0 border border-white/[0.075] bg-black/18 px-2.5 py-1.5 text-[11px] font-black text-white/55">
                {closedDates.length} cierre(s)
              </div>
            </div>

            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={selectDate}
              modifiers={{
                closed: closedDates.map(([date]) => new Date(`${date}T00:00:00`)),
              }}
              modifiersClassNames={{
                closed:
                  "text-rose-100 *:after:absolute *:after:right-1 *:after:top-1 *:after:h-1.5 *:after:w-1.5 *:after:rounded-full *:after:bg-rose-300",
              }}
              className="mx-auto mt-3 w-full max-w-[302px] text-white"
              classNames={{
                months: "w-full justify-center",
                month: "w-full space-y-2",
                month_caption: "relative mx-10 px-1 mb-1 flex h-10 items-center justify-center z-2",
                day_button:
                  "h-8 w-8 border border-transparent text-xs data-[selected=true]:border-white/20 data-[selected=true]:bg-white/[0.12]",
                day: "h-8 w-8 text-xs",
                today: "text-white font-black",
                weekday: "h-8 w-8 text-white/35",
                caption_label: "text-white",
                button_next: "text-white/70 hover:bg-white/[0.06]",
                button_previous: "text-white/70 hover:bg-white/[0.06]",
              }}
            />

            <div className="mt-3 apex-cut border border-white/[0.060] bg-black/16 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                {selectedDateKey} / {dayLabel[selectedDayKey]}
              </div>
              <div className="mt-1 text-sm font-black text-white">
                {selectedSpecial?.closed
                  ? `Cerrado especial: ${selectedSpecial.reason || "Sin motivo"}`
                  : formatRange(selectedDay)}
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <input
                value={reasonDraft}
                disabled={saving || !onClosedDateChange}
                onChange={(event) => setReasonDraft(event.target.value)}
                placeholder="Motivo: feriado, inventario, vacaciones..."
                className="h-10 rounded-[8px] border border-white/[0.070] bg-black/22 px-3 text-xs font-semibold text-white outline-none transition placeholder:text-white/24 focus:border-white/20 disabled:opacity-40"
              />

              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={saving || !onClosedDateChange}
                  onClick={saveSelectedClosure}
                  className="apex-button inline-flex h-10 items-center justify-center gap-2 border border-white/10 bg-white/[0.050] px-3 text-xs font-black text-white transition hover:bg-white/[0.075] disabled:opacity-45"
                >
                  <CalendarX2 className="h-3.5 w-3.5" />
                  Guardar cierre
                </button>
                <button
                  type="button"
                  disabled={saving || !onClosedDateChange || !selectedSpecial?.closed}
                  onClick={() => {
                    setReasonDraft("");
                    onClosedDateChange?.(selectedDateKey, null);
                  }}
                  className="apex-button inline-flex h-10 items-center justify-center border border-white/10 bg-white/[0.020] px-3 text-xs font-black text-white/72 transition hover:bg-white/[0.045] disabled:opacity-35"
                >
                  Quitar
                </button>
              </div>
            </div>

            {closedDates.length ? (
              <div className="mt-4 grid gap-2">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
                  Cierres programados
                </div>
                {closedDates.slice(0, 4).map(([date, rule]) => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => selectDate(new Date(`${date}T00:00:00`))}
                    className="apex-cut border border-white/[0.055] bg-white/[0.018] p-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <div className="text-xs font-black text-white">{date}</div>
                    <div className="mt-1 text-xs leading-5 text-white/44">
                      {rule.reason || "Dia sin atencion"}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Accordion
            type="single"
            collapsible
            className="apex-cut border border-white/[0.070] bg-white/[0.026] px-4"
          >
            <AccordionItem value="rules" className="border-white/[0.060]">
              <AccordionTrigger className="py-4 text-sm font-black text-white hover:no-underline">
                Reglas fuera de horario
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-6 text-white/48">
                LumenAI capta nombre, contacto e interes, avisa que el equipo responde dentro del horario activo y evita prometer atencion inmediata cuando el negocio esta cerrado.
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="apex-cut border border-white/[0.060] bg-black/14 p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
              Resumen semanal
            </div>
            <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs font-semibold text-white/54">
              {dayOrder.map((day) => (
                <div
                  key={day}
                  className="flex items-center justify-between gap-2 border-b border-white/[0.045] pb-1"
                >
                  <span className="text-white/38">{shortDayLabel[day]}</span>
                  <span className="text-right">{formatRange(hours[day])}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
