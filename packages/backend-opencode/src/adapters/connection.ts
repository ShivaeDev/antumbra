export interface OpencodeRequest {
	readonly body: unknown;
	readonly path: string;
	readonly query: Readonly<Record<string, string>>;
}

export interface OpencodeConnection {
	readonly close: () => void;
	readonly get: (request: OpencodeRequest) => Promise<unknown>;
	readonly onEvent: (listener: (frame: unknown) => void) => void;
	readonly onExit: (listener: () => void) => void;
	readonly post: (request: OpencodeRequest) => Promise<unknown>;
}
