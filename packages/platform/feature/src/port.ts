import { Context, Effect } from "effect";

export interface PortShape {
	readonly key: string;
	readonly port: string;
	readonly Identifier: unknown;
	readonly Service: unknown;
}

export interface PortClass<Self, Name extends string, Shape> extends Context.ServiceClass<Self, `@antumbra/port/${Name}`, Shape> {
	readonly port: Name;
}

export type PortRecord<Ports extends readonly PortShape[]> = { readonly [Port in Ports[number] as Port["port"]]: Port["Service"] };

export type PortServices<Ports extends readonly PortShape[]> = Ports[number]["Identifier"];

export function port<Self, Shape>(): <const Name extends string>(name: Name) => PortClass<Self, Name, Shape>;
export function port(): (name: string) => unknown {
	return (name) => Object.assign(Context.Service<unknown, unknown>()(`@antumbra/port/${name}`), { port: name });
}

function instance(declared: PortShape): Effect.Effect<unknown>;
function instance(declared: unknown): unknown {
	return declared;
}

export function portRecord(ports: readonly PortShape[]): Effect.Effect<Record<string, unknown>>;
export function portRecord(ports: readonly PortShape[]): unknown {
	return Effect.gen(function* () {
		const instances: Record<string, unknown> = {};
		for (const declared of ports) instances[declared.port] = yield* instance(declared);
		return instances;
	});
}
