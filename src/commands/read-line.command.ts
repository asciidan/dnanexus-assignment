import events from "node:events";
import fs, { Stats } from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { EnvConfig } from "../config/env.config";
import { MathUtils } from "../utils/math.utils";
import { AbstractCommand } from "./abstract.command";
import type { ICacheMetadata } from "./types/ICacheMetadata";
import type { Partition } from "./types/Partition";

export class ReadLineCommand extends AbstractCommand {
    public static action = "read-line";
    private readonly fileEncoding: BufferEncoding;
    private readonly maxPartitionSize: number;
    private readonly base2LogMaxPartitionSize: number;

    constructor(cwd: string, argv: string[], signal: AbortSignal) {
        super(cwd, argv, signal);

        if (!EnvConfig.maxPartitionSize) {
            throw new Error("Max partition size is required");
        }

        const base2LogMaxPartitionSize = MathUtils.getIntegerBase2Log(EnvConfig.maxPartitionSize);
        if (base2LogMaxPartitionSize === null) {
            throw new Error("Max partition size must be a power of 2");
        }

        this.fileEncoding = EnvConfig.fileEncoding;
        this.maxPartitionSize = EnvConfig.maxPartitionSize;
        this.base2LogMaxPartitionSize = base2LogMaxPartitionSize;
    }

    /**
     * Execute the command to read a specific line from a file
     */
    public async execute(): Promise<void> {
        const filePathInput = this.argv[3] ?? null;
        const nthLineInput = this.argv[4] ?? null;

        if (filePathInput === null || nthLineInput === null) {
            console.warn(`WARN> Usage: ${ReadLineCommand.action} <file-path> <line-number>`);
            return Promise.reject();
        }

        const filePath = await this.validateAndReturnFilePath(filePathInput);
        if (filePath === null) {
            return Promise.reject();
        }

        const nthLine = this.validateAndReturnNthLine(nthLineInput);
        if (nthLine === null) {
            return Promise.reject();
        }

        // Cache folder and files, ensure they exist
        const cacheFolder = path.resolve(this.cwd, ".cache", path.basename(filePath));
        const cachePartitionsFolder = path.resolve(cacheFolder, "partitions");
        const metadataCacheFile = path.resolve(cacheFolder, "metadata.json");

        await this.ensureCacheFolderExists(cacheFolder, cachePartitionsFolder);

        // Check metadata cache, rebuild if necessary
        const fileStats = await fsp.stat(filePath);
        let metadata: ICacheMetadata | null = null;

        try {
            metadata = require(metadataCacheFile) as ICacheMetadata;
        } catch {
            // Noop, metadata cache file will be created later
        }

        if (
            metadata === null ||
            metadata.mtime !== fileStats.mtimeMs ||
            metadata.size !== fileStats.size ||
            metadata.partitionSize !== this.maxPartitionSize
        ) {
            metadata = await this.rebuildCache(filePath, fileStats, cacheFolder, metadataCacheFile, cachePartitionsFolder);
        }

        // Use bitwise operation to get the partition index (and avoid Math.floor to save some time)
        const partitionIndex = nthLine >> this.base2LogMaxPartitionSize;
        if (partitionIndex >= metadata.partitionCount) {
            console.error("ERR> Line out of range");
            return Promise.reject();
        }

        // Get the line index within the partition
        const lineIndex = nthLine % this.maxPartitionSize;
        const partitionFile = path.resolve(cachePartitionsFolder, `p-${partitionIndex}.json`);
        console.info("VERB> Reading from partition file: " + path.relative(this.cwd, partitionFile));

        const [byteOffset, lineMap] = require(partitionFile) as Partition;
        if (lineIndex >= lineMap.length) {
            console.error("ERR> Line out of range");
            return Promise.reject();
        }

        // Read the line from the file using the byte offset and line map from the partition
        const byteStart = byteOffset + (lineIndex > 0 ? lineMap[lineIndex - 1] : 0);
        const byteEnd = lineMap[lineIndex] - 1;

        const readStream = fs.createReadStream(filePath, {
            encoding: this.fileEncoding,
            autoClose: true,
            highWaterMark: 1024 * 1024,
            start: byteStart,
            end: byteOffset + byteEnd - 1,
            signal: this.signal,
        });

        let data = "";

        readStream.on("data", (chunk) => {
            data += chunk;
        });

        readStream.on("error", (error) => {
            console.error("ERR> Read stream error: " + error.message);
        });

        readStream.on("end", () => {
            console.info("INFO> " + data);
        });
    }

    /**
     * Validate and return the file path if it exists and is readable
     */
    private async validateAndReturnFilePath(fileName: string): Promise<string | null> {
        if (fileName.length < 1) {
            console.error("ERR> File name must be at least 1 character long");
            return null;
        }

        const filePath = path.resolve(this.cwd, fileName);

        try {
            await fsp.access(filePath, fs.constants.R_OK | fs.constants.F_OK);
        } catch {
            console.error("ERR> File does not exist or is not readable");
            return null;
        }

        return filePath;
    }

    /**
     * Validate and return the line number as a number if it is a valid number
     */
    private validateAndReturnNthLine(nthLine: string): number | null {
        const line = Number.parseInt(nthLine, 10);

        if (Number.isNaN(line) || Number.isNaN(+nthLine)) {
            console.error("ERR> Line number must be a number");
            return null;
        } else if (line < 0) {
            console.error("ERR> Line number must be greater than or equal to 0");
            return null;
        }

        return line;
    }

    /**
     * Ensure the cache folder and partitions folder exist or create them if they do not
     */
    private async ensureCacheFolderExists(cacheFolder: string, cachePartitionsFolder: string): Promise<void> {
        try {
            const stat = await fsp.stat(cacheFolder);
            if (stat.isDirectory()) {
                return;
            }
        } catch (error) {
            if ("code" in error && error.code === "ENOENT") {
                console.info("INFO> Cache folder does not exist, creating...");
            } else {
                console.warn("WARN> Cache folder cannot be accessed or is not a directory. Reason: " + error.message);
                return Promise.reject();
            }
        }

        try {
            await fsp.mkdir(cachePartitionsFolder, { recursive: true });
        } catch (error) {
            console.error("ERR> Cache partitions folder cannot be created. Reason: " + error.message);
        }
    }

    /**
     * Rebuild the index cache for the file and write the metadata to the cache folder
     */
    private async rebuildCache(
        filePath: string,
        fileStats: Stats,
        cacheFolder: string,
        metadataCacheFile: string,
        cachePartitionsFolder: string
    ): Promise<ICacheMetadata> {
        console.info("INFO> Rebuilding index cache...");

        try {
            await fsp.rm(cacheFolder, { recursive: true });
            await fsp.mkdir(cachePartitionsFolder, { recursive: true });
        } catch (error) {
            console.error("ERR> Cache folder cannot be cleared or created. Reason: " + error.message);
            return Promise.reject();
        }

        let metadata: ICacheMetadata = {
            mtime: fileStats.mtimeMs,
            size: fileStats.size,
            partitionCount: 0,
            partitionSize: this.maxPartitionSize,
        };

        let byteOffset = 0;

        // Partition variables
        let partLineMap: number[] = [];
        let partIndex = 0;
        let partByteLength = 0;
        let partLineCount = 0;

        const readInterface = readline.createInterface({
            input: fs.createReadStream(filePath, {
                encoding: this.fileEncoding,
                autoClose: true,
                highWaterMark: 1024 * 1024,
                signal: this.signal,
            }),
            crlfDelay: Infinity,
        });

        return new Promise<ICacheMetadata>(async (resolve, reject) => {
            readInterface.on("line", async (line) => {
                const size = Buffer.byteLength(line, this.fileEncoding);

                partByteLength += size + 1; // +1 for newline character
                partLineMap[partLineCount] = partByteLength;
                partLineCount++;

                if (partLineCount < this.maxPartitionSize) {
                    return;
                }

                this.writePartitionFile(cachePartitionsFolder, partIndex, [byteOffset, partLineMap] as Partition).catch(reject);

                byteOffset += partByteLength;

                // Reset partition variables
                partLineMap = [];
                partLineCount = 0;
                partByteLength = 0;
                partIndex++;
            });

            await events.once(readInterface, "close");

            if (partLineCount != 0 && partLineCount < this.maxPartitionSize) {
                await this.writePartitionFile(cachePartitionsFolder, partIndex, [byteOffset, partLineMap] as Partition);
            } else {
                partIndex--;
            }

            // Update metadata partition count and write to cache
            metadata.partitionCount = partIndex + 1;

            try {
                await fsp.writeFile(metadataCacheFile, JSON.stringify(metadata), {
                    encoding: this.fileEncoding,
                    signal: this.signal,
                });
            } catch (error) {
                console.error("ERR> Metadata cache file cannot be written. Reason: " + error.message);
                return reject();
            }

            return resolve(metadata);
        });
    }

    private async writePartitionFile(
        cachePartitionsFolder: string,
        partitionIndex: number,
        partitionData: Partition
    ): Promise<void> {
        try {
            await fsp.writeFile(path.resolve(cachePartitionsFolder, `p-${partitionIndex}.json`), JSON.stringify(partitionData), {
                encoding: this.fileEncoding,
                signal: this.signal,
            });
        } catch (error) {
            console.error("ERR> Partition file cannot be written. Reason: " + error.message);
            return Promise.reject();
        }
    }
}
