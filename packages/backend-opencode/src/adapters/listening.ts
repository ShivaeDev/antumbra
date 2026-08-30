// why: the server picks its own port when asked for zero and announces the URL
// it settled on as its first line of stdout, padded. That line is the only
// place the address exists — there is no file and no fixed port to assume.
const LISTENING = /listening on (?<url>https?:\/\/\S+)/;

export const listeningUrl = (line: string): string | undefined =>
	LISTENING.exec(line)?.groups?.url;
