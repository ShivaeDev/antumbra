import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import type { ReactNode } from "react";
import type { DraftImage } from "#session-draft.ts";

const Act = ({
	children,
	disabled,
	onAct,
	words,
}: {
	readonly children: ReactNode;
	readonly disabled: boolean;
	readonly onAct: () => void;
	readonly words: string;
}) => (
	<Tooltip>
		<TooltipTrigger asChild>
			<Button aria-label={words} disabled={disabled} onClick={onAct} size="icon-xs" type="button" variant="ghost">
				{children}
			</Button>
		</TooltipTrigger>
		<TooltipContent>{words}</TooltipContent>
	</Tooltip>
);

export const SessionAttachments = ({
	disabled,
	images,
	onMove,
	onRemove,
}: {
	readonly disabled: boolean;
	readonly images: ReadonlyArray<DraftImage>;
	readonly onMove: (from: number, to: number) => void;
	readonly onRemove: (index: number) => void;
}) =>
	images.length === 0 ? null : (
		<fieldset aria-label="Attached images" className="m-0 flex min-w-0 gap-2 overflow-x-auto border-0 p-0 py-1">
			{images.map((image, index) => (
				<figure className="w-24 shrink-0 rounded-md border border-border bg-secondary p-1" key={image.id}>
					<img alt={`Attachment ${index + 1}: ${image.file.name || "pasted file"}`} className="h-16 w-full rounded-sm object-cover" src={image.url} />
					<figcaption className="truncate pt-1 text-xs" title={image.file.name}>
						{image.file.name || "pasted image"}
					</figcaption>
					<div className="flex justify-end gap-1 pt-1">
						<Act disabled={disabled || index === 0} onAct={() => onMove(index, index - 1)} words={`Move ${image.file.name || "image"} earlier`}>
							<ArrowLeft />
						</Act>
						<Act
							disabled={disabled || index === images.length - 1}
							onAct={() => onMove(index, index + 1)}
							words={`Move ${image.file.name || "image"} later`}
						>
							<ArrowRight />
						</Act>
						<Act disabled={disabled} onAct={() => onRemove(index)} words={`Remove ${image.file.name || "image"}`}>
							<X />
						</Act>
					</div>
				</figure>
			))}
		</fieldset>
	);
