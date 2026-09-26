import { Result, Schema } from "effect";

export const decoder = <A>(schema: Schema.Codec<A, string>): ((body: string) => Result.Result<A, string>) => {
	const decode = Schema.decodeUnknownResult(schema);
	return (body) => Result.mapError(decode(body), (error) => error.message);
};

export const pagesDecoder = <A>(decode: (body: string) => Result.Result<readonly A[], string>) => {
	return (pages: readonly string[]): Result.Result<readonly A[], string> => Result.map(Result.all(pages.map(decode)), (lists) => lists.flat());
};

export const firstPage =
	<A>(decode: (body: string) => Result.Result<A, string>) =>
	(pages: readonly string[]): Result.Result<A, string> =>
		decode(pages[0] ?? "");
