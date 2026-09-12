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

it.glass("keeps a replaced action pending until completion", function* ({ render }) {
	const answered = yield* Deferred.make<number, InstanceType<typeof launch.Rejection.Refused>>();
	const sent: Record<string, unknown>[] = [];
	const send = acting((input) => {
		sent.push(input);
		return Deferred.await(answered);
	});
	const replacement = acting((input) => {
		sent.push(input);
		return Effect.succeed(2);
	});
	const container = yield* render(<CommandAct command={send} input={INPUT} label="Launch" />);
	yield* until(() => container.querySelector("button") !== null, "the Launch button to appear");
	const button = () => container.querySelector("button");

	expect(button()?.textContent).toBe("Launch");
	expect(button()?.disabled).toBe(false);

	yield* press(container, "Launch");
	yield* until(() => button()?.disabled === true, "Launch to become disabled while pending");
	expect(sent).toEqual([INPUT]);

	yield* render(<CommandAct command={replacement} input={{ id: "the-shoals" }} label="Resume" />);
	expect(button()?.disabled).toBe(true);
	yield* Deferred.fail(answered, new launch.Rejection.Refused({ message: "The old action was refused" }));
	yield* until(() => button()?.disabled === false, "Resume to become enabled after completion");
	expect(container.querySelector('[role="alert"]')).toBeNull();
	yield* press(container, "Resume");
	yield* until(() => sent.length === 2, "the replacement action to run");
	expect(sent).toEqual([INPUT, { id: "the-shoals" }]);
});

it.glass("shows an action rejection", function* ({ render }) {
	const send = acting(() => Effect.fail(new launch.Rejection.Refused({ message: "No such piece" })));
	const container = yield* render(<CommandAct command={send} input={INPUT} label="Launch" />);

	yield* until(() => container.querySelector("button") !== null, "the Launch button to appear");
	yield* press(container, "Launch");

	yield* until(() => container.querySelector('[role="alert"]') !== null, "the action rejection to appear");
	expect(container.querySelector('[role="alert"]')?.textContent).toBe("No such piece");
});

it.glass("keeps mounted actions independent", function* ({ render }) {
	const completed = yield* Deferred.make<number>();
	const sent: Record<string, unknown>[] = [];
	const send = acting((input) => {
		sent.push(input);
		return input.id === "the-reef" ? Deferred.await(completed) : Effect.succeed(2);
	});
	const container = yield* render(
		<>
			<section aria-label="Reef">
				<CommandAct command={send} input={INPUT} label="Launch reef" />
			</section>
			<section aria-label="Shoals">
				<CommandAct command={send} input={{ id: "the-shoals" }} label="Launch shoals" />
			</section>
		</>,
	);
	yield* press(container, "Launch reef");
	yield* until(
		() => container.querySelector<HTMLButtonElement>('[aria-label="Reef"] button')?.disabled === true,
		"the reef action to become pending",
	);
	expect(container.querySelector<HTMLButtonElement>('[aria-label="Shoals"] button')?.disabled).toBe(false);
	yield* press(container, "Launch shoals");
	yield* until(() => sent.length === 2, "the shoals action to run independently");
	expect(sent).toEqual([INPUT, { id: "the-shoals" }]);
	expect(container.querySelector<HTMLButtonElement>('[aria-label="Reef"] button')?.disabled).toBe(true);
	yield* Deferred.succeed(completed, 1);
	yield* until(() => container.querySelector<HTMLButtonElement>('[aria-label="Reef"] button')?.disabled === false, "the reef action to complete");
});
