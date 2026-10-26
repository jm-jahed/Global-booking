"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Globe, Check, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n/i18n-context";
import { SUPPORTED_LOCALES, getLocaleInfo } from "@/lib/i18n/locales";
import type { Locale } from "@/lib/i18n/types";

export interface LanguageSelectorProps {
  readonly variant?: "header" | "topbar" | "footer" | "compact";
  readonly className?: string;
  readonly theme?: "dark" | "light";
}

export function LanguageSelector({ variant = "header", className = "", theme = "dark" }: LanguageSelectorProps) {
  const { locale, setLocale, dir } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeLocaleInfo = getLocaleInfo(locale);
  const isLight = theme === "light";

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard accessibility
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    },
    [],
  );

  const handleSelect = (code: Locale) => {
    setLocale(code);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const isCompact = variant === "compact";

  return (
    <div
      ref={containerRef}
      className={`relative inline-block text-left ${className}`}
      onKeyDown={handleKeyDown}
      style={{ position: "relative", zIndex: 60 }}
    >
      <button
        ref={triggerRef}
        type="button"
        id="global-language-selector-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select language. Current: ${activeLocaleInfo.nativeName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: isCompact ? "4px 8px" : "6px 12px",
          borderRadius: 8,
          background: isLight ? "rgba(241, 245, 249, 0.95)" : "rgba(30, 41, 59, 0.7)",
          border: isLight ? "1px solid rgba(203, 213, 225, 0.9)" : "1px solid rgba(255, 255, 255, 0.12)",
          color: isLight ? "#0f172a" : "#f8fafc",
          fontSize: isCompact ? 12 : 13,
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.15s ease",
          backdropFilter: "blur(12px)",
          outline: "none",
          boxShadow: isLight ? "0 1px 3px rgba(15, 23, 42, 0.05)" : "none",
        }}
      >
        <Globe size={isCompact ? 13 : 15} style={{ color: isLight ? "#4f46e5" : "#818cf8", flexShrink: 0 }} />
        <span className="lang-label-text">{activeLocaleInfo.nativeName}</span>
        <ChevronDown
          size={isCompact ? 12 : 14}
          style={{
            color: isLight ? "#64748b" : "#94a3b8",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Supported Languages"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: dir === "rtl" ? "auto" : 0,
            left: dir === "rtl" ? 0 : "auto",
            width: 210,
            maxHeight: 320,
            overflowY: "auto",
            backgroundColor: isLight ? "#ffffff" : "#0f172a",
            borderRadius: 10,
            border: isLight ? "1px solid rgba(226, 232, 240, 1)" : "1px solid rgba(255, 255, 255, 0.14)",
            boxShadow: isLight ? "0 16px 36px rgba(15, 23, 42, 0.16)" : "0 12px 30px rgba(0, 0, 0, 0.45)",
            padding: "4px 0",
            zIndex: 100,
            textAlign: "start",
          }}
        >
          <div
            style={{
              padding: "6px 12px",
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: isLight ? "#64748b" : "#64748b",
              borderBottom: isLight ? "1px solid rgba(226, 232, 240, 0.8)" : "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            Select Language
          </div>

          {SUPPORTED_LOCALES.map((item) => {
            const isSelected = item.code === locale;
            return (
              <button
                key={item.code}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(item.code)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected
                    ? isLight ? "#4338ca" : "#a5b4fc"
                    : isLight ? "#1e293b" : "#e2e8f0",
                  backgroundColor: isSelected
                    ? isLight ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.14)"
                    : "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "start",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = isLight ? "rgba(241, 245, 249, 1)" : "rgba(255, 255, 255, 0.05)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }
                }}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, lineHeight: 1.2 }}>{item.nativeName}</span>
                  <span style={{ fontSize: 10, color: "#64748b" }}>{item.name}</span>
                </div>
                {isSelected && (
                  <Check size={14} style={{ color: isLight ? "#4f46e5" : "#818cf8", flexShrink: 0 }} />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
