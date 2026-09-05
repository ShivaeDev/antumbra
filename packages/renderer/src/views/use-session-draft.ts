import { SessionInputId, type SessionInputReceipt } from "@antumbra/contract";
import { useAtomValue } from "@effect/atom-react";
import { Effect } from "effect";
import { useRef, useState } from "react";
import { useRequest } from "#adapters/request.ts";
import type { RendererRequestError } from "#adapters/request-error.ts";
import { readSessionInputRequest } from "#adapters/session-input.ts";
import { sendSessionInput } from "#adapters/trpc.ts";
import { useSessionDraft as usePersistedSessionDraft } from "#hooks/session-draft.ts";
import { useSessionImages } from "#views/use-session-images.ts";

export const useSessionDraft = ({
	canAttach,
	onError,
	sessionId,
}: {
	readonly canAttach: boolean;
	readonly onError: (message: string) => void;
	readonly sessionId: string;
}) => {
	const [inputId, setInputId] = useState<SessionInputId>();
	const [issue, setIssue] = useState<string>();
	const { requestAtom, submit } = useRequest<SessionInputReceipt, RendererRequestError>();
	const sending = useAtomValue(requestAtom).waiting;
	const words = usePersistedSessionDraft(sessionId, "message");
	const textArea = useRef<HTMLTextAreaElement>(null);
	const changed = () => {
		setInputId(undefined);
		setIssue(undefined);
	};
	const draftImages = useSessionImages({
		canAttach,
		onChange: changed,
		onIssue: setIssue,
	});
	const clear = (sent: ReturnType<typeof words.capture>) => {
		draftImages.clear();
		words.clear(sent);
		setInputId(undefined);
	};
	const refused = (message: string) => {
		setIssue(message);
		onError(message);
		textArea.current?.focus();
	};
	const accepted = (
		receipt: {
			readonly status: "accepted" | "queued_for_wake";
		},
		sent: ReturnType<typeof words.capture>,
	) => {
		clear(sent);
		draftImages.announce(receipt.status === "accepted" ? "Message sent" : "Message queued while the session wakes");
	};
	const send = () => {
		const sent = words.capture();
		if (sending || (draftImages.images.length === 0 && sent.text.trim() === "")) return;
		const id = inputId ?? SessionInputId.make(crypto.randomUUID());
		setInputId(id);
		setIssue(undefined);
		void submit(
			readSessionInputRequest(sessionId, id, draftImages.images, sent.text).pipe(
				Effect.flatMap(sendSessionInput),
				Effect.tap((receipt) => Effect.sync(() => accepted(receipt, sent))),
				Effect.tapError((error) => Effect.sync(() => refused(error.message))),
			),
		);
	};
	return {
		...draftImages,
		issue,
		send,
		sending,
		setText: (value: string) => {
			changed();
			words.setText(value);
		},
		text: words.text,
		textArea,
	};
};
