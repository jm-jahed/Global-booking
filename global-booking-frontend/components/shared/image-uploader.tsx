"use client";

import React, { useState, useRef, useCallback } from "react";
import { Upload, X, RefreshCw, CheckCircle2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/i18n-context";

export interface UploadedImageMetadata {
  readonly imageUrl: string;
  readonly storageKey?: string;
  readonly storageProvider?: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
}

export interface ImageUploaderProps {
  readonly currentImageUrl?: string;
  readonly onUploadSuccess: (metadata: UploadedImageMetadata) => void;
  readonly onRemove?: () => void;
  readonly uploadEndpoint?: string;
  readonly maxSizeBytes?: number; // Default 5 MB
  readonly allowedTypes?: readonly string[]; // Default ['image/jpeg', 'image/png', 'image/webp']
  readonly label?: string;
  readonly disabled?: boolean;
  readonly aspectRatio?: "square" | "cover" | "avatar";
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const DEFAULT_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUploader({
  currentImageUrl,
  onUploadSuccess,
  onRemove,
  uploadEndpoint = "/api/v1/portal/doctor/upload-avatar",
  maxSizeBytes = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  label,
  disabled = false,
  aspectRatio = "avatar",
}: ImageUploaderProps) {
  const { t, dir } = useTranslation("upload");
  const { t: tCommon } = useTranslation("common");

  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRtl = dir === "rtl";

  const validateFile = (file: File): string | null => {
    if (!allowedTypes.includes(file.type)) {
      return t("invalidFileType", undefined, "Only JPEG, PNG, and WebP images are allowed.");
    }
    if (file.size > maxSizeBytes) {
      return t("fileTooLarge", undefined, "File exceeds maximum allowed size of 5 MB.");
    }
    return null;
  };

  const handleUploadFile = async (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateFile(file);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // Simulation/backend upload call
      setUploadProgress(45);

      const response = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setUploadProgress(85);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t("uploadError", undefined, "Failed to upload image. Please try again."));
      }

      const result = await response.json();
      setUploadProgress(100);

      const metadata: UploadedImageMetadata = {
        imageUrl: result.imageUrl || result.url || result.data?.imageUrl,
        storageKey: result.storageKey || result.publicId,
        storageProvider: result.storageProvider || "persistent",
        mimeType: file.type,
        sizeBytes: file.size,
      };

      if (!metadata.imageUrl) {
        throw new Error("Storage provider did not return a valid persistent image URL.");
      }

      setPreviewUrl(metadata.imageUrl);
      setSuccessMessage(t("uploadSuccess", undefined, "Image uploaded and saved successfully!"));
      onUploadSuccess(metadata);
    } catch (err: any) {
      // In development / demo when backend storage provider credentials are not yet configured,
      // report clear error rather than saving fake blob URL!
      setErrorMessage(err.message || t("uploadError", undefined, "Upload failed."));
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleUploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleUploadFile(file);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (onRemove) {
      onRemove();
    }
  };

  const borderRadius = aspectRatio === "avatar" ? "50%" : 12;
  const containerDimensions =
    aspectRatio === "avatar"
      ? { width: 110, height: 110 }
      : aspectRatio === "square"
        ? { width: 140, height: 140 }
        : { width: "100%", height: 180 };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        direction: dir,
        textAlign: isRtl ? "right" : "left",
      }}
    >
      {label && (
        <label style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>
          {label}
        </label>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: 16,
          borderRadius: 14,
          background: isDragging ? "rgba(99, 102, 241, 0.12)" : "rgba(15, 23, 42, 0.6)",
          border: isDragging
            ? "2px dashed #818cf8"
            : "1px dashed rgba(255, 255, 255, 0.16)",
          transition: "all 0.2s ease",
        }}
      >
        {/* Image Preview Box */}
        <div
          style={{
            ...containerDimensions,
            borderRadius,
            overflow: "hidden",
            flexShrink: 0,
            background: "#0b1222",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            display: "grid",
            placeItems: "center",
            position: "relative",
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={t("preview", undefined, "Image Preview")}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <ImageIcon size={32} style={{ color: "#475569" }} />
          )}

          {isUploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0, 0, 0, 0.7)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <RefreshCw
                size={22}
                className="animate-spin"
                style={{ color: "#818cf8" }}
              />
              <span style={{ fontSize: 11, color: "#e2e8f0", fontWeight: 700 }}>
                {uploadProgress}%
              </span>
            </div>
          )}
        </div>

        {/* Controls and Help Text */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept={allowedTypes.join(",")}
              onChange={handleFileChange}
              disabled={disabled || isUploading}
              style={{ display: "none" }}
              id="global-image-file-input"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                border: "1px solid rgba(129, 140, 248, 0.4)",
                color: "#ffffff",
                fontSize: 13,
                fontWeight: 600,
                cursor: disabled || isUploading ? "not-allowed" : "pointer",
                opacity: disabled || isUploading ? 0.6 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <Upload size={14} />
              <span>
                {previewUrl
                  ? t("replaceImage", undefined, "Replace Image")
                  : t("uploadImage", undefined, "Upload Image")}
              </span>
            </button>

            {previewUrl && onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || isUploading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: disabled || isUploading ? "not-allowed" : "pointer",
                }}
              >
                <X size={14} />
                <span>{t("removeImage", undefined, "Remove Image")}</span>
              </button>
            )}
          </div>

          <span style={{ fontSize: 12, color: "#94a3b8" }}>
            {t("supportedFormats", undefined, "Supported formats: JPEG, PNG, WebP (Max 5 MB)")}
          </span>
        </div>
      </div>

      {/* Upload Feedback Toasts / Banners */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            color: "#fca5a5",
            fontSize: 12,
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            color: "#6ee7b7",
            fontSize: 12,
          }}
        >
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
}
