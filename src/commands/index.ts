import { AbstractCommand } from "./abstract.command";
import { GenerateFileCommand } from "./generate-file.command";
import { ReadLineCommand } from "./read-line.command";

const commands = new Map<string, new (cwd: string, argv: string[], signal: AbortSignal) => AbstractCommand>();
commands.set(ReadLineCommand.action, ReadLineCommand);
commands.set(GenerateFileCommand.action, GenerateFileCommand);

// Get command by action name from arguments
export const getCommand = (action: string, cwd: string, argv: string[], signal: AbortSignal): AbstractCommand => {
    const Command = commands.get(action);
    if (!Command) {
        throw new Error(`Command not found: ${action}`);
    }

    return new Command(cwd, argv, signal);
};
