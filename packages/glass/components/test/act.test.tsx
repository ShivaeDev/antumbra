import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Schema } from "effect";
import type { ReactNode } from "react";
import { CommandAct } from "#act.tsx";
import { type Desk, desk } from "#test/desk.ts";
import { mount, settle, until } from "#test/dom.ts";

const launched = fact("Launched", { id: Schema.String });

const launch = command("launch", {
	input: { id: Schema.String },
	reads: [],
	emits: launched,
	rejections: { Refused: { message: Schema.String } },
	run: (input) => Effect.succeed({ id: input.id }),
});

const INPUT = { id: "the-reef" };

const shown = (board: Desk, screen: ReactNode) =>
	Effect.gen(function* () {
		const { container, root } = yield* mount();
		yield* settle(() => root.render(<board.glass.Provider>{screen}</board.glass.Provider>));
		yield* until(() => container.querySelector("button") !== null);
		return container;
	});

const acting = (answer: (input: Record<string, unknown>) => Effect.Effect<number, unknown>) => Object.assign(answer, { command: launch });

it.live("sends the input the screen gives it and holds the button while the command is away", () =>
	Effect.gen(function* () {
		const board = desk();
		const answered = yield* Deferred.make<number>();
		const sent: Record<string, unknown>[] = [];
		const send = acting((input) => {
			sent.push(input);
			return Deferred.await(answered);
		});
		const container = yield* shown(board, <CommandAct command={send} input={INPUT} label="Launch" />);
		const button = () => container.querySelector("button");

		expect(button()?.textContent).toBe("Launch");
		expect(button()?.disabled).toBe(false);

		yield* settle(() => button()?.click());
		yield* until(() => button()?.disabled === true);
		expect(sent).toEqual([INPUT]);

		yield* Deferred.succeed(answered, 1);
		yield* until(() => button()?.disabled === false);
	}),
);

it.live("says beside the button what the command refused", () =>
	Effect.gen(function* () {
		const board = desk();
		const send = acting(() => Effect.fail(new launch.Rejection.Refused({ message: "No such piece" })));
		const container = yield* shown(board, <CommandAct command={send} input={INPUT} label="Launch" />);

		yield* settle(() => container.querySelector("button")?.click());

		yield* until(() => container.querySelector('[role="alert"]') !== null);
		expect(container.querySelector('[role="alert"]')?.textContent).toBe("No such piece");
	}),
);
