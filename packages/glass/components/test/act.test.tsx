import { press, until } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Schema } from "effect";
import { CommandAct } from "#act.tsx";

const launched = fact("Launched", { id: Schema.String });

const launch = command("launch", {
	input: { id: Schema.String },
	reads: [],
	emits: launched,
	rejections: { Refused: { message: Schema.String } },
	run: (input) => Effect.succeed({ id: input.id }),
});

const INPUT = { id: "the-reef" };

const acting = (answer: (input: Record<string, unknown>) => Effect.Effect<number, unknown>) => Object.assign(answer, { command: launch });

it.glass("holds the action while pending", function* ({ render }) {
	const answered = yield* Deferred.make<number>();
	const sent: Record<string, unknown>[] = [];
	const send = acting((input) => {
		sent.push(input);
		return Deferred.await(answered);
	});
	const container = yield* render(<CommandAct command={send} input={INPUT} label="Launch" />);
	yield* until(() => container.querySelector("button") !== null);
	const button = () => container.querySelector("button");

	expect(button()?.textContent).toBe("Launch");
	expect(button()?.disabled).toBe(false);

	yield* press(container, "Launch");
	yield* until(() => button()?.disabled === true);
	expect(sent).toEqual([INPUT]);

	yield* Deferred.succeed(answered, 1);
	yield* until(() => button()?.disabled === false);
});

it.glass("shows an action rejection", function* ({ render }) {
	const send = acting(() => Effect.fail(new launch.Rejection.Refused({ message: "No such piece" })));
	const container = yield* render(<CommandAct command={send} input={INPUT} label="Launch" />);

	yield* until(() => container.querySelector("button") !== null);
	yield* press(container, "Launch");

	yield* until(() => container.querySelector('[role="alert"]') !== null);
	expect(container.querySelector('[role="alert"]')?.textContent).toBe("No such piece");
});
