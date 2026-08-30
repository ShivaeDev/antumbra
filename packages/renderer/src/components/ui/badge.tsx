import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#lib/utils.ts";

export const badgeVariants = cva(
	"inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-1.5 py-px text-2xs font-medium [&_svg]:pointer-events-none [&_svg]:size-2.5",
	{
		defaultVariants: {
			variant: "default",
		},
		variants: {
			variant: {
				default: "border-transparent bg-primary text-primary-foreground",
				destructive: "border-destructive/40 bg-destructive/10 text-destructive",
				info: "border-info/40 bg-info/10 text-info",
				outline: "border-border text-muted-foreground",
				secondary: "border-transparent bg-secondary text-secondary-foreground",
				success: "border-success/40 bg-success/10 text-success",
				warning: "border-warning/40 bg-warning/10 text-warning",
			},
		},
	},
);

export const Badge = ({
	asChild = false,
	className,
	variant,
	...props
}: React.ComponentProps<"span"> &
	VariantProps<typeof badgeVariants> & {
		readonly asChild?: boolean;
	}) => {
	const Element = asChild ? Slot : "span";
	return <Element className={cn(badgeVariants({ className, variant }))} data-slot="badge" {...props} />;
};
