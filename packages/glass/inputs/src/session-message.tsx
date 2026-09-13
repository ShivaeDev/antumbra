import { Button } from "@antumbra/glass-components/shadcn/button.tsx";
import { Textarea } from "@antumbra/glass-components/shadcn/textarea.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@antumbra/glass-components/shadcn/tooltip.tsx";
import { Paperclip } from "lucide-react";
import { type ComponentProps, useRef } from "react";
import type { InputsClient } from "#client.ts";
import type { Drafts } from "#drafts.ts";
import { SessionAttachments } from "#session-attachments.tsx";
import { useSessionInput } from "#use-session-input.ts";

const SessionInputComposer = ({
	api,
	drafts,
	canSend,
	canAttachImages,
	backend,
	hint,
	onError,
	sessionId,
}: {
	readonly api: InputsClient;
	readonly drafts: Drafts;
	readonly canSend: boolean;
	readonly canAttachImages: boolean;
	readonly backend: string;
	readonly hint?: string | undefined;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => {
	const blocked = canSend ? undefined : "This session cannot receive messages";
	const fileInput = useRef<HTMLInputElement>(null);
	const draft = useSessionInput(api, drafts, sessionId, canAttachImages, onError);
	const ready =
		blocked === undefined &&
		!draft.sending &&
		(draft.images.length === 0 || canAttachImages === true) &&
		(draft.text.trim() !== "" || draft.images.length > 0);
	const attaches = canAttachImages ? "Attach a file" : "This backend cannot receive images";
	return (
		<div className="flex min-w-0 flex-col gap-1">
			<SessionAttachments disabled={draft.sending} images={draft.images} onMove={draft.move} onRemove={draft.remove} />
			<div className="flex min-w-0 items-end gap-2">
				<input
					accept="image/jpeg,image/png,image/webp"
					aria-label="Choose images to attach"
					className="sr-only"
					disabled={blocked !== undefined || draft.sending}
					multiple
					onChange={(event) => {
						draft.addFiles(Array.from(event.target.files ?? []));
						event.target.value = "";
					}}
					ref={fileInput}
					type="file"
				/>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-label="Attach a file"
							disabled={blocked !== undefined || draft.sending || !canAttachImages}
							onClick={() => fileInput.current?.click()}
							size="icon-sm"
							type="button"
							variant="ghost"
						>
							<Paperclip />
						</Button>
					</TooltipTrigger>
					<TooltipContent>{attaches}</TooltipContent>
				</Tooltip>
				<Textarea
					aria-label="Message this session"
					className="max-h-40 min-h-8 flex-1 resize-none"
					disabled={blocked !== undefined}
					onChange={(event) => draft.setText(event.target.value)}
					onDragOver={(event) => {
						if (event.dataTransfer.types.includes("Files")) event.preventDefault();
					}}
					onDrop={(event) => {
						if (!draft.sending) draft.drop(event);
					}}
					onKeyDown={(event) => {
						if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
							event.preventDefault();
							if (ready) draft.send();
						}
					}}
					onPaste={(event) => {
						if (!draft.sending) draft.paste(event);
					}}
					placeholder="Say something to this session"
					ref={draft.textArea}
					rows={1}
					value={draft.text}
				/>
				<Button disabled={!ready} onClick={draft.send} size="sm" type="button">
					{draft.sending ? "Sending…" : "Send"}
				</Button>
			</div>
			{canAttachImages ? <span className="text-xs text-muted-foreground">Images stay on this device until you send them to {backend}.</span> : null}
			{hint === undefined ? null : <span className="text-xs text-muted-foreground">{hint}</span>}
			{draft.issue === undefined ? null : (
				<span className="text-xs text-destructive" role="alert">
					{draft.issue}
				</span>
			)}
			<span aria-live="polite" className="sr-only">
				{draft.announcement}
			</span>
		</div>
	);
};

export const SessionMessage = (props: ComponentProps<typeof SessionInputComposer>) => <SessionInputComposer key={props.sessionId} {...props} />;
