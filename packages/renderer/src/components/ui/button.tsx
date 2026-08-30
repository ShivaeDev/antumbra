import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "#lib/utils.ts";

export const buttonVariants = cva(
	"inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
	{
		defaultVariants: {
			size: "default",
			variant: "default",
		},
		variants: {
			size: {
				default: "h-7 px-2.5 text-xs",
				icon: "size-7",
				lg: "h-8 px-3 text-sm",
				sm: "h-6 px-2 text-2xs",
			},
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/85",
				destructive: "bg-destructive/15 text-destructive hover:bg-destructive/25 focus-visible:ring-destructive/50",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-link underline-offset-4 hover:underline",
				outline: "border-border bg-input/40 hover:border-border-strong hover:bg-accent",
				secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
			},
		},
	},
);

export const Button = ({
	asChild = false,
	className,
	size,
	variant,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		readonly asChild?: boolean;
	}) => {
	const Element = asChild ? Slot : "button";
	return <Element className={cn(buttonVariants({ className, size, variant }))} data-slot="button" {...props} />;
};
