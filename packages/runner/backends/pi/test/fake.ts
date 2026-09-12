import { Effect } from "effect";
import { piFailure } from "#failure.ts";
import type { PiEvent, PiModel, PiOpenRequest, PiRuntime, PiSession } from "#runtime.ts";

export const SESSION_FILE = "/pi/sessions/--moorage--/2026-09-05-fake.jsonl";

export interface FakePrompt {
	readonly delivery: "followUp" | "steer";
	readonly text: string;
}

export interface FakePi {
	readonly aborts: () => number;
	readonly disposed: () => boolean;
	readonly emit: (event: PiEvent) => void;
	readonly opened: ReadonlyArray<PiOpenRequest>;
	readonly prompts: ReadonlyArray<FakePrompt>;
	readonly refuse: (detail: string) => void;
	readonly runtime: PiRuntime;
}

export const makeFakePi = (models: ReadonlyArray<PiModel> = []): FakePi => {
	const opened: PiOpenRequest[] = [];
	const prompts: FakePrompt[] = [];
	const listeners = new Set<(event: PiEvent) => void>();
	let refusal: string | undefined;
	let aborts = 0;
	let disposed = false;
	const session: PiSession = {
		abort: Effect.sync(() => {
			aborts += 1;
		}),
		dispose: Effect.sync(() => {
			disposed = true;
		}),
		prompt: (text, delivery) =>
			Effect.suspend(() => {
				prompts.push({ delivery, text });
				return refusal === undefined ? Effect.void : Effect.fail(piFailure(refusal));
			}),
		sessionFile: SESSION_FILE,
		sessionId: "pi-session",
		subscribe: (listener) => {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
	};
	return {
		aborts: () => aborts,
		disposed: () => disposed,
		emit: (event) => {
			for (const listener of listeners) {
				listener(event);
			}
		},
		opened,
		prompts,
		refuse: (detail) => {
			refusal = detail;
		},
		runtime: {
			models: Effect.succeed(models),
			open: (request) =>
				Effect.sync(() => {
					opened.push(request);
					return session;
				}),
		},
	};
};
