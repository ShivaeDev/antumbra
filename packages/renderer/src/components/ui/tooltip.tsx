import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "#lib/utils.ts";

export const TooltipProvider = ({ delayDuration = 200, ...props }: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
	<TooltipPrimitive.Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />
);

export const Tooltip = (props: React.ComponentProps<typeof TooltipPrimitive.Root>) => <TooltipPrimitive.Root data-slot="tooltip" {...props} />;

export const TooltipTrigger = (props: React.ComponentProps<typeof TooltipPrimitive.Trigger>) => (
	<TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
);

export const TooltipContent = ({ children, className, sideOffset = 6, ...props }: React.ComponentProps<typeof TooltipPrimitive.Content>) => (
	<TooltipPrimitive.Portal>
		<TooltipPrimitive.Content
			className={cn(
				"z-50 w-fit max-w-64 origin-(--radix-tooltip-content-transform-origin) rounded-md border border-border bg-popover px-2 py-1 text-2xs text-popover-foreground shadow-lg",
				className,
			)}
			data-slot="tooltip-content"
			sideOffset={sideOffset}
			{...props}
		>
			{children}
			<TooltipPrimitive.Arrow className="z-50 size-2 translate-y-[calc(-50%_-_1px)] rotate-45 rounded-[2px] border-r border-b border-border bg-popover fill-popover" />
		</TooltipPrimitive.Content>
	</TooltipPrimitive.Portal>
);
