import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { selectRendererDocument } from "#adapters/renderer-document.ts";

const bundled = "file:///app/renderer/index.html";

it.effect("always selects bundled content for packaged builds", () =>
	Effect.gen(function* () {
		const selected = yield* selectRendererDocument({
			arguments: ["--renderer-url=://malformed"],
			bundled,
			isPackaged: true,
		});
		expect(selected).toBe(bundled);
	}),
);

it.effect("allows only the exact dev launcher document", () =>
	Effect.gen(function* () {
		expect(
			yield* selectRendererDocument({
				arguments: ["--renderer-url=http://localhost:5183"],
				bundled,
				isPackaged: false,
			}),
		).toBe("http://localhost:5183/");

		for (const candidate of [
			"://malformed",
			"https://localhost:5183",
			"http://127.0.0.1:5183",
			"http://localhost.example:5183",
			"http://user:secret@localhost:5183",
			"http://localhost:5184",
			"http://localhost:5183/elsewhere",
			"http://localhost:5183/?query=yes",
		]) {
			const failure = yield* selectRendererDocument({
				arguments: [`--renderer-url=${candidate}`],
				bundled,
				isPackaged: false,
			}).pipe(Effect.flip);
			expect(failure._tag, candidate).toBe("RendererDocumentRefused");
		}

		const duplicate = yield* selectRendererDocument({
			arguments: [
				"--renderer-url=http://localhost:5183",
				"--renderer-url=http://localhost:5183",
			],
			bundled,
			isPackaged: false,
		}).pipe(Effect.flip);
		expect(duplicate.reason).toBe("ambiguous_override");
	}),
);
