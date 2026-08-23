import type { SessionSituation } from "@antumbra/contract";
import { useEffect, useRef, useState } from "react";
import { sendToSession, situationDraft } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogClose, DialogContent } from "#components/ui/dialog.tsx";
import {
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog-sections.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { situationLabel } from "#fleet/situations.ts";
import { useSessionDraft } from "#hooks/session-draft.ts";

// why: the words are drafted for the admiral to read, not sent behind them. The
// box opens holding what the catalog wrote, every edit is theirs, and the Send
// beside it is the same act the message box performs — so a situation is a
// faster way to say something, never a way for something to be said.
export const SituationDialog = ({
	onClose,
	onError,
	sessionId,
	situation,
}: {
	readonly onClose: () => void;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
	readonly situation: SessionSituation;
}) => {
	const draft = useSessionDraft(
		sessionId,
		`situation:${situation.changeId}:${situation.situation}`,
	);
	const initialText = useRef(draft.text).current;
	const [drafting, setDrafting] = useState(initialText === "");
	const [sending, setSending] = useState(false);

	useEffect(() => {
		if (initialText !== "") {
			return;
		}
		let open = true;
		situationDraft(
			{ changeId: situation.changeId, situation: situation.situation },
			(text) => {
				if (open) {
					draft.setText(text);
					setDrafting(false);
				}
			},
			onError,
		);
		return () => {
			open = false;
		};
	}, [
		draft.setText,
		initialText,
		onError,
		situation.changeId,
		situation.situation,
	]);

	const send = () => {
		if (sending || draft.text.trim() === "") {
			return;
		}
		const sent = draft.capture();
		setSending(true);
		sendToSession(
			sessionId,
			sent.text,
			() => {
				draft.clear(sent);
				setSending(false);
				onClose();
			},
			(message) => {
				setSending(false);
				onError(message);
			},
		);
	};
	return (
		<Dialog
			onOpenChange={(next) => {
				if (!next) {
					onClose();
				}
			}}
			open={true}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{situationLabel[situation.situation]}</DialogTitle>
					<DialogDescription>
						Change {situation.reference}. Read it, change anything you want said
						differently, then send.
					</DialogDescription>
				</DialogHeader>
				<Textarea
					aria-label="Words to send"
					disabled={drafting}
					onChange={(event) => draft.setText(event.target.value)}
					rows={8}
					value={draft.text}
				/>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button disabled={sending || draft.text.trim() === ""} onClick={send}>
						Send
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
