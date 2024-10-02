export class EnvConfig {
    /**
     * The default encoding to be used
     * @default utf-8
     * @description This value is used to read and write files
     */
    public static fileEncoding: BufferEncoding = (process.env.FILE_ENCODING as BufferEncoding) ?? "utf-8";

    /**
     * The maximum size of a partition
     * @default null
     * @description This value is used to generate partitions of a file
     */
    public static maxPartitionSize: number | null = process.env.MAX_PARTITION_SIZE
        ? Number.parseInt(process.env.MAX_PARTITION_SIZE, 10)
        : null;

    /**
     * The minimum length of a line to be considered valid
     * @default 5
     * @description This value is used to generate random lines
     */
    public static lineMinLength: number = process.env.LINE_MIN_LENGTH ? Number.parseInt(process.env.LINE_MIN_LENGTH, 10) : 5;

    /**
     * The maximum length of a line to be considered valid
     * @default 999
     * @description This value is used to generate random lines
     */
    public static lineMaxLength: number = process.env.LINE_MAX_LENGTH ? Number.parseInt(process.env.LINE_MAX_LENGTH, 10) : 999;
}
