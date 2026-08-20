import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "#lib/utils.ts";

export const ScrollBar = ({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		className={cn(
			"flex touch-none select-none p-px transition-colors",
			"data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5",
			"data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col",
			className,
		)}
		data-slot="scroll-area-scrollbar"
		orientation={orientation}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb
			className="relative flex-1 rounded-full bg-border-strong hover:bg-muted-foreground"
			data-slot="scroll-area-thumb"
		/>
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
);

export const ScrollArea = ({
	children,
	className,
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) => (
	<ScrollAreaPrimitive.Root
		className={cn("relative min-h-0", className)}
		data-slot="scroll-area"
		{...props}
	>
		<ScrollAreaPrimitive.Viewport
			className="size-full rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
			data-slot="scroll-area-viewport"
		>
			{children}
		</ScrollAreaPrimitive.Viewport>
		<ScrollBar />
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
);
