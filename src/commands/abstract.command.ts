import type { ICommand } from "./types/ICommand";

export abstract class AbstractCommand implements ICommand {
    public static action: string;
    constructor(protected readonly cwd: string, protected readonly argv: string[], protected readonly signal: AbortSignal) {}
    public abstract execute(): Promise<void>;
}
