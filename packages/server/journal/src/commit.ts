import {
	AlreadyDone,
	type CommandDefinition,
	type CommandInput,
	type FactShape,
	type Fields,
	type RejectedBy,
	type RejectionSpecs,
	type RowShape,
} from "@antumbra/journal";
import { Clock, Context, Effect, Schema } from "effect";
import type { Reactivity } from "effect/unstable/reactivity/Reactivity";
import type { SqlClient } from "effect/unstable/sql/SqlClient";
import { codecOf, type Registry } from "#app.ts";
import { readHandle } from "#read-handle.ts";
import { writeHandle } from "#write-handle.ts";

export interface CommitService {
	readonly commit: <
		Name extends string,
		Input extends Fields,
		Reads extends readonly RowShape[],
		Emits extends FactShape,
		Specs extends RejectionSpecs,
	>(
		command: CommandDefinition<Name, Input, Reads, Emits, Specs>,
		input: CommandInput<Input>,
	) => Effect.Effect<number, AlreadyDone | RejectedBy<Specs>>;
}

export class Commit extends Context.Service<Commit, CommitService>()("@antumbra/journal-server/Commit") {}

export interface CommitContext {
	readonly reactivity: Reactivity["Service"];
	readonly registry: Registry;
	readonly sql: SqlClient;
}

interface RunnableCommand {
	readonly emits: { readonly name: string; readonly Payload: Schema.ConstraintCodec<unknown, unknown> };
	readonly reads: readonly RowShape[];
	readonly reject: Record<string, unknown>;
	readonly rejections: Record<string, unknown>;
	readonly run: (
		input: Record<string, unknown>,
		rows: Record<string, unknown>,
		reject: Record<string, unknown>,
	) => Effect.Effect<Record<string, unknown>, unknown>;
}

type RuntimeInput = Record<string, unknown> & { readonly requestId: string };

const declared = (command: RunnableCommand, error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"_tag" in error &&
	typeof error._tag === "string" &&
	(error._tag === "AlreadyDone" || error._tag in command.rejections);

const reads = (context: CommitContext, rows: readonly RowShape[]): Record<string, unknown> =>
	Object.fromEntries(rows.map((row) => [row.name, readHandle(context.sql, codecOf(context.registry, row))]));

const writes = (context: CommitContext, rows: readonly RowShape[], dirty: (key: string) => void): Record<string, unknown> =>
	Object.fromEntries(rows.map((row) => [row.name, writeHandle(context.sql, codecOf(context.registry, row), dirty)]));

const append = Effect.fn("journal.append")(function* (context: CommitContext, entry: Record<string, unknown>) {
	const written = yield* context.sql`INSERT INTO "journal" ${context.sql.insert(entry)} RETURNING "seq"`;
	return Number(written[0]?.seq);
});

const transact = Effect.fn("journal.commit")(function* (
	context: CommitContext,
	command: RunnableCommand,
	input: RuntimeInput,
	dirty: (key: string) => void,
) {
	const done = yield* context.sql`SELECT "seq" FROM "applied" WHERE "requestId" = ${input.requestId}`;
	const earlier = done[0]?.seq;
	if (earlier !== undefined) {
		return yield* Effect.fail(new AlreadyDone({ requestId: input.requestId, seq: Number(earlier) }));
	}
	const payload = yield* command.run(input, reads(context, command.reads), command.reject);
	const at = yield* Clock.currentTimeMillis;
	const encoded = yield* Effect.orDie(Schema.encodeUnknownEffect(command.emits.Payload)(payload));
	const seq = yield* append(context, { at, name: command.emits.name, payload: JSON.stringify(encoded), requestId: input.requestId });
	const materializer = context.registry.materializers.get(command.emits.name);
	if (materializer === undefined) {
		return yield* Effect.die(new Error(`no materializer declares the fact "${command.emits.name}"`));
	}
	yield* materializer.run({ ...payload, at, requestId: input.requestId, seq }, writes(context, materializer.writes, dirty));
	yield* context.sql`INSERT INTO "applied" ${context.sql.insert({ requestId: input.requestId, seq })}`;
	return seq;
});

const perform = Effect.fn("journal.perform")(function* (context: CommitContext, command: RunnableCommand, input: RuntimeInput) {
	const dirty = new Set<string>();
	const seq = yield* context.sql
		.withTransaction(transact(context, command, input, (key) => dirty.add(key)))
		.pipe(Effect.catchIf((error) => !declared(command, error), Effect.die));
	yield* context.reactivity.invalidate([...dirty]);
	return seq;
});

export function commitService(context: CommitContext): CommitService;
export function commitService(context: CommitContext): unknown {
	return { commit: (command: RunnableCommand, input: RuntimeInput) => perform(context, command, input) };
}
