import type { SessionSituation } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { Effect } from "effect";
import { useEffect, useRef, useState } from "react";
import { useRequest } from "#adapters/request.ts";
import type { RendererRequestError } from "#adapters/request-error.ts";
import { sendToSession, situationDraft } from "#adapters/trpc.ts";
import { Button } from "#components/ui/button.tsx";
import { Dialog, DialogClose, DialogContent } from "#components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "#components/ui/dialog-sections.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { situationLabel } from "#fleet/situations.ts";
import { useSessionDraft } from "#hooks/session-draft.ts";

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
	const draft = useSessionDraft(sessionId, `situation:${situation.changeId}:${situation.situation}`);
	const initialText = useRef(draft.text).current;
	const [drafting, setDrafting] = useState(initialText === "");
	const { requestAtom, submit } = useRequest<void, RendererRequestError>();
	const sending = useAtomValue(requestAtom).waiting;

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
	}, [draft.setText, initialText, onError, situation.changeId, situation.situation]);

	const send = () => {
		if (sending || draft.text.trim() === "") {
			return;
		}
		const sent = draft.capture();
		void submit(
			sendToSession(sessionId, sent.text).pipe(
				Effect.tap(() =>
					Effect.sync(() => {
						draft.clear(sent);
						onClose();
					}),
				),
				Effect.tapError((error) => Effect.sync(() => onError(error.message))),
			),
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
					<DialogDescription>Change {situation.reference}. Read it, change anything you want said differently, then send.</DialogDescription>
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
