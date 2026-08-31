import type { SessionImageRequest, SessionInputReceipt, SessionInputRequest } from "@antumbra/contract";
import { SessionImage } from "@antumbra/contract";
import { Result, Schema } from "effect";
import { client, toError } from "#adapters/bridge.ts";

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

export const sendToSession = (sessionId: string, text: string, onDone: () => void, onError: (message: string) => void): void => {
	client.sendToSession
		.mutate({ sessionId, text })
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const sendSessionInput = (
	request: SessionInputRequest,
	onDone: (receipt: SessionInputReceipt) => void,
	onError: (message: string) => void,
): void => {
	client.sendSessionInput
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const loadSessionImage = (request: SessionImageRequest, onDone: (image: SessionImage) => void, onError: (message: string) => void): void => {
	client.sessionImage
		.query(request)
		.then((image) => {
			const decoded = decodeSessionImage(image);
			return Result.isFailure(decoded) ? onError("malformed_image_response: main returned invalid image bytes") : onDone(decoded.success);
		})
		.catch((cause: unknown) => onError(toError(cause).message));
};
