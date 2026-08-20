import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cn } from "#lib/utils.ts";

export const Dialog = (
	props: React.ComponentProps<typeof DialogPrimitive.Root>,
) => <DialogPrimitive.Root data-slot="dialog" {...props} />;

export const DialogTrigger = (
	props: React.ComponentProps<typeof DialogPrimitive.Trigger>,
) => <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;

export const DialogClose = (
	props: React.ComponentProps<typeof DialogPrimitive.Close>,
) => <DialogPrimitive.Close data-slot="dialog-close" {...props} />;

export const DialogOverlay = ({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) => (
	<DialogPrimitive.Overlay
		className={cn(
			"fixed inset-0 z-50 bg-background/75 backdrop-blur-[2px]",
			className,
		)}
		data-slot="dialog-overlay"
		{...props}
	/>
);

export const DialogContent = ({
	children,
	className,
	showCloseButton = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	readonly showCloseButton?: boolean;
}) => (
	<DialogPrimitive.Portal>
		<DialogOverlay />
		<DialogPrimitive.Content
			className={cn(
				"fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-3",
				"rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-2xl",
				className,
			)}
			data-slot="dialog-content"
			{...props}
		>
			{children}
			{showCloseButton ? (
				<DialogPrimitive.Close
					className="absolute top-3 right-3 rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:pointer-events-none [&_svg]:size-3.5"
					data-slot="dialog-close"
				>
					<XIcon />
					<span className="sr-only">Close</span>
				</DialogPrimitive.Close>
			) : null}
		</DialogPrimitive.Content>
	</DialogPrimitive.Portal>
);
