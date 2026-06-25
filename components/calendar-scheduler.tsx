"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarClock, Check, RotateCcw } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

export interface CalendarSchedulerProps {
  timeSlots?: string[];
  onConfirm?: (value: { date?: Date; time?: string }) => void;
  title?: string;
  description?: string;
  className?: string;
}

function CalendarScheduler({
  timeSlots = [
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ],
  onConfirm,
  title = "Programar seguimiento",
  description = "Selecciona dia y hora para crear una accion comercial.",
  className,
}: CalendarSchedulerProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [time, setTime] = React.useState<string | undefined>(timeSlots[2]);

  return (
    <div className={cn("apex-panel p-4", className)}>
      <div className="flex items-start justify-between gap-3 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/35">
            <CalendarClock className="h-3.5 w-3.5 text-cyan-100" />
            Scheduler
          </div>
          <h3 className="mt-2 text-lg font-black text-white">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-white/42">{description}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setDate(new Date());
            setTime(undefined);
          }}
          className="grid h-9 w-9 place-items-center border border-white/[0.08] bg-white/[0.025] text-white/45 apex-cut transition hover:bg-white/[0.055] hover:text-white"
          aria-label="Reset scheduler"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="grid gap-4 pt-4 xl:grid-cols-[minmax(0,1fr)_210px]">
        <div className="border border-white/[0.075] bg-black/22 p-3 apex-cut">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            showOutsideDays={false}
            className="mx-auto text-white"
            classNames={{
              day_button:
                "relative flex size-9 items-center justify-center whitespace-nowrap p-0 text-white outline-offset-2 focus:outline-none hover:bg-white/[0.08] data-[selected=true]:bg-cyan-300 data-[selected=true]:text-black",
              caption_label: "text-sm font-black text-white",
              weekday: "size-9 p-0 text-xs font-black text-white/35",
            }}
          />
        </div>

        <div className="border border-white/[0.075] bg-black/22 p-3 apex-cut">
          <div className="mb-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">
            Slots
          </div>
          <div className="grid max-h-[300px] grid-cols-2 gap-2 overflow-y-auto pr-1">
            {timeSlots.map((slot) => {
              const active = time === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  className={cn(
                    "apex-cut h-10 border text-xs font-black transition",
                    active
                      ? "border-cyan-200/40 bg-cyan-300 text-black"
                      : "border-white/[0.08] bg-white/[0.025] text-white/55 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-white/[0.08] pt-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs leading-5 text-white/48">
          {date && time ? (
            <>
              Seguimiento para{" "}
              <span className="font-black text-white">
                {format(date, "dd/MM/yyyy")}
              </span>{" "}
              a las <span className="font-black text-white">{time}</span>.
            </>
          ) : (
            "Selecciona una fecha y un horario disponible."
          )}
        </div>

        <button
          type="button"
          onClick={() => onConfirm?.({ date, time })}
          disabled={!date || !time}
          className="apex-button inline-flex h-10 items-center justify-center gap-2 border border-cyan-200/30 bg-[linear-gradient(135deg,#00E5FF,#008CFF_45%,#1B43FF_75%,#6C3BFF)] px-4 text-xs font-black uppercase tracking-[0.12em] text-[#05070B] disabled:opacity-45"
        >
          <Check className="h-3.5 w-3.5" />
          Confirmar
        </button>
      </div>
    </div>
  );
}

export { CalendarScheduler };
