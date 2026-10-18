import type { ReactNode } from "react";

export function PageContainer({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`page-container ${className}`.trim()}>{children}</div>;
}
