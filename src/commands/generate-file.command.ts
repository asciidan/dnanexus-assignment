import crypto from "node:crypto";
import events from "node:events";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { EnvConfig } from "../config/env.config";
import { AbstractCommand } from "./abstract.command";

export class GenerateFileCommand extends AbstractCommand {
    public static action = "generate-file";
    private readonly lineMinLength: number;
    private readonly lineMaxLength: number;

    constructor(cwd: string, argv: string[], signal: AbortSignal) {
        super(cwd, argv, signal);

        this.lineMinLength = EnvConfig.lineMinLength;
        this.lineMaxLength = EnvConfig.lineMaxLength;
    }

    /**
     * Execute the command to generate a file with random line lengths
     */
    public async execute(): Promise<void> {
        const fileNameInput = this.argv[3] ?? null;
        const numberOfLinesInput = this.argv[4] ?? null;

        if (fileNameInput === null || numberOfLinesInput === null) {
            console.warn(`WARN> Usage: ${GenerateFileCommand.action} <file-name> <number-of-lines>`);
            return Promise.reject();
        }

        const filePath = await this.validateAndReturnFilePath(fileNameInput);
        if (filePath === null) {
            return Promise.reject();
        }

        const numberOfLines = this.validateAndReturnNumberOfLines(numberOfLinesInput);
        if (numberOfLines === null) {
            return Promise.reject();
        }

        console.info(`INFO> Generating file ${fileNameInput} with ${numberOfLines} lines`);

        const writeStream = fs.createWriteStream(filePath, {
            encoding: "utf-8",
            autoClose: true,
            highWaterMark: 1024 * 1024,
            signal: this.signal,
        });

        return new Promise<void>(async (resolve, reject) => {
            writeStream.on("error", (error) => {
                console.error(`ERR> ${error.message}`);
                return reject(error);
            });

            writeStream.on("finish", () => {
                console.info(`INFO> File ${fileNameInput} has been created`);
                return resolve();
            });

            for (let i = 0; i < numberOfLines; i++) {
                const lineLength = Math.floor(Math.random() * (this.lineMaxLength - this.lineMinLength)) + this.lineMinLength;
                let line = crypto.randomBytes(lineLength).toString("hex");
                if (line.length > this.lineMaxLength) {
                    line = line.slice(0, this.lineMaxLength);
                }

                const shouldAwaitDrain = writeStream.write(`${line}\n`);
                if (!shouldAwaitDrain) {
                    await events.once(writeStream, "drain");
                }
            }

            writeStream.end();
            return resolve();
        });
    }

    /**
     * Validate and return the file path if it exists and is writable
     */
    private async validateAndReturnFilePath(fileName: string): Promise<string | null> {
        if (fileName.length < 1) {
            console.error("ERR> File name must be at least 1 character long");
            return null;
        }

        const filePath = path.resolve(this.cwd, fileName);

        try {
            await fsp.access(filePath, fs.constants.F_OK);
            console.error("ERR> File already exists");
            return null;
        } catch {
            return filePath;
        }
    }

    /**
     * Validate and return the number of lines if it is a valid number
     */
    private validateAndReturnNumberOfLines(numberOfLines: string): number | null {
        const lines = parseInt(numberOfLines, 10);

        if (Number.isNaN(lines) || Number.isNaN(+numberOfLines)) {
            console.error("ERR> Number of lines must be a number");
            return null;
        } else if (lines < 1) {
            console.error("ERR> Number of lines must be greater than 0");
            return null;
        }

        return lines;
    }
}
