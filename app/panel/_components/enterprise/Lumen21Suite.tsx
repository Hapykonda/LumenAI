"use client";

import type { ReactNode } from "react";
import {
  BarChart3,
  Globe2,
  MessageCircle,
  Radar,
  Search,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import SearchComponent from "@/components/animated-glowing-search-bar";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/carousel";
import { Globe } from "@/components/ui/cobe-globe";

const accentA = "var(--lmn-accent-rgb, 0,229,255)";
const accentB = "var(--lmn-accent-2-rgb, 27,67,255)";

type StatInput = {
  chats_total?: number;
  chats_unread?: number;
  leads_total?: number;
  leads_new?: number;
  leads_qualified?: number;
  leads_won?: number;
};

const trafficMarkers = [
  { id: "madrid", location: [40.4168, -3.7038] as [number, number], label: "Madrid 31%" },
  { id: "miami", location: [25.7617, -80.1918] as [number, number], label: "Miami 22%" },
  { id: "mexico", location: [19.4326, -99.1332] as [number, number], label: "CDMX 18%" },
  { id: "bogota", location: [4.711, -74.0721] as [number, number], label: "Bogota 14%" },
  { id: "santiago", location: [-33.4489, -70.6693] as [number, number], label: "Santiago 9%" },
  { id: "buenosaires", location: [-34.6037, -58.3816] as [number, number], label: "Buenos Aires 6%" },
];

const trafficArcs = [
  {
    id: "madrid-miami",
    from: [40.4168, -3.7038] as [number, number],
    to: [25.7617, -80.1918] as [number, number],
    label: "Europa -> USA",
  },
  {
    id: "mexico-bogota",
    from: [19.4326, -99.1332] as [number, number],
    to: [4.711, -74.0721] as [number, number],
    label: "LATAM",
  },
  {
    id: "santiago-madrid",
    from: [-33.4489, -70.6693] as [number, number],
    to: [40.4168, -3.7038] as [number, number],
    label: "CL -> ES",
  },
];

export function LumenSearchDock() {
  return (
    <section className="apex-panel glass-sheen grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_340px] md:items-center">
      <div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/42">
          <Search className="h-3.5 w-3.5" />
          Busqueda operativa
        </div>
        <h3 className="mt-3 text-2xl font-black leading-none text-white">
          Encuentra leads, respuestas, horarios y acciones.
        </h3>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-white/50">
          Un acceso rapido para navegar el sistema sin perder contexto.
        </p>
      </div>
      <div className="justify-self-start md:justify-self-end">
        <SearchComponent placeholder="Buscar en LumenAI..." />
      </div>
    </section>
  );
}

export function TrafficGlobePanel({ stats }: { stats?: StatInput }) {
  const total = Math.max(1, stats?.chats_total ?? 0, stats?.leads_total ?? 0);
  const hotTraffic = Math.min(100, Math.round(((stats?.leads_new ?? 0) / total) * 100));

  return (
    <section className="apex-panel glass-sheen overflow-hidden p-5 md:p-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:items-center">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/42">
            <Globe2 className="h-3.5 w-3.5" />
            Traffic globe
          </div>
          <h3 className="mt-3 text-3xl font-black leading-none text-white md:text-5xl">
            Trafico por <span className="glass-title-highlight">region</span>
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/54">
            Vista ejecutiva para entender desde que zonas viene mas atencion.
            Ahora usa distribucion operacional estimada; queda lista para conectar analytics real por pais/ciudad.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <TrafficChip icon={<MessageCircle />} label="Chats" value={stats?.chats_total ?? 0} />
            <TrafficChip icon={<Target />} label="Leads" value={stats?.leads_total ?? 0} />
            <TrafficChip icon={<Zap />} label="Hot" value={`${hotTraffic}%`} />
          </div>
        </div>

        <div className="relative min-h-[360px] overflow-hidden rounded-[28px] border border-white/10 bg-black/25">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,.12),transparent_42%)]" />
          <Globe
            className="mx-auto max-w-[520px]"
            markers={trafficMarkers}
            arcs={trafficArcs}
            markerColor={[0.0, 0.90, 1.0]}
            arcColor={[0.0, 0.55, 1.0]}
            baseColor={[0.78, 0.84, 0.92]}
            glowColor={[0.0, 0.90, 1.0]}
            dark={0.84}
            mapBrightness={4.6}
            markerSize={0.032}
            markerElevation={0.018}
            arcWidth={0.85}
            arcHeight={0.34}
            speed={0.0022}
          />
        </div>
      </div>
    </section>
  );
}

function TrafficChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.055] p-3 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-white/48">
        <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

export function LumenInsightCarousel({ stats }: { stats?: StatInput }) {
  const slides = [
    {
      icon: <Radar />,
      title: "Lectura comercial",
      body: `${stats?.leads_qualified ?? 0} leads calificados y ${stats?.leads_won ?? 0} ganados registrados.`,
    },
    {
      icon: <Sparkles />,
      title: "Contenido que convierte",
      body: "Combina Knowledge, horarios y tono para responder con precision sin sonar generico.",
    },
    {
      icon: <BarChart3 />,
      title: "Sistema fluido",
      body: "Los modulos pesados se cargan por piezas y los paneles mantienen respuesta rapida.",
    },
  ];

  return (
    <section className="apex-panel overflow-hidden p-5 md:p-6">
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/38">
            Carousel intelligence
          </div>
          <h3 className="mt-2 text-2xl font-black text-white">
            Acciones recomendadas
          </h3>
        </div>
      </div>

      <Carousel opts={{ align: "start" }}>
        <CarouselContent>
          {slides.map((slide) => (
            <CarouselItem key={slide.title} className="basis-full md:basis-1/2 xl:basis-1/3">
              <div className="min-h-[190px] rounded-[26px] border border-white/10 bg-white/[0.055] p-5 backdrop-blur-2xl">
                <div
                  className="grid h-11 w-11 place-items-center rounded-[16px] border"
                  style={{
                    borderColor: `rgba(${accentA}, .22)`,
                    background: `linear-gradient(135deg, rgba(${accentA}, .16), rgba(${accentB}, .08))`,
                  }}
                >
                  <span className="[&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-white">
                    {slide.icon}
                  </span>
                </div>
                <h4 className="mt-5 text-xl font-black text-white">{slide.title}</h4>
                <p className="mt-3 text-sm leading-6 text-white/50">{slide.body}</p>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-auto right-12 top-[-54px] border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]" />
        <CarouselNext className="right-0 top-[-54px] border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]" />
      </Carousel>
    </section>
  );
}
