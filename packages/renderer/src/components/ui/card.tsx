import { cn } from "#lib/utils.ts";

export const Card = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div
		className={cn("flex min-w-0 flex-col gap-1.5 rounded-lg border border-border bg-card px-2.5 py-2 text-card-foreground", className)}
		data-slot="card"
		{...props}
	/>
);

export const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div
		className={cn("grid min-w-0 auto-rows-min items-start gap-0.5 has-data-[slot=card-action]:grid-cols-[1fr_auto]", className)}
		data-slot="card-header"
		{...props}
	/>
);

export const CardAction = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)} data-slot="card-action" {...props} />
);

export const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div className={cn("min-w-0 wrap-anywhere", className)} data-slot="card-content" {...props} />
);
