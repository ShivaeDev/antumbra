import { click } from "@antumbra/app-testing/glass/dom.ts";
import { it } from "@antumbra/app-testing/glass/entry.tsx";
import { Effect } from "effect";
import { expect } from "vitest";
import { TranscriptRaw } from "#views/transcript-raw.tsx";

it.glass("an unfamiliar provider event keeps its full evidence available", function* ({ render }) {
	const payload = JSON.stringify({ result: "unfamiliar evidence", detail: "the complete provider payload" }, null, 2);
	const container = yield* render(<TranscriptRaw item={{ kind: "raw", seq: 1, label: "future.event", payload }} />);
	expect(container.textContent).toContain("future.event");
	expect(container.querySelector("pre")).toBeNull();
	const disclosure = container.querySelector<HTMLButtonElement>('button[title="Show this payload"]');
	if (disclosure === null) return yield* Effect.die("Missing provider evidence disclosure");
	yield* click(disclosure);
	expect(container.querySelector("pre")?.textContent).toBe(payload);
});
