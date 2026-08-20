import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "#lib/utils.ts";

export const DialogHeader = ({
	className,
	...props
}: React.ComponentProps<"div">) => (
	<div
		className={cn("flex flex-col gap-1", className)}
		data-slot="dialog-header"
		{...props}
	/>
);

export const DialogFooter = ({
	className,
	...props
}: React.ComponentProps<"div">) => (
	<div
		className={cn("flex items-center justify-end gap-2", className)}
		data-slot="dialog-footer"
		{...props}
	/>
);

export const DialogTitle = ({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) => (
	<DialogPrimitive.Title
		className={cn("text-sm font-medium", className)}
		data-slot="dialog-title"
		{...props}
	/>
);

export const DialogDescription = ({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) => (
	<DialogPrimitive.Description
		className={cn("text-xs text-muted-foreground", className)}
		data-slot="dialog-description"
		{...props}
	/>
);
