import { Effect, Schema } from "effect";

export type Response = { readonly body: string | undefined; readonly etag: string | undefined };

export type Get = (path: string, etag: string | undefined) => Effect.Effect<Response, Error>;

export type Outcome =
	| { readonly kind: "failed"; readonly message: string }
	| { readonly kind: "pages"; readonly pages: readonly string[] }
	| { readonly kind: "same" };

export const Page = Schema.Struct({ etag: Schema.optional(Schema.String) });
export type Page = typeof Page.Type;

export type Resource = { readonly path: string; readonly size: (body: string) => number };

type Paged = { readonly outcome: Outcome; readonly pages: readonly Page[] };

export const perPage = 100;

const same: Outcome = { kind: "same" };

const pageOf = (path: string, index: number): string => (index === 0 ? path : `${path}&page=${index + 1}`);

type Changed = { readonly index: number; readonly response: Response };

const firstChange = (get: Get, path: string, known: readonly Page[]): Effect.Effect<Changed | undefined, Error> =>
	Effect.gen(function* () {
		for (const [index, page] of known.entries()) {
			const response = yield* get(pageOf(path, index), page.etag);
			if (response.body !== undefined) return { index, response };
		}
		return undefined;
	});

const whole = (get: Get, resource: Resource, changed: Changed): Effect.Effect<Paged, Error> =>
	Effect.gen(function* () {
		const bodies: string[] = [];
		const pages: Page[] = [];
		for (let index = 0; ; index += 1) {
			const response = index === changed.index ? changed.response : yield* get(pageOf(resource.path, index), undefined);
			const body = response.body ?? "";
			const size = resource.size(body);
			bodies.push(body);
			pages.push({ etag: response.etag });
			if (size < perPage) return { outcome: { kind: "pages" as const, pages: bodies }, pages };
		}
	});

export const readPaged = (get: Get, resource: Resource, known: readonly Page[]): Effect.Effect<Paged> =>
	Effect.gen(function* () {
		const changed = known.length === 0 ? { index: 0, response: yield* get(resource.path, undefined) } : yield* firstChange(get, resource.path, known);
		if (changed === undefined) return { outcome: same, pages: known };
		return yield* whole(get, resource, changed);
	}).pipe(Effect.catch((error) => Effect.succeed<Paged>({ outcome: { kind: "failed", message: error.message }, pages: known })));
