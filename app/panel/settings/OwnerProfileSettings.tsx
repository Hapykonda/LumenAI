"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  Check,
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { ImageCropDialog } from "@/components/ui/image-crop-dialog";
import {
  deleteOwnerProfileImage,
  getOwnerProfile,
  updateOwnerProfile,
  uploadOwnerProfileImage,
  validateOwnerProfileSourceImage,
} from "@/lib/owner-profile-client";
import {
  EMPTY_OWNER_PROFILE,
  OWNER_PROFILE_EVENT,
  type OwnerProfile,
} from "@/lib/owner-profile";
import styles from "./owner-profile-settings.module.css";

function initials(name: string, email: string) {
  const source = name.trim() || email.split("@")[0] || "L";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function roleLabel(role: string) {
  if (role === "owner") return "Propietario";
  if (role === "admin") return "Administrador";
  if (role === "member") return "Miembro";
  return role || "Propietario";
}

function editableSnapshot(profile: OwnerProfile) {
  return JSON.stringify({
    displayName: profile.displayName.trim(),
    jobTitle: profile.jobTitle.trim(),
    bio: profile.bio.trim(),
    avatarUrl: profile.avatarUrl,
  });
}

export function OwnerProfileSettings() {
  const [profile, setProfile] = useState<OwnerProfile>(EMPTY_OWNER_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const savedRef = useRef(editableSnapshot(EMPTY_OWNER_PROFILE));
  const fileRef = useRef<HTMLInputElement | null>(null);

  const dirty = editableSnapshot(profile) !== savedRef.current;
  const completion = useMemo(() => {
    const checks = [
      Boolean(profile.displayName.trim()),
      Boolean(profile.jobTitle.trim()),
      Boolean(profile.bio.trim()),
      Boolean(profile.avatarUrl),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);

  useEffect(() => {
    let active = true;

    void getOwnerProfile()
      .then(({ profile: loaded }) => {
        if (!active) return;
        setProfile(loaded);
        savedRef.current = editableSnapshot(loaded);
      })
      .catch((loadError) => {
        if (!active) return;
        setError(
          loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil.",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), 2200);
    return () => window.clearTimeout(timer);
  }, [message]);

  function publishUpdate(next: OwnerProfile) {
    window.dispatchEvent(
      new CustomEvent<OwnerProfile>(OWNER_PROFILE_EVENT, { detail: next }),
    );
  }

  async function saveProfile() {
    if (saving || uploading || !dirty) return;
    setSaving(true);
    setError(null);

    try {
      const { profile: saved } = await updateOwnerProfile(profile);
      setProfile(saved);
      savedRef.current = editableSnapshot(saved);
      publishUpdate(saved);
      setMessage("Perfil guardado.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmPhoto(file: File) {
    if (uploading) return;
    setUploading(true);
    setError(null);
    try {
      const { profile: saved } = await uploadOwnerProfileImage(file);
      setProfile(saved);
      savedRef.current = editableSnapshot(saved);
      publishUpdate(saved);
      setMessage("Foto de perfil actualizada.");
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo actualizar la foto.",
      );
    } finally {
      setUploading(false);
      setCropFile(null);
    }
  }

  async function removePhoto() {
    if (uploading || !profile.avatarUrl) return;
    setUploading(true);
    setError(null);

    try {
      const { profile: saved } = await deleteOwnerProfileImage();
      setProfile(saved);
      savedRef.current = editableSnapshot(saved);
      publishUpdate(saved);
      setMessage("Foto retirada.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "No se pudo retirar la foto.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loading} role="status">
        <Loader2 aria-hidden="true" />
        Preparando tu perfil
      </div>
    );
  }

  return (
    <>
      <div className={styles.layout}>
        <section className={styles.identity} aria-labelledby="owner-profile-heading">
          <div className={styles.sectionHeader}>
            <div>
              <span>Identidad de cuenta</span>
              <h2 id="owner-profile-heading">Mi perfil</h2>
              <p>Esta identidad se utiliza dentro del panel y no cambia la foto del asistente.</p>
            </div>
            <div
              className={styles.completion}
              role="progressbar"
              aria-label="Perfil completado"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completion}
            >
              <strong>{completion}%</strong>
              <span>completo</span>
            </div>
          </div>

          <div className={styles.photoRow}>
            <div className={styles.avatar}>
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt={`Foto de ${profile.displayName || "la cuenta"}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>{initials(profile.displayName, profile.email)}</span>
              )}
              {uploading ? (
                <span className={styles.avatarLoading} role="status">
                  <Loader2 aria-hidden="true" />
                  <span className={styles.srOnly}>Actualizando foto</span>
                </span>
              ) : null}
            </div>

            <div className={styles.photoContent}>
              <strong>Foto del dueño del panel</strong>
              <p>PNG, JPG o WebP hasta 10 MB. Se recorta y optimiza a 640 × 640 px.</p>
              <div className={styles.photoActions}>
                <input
                  aria-label="Seleccionar foto del dueño del panel"
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0] ?? null;
                    event.currentTarget.value = "";
                    if (!file) return;
                    const validation = validateOwnerProfileSourceImage(file);
                    if (validation) {
                      setError(validation);
                      return;
                    }
                    setCropFile(file);
                  }}
                />
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || saving}
                >
                  <Camera aria-hidden="true" />
                  {profile.avatarUrl ? "Cambiar foto" : "Elegir foto"}
                </button>
                {profile.avatarUrl ? (
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => void removePhoto()}
                    disabled={uploading || saving}
                    aria-label="Retirar foto del perfil"
                    title="Retirar foto"
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.fields}>
            <label>
              <span>Nombre visible</span>
              <div>
                <UserRound aria-hidden="true" />
                <input
                  value={profile.displayName}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      displayName: event.target.value.slice(0, 80),
                    }))
                  }
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </div>
            </label>

            <label>
              <span>Cargo o función</span>
              <div>
                <BriefcaseBusiness aria-hidden="true" />
                <input
                  value={profile.jobTitle}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      jobTitle: event.target.value.slice(0, 80),
                    }))
                  }
                  placeholder="Ej. Fundador, Directora comercial"
                  autoComplete="organization-title"
                />
              </div>
            </label>

            <label className={styles.fullField}>
              <span>Descripción breve</span>
              <textarea
                value={profile.bio}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    bio: event.target.value.slice(0, 240),
                  }))
                }
                placeholder="Describe tu responsabilidad dentro del negocio."
                rows={4}
              />
              <small>{profile.bio.length}/240</small>
            </label>
          </div>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          {message ? (
            <p className={styles.success} role="status">
              <Check aria-hidden="true" />
              {message}
            </p>
          ) : null}

          <div className={styles.footer}>
            <span>{dirty ? "Hay cambios sin guardar." : "El perfil está sincronizado."}</span>
            <button
              type="button"
              className={styles.saveButton}
              onClick={() => void saveProfile()}
              disabled={!dirty || saving || uploading}
            >
              {saving ? <Loader2 className={styles.spin} aria-hidden="true" /> : <Check aria-hidden="true" />}
              {saving ? "Guardando" : "Guardar perfil"}
            </button>
          </div>
        </section>

        <aside className={styles.summary} aria-label="Resumen del perfil">
          <div className={styles.summaryAvatar}>
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span>{initials(profile.displayName, profile.email)}</span>
            )}
          </div>
          <span className={styles.role}>
            <ShieldCheck aria-hidden="true" />
            {roleLabel(profile.role)}
          </span>
          <h3>{profile.displayName || "Tu nombre"}</h3>
          <p className={styles.jobTitle}>{profile.jobTitle || "Cargo sin definir"}</p>
          <p className={styles.bio}>{profile.bio || "Añade una descripción breve para completar tu identidad interna."}</p>
          <div className={styles.email}>
            <Mail aria-hidden="true" />
            <span>{profile.email || "Correo no disponible"}</span>
          </div>
          <p className={styles.privacy}>
            La cuenta y el asistente mantienen identidades independientes. Cambiar esta foto no modifica el widget público.
          </p>
        </aside>
      </div>

      {cropFile ? (
        <ImageCropDialog
          file={cropFile}
          title="Encuadrar foto del perfil"
          onCancel={() => setCropFile(null)}
          onConfirm={confirmPhoto}
        />
      ) : null}
    </>
  );
}
