import { SessionInputId } from "@antumbra/platform-vocabulary/session-input.ts";
import { Effect } from "effect";
import { useRef, useState } from "react";
import { inputRequest } from "#adapters/request.ts";
import type { InputsClient } from "#client.ts";
import type { Drafts } from "#drafts.ts";
import { inputFailureMessage } from "#failure.ts";
import { useDraft } from "#use-draft.ts";
import { useSessionImages } from "#use-session-images.ts";

export const useSessionInput = (api: InputsClient, drafts: Drafts, sessionId: string, canAttach: boolean, onError: (message: string) => void) => {
	const words = useDraft(drafts, sessionId);
	const [inputId, setInputId] = useState<SessionInputId>();
	const [issue, setIssue] = useState<string>();
	const [sending, setSending] = useState(false);
	const inFlight = useRef(false);
	const textArea = useRef<HTMLTextAreaElement>(null);
	const changed = () => {
		setInputId(undefined);
		setIssue(undefined);
	};
	const images = useSessionImages({ canAttach, onChange: changed, onIssue: setIssue });
	const send = () => {
		if (inFlight.current || (images.images.length === 0 && words.text.trim() === "")) return;
		inFlight.current = true;
		setSending(true);
		const id = inputId ?? SessionInputId.make(crypto.randomUUID());
		setInputId(id);
		setIssue(undefined);
		const text = words.text;
		const captured = words.capture();
		Effect.runFork(
			Effect.gen(function* () {
				const sent = yield* captured;
				const request = yield* inputRequest(sessionId, id, images.images, text);
				const receipt = yield* api["inputs.submit"](request);
				images.clear();
				yield* words.clear(sent);
				setInputId(undefined);
				images.announce(receipt.status === "accepted" ? "Message sent" : "Message queued while the session wakes");
			}).pipe(
				Effect.catch((error) =>
					Effect.sync(() => {
						let message: string;
						if (error._tag === "InputFileReadFailed") message = error.detail;
						else if (error._tag === "Unauthorized" || error._tag === "RpcClientError") message = String(error);
						else message = inputFailureMessage(error);
						setIssue(message);
						onError(message);
						textArea.current?.focus();
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
	return {
		...images,
		text: words.text,
		setText: (value: string) => {
			changed();
			words.change(value);
		},
		send,
		sending,
		issue,
		textArea,
	};
};
