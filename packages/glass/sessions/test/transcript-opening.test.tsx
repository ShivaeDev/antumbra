import { click } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { inputApi } from "@antumbra/app-testing/inputs.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { TranscriptMessage } from "#views/transcript-message.tsx";

const charter = ["# Captain of the Reef voyage", "", "Survey the eastern shoal and report the depths you find."].join("\n");

it.glass("a charter opens folded to its first heading while a one-line wake stays plain", function* ({ render, run }) {
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
	const woken = yield* render(
		<TranscriptMessage
			api={inputs.client}
			item={{ kind: "message", parts: [], role: "user", seq: 2, served: "wake", text: "Finish the summary" }}
			sessionId="session:opening"
		/>,
	);
	expect(woken.textContent).toContain("Finish the summary");
	expect(woken.querySelector("button")).toBeNull();
});
