import { Context } from "effect";

export class SessionSendOptions extends Context.Service<
	SessionSendOptions,
	{
		readonly imageInputBackends: ReadonlySet<string>;
		readonly wakePatienceMillis: number;
	}
>()("@antumbra/sessions/SessionSendOptions") {}
