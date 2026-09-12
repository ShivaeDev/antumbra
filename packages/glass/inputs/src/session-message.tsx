import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Textarea } from "@antumbra/glass-components/ui/textarea.tsx";
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
	standing,
	reason,
	onError,
	sessionId,
}: {
	readonly api: InputsClient;
	readonly drafts: Drafts;
	readonly canSend: boolean;
	readonly canAttachImages: boolean;
	readonly backend: string;
	readonly standing?: string;
	readonly reason?: string;
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
	return (
		<div className="flex min-w-0 shrink-0 flex-col gap-1 border-t border-border px-4 py-2">
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
				<Button
					aria-label="Attach images"
					disabled={blocked !== undefined || draft.sending || !canAttachImages}
					onClick={() => fileInput.current?.click()}
					title={canAttachImages ? "Attach JPEG, PNG, or WebP images" : "This backend cannot receive images"}
					type="button"
					variant="outline"
				>
					<Paperclip />
				</Button>
				<Textarea
					aria-label="Message this session"
					className="max-h-40 min-h-9 flex-1 resize-none"
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
					placeholder="say something to this session"
					ref={draft.textArea}
					rows={2}
					title={standing}
					value={draft.text}
				/>
				<Button disabled={!ready} onClick={draft.send} type="button">
					{draft.sending ? "Sending…" : "Send"}
				</Button>
			</div>
			{canAttachImages ? <span className="text-2xs text-muted-foreground">Images stay on this device until you send them to {backend}.</span> : null}
			{standing === undefined ? null : <span className="text-2xs text-muted-foreground">{standing}</span>}
			{reason === undefined ? null : <span className="font-mono text-2xs text-muted-foreground">{reason}</span>}
			{draft.issue === undefined ? null : (
				<span className="text-2xs text-destructive" role="alert">
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
