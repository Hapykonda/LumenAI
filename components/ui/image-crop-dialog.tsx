"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImageIcon, Loader2, X, ZoomIn } from "lucide-react";
import { useModalAccessibility } from "./use-modal-accessibility";
import styles from "./image-crop-dialog.module.css";

type ImageCropDialogProps = {
  file: File;
  title?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void | Promise<void>;
};

type ImageSize = {
  width: number;
  height: number;
};

type FocusPoint = {
  x: number;
  y: number;
};

const OUTPUT_SIZE = 640;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getRenderMetrics(
  image: ImageSize,
  frameSize: number,
  zoom: number,
  focus: FocusPoint
) {
  const baseScale = Math.max(frameSize / image.width, frameSize / image.height);
  const scale = baseScale * zoom;
  const width = image.width * scale;
  const height = image.height * scale;
  const maxX = Math.max(0, (width - frameSize) / 2);
  const maxY = Math.max(0, (height - frameSize) / 2);

  return {
    width,
    height,
    maxX,
    maxY,
    x: (frameSize - width) / 2 + (0.5 - focus.x) * maxX * 2,
    y: (frameSize - height) / 2 + (0.5 - focus.y) * maxY * 2,
  };
}

async function renderCroppedFile(
  sourceUrl: string,
  sourceFile: File,
  zoom: number,
  focus: FocusPoint
) {
  const image = new Image();
  image.decoding = "async";
  image.src = sourceUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("No se pudo preparar el recorte.");

  const metrics = getRenderMetrics(
    { width: image.naturalWidth, height: image.naturalHeight },
    OUTPUT_SIZE,
    zoom,
    focus
  );

  context.fillStyle = "#05070B";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, metrics.x, metrics.y, metrics.width, metrics.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("No se pudo generar la imagen recortada."));
      },
      "image/webp",
      0.88
    );
  });

  const baseName = sourceFile.name.replace(/\.[^.]+$/, "").slice(0, 72) || "avatar";
  return new File([blob], `${baseName}-lumenai.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export function ImageCropDialog({
  file,
  title = "Ajustar foto",
  onCancel,
  onConfirm,
}: ImageCropDialogProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    pointerX: number;
    pointerY: number;
    focus: FocusPoint;
  } | null>(null);
  const sourceUrl = useMemo(() => URL.createObjectURL(file), [file]);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [frameSize, setFrameSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [focus, setFocus] = useState<FocusPoint>({ x: 0.5, y: 0.5 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useModalAccessibility<HTMLElement>({
    onClose: onCancel,
    closeDisabled: saving,
  });

  useEffect(() => {
    return () => URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateSize = () => setFrameSize(frame.clientWidth || 320);
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  const metrics = useMemo(() => {
    if (!imageSize) return null;
    return getRenderMetrics(imageSize, frameSize, zoom, focus);
  }, [focus, frameSize, imageSize, zoom]);

  function moveImage(event: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || !metrics) return;

    const deltaX = event.clientX - drag.pointerX;
    const deltaY = event.clientY - drag.pointerY;

    setFocus({
      x:
        metrics.maxX > 0
          ? clamp(drag.focus.x - deltaX / (metrics.maxX * 2))
          : drag.focus.x,
      y:
        metrics.maxY > 0
          ? clamp(drag.focus.y - deltaY / (metrics.maxY * 2))
          : drag.focus.y,
    });
  }

  async function confirmCrop() {
    if (!sourceUrl || !imageSize || saving) return;

    setSaving(true);
    setError(null);

    try {
      const cropped = await renderCroppedFile(sourceUrl, file, zoom, focus);
      await onConfirm(cropped);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "No se pudo procesar la imagen."
      );
      setSaving(false);
    }
  }

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="lumenai-crop-title"
        aria-describedby="lumenai-crop-hint"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Perfil visual</span>
            <h2 id="lumenai-crop-title">{title}</h2>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            onClick={onCancel}
            disabled={saving}
            aria-label="Cerrar recorte"
            title="Cerrar"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          <div
            ref={frameRef}
            className={styles.cropFrame}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              dragRef.current = {
                pointerX: event.clientX,
                pointerY: event.clientY,
                focus,
              };
            }}
            onPointerMove={moveImage}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {sourceUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sourceUrl}
                alt="Vista previa de la foto seleccionada"
                draggable={false}
                onLoad={(event) => {
                  setImageSize({
                    width: event.currentTarget.naturalWidth,
                    height: event.currentTarget.naturalHeight,
                  });
                }}
                style={
                  metrics
                    ? {
                        width: metrics.width,
                        height: metrics.height,
                        transform: `translate3d(${metrics.x}px, ${metrics.y}px, 0)`,
                      }
                    : undefined
                }
              />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
            <span className={styles.focusRing} aria-hidden="true" />
          </div>

          <label className={styles.zoomControl}>
            <span>
              <ZoomIn aria-hidden="true" />
              Ampliacion
            </span>
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              aria-label="Ampliacion de la foto"
            />
            <output>{Math.round(zoom * 100)}%</output>
          </label>

          <p className={styles.hint} id="lumenai-crop-hint">
            Arrastra la imagen para elegir el encuadre. Se optimizara a 640 x 640
            px para cargar rapido.
          </p>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={onCancel}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => void confirmCrop()}
            disabled={!imageSize || saving}
          >
            {saving ? (
              <Loader2 className={styles.spin} aria-hidden="true" />
            ) : (
              <Check aria-hidden="true" />
            )}
            {saving ? "Procesando" : "Usar esta foto"}
          </button>
        </footer>
      </section>
    </div>
  );
}
