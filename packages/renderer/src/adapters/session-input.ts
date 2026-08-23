import type { SessionInputRequest } from "@antumbra/contract";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import type { DraftImage } from "#views/session-draft.ts";

const buildRequest = async (
	sessionId: string,
	id: SessionInputId,
	images: ReadonlyArray<DraftImage>,
	text: string,
): Promise<SessionInputRequest> => {
	const imageParts = await Promise.all(
		images.map(async ({ file }) => ({
			bytes: new Uint8Array(await file.arrayBuffer()),
			...(file.type === "" ? {} : { declaredMediaType: file.type }),
			name: file.name || "pasted image",
			type: "image" as const,
		})),
	);
	const parts = [
		...imageParts,
		...(text.trim() === "" ? [] : [{ text, type: "text" as const }]),
	];
	const [first, ...rest] = parts;
	return first === undefined
		? Promise.reject(
				new Error("empty_input: add words or an image before sending"),
			)
		: { id, parts: [first, ...rest], sessionId };
};

export const readSessionInputRequest = (
	sessionId: string,
	id: SessionInputId,
	images: ReadonlyArray<DraftImage>,
	text: string,
	onDone: (request: SessionInputRequest) => void,
	onError: (message: string) => void,
): void => {
	void buildRequest(sessionId, id, images, text)
		.then(onDone)
		.catch((cause: unknown) =>
			onError(
				`image_read_failed: ${cause instanceof Error ? cause.message : String(cause)}`,
			),
		);
};
