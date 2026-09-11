import { choice, editing, optional, titled } from "@antumbra/feature/edit.ts";
import { query } from "@antumbra/feature/query.ts";
import { row } from "@antumbra/feature/row.ts";
import { Effect, Schema } from "effect";
import { expect, it } from "vitest";

const model = row("model", { id: Schema.String, backend: Schema.String, name: Schema.String }, { key: "id", scope: "backend" });

const models = query("models", {
	input: { backend: Schema.String },
	output: Schema.Array(model.Row),
	reads: [model],
	run: Effect.fn("catalogue.models")(function* (input, rows) {
		return yield* rows.model.where({ backend: input.backend });
	}),
});

const TAGS = ["claude", "codex"] as const;

it("reads a title and the values a literals field can take", () => {
	const field = optional(Schema.Literals(TAGS), { title: "Backend" });

	expect(editing(field)).toMatchObject({ literals: TAGS, optional: true, title: "Backend" });
});

it("reads the query a choice field takes its values from", () => {
	const field = optional(choice(models, { input: { backend: "backend" }, label: "name", value: "id" }), { title: "Model" });

	expect(editing(field).choice).toEqual({ free: false, input: { backend: "backend" }, label: "name", query: models, value: "id" });
	expect(editing(field).title).toBe("Model");
});

it("reads a choice that lets a value outside the list through", () => {
	const field = choice(models, { free: true, input: { backend: "backend" } });

	expect(editing(field)).toMatchObject({ optional: false, title: undefined });
	expect(editing(field).choice).toMatchObject({ free: true, label: undefined, value: undefined });
});

it("reads a plain field as neither optional nor chosen from a list", () => {
	expect(editing(Schema.String)).toMatchObject({
		choice: undefined,
		flag: false,
		literals: undefined,
		number: false,
		optional: false,
		title: undefined,
	});
});

it("titles a field that takes one value rather than none", () => {
	const field = titled(Schema.Number.check(Schema.isInt()), { title: "Count" });

	expect(editing(field)).toMatchObject({ number: true, optional: false, title: "Count" });
	expect(Schema.decodeUnknownSync(field)(7)).toBe(7);
	expect(() => Schema.decodeUnknownSync(field)(7.5)).toThrow();
});

it("reads a boolean field as a flag", () => {
	expect(editing(Schema.Boolean).flag).toBe(true);
	expect(editing(optional(Schema.Boolean, { title: "Wanted" })).flag).toBe(true);
});

it("still decodes the value the field describes", () => {
	const field = optional(Schema.Literals(TAGS), { title: "Backend" });

	expect(Schema.decodeUnknownSync(field)("codex")).toBe("codex");
	expect(Schema.decodeUnknownSync(field)(null)).toBe(null);
});
