import {
	type IntentKind,
	type IntentNotFound,
	type IntentStatus,
	Kernel,
	type PayloadInvalid,
	type StoredIntentInvalid,
	type UnregisteredIntentTag,
} from "@antumbra/kernel";
import type { PrismaError } from "@antumbra/persistence";
import type { WakeFields } from "@antumbra/sessions";
import { Effect, type Stream } from "effect";

export type SpawnRefused = PayloadInvalid | PrismaError | UnregisteredIntentTag;

export type RouseRefused = SpawnRefused | StoredIntentInvalid;

export interface SessionRouse {
	readonly changes: Stream.Stream<IntentStatus, IntentNotFound | PrismaError>;
	readonly id: string;
	readonly retried: boolean;
}

export const makeRouseSession = (wake: IntentKind<WakeFields>) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const watched = (id: string, retried: boolean): SessionRouse => ({
			changes: kernel.changes(id),
			id,
			retried,
		});
		const submitted = (payload: WakeFields) => kernel.submit(wake, payload).pipe(Effect.map((submission) => watched(submission.id, false)));
		const replaced = (id: string, payload: WakeFields) =>
			kernel.cancel(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
				Effect.andThen(submitted(payload)),
			);
		const sameDemand = (left: WakeFields, right: WakeFields) =>
			left.inputId === right.inputId && left.message === right.message && left.sessionId === right.sessionId;
		const pushed = (id: string, payload: WakeFields) =>
			kernel.retry(id).pipe(
				Effect.as(watched(id, true)),
				Effect.catchTags({
					IntentNotFound: () => submitted(payload),
					InvalidTransition: () => submitted(payload),
				}),
			);
		const advance = (id: string) =>
			kernel.retry(id).pipe(
				Effect.catchTags({
					IntentNotFound: () => Effect.void,
					InvalidTransition: () => Effect.void,
				}),
			);
		const advanceInputs = (
			parked: ReadonlyArray<{
				readonly id: string;
				readonly payload: WakeFields;
			}>,
			exceptId?: string,
		) =>
			Effect.forEach(
				parked.filter((intent) => intent.id !== exceptId && intent.payload.inputId !== undefined),
				(intent) => advance(intent.id),
				{ concurrency: 1, discard: true },
			);
		return (payload: WakeFields): Effect.Effect<SessionRouse, RouseRefused> =>
			Effect.gen(function* () {
				const active = yield* kernel.active(wake);
				const parked = active.filter((intent) => intent.payload.sessionId === payload.sessionId && intent.status === "waiting");
				const same = parked.find((intent) => sameDemand(intent.payload, payload));
				if (same !== undefined) {
					yield* advanceInputs(parked, same.id);
					return yield* pushed(same.id, payload);
				}
				yield* advanceInputs(parked);
				const replaceable = parked.find((intent) => intent.payload.inputId === undefined);
				return yield* replaceable === undefined ? submitted(payload) : replaced(replaceable.id, payload);
			});
	});
