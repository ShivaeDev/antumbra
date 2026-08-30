import type { ReactNode } from "react";
import { cn } from "#lib/utils.ts";

// why: a pane is read by its headings, so every section on the voyage wears
// the same one — a name, an optional count, and the one act the section
// offers, over a hairline that does the dividing instead of a gap.
export const SectionHeading = ({ action, count, title }: { readonly action?: ReactNode; readonly count?: number; readonly title: string }) => (
	<div className="flex min-w-0 items-center gap-2 border-b border-border pb-1.5">
		<h2 className="min-w-0 truncate text-xs font-medium">{title}</h2>
		{count === undefined ? null : <span className="text-2xs text-muted-foreground tabular-nums">{count}</span>}
		{action === undefined ? null : <div className="ml-auto">{action}</div>}
	</div>
);

export const Section = ({ children, className }: { readonly children: ReactNode; readonly className?: string }) => (
	<section className={cn("flex min-w-0 flex-col gap-2", className)}>{children}</section>
);
