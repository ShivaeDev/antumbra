import { Result, Schema } from "effect";

export const decoder = <A>(schema: Schema.Codec<A, string>): ((body: string) => Result.Result<A, string>) => {
	const decode = Schema.decodeUnknownResult(schema);
	return (body) => Result.mapError(decode(body), (error) => error.message);
};
