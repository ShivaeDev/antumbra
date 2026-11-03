import * as Id from "@antumbra/platform-vocabulary/id.ts";
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
	const [inputId, setInputId] = useState<SessionInputId>();
	const [issue, setIssue] = useState<string>();
	const textArea = useRef<HTMLTextAreaElement>(null);
	const changed = () => {
		setInputId(undefined);
		setIssue(undefined);
	};
	const images = useSessionImages({ canAttach, onChange: changed, onIssue: setIssue });
	const words = useDraft({
		drafts,
		sessionId,
		send: (text) =>
			Effect.gen(function* () {
				const id = inputId ?? SessionInputId.make(Id.make());
				setInputId(id);
				setIssue(undefined);
				const request = yield* inputRequest(sessionId, id, images.images, text);
				const receipt = yield* api["inputs.submit"](request);
				images.clear();
				setInputId(undefined);
				images.announce(receipt.status === "accepted" ? "Message sent" : "Message recorded and queued.");
			}).pipe(
				Effect.tapError((error) =>
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
			),
	});
	return {
		...images,
		text: words.text,
		setText: (value: string) => {
			changed();
			words.change(value);
		},
		send: () => {
			if (images.images.length > 0 || words.text.trim() !== "") words.send();
		},
		sending: words.sending,
		issue,
		textArea,
	};
};
