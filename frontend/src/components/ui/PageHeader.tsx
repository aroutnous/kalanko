import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string;
  action?: ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  action,
}: PageHeaderProps): React.JSX.Element {
  return (
    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div>
        {breadcrumb ? (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {breadcrumb}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
