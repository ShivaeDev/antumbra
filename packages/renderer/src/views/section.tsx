import type { ReactNode } from "react";
import { cn } from "#lib/utils.ts";

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
