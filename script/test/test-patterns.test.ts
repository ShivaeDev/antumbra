import { describe, expect, it } from "vitest";
import { testPatternViolations } from "#lint/rules/test-patterns.ts";
import { inventoryOf } from "#test/support/inventory.ts";

const SCREEN = "packages/glass/settings/test/screens.test.tsx";
const ENTRY = 'import { it } from "@antumbra/app-testing/glass/entry.tsx";';
const check = (content: string, path = SCREEN) => testPatternViolations(inventoryOf({ sources: [{ content, path }] }));

const messages = (content: string, path = SCREEN) => check(content, path).map(({ message }) => message);

describe("shared application test patterns", () => {
	it("requires shared mounting and application setup", () => {
		const found = check(`
import { createRoot as mount } from "react-dom/client";
import { app as build } from "@antumbra/server-journal/app.ts";
import { apiOf } from "@antumbra/server-journal/testing/api.ts";
import { kit } from "@antumbra/server-journal/testing/kit.ts";
import { application } from "@antumbra/server/application.ts";
import { layer } from "@antumbra/app-testing/app.ts";
`);
		expect(found).toHaveLength(6);
		expect(found[0]).toMatchObject({ file: SCREEN, line: 2, rule: "tests/shared-patterns" });
		expect(found.every(({ message }) => message.includes("fixed it.app or it.glass"))).toBe(true);
	});

	it("requires fixed entries even when a domain or screen omits the harness import", () => {
		for (const path of [SCREEN, "packages/server/domains/settings/test/counts.test.ts"]) {
			expect(messages('import { it as test, expect } from "vitest";', path)).toHaveLength(1);
			expect(messages('import * as cases from "@effect/vitest"; cases.it.effect("case", body);', path)).toHaveLength(1);
		}
	});

	it("recognizes other consumers through aliased and namespace entry imports", () => {
		for (const entry of [
			'import { it as cases } from "@antumbra/app-testing/entry.ts";',
			'import * as cases from "@antumbra/app-testing/glass/entry.tsx";',
		]) {
			expect(messages(`${entry}\nimport { createRoot } from "react-dom/client";`, "packages/glass/client/test/glass.test.tsx")).toHaveLength(1);
		}
	});

	it("keeps browser configuration in the shared runner", () => {
		expect(messages(`${ENTRY}\n/** @vitest-environment happy-dom */`)).toEqual([
			"Use the shared glass test runner configuration instead of a local browser environment directive.",
		]);
		expect(messages(`${ENTRY}\n// @vitest-environment jsdom`)).toHaveLength(1);
	});

	it("replaces nested labelled writes, including import aliases", () => {
		const found = messages(`${ENTRY}
import { write as enter, labelled as field } from "@antumbra/app-testing/glass/dom.ts";
import * as dom from "@antumbra/app-testing/glass/dom.ts";
enter(field(form, "Name"), "Reef");
dom.write(dom.labelled(form, "Name"), "Reef");
`);
		expect(found).toHaveLength(2);
		expect(found.every((message) => message.includes("Use fill("))).toBe(true);
	});

	it("recognizes first-answer reads through yield and a saved binding", () => {
		const found = messages(`${ENTRY}
import { Option as O, Stream as S } from "effect";
function* read() {
  O.getOrThrow(yield* query.pipe(S.runHead));
  const saved = yield* S.runHead(query);
  O.getOrThrow(saved);
}
`);
		expect(found).toHaveLength(2);
		expect(found.every((message) => message.includes("Use answered("))).toBe(true);
	});

	it("reports matching-answer reads once rather than also asking for answered", () => {
		const found = messages(`${ENTRY}
import * as S from "effect/Stream";
import * as O from "effect/Option";
function* read() {
  O.getOrThrow(yield* query.pipe(S.filter(matches), S.runHead));
  const saved = yield* query.pipe(S.filter(matches), S.runHead);
  O.getOrThrow(saved);
}
`);
		expect(found).toHaveLength(2);
		expect(found.every((message) => message.includes("Use eventually("))).toBe(true);
	});

	it("ignores shadowed names and ordinary DOM and stream operations", () => {
		expect(
			messages(`${ENTRY}
import { write, labelled } from "@antumbra/app-testing/glass/dom.ts";
import { Option, Stream } from "effect";
function fill(write: Function, Stream: object, Option: object) {
  write(labelled(form, "Name"), "Reef");
  Option.getOrThrow(Stream.runHead(query));
}
expect(labelled(form, "Name").value).toBe("Reef");
write(existingField, "Reef");
Stream.runHead(query);
query.pipe(Stream.filter(matches), Stream.map(project), Stream.runHead);
query.pipe(Stream.filter(matches), Stream.runCollect);
Option.getOrThrow(optionalValue);
Option.getOrThrow(query.pipe(Stream.runHead, project));
let result = Stream.runHead(query);
result = anotherOption;
Option.getOrThrow(result);
`),
		).toEqual([]);
	});

	it("permits shared helpers, type imports, and expect", () => {
		expect(
			messages(`${ENTRY}
import type { Root } from "react-dom/client";
import { type AppDefinition } from "@antumbra/server-journal/app.ts";
import { expect } from "vitest";
import { fill } from "@antumbra/app-testing/glass/dom.ts";
import { answered, eventually } from "@antumbra/app-testing/answers.ts";
fill(form, "Name", "Reef");
answered(query);
eventually(query, matches);
`),
		).toEqual([]);
	});

	it("leaves primitive tests and fixture internals alone", () => {
		const content = `import { it } from "@effect/vitest";
import { app } from "@antumbra/server-journal/app.ts";
import { Option, Stream } from "effect";
Option.getOrThrow(Stream.runHead(source));`;
		for (const path of ["packages/server/journal/test/app.test.ts", "packages/glass/form/test/form.test.ts", "apps/testing/test/answers.test.ts"]) {
			expect(messages(content, path)).toEqual([]);
		}
	});
});
