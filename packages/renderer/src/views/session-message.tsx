import type { Fleet } from "@antumbra/contract";
import { Paperclip } from "lucide-react";
import { useRef } from "react";
import { Button } from "#components/ui/button.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { SessionAttachments } from "#views/session-attachments.tsx";
import { sessionMessageState } from "#views/session-message-state.ts";
import { SessionSituations } from "#views/session-situations.tsx";
import { useSessionDraft } from "#views/use-session-draft.ts";

export const SessionMessage = ({
	fleet,
	onError,
	sessionId,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => {
	const { blocked, reason, session, standing } = sessionMessageState(fleet, sessionId);
	const fileInput = useRef<HTMLInputElement>(null);
	const draft = useSessionDraft({
		canAttach: session?.canAttachImages ?? false,
		onError,
		sessionId,
	});
	const ready =
		blocked === undefined &&
		!draft.sending &&
		(draft.images.length === 0 || session?.canAttachImages === true) &&
		(draft.text.trim() !== "" || draft.images.length > 0);
	return (
		<div className="flex min-w-0 shrink-0 flex-col gap-1 border-t border-border px-4 py-2">
			{blocked === undefined && session !== undefined ? (
				<SessionSituations onError={onError} sessionId={sessionId} situations={session.addressable} />
			) : null}
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
					disabled={blocked !== undefined || draft.sending || !session?.canAttachImages}
					onClick={() => fileInput.current?.click()}
					title={session?.canAttachImages ? "Attach JPEG, PNG, or WebP images" : "This backend cannot receive images"}
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
			{session?.canAttachImages ? (
				<span className="text-2xs text-muted-foreground">Images stay on this device until you send them to {session.backend}.</span>
			) : null}
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
