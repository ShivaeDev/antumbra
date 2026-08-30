import * as SelectPrimitive from "@radix-ui/react-select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "#lib/utils.ts";

const scrollButton =
	"flex cursor-default items-center justify-center py-0.5 text-muted-foreground [&_svg]:size-3.5";

export const SelectItem = ({
	children,
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) => (
	<SelectPrimitive.Item
		className={cn(
			"relative flex w-full cursor-default select-none items-center gap-1.5 rounded-sm py-1 pr-7 pl-2 text-xs outline-none",
			"focus:bg-accent focus:text-accent-foreground",
			"data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
			className,
		)}
		data-slot="select-item"
		{...props}
	>
		<SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
		<span className="absolute right-2 flex size-3.5 items-center justify-center">
			<SelectPrimitive.ItemIndicator>
				<CheckIcon className="size-3.5 text-primary" />
			</SelectPrimitive.ItemIndicator>
		</span>
	</SelectPrimitive.Item>
);

export const SelectScrollUpButton = ({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) => (
	<SelectPrimitive.ScrollUpButton
		className={cn(scrollButton, className)}
		data-slot="select-scroll-up-button"
		{...props}
	>
		<ChevronUpIcon />
	</SelectPrimitive.ScrollUpButton>
);

export const SelectScrollDownButton = ({
	className,
	...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) => (
	<SelectPrimitive.ScrollDownButton
		className={cn(scrollButton, className)}
		data-slot="select-scroll-down-button"
		{...props}
	>
		<ChevronDownIcon />
	</SelectPrimitive.ScrollDownButton>
);
