import type {
	ArtifactMarkdown,
	BoardWriteRequest,
	CharterPieceRequest,
	OpenVoyageRequest,
	ReportMarkdown,
	RewireRequest,
	VoyageSummary,
	VoyageView,
} from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";
import type { Unsubscribe } from "#adapters/trpc.ts";

type OnError = (message: string) => void;

const fired = (acted: Promise<unknown>, onError: OnError): void => {
	acted
		.then(() => undefined)
		.catch((cause: unknown) => {
			onError(toError(cause).message);
		});
};

export const watchVoyages = (
	onVoyages: (voyages: ReadonlyArray<VoyageSummary>) => void,
	onError: OnError,
): Unsubscribe => {
	const subscription = client.voyagesFeed.subscribe(undefined, {
		onData: onVoyages,
		onError: (cause) => onError(toError(cause).message),
	});
	return () => subscription.unsubscribe();
};

export const watchVoyage = (
	voyageId: string,
	onVoyage: (voyage: VoyageView) => void,
	onError: OnError,
): Unsubscribe => {
	const subscription = client.voyageFeed.subscribe(
		{ voyageId },
		{
			onData: onVoyage,
			onError: (cause) => onError(toError(cause).message),
		},
	);
	return () => subscription.unsubscribe();
};

export const readArtifactMarkdown = (
	artifactId: string,
	onDone: (artifact: ArtifactMarkdown) => void,
	onError: OnError,
): void => {
	client.artifactMarkdown
		.query({ artifactId })
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const readReportMarkdown = (
	reportId: string,
	onDone: (report: ReportMarkdown) => void,
	onError: OnError,
): void => {
	client.reportMarkdown
		.query({ reportId })
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const openVoyage = (
	request: OpenVoyageRequest,
	onDone: (voyage: VoyageSummary) => void,
	onError: OnError,
): void => {
	client.openVoyage
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const focusVoyage = (
	voyageId: string,
	focused: boolean,
	onError: OnError,
): void => fired(client.focusVoyage.mutate({ focused, voyageId }), onError);

export const hailCaptain = (voyageId: string, onError: OnError): void =>
	fired(client.hailCaptain.mutate({ voyageId }), onError);

export const charterPiece = (
	request: CharterPieceRequest,
	onDone: () => void,
	onError: OnError,
): void => {
	client.charterPiece
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const launchPiece = (pieceId: string, onError: OnError): void =>
	fired(client.launchPiece.mutate({ pieceId }), onError);

export const parkPiece = (pieceId: string, onError: OnError): void =>
	fired(client.parkPiece.mutate({ pieceId }), onError);

export const unparkPiece = (pieceId: string, onError: OnError): void =>
	fired(client.unparkPiece.mutate({ pieceId }), onError);

export const rewirePiece = (request: RewireRequest, onError: OnError): void =>
	fired(client.rewirePiece.mutate(request), onError);

export const writeBoard = (
	request: BoardWriteRequest,
	onDone: () => void,
	onError: OnError,
): void => {
	client.writeBoard
		.mutate(request)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};
