import type { SessionInputId, SessionInputRequest } from "@antumbra/contract";
import { Effect } from "effect";
import { RendererRequestError } from "#adapters/request-error.ts";
import type { DraftImage } from "#views/session-draft.ts";

const buildRequest = async (sessionId: string, id: SessionInputId, images: ReadonlyArray<DraftImage>, text: string): Promise<SessionInputRequest> => {
	const imageParts = await Promise.all(
		images.map(async ({ file }) => ({
			bytes: new Uint8Array(await file.arrayBuffer()),
			...(file.type === "" ? {} : { declaredMediaType: file.type }),
			name: file.name || "pasted image",
			type: "image" as const,
		})),
	);
	const parts = [...imageParts, ...(text.trim() === "" ? [] : [{ text, type: "text" as const }])];
	const [first, ...rest] = parts;
	return first === undefined
		? Promise.reject(new Error("empty_input: add words or an image before sending"))
		: { id, parts: [first, ...rest], sessionId };
};

export const readSessionInputRequest = Effect.fn("Renderer.readSessionInputRequest")(
	(sessionId: string, id: SessionInputId, images: ReadonlyArray<DraftImage>, text: string) =>
		Effect.tryPromise({
			try: () => buildRequest(sessionId, id, images, text),
			catch: (cause) => new RendererRequestError({ message: `image_read_failed: ${cause instanceof Error ? cause.message : String(cause)}` }),
		}),
);
