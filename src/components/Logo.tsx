import React from "react";

/**
 * Minimal geometric mark: a square split down the middle, one half filled.
 * Paired with a plain monochrome wordmark.
 */
export function LogoMark({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="18"
        height="18"
        stroke="#FAFAFA"
        strokeWidth="1.5"
      />
      <rect x="1" y="1" width="9" height="18" fill="#FAFAFA" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="text-[15px] font-semibold tracking-tight text-ink">
        Decide For Us
      </span>
    </span>
  );
}
