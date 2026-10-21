import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "~/components/ui/breadcrumb";
import { cn } from "~/lib/utils";

export type Crumb = { label: string; to: string };

/**
 * The one way a page in the app shell opens: where you came from, what this is,
 * what you can do here. Every page uses it so titles start at the same height,
 * in the same size, on every route.
 *
 * `crumbs` lists the parents only; the title already names the current page.
 * `meta` sits under the description (badges, counts); `actions` sits beside the
 * title on wide screens and under it on narrow ones.
 */
export function PageHeader({
  title,
  description,
  crumbs,
  eyebrow,
  meta,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  eyebrow?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header data-slot="page-header" className={cn("flex flex-col gap-4", className)}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {crumbs.map((crumb, index) => (
              <Fragment key={crumb.to}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbLink
                    className="block max-w-[16rem] truncate py-0.5 sm:max-w-sm"
                    render={<Link to={crumb.to} />}
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-2.5">
          {eyebrow && <div className="flex min-w-0 flex-wrap items-center gap-2">{eyebrow}</div>}
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance break-words sm:text-4xl">
            {title}
          </h1>
          {description && (
            <p className="max-w-2xl leading-relaxed text-pretty text-muted-foreground">
              {description}
            </p>
          )}
          {meta && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-sm text-muted-foreground">
              {meta}
            </div>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}
