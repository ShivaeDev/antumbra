import { cn } from "#lib/utils.ts";

// why: a field sizes itself from its longest option or its default columns, so
// without a floor of its own it decides how wide the pane holding it must be.
export const Input = ({
	className,
	type,
	...props
}: React.ComponentProps<"input">) => (
	<input
		className={cn(
			"h-7 w-full min-w-0 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none transition-colors",
			"placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
			"file:mr-2 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground",
			"focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40",
			"disabled:pointer-events-none disabled:opacity-50",
			"aria-invalid:border-destructive/60 aria-invalid:ring-2 aria-invalid:ring-destructive/30",
			className,
		)}
		data-slot="input"
		type={type}
		{...props}
	/>
);
