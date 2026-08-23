import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "#components/ui/button.tsx";
import type { DraftImage } from "#views/session-draft.ts";

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
		<fieldset
			aria-label="Attached images"
			className="m-0 flex min-w-0 gap-2 overflow-x-auto border-0 p-0 py-1"
		>
			{images.map((image, index) => (
				<figure
					className="w-24 shrink-0 rounded-md border border-border bg-secondary p-1"
					key={image.id}
				>
					<img
						alt={`Attachment ${index + 1}: ${image.file.name || "pasted file"}`}
						className="h-16 w-full rounded-sm object-cover"
						src={image.url}
					/>
					<figcaption
						className="truncate pt-1 text-2xs"
						title={image.file.name}
					>
						{image.file.name || "pasted image"}
					</figcaption>
					<div className="flex justify-end gap-0.5 pt-0.5">
						<Button
							aria-label={`Move ${image.file.name || "image"} earlier`}
							disabled={disabled || index === 0}
							onClick={() => onMove(index, index - 1)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<ArrowLeft />
						</Button>
						<Button
							aria-label={`Move ${image.file.name || "image"} later`}
							disabled={disabled || index === images.length - 1}
							onClick={() => onMove(index, index + 1)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<ArrowRight />
						</Button>
						<Button
							aria-label={`Remove ${image.file.name || "image"}`}
							disabled={disabled}
							onClick={() => onRemove(index)}
							size="icon"
							type="button"
							variant="ghost"
						>
							<X />
						</Button>
					</div>
				</figure>
			))}
		</fieldset>
	);
