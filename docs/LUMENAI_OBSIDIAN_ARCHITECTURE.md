# LumenAI Obsidian Design Architecture

LumenAI debe sentirse como un sistema de inteligencia operativa en obsidiana: negro, preciso, translucido, con luz viva detras y componentes sobrios que parecen hardware/software premium, no una plantilla de IA.

## Capas Del Sistema

1. `PanelShell`
   - Aplica el universo visual del panel.
   - Debe mantener el fondo negro puro, layout centrado y sidebar persistente.
   - Clase raiz: `lmn-obsidian-system`.

2. `PageShell`
   - Es el molde oficial para paginas internas.
   - Centra el contenido con `--lmn-obsidian-max-content`.
   - Define header, acciones, stack y right rail.

3. Primitivos Obsidian
   - Archivo: `app/panel/_components/ui/ObsidianPrimitives.tsx`.
   - `ObsidianSurface`: superficie translucida base.
   - `ObsidianGrid`: grilla con separacion minima y sin tarjetas flotantes.
   - `ObsidianMetric`: metrica sobria, numerica y escaneable.
   - `ObsidianKicker`: etiqueta tecnica pequena.
   - `ObsidianStack`: spacing vertical consistente.

4. Componentes Compatibles
   - `GlassCard` ahora es wrapper de `ObsidianSurface`.
   - `MetricCard` ahora es wrapper de `ObsidianMetric`.
   - `ActionButton` conserva variantes, pero la capa CSS obsidiana controla bordes, radios y hover.

5. Capa CSS Global
   - Archivo: `app/globals.css`.
   - Bloques principales:
     - `LumenAI Obsidian Glass system-wide application`
     - `LumenAI Obsidian Architecture primitives`

## Reglas Visuales

- Fondo base: negro real `#000`.
- Las tarjetas no deben tener color propio fuerte.
- El color debe venir de luz ambiental detras o de acentos funcionales.
- Bordes en reposo: casi invisibles.
- Bordes en hover: visibles, finos, sin brillos exagerados.
- Radius recomendado: `2px` a `4px`.
- No usar cards redondeadas tipo plantilla.
- No usar gradientes decorativos independientes en cada modulo.
- No usar textos gigantes dentro de paneles pequenos.
- El contenido debe vivir centrado, no ocupar todo el ancho de pantalla.

## Patron De Pagina

```tsx
import { PageShell } from "../_components/ui/PageShell";
import {
  ObsidianGrid,
  ObsidianMetric,
  ObsidianSurface,
  ObsidianStack,
} from "../_components/ui/ObsidianPrimitives";

export default function ModulePage() {
  return (
    <PageShell
      eyebrow="Inteligencia"
      title="Modulo"
      description="Descripcion clara, corta y operativa."
      actions={<ActionButton variant="primary">Accion principal</ActionButton>}
    >
      <ObsidianStack>
        <ObsidianGrid>
          <ObsidianMetric label="Salud" value="83%" detail="Sistema listo" />
          <ObsidianMetric label="Leads" value="6" detail="Datos reales" />
        </ObsidianGrid>

        <ObsidianSurface tone="ambient">
          Contenido operativo.
        </ObsidianSurface>
      </ObsidianStack>
    </PageShell>
  );
}
```

## Migracion Por Seccion

1. Reemplazar wrappers externos por `PageShell`.
2. Cambiar tarjetas principales a `ObsidianSurface`.
3. Cambiar grupos de metricas a `ObsidianGrid` + `ObsidianMetric`.
4. Mantener acciones con `ActionButton`.
5. Eliminar `border-white/[...]` y `rounded-[...]` cuando ya no sean necesarios.
6. Evitar estilos inline salvo datos dinamicos o variables CSS.
7. Validar visualmente desktop y mobile.

## Checklist De QA Visual

- Fondo negro puro sin capas grises accidentales.
- Las superficies reflejan la luz de fondo, no se pintan solas.
- Sin bordes blancos fuertes en reposo.
- Hover revela estructura sin saturar.
- Sidebar y contenido usan la misma escala tipografica.
- El contenido queda centrado como Vercel, con ancho maximo.
- Botones principales tienen una jerarquia clara.
- Ninguna pantalla se siente como demo generica de IA.
