import { useState, useRef, useEffect } from "react";
import { useClubLogo, DEFAULT_LOGO } from "../../../hooks/useClubLogo";
import { Btn } from "../../atoms/Button/Button";

interface LogoUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function LogoUploadModal({ open, onClose }: LogoUploadModalProps) {
  const { logoUrl, isCustom, updateLogo, resetLogo } = useClubLogo();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPreview(logoUrl);
      setError(null);
    }
  }, [open, logoUrl]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPG, PNG, WebP, SVG).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB.");
      return;
    }

    setError(null);
    setBusy(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Resize to max 512x512 using canvas for fast localStorage storage
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 512;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setPreview(result);
            setBusy(false);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const optimizedData = canvas.toDataURL("image/png", 0.9);
          setPreview(optimizedData);
        } catch {
          setPreview(result);
        } finally {
          setBusy(false);
        }
      };
      img.onerror = () => {
        setError("Gagal memproses file gambar.");
        setBusy(false);
      };
      img.src = result;
    };
    reader.onerror = () => {
      setError("Gagal membaca file.");
      setBusy(false);
    };
    reader.readAsDataURL(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }

  function handleSave() {
    if (preview && preview !== logoUrl) {
      try {
        updateLogo(preview);
        onClose();
      } catch {
        setError("Gagal menyimpan logo. Silakan coba gambar dengan ukuran lebih kecil.");
      }
    } else {
      onClose();
    }
  }

  function handleReset() {
    resetLogo();
    setPreview(DEFAULT_LOGO);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-xs transition-opacity">
      <div
        className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-2xl border border-line animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logo-modal-title"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div>
            <h3 id="logo-modal-title" className="text-base font-bold text-ink">
              Kustomisasi Logo Klub
            </h3>
            <p className="text-xs text-ink-soft">Unggah logo baru atau kembalikan ke logo default PB Kecebong.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-soft hover:bg-court/60 hover:text-ink transition-colors"
            aria-label="Tutup modal"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="my-5 flex flex-col items-center">
          {/* Circular Preview */}
          <div className="relative mb-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white shadow-md ring-4 ring-lime/40 border border-neutral-200">
            <img
              src={preview || DEFAULT_LOGO}
              alt="Preview Logo"
              className="h-full w-full object-cover rounded-full"
            />
          </div>
          <span className="text-xs font-semibold text-pine">
            {preview === DEFAULT_LOGO ? "Logo Default PB Kecebong" : "Pratinjau Logo Baru"}
          </span>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 w-full cursor-pointer rounded-xl border-2 border-dashed border-line bg-court/30 p-5 text-center transition-colors hover:border-lime hover:bg-court/60"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6 text-pine">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-xs font-semibold text-ink">
                Klik untuk memilih file atau seret gambar ke sini
              </p>
              <p className="text-[11px] text-ink-soft">Format: PNG, JPG, WebP, SVG (Maks. 5MB)</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-between sm:items-center">
          {isCustom ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline text-left"
            >
              Reset ke Logo Default
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2 justify-end">
            <Btn variant="plain" onClick={onClose} disabled={busy}>
              Batal
            </Btn>
            <Btn variant="primary" onClick={handleSave} disabled={busy || preview === logoUrl}>
              {busy ? "Memproses..." : "Simpan Logo"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}
