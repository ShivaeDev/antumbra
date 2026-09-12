const LISTENING = /listening on (?<url>https?:\/\/\S+)/;

export const listeningUrl = (line: string): string | undefined => LISTENING.exec(line)?.groups?.url;
