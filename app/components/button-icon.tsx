import type { ReactNode } from "react";

export function ButtonIcon({
  loading,
  children,
}: {
  loading: boolean;
  children: ReactNode;
}) {
  return loading ? (
    <span className="button-spinner" aria-hidden="true" />
  ) : (
    children
  );
}
