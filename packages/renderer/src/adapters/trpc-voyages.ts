import type {
	ArtifactMarkdown,
	BoardWriteRequest,
	CharterPieceRequest,
	OpenVoyageRequest,
	ReportMarkdown,
	RewireRequest,
	VoyageAgentSettingsRequest,
	VoyageSummary,
	VoyageView,
} from "@antumbra/contract";
import { Effect } from "effect";
import { client, fired, toError } from "#adapters/bridge.ts";
import { RendererRequestError } from "#adapters/request-error.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

type OnError = (message: string) => void;

export const watchVoyages = (onVoyages: (voyages: ReadonlyArray<VoyageSummary>) => void, onError: OnError): Unsubscribe => {
	const subscription = client.voyagesFeed.subscribe(undefined, {
		onData: onVoyages,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchVoyage = (voyageId: string, onVoyage: (voyage: VoyageView) => void, onError: OnError): Unsubscribe => {
	const subscription = client.voyageFeed.subscribe(
		{ voyageId },
		{
			onData: onVoyage,
			onError: (cause) => onError(toError(cause).message),
		},
	);
	return () => subscription.unsubscribe();
};

export const readArtifactMarkdown = (artifactId: string, onDone: (artifact: ArtifactMarkdown) => void, onError: OnError): void => {
	client.artifactMarkdown
		.query({ artifactId })
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const readReportMarkdown = (reportId: string, onDone: (report: ReportMarkdown) => void, onError: OnError): void => {
	client.reportMarkdown
		.query({ reportId })
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const openVoyage = Effect.fn("Renderer.openVoyage")((request: OpenVoyageRequest) =>
	Effect.tryPromise({
		try: () => client.openVoyage.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const focusVoyage = (voyageId: string, focused: boolean, onError: OnError): void =>
	fired(client.focusVoyage.mutate({ focused, voyageId }), onError);

export const setAgentSettings = Effect.fn("Renderer.setAgentSettings")((request: VoyageAgentSettingsRequest) =>
	Effect.tryPromise({
		try: () => client.setAgentSettings.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const hailCaptain = (voyageId: string, onError: OnError): void => fired(client.hailCaptain.mutate({ voyageId }), onError);

export const charterPiece = Effect.fn("Renderer.charterPiece")((request: CharterPieceRequest) =>
	Effect.tryPromise({
		try: () => client.charterPiece.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const launchPiece = (pieceId: string, onError: OnError): void => fired(client.launchPiece.mutate({ pieceId }), onError);

export const parkPiece = (pieceId: string, onError: OnError): void => fired(client.parkPiece.mutate({ pieceId }), onError);

export const unparkPiece = (pieceId: string, onError: OnError): void => fired(client.unparkPiece.mutate({ pieceId }), onError);

export const rewirePiece = Effect.fn("Renderer.rewirePiece")((request: RewireRequest) =>
	Effect.tryPromise({
		try: () => client.rewirePiece.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);

export const workPieceNow = (pieceId: string, onError: OnError): void => fired(client.workPieceNow.mutate({ pieceId }), onError);

export const smoothBoard = (voyageId: string, onError: OnError): void => fired(client.smoothBoard.mutate({ voyageId }), onError);

export const writeBoard = Effect.fn("Renderer.writeBoard")((request: BoardWriteRequest) =>
	Effect.tryPromise({
		try: () => client.writeBoard.mutate(request),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);
