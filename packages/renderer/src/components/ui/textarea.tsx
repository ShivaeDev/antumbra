import { cn } from "#lib/utils.ts";

export const Textarea = ({ className, ...props }: React.ComponentProps<"textarea">) => (
	<textarea
		className={cn(
			"w-full min-w-0 resize-y rounded-md border border-border bg-input px-2 py-1.5 text-xs text-foreground outline-none transition-colors",
			"placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
			"focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40",
			"disabled:pointer-events-none disabled:opacity-50",
			"aria-invalid:border-destructive/60 aria-invalid:ring-2 aria-invalid:ring-destructive/30",
			className,
		)}
		data-slot="textarea"
		{...props}
	/>
);
