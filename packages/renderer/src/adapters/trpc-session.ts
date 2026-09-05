import type { SessionImageRequest, SessionInputRequest } from "@antumbra/contract";
import { SessionImage } from "@antumbra/contract";
import { Effect, Result, Schema } from "effect";
import { client, toError } from "#adapters/bridge.ts";

import { RendererRequestError } from "#adapters/request-error.ts";

const decodeSessionImage = Schema.decodeUnknownResult(SessionImage);

export const interruptSession = (sessionId: string, onError: (message: string) => void): void => {
	client.interruptSession
		.mutate({ sessionId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const sleepSession = (sessionId: string, onError: (message: string) => void): void => {
	client.sleepSession
		.mutate({ sessionId })
		.then(() => undefined)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const sendToSession = Effect.fn("Renderer.sendToSession")((sessionId: string, text: string) =>
	Effect.tryPromise({
		try: () => client.sendToSession.mutate({ sessionId, text }),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const sendSessionInput = Effect.fn("Renderer.sendSessionInput")((request: SessionInputRequest) =>
	Effect.tryPromise({
		try: () => client.sendSessionInput.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const loadSessionImage = (request: SessionImageRequest, onDone: (image: SessionImage) => void, onError: (message: string) => void): void => {
	client.sessionImage
		.query(request)
		.then((image) => {
			const decoded = decodeSessionImage(image);
			return Result.isFailure(decoded) ? onError("malformed_image_response: main returned invalid image bytes") : onDone(decoded.success);
		})
		.catch((cause: unknown) => onError(toError(cause).message));
};
