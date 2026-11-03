import type { sessionSituation } from "@antumbra/domain-changes/rows/session-situation.ts";
import { Button } from "@antumbra/glass-components/ui/button.tsx";
import { Dialog, DialogClose, DialogContent } from "@antumbra/glass-components/ui/dialog.tsx";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@antumbra/glass-components/ui/dialog-sections.tsx";
import { Textarea } from "@antumbra/glass-components/ui/textarea.tsx";
import { inputRequest } from "@antumbra/glass-inputs/adapters/request.ts";
import type { InputsClient } from "@antumbra/glass-inputs/client.ts";
import type { Drafts } from "@antumbra/glass-inputs/drafts.ts";
import { inputFailureMessage } from "@antumbra/glass-inputs/failure.ts";
import { useDraft } from "@antumbra/glass-inputs/use-draft.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import { useRef } from "react";
import type { ChangesApi } from "#glass.ts";

const slotOf = (situation: typeof sessionSituation.Row.Type): string => {
	const slot = `situation:${situation.changeId}:${situation.situation}`;
	return situation.situation === "feedback_waiting" ? `${slot}:${situation.feedbackIds.join(",")}` : slot;
};

export const SituationDialog = (props: {
	readonly api: ChangesApi;
	readonly inputs: InputsClient;
	readonly drafts: Drafts;
	readonly sessionId: string;
	readonly situation: typeof sessionSituation.Row.Type;
	readonly onError: (message: string) => void;
	readonly onClose: () => void;
}) => {
	const inputId = useRef<SessionInputId | undefined>(undefined);
	const draft = useDraft({
		drafts: props.drafts,
		sessionId: props.sessionId,
		slot: slotOf(props.situation),
		initial: props.situation.text,
		send: (text) =>
			Effect.gen(function* () {
				const id = inputId.current ?? SessionInputId.make(Id.make());
				inputId.current = id;
				const request = yield* inputRequest(props.sessionId, id, [], text);
				yield* props.inputs["inputs.submit"](request);
				if (props.situation.feedbackIds.length > 0)
					yield* props.api.changes.forwardFeedback({ changeId: props.situation.changeId, ids: props.situation.feedbackIds });
				props.onClose();
			}).pipe(
				Effect.tapError((error) =>
					Effect.sync(() => {
						if (error._tag === "InputFileReadFailed") props.onError(error.detail);
						else if (error._tag === "Unauthorized" || error._tag === "RpcClientError") props.onError(String(error));
						else props.onError(inputFailureMessage(error));
					}),
				),
			),
	});
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) props.onClose();
			}}
		>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{props.situation.label}</DialogTitle>
					<DialogDescription>Read the draft, change anything you want said differently, then send.</DialogDescription>
				</DialogHeader>
				<Textarea
					aria-label="Words to send"
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
					<Button disabled={draft.sending || draft.text.trim() === ""} onClick={draft.send}>
						Send
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
