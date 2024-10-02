import { getCommand } from "./commands";
import type { ICommand } from "./commands/types/ICommand";

// Get action name from arguments
const action = process.argv[2];
if (!action) {
    console.error("ERR> Action name is required");
    process.exit(1);
}

// Create abort controller to handle graceful shutdown
const abortController = new AbortController();
let command: ICommand;

// Get command by action name from arguments
try {
    command = getCommand(action, process.cwd(), process.argv, abortController.signal);
} catch (error) {
    console.error("ERR> " + error.message);
    abortController.abort();
    process.exit(1);
}

// Execute command, abort on error
command.execute().catch((error) => {
    if (error) {
        console.error("ERR> " + error.message);
    }

    abortController.abort();
});

// Handle graceful shutdown
process.on("SIGINT", () => {
    abortController.abort();
    process.exit();
});

process.on("SIGTERM", () => {
    abortController.abort();
    process.exit();
});
