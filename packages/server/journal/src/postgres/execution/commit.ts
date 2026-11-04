import type { CommandDefinition, CommandInput } from "@antumbra/platform-feature/command.ts";
import type { FactShape } from "@antumbra/platform-feature/fact.ts";
import type { Fields } from "@antumbra/platform-feature/fields.ts";
import { AlreadyDone, type RejectedBy, type RejectionSpecs } from "@antumbra/platform-feature/rejection.ts";
import type { RowShape } from "@antumbra/platform-feature/row.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Clock, Effect, Schema } from "effect";
import type { Reactivity } from "effect/reactivity/Reactivity";
import type { SqlClient } from "effect/sql/SqlClient";

import type { State } from "#postgres/execution/state.ts";
import { append, locked, read } from "#postgres/execution/write.ts";

interface Commands {
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
interface Runnable {
	readonly emits: FactShape;
	readonly rejections: Record<string, unknown>;
	readonly reject: Record<string, unknown>;
	readonly run: (input: Record<string, unknown>, rows: Record<string, unknown>, reject: Record<string, unknown>) => Effect.Effect<unknown, unknown>;
}
const declared = (command: Runnable, error: unknown): boolean =>
	typeof error === "object" &&
	error !== null &&
	"_tag" in error &&
	typeof error._tag === "string" &&
	(error._tag === "AlreadyDone" || error._tag in command.rejections);

export function commands(state: State): Effect.Effect<Commands, never, SqlClient | Reactivity>;
export function commands(state: State): unknown {
	return Effect.gen(function* () {
		const context = yield* Effect.context<SqlClient | Reactivity>();
		return {
			commit: Effect.fn("ExecutionHistory.commit")(function* (command: Runnable, input: Record<string, unknown> & { readonly requestId: Request }) {
				return yield* locked(perform(state)(command, input)).pipe(
					Effect.provideContext(context),
					Effect.catchIf((error) => !declared(command, error), Effect.die),
				);
			}),
		};
	});
}

const perform = (state: State) =>
	Effect.fn("ExecutionHistory.perform")(function* (command: Runnable, input: Record<string, unknown> & { readonly requestId: Request }) {
		const current = yield* read(state)();
		const earlier = current.findLast((event) => event.requestId === input.requestId);
		if (earlier !== undefined) return yield* Effect.fail(new AlreadyDone({ requestId: input.requestId, seq: earlier.value.sequence }));
		const value = yield* command.run(input, state.rows, command.reject);
		const event = yield* Schema.decodeUnknownEffect(state.schema)(
			Object.assign({}, yield* Schema.encodeUnknownEffect(command.emits.Payload)(value), {
				_tag: command.emits.name,
				at: yield* Clock.currentTimeMillis,
				sequence: (current.at(-1)?.value.sequence ?? 0) + 1,
			}),
		);
		yield* append(state)(Request.make(input.requestId), [event]);
		return event.sequence;
	});
