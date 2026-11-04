import { Effect, Schema } from "effect";
import { GhAuthRequired, type GhOperation, GhOutputInvalid } from "#errors.ts";
import type { ObserveSelection } from "#query.ts";

const GraphqlError = Schema.Struct({
	message: Schema.String,
	type: Schema.optionalKey(Schema.String),
	path: Schema.optionalKey(Schema.Array(Schema.Union([Schema.String, Schema.Number]))),
});
const Repository = Schema.NullOr(Schema.Record(Schema.String, Schema.Unknown));
const Data = Schema.Record(Schema.String, Repository);
const Envelope = Schema.Struct({ data: Schema.optionalKey(Schema.NullOr(Data)), errors: Schema.optionalKey(Schema.Array(GraphqlError)) });
const authFailure = (error: typeof GraphqlError.Type) =>
	error.type === "UNAUTHENTICATED" || /bad credentials|requires authentication|must authenticate|not authenticated/iu.test(error.message);
const affects = (error: typeof GraphqlError.Type, selection: ObserveSelection) =>
	error.path?.[0] === selection.repoAlias && (error.path.length === 1 || error.path[1] === selection.pullAlias);

export const responseSelections = Effect.fn("GitHub.responseSelections")(function* (
	operation: GhOperation,
	body: unknown,
	selections: readonly ObserveSelection[],
) {
	const envelope = yield* Schema.decodeUnknownEffect(Envelope)(body).pipe(
		Effect.mapError((cause) => new GhOutputInvalid({ detail: String(cause), operation })),
	);
	const errors = envelope.errors ?? [];
	if (errors.some(authFailure)) return yield* new GhAuthRequired({ operation, detail: "GitHub authentication failed; run gh auth login" });
	if (envelope.data === undefined || envelope.data === null)
		return yield* new GhOutputInvalid({ operation, detail: "GitHub returned no GraphQL data" });
	return selections.flatMap((selection): readonly (readonly [ObserveSelection, unknown])[] => {
		const node = envelope.data?.[selection.repoAlias]?.[selection.pullAlias];
		return node === null || node === undefined || errors.some((error) => affects(error, selection)) ? [] : [[selection, node]];
	});
});
