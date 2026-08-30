import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDownIcon } from "lucide-react";
import {
	SelectScrollDownButton,
	SelectScrollUpButton,
} from "#components/ui/select-parts.tsx";
import { cn } from "#lib/utils.ts";

export const Select = (
	props: React.ComponentProps<typeof SelectPrimitive.Root>,
) => <SelectPrimitive.Root data-slot="select" {...props} />;

export const SelectValue = (
	props: React.ComponentProps<typeof SelectPrimitive.Value>,
) => <SelectPrimitive.Value data-slot="select-value" {...props} />;

export const SelectTrigger = ({
	children,
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) => (
	<SelectPrimitive.Trigger
		className={cn(
			"flex h-7 w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none transition-colors",
			"data-[placeholder]:text-muted-foreground",
			"focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40",
			"disabled:pointer-events-none disabled:opacity-50",
			"*:data-[slot=select-value]:truncate [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground",
			className,
		)}
		data-slot="select-trigger"
		{...props}
	>
		{children}
		<SelectPrimitive.Icon asChild>
			<ChevronDownIcon />
		</SelectPrimitive.Icon>
	</SelectPrimitive.Trigger>
);

export const SelectContent = ({
	children,
	className,
	position = "popper",
	...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) => (
	<SelectPrimitive.Portal>
		<SelectPrimitive.Content
			className={cn(
				"relative z-50 max-h-(--radix-select-content-available-height) min-w-32 origin-(--radix-select-content-transform-origin) overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-2xl",
				position === "popper" &&
					"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
				className,
			)}
			data-slot="select-content"
			position={position}
			{...props}
		>
			<SelectScrollUpButton />
			<SelectPrimitive.Viewport
				className={cn(
					"p-1",
					position === "popper" &&
						"h-(--radix-select-trigger-height) w-full min-w-(--radix-select-trigger-width) scroll-my-1",
				)}
			>
				{children}
			</SelectPrimitive.Viewport>
			<SelectScrollDownButton />
		</SelectPrimitive.Content>
	</SelectPrimitive.Portal>
);
