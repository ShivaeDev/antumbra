export interface OpencodeRequest {
	readonly body: unknown;
	readonly path: string;
	// why: opencode multiplexes one server over many working directories and
	// takes the one a call means as a query parameter, so a request that omits
	// it lands on whichever instance the server booted with.
	readonly query: Readonly<Record<string, string>>;
}

// why: the whole of what this backend needs from a running opencode server,
// so the client above it is exercised against an in-memory server rather than
// a spawned binary. `onEvent` carries decoded frames from the host-wide event
// stream, which is subscribed once and shared by every session.
export interface OpencodeConnection {
	readonly close: () => void;
	readonly get: (request: OpencodeRequest) => Promise<unknown>;
	readonly onEvent: (listener: (frame: unknown) => void) => void;
	readonly onExit: (listener: () => void) => void;
	readonly post: (request: OpencodeRequest) => Promise<unknown>;
}
