import { click } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { TranscriptMessage } from "#views/transcript-message.tsx";

const charter = ["# Captain of the Reef voyage", "", "Survey the eastern shoal and report the depths you find."].join("\n");
const orders = "Answer only with the summary you were asked for, and never sound a tool.";

it.glass("a charter opens folded to its first heading", function* ({ render, run }) {
	const inputs = yield* run(inputApi);
	const container = yield* render(
		<TranscriptMessage
			api={inputs.client}
			item={{ kind: "message", parts: [], role: "user", seq: 1, served: "charter", text: charter }}
			sessionId="session:opening"
		/>,
	);
	expect(container.textContent).toContain("Captain of the Reef voyage");
	expect(container.textContent).not.toContain("eastern shoal");
	const disclosure = container.querySelector<HTMLButtonElement>('button[title="Show this charter"]');
	if (disclosure === null) return yield* Effect.die("Missing charter disclosure");
	yield* click(disclosure);
	expect(container.textContent).toContain("Survey the eastern shoal and report the depths you find.");
});

it.glass("standing orders fold beside the charter, each summarised by its own words", function* ({ render, run }) {
	const inputs = yield* run(inputApi);
	const container = yield* render(
		<TranscriptMessage
			api={inputs.client}
			item={{ kind: "message", parts: [], role: "user", seq: 1, served: "charter", standingOrders: orders, text: charter }}
			sessionId="session:opening"
		/>,
	);
	const folds = container.querySelectorAll("button");
	expect(folds).toHaveLength(2);
	expect(folds[0]?.textContent).toBe(`Standing orders${orders}`);
	expect(folds[1]?.textContent).toBe("CharterCaptain of the Reef voyage");
	const opened = container.querySelector<HTMLButtonElement>('button[title="Show the standing orders"]');
	if (opened === null) return yield* Effect.die("Missing standing orders disclosure");
	yield* click(opened);
	expect(container.textContent).toContain(orders);
	expect(container.textContent).not.toContain("eastern shoal");
});

it.glass("a served instruction is labelled by the state it found the session in, and a one-line wake stays plain", function* ({ render, run }) {
	const inputs = yield* run(inputApi);
	const steered = yield* render(
		<TranscriptMessage
			api={inputs.client}
			item={{ kind: "message", parts: [], role: "user", seq: 2, served: "steer", text: ["Mail from the captain", "", "Hold the shoal."].join("\n") }}
			sessionId="session:opening"
		/>,
	);
	expect(steered.querySelector("button")?.textContent).toBe("SteerMail from the captain");
	expect(steered.textContent).not.toContain("Hold the shoal.");
	const woken = yield* render(
		<TranscriptMessage
			api={inputs.client}
			item={{ kind: "message", parts: [], role: "user", seq: 3, served: "wake", text: "Finish the summary" }}
			sessionId="session:opening"
		/>,
	);
	expect(woken.textContent).toContain("Finish the summary");
	expect(woken.querySelector("button")).toBeNull();
});
