import type { sessionSituation } from "@antumbra/domain-changes/rows/session-situation.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogClose, DialogContent } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { Textarea } from "@antumbra/glass-components/ui/textarea.tsx";
import { inputRequest } from "@antumbra/glass-inputs/adapters/request.ts";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { inputFailureMessage } from "@antumbra/glass-inputs/failure.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import { useRef, useState } from "react";
import { useSituationDraft } from "#situation-draft.ts";
import { situationLabel } from "#situation-labels.ts";
export const SituationDialog = (props: {
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly situation: typeof sessionSituation.Row.Type;
	readonly onError: (message: string) => void;
	readonly onClose: () => void;
}) => {
	const draft = useSituationDraft(
		props.drafts,
		props.sessionId,
		`situation:${props.situation.changeId}:${props.situation.situation}`,
		props.situation.text,
	);
	const [sending, setSending] = useState(false);
	const inFlight = useRef(false);
	const inputId = useRef<SessionInputId | undefined>(undefined);
	const send = () => {
		if (inFlight.current || draft.drafting || draft.text.trim() === "") return;
		inFlight.current = true;
		setSending(true);
		const id = inputId.current ?? SessionInputId.make(crypto.randomUUID());
		inputId.current = id;
		Effect.runFork(
			Effect.gen(function* () {
				const sent = yield* draft.capture();
				const request = yield* inputRequest(props.sessionId, id, [], sent.text);
				yield* props.inputs["sessionInput.submit"](request);
				yield* draft.clear(sent);
				props.onClose();
			}).pipe(
				Effect.catch((error) =>
					Effect.sync(() => {
						if (error._tag === "InputFileReadFailed") props.onError(error.detail);
						else if (error._tag === "Unauthorized" || error._tag === "RpcClientError") props.onError(String(error));
						else props.onError(inputFailureMessage(error));
					}),
				),
				Effect.ensuring(
					Effect.sync(() => {
						inFlight.current = false;
						setSending(false);
					}),
				),
			),
		);
	};
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{situationLabel[props.situation.situation]}</DialogTitle>
					<DialogDescription>Change {props.situation.reference}. Read it, change anything you want said differently, then send.</DialogDescription>
				</DialogHeader>
				<Textarea
					aria-label="Words to send"
					disabled={draft.drafting}
					rows={8}
					value={draft.text}
					onChange={(event) => {
						inputId.current = undefined;
						draft.change(event.target.value);
					}}
				/>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button disabled={sending || draft.drafting || draft.text.trim() === ""} onClick={send}>
						Send
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
