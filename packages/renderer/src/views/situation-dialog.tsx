import type { SessionSituation } from "@antumbra/contract";
import { useEffect, useState } from "react";
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

type Draft =
	| { readonly _tag: "drafting" }
	| { readonly _tag: "ready"; readonly text: string };

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
	const [draft, setDraft] = useState<Draft>({ _tag: "drafting" });

	useEffect(() => {
		situationDraft(
			{ changeId: situation.changeId, situation: situation.situation },
			(text) => setDraft({ _tag: "ready", text }),
			onError,
		);
	}, [onError, situation.changeId, situation.situation]);

	const text = draft._tag === "ready" ? draft.text : "";
	const send = () => {
		if (text.trim() === "") {
			return;
		}
		sendToSession(sessionId, text, onClose, onError);
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
					disabled={draft._tag === "drafting"}
					onChange={(event) =>
						setDraft({ _tag: "ready", text: event.target.value })
					}
					rows={8}
					value={text}
				/>
				<DialogFooter>
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button disabled={text.trim() === ""} onClick={send}>
						Send
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
