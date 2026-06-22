"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@/components/Avatar";
import { useT } from "@/components/LanguageProvider";

type User = { id: string; username: string; avatarUrl: string | null; createdAt: string };

export default function ProfileClient({ user: initial }: { user: User }) {
  const router = useRouter();
  const { t } = useT();
  const [user, setUser] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError(t.profile.errTooBig);
      return;
    }
    setError(null);
    setSuccess(false);
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/users/me/avatar", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t.profile.errFailed);
      return;
    }
    const { avatarUrl } = await res.json();
    setUser((u) => ({ ...u, avatarUrl }));
    setSuccess(true);
    router.refresh();
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="font-display text-2xl font-bold text-ink">{t.profile.heading}</h1>

      <div className="panel p-6 space-y-5">
        {/* Current avatar + upload */}
        <div className="flex items-center gap-5">
          <Avatar username={user.username} avatarUrl={user.avatarUrl} size={72} />
          <div className="space-y-1.5">
            <p className="text-sm font-semibold text-ink">{user.username}</p>
            <p className="text-xs text-muted">
              {t.profile.memberSince(new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long" }))}
            </p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-edge hover:border-quant/50 rounded-lg p-6 text-center cursor-pointer transition"
        >
          <p className="text-sm text-muted">
            {uploading ? t.profile.uploading : t.profile.uploadHint}
          </p>
          <p className="text-xs text-muted/60 mt-1">{t.profile.uploadSub}</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={onInputChange}
          />
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}
        {success && <p className="text-sm text-toxic">{t.profile.success}</p>}
      </div>
    </div>
  );
}
