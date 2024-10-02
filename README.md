# DNAnexus Assignment / Programming Challenge solution

> Assignee: **Daniel Knotek**

## Problem - Random line from a file

You are given a very, very large plain text file where each line contains a plain text string. The file has at most 1 billion lines; lines may have different lengths, but each line has at most 1000 characters. Your goal is to write a program that will print an arbitrary line from the file. Your program will be run many times (although you don't know exactly how many times it will be run in advance), and you don't know in advance which lines might be selected. Thus, your solution should be optimized to minimize the runtime for each additional execution. The first execution of the program may take longer than subsequent runs, and you may use additional disk storage to improve performance. Your program should take two command-line arguments: the path of the input file from which to print lines, and the index of the line you want to print. Your program should write the line to standard output.

## Prerequisites

-   Node.js LTS v20 or higher
-   npm v8 or higher

## Local setup

### Dependencies

The project only has one dependency, which is `dotenv` for loading environment variables from a `.env` file. Though you may want to install dev dependencies (`typescript` and `typescript`-related dependencies) for development purposes or for building the project.

```bash
# Copy the .env.example file to .env
cp .env.example .env

# Install dependencies
npm install
```

### Building the project

The project is written in TypeScript, so you need to compile it to JavaScript before running it. The following command will compile the project to the `dist` directory.

```bash
npm run build
```

## Usage

### generate-file

> For testing purposes. If you already have a file prepared, you can skip to the read-line command.

This command generates a file with random lines. The command takes two arguments, the file name and the number of lines to generate. Each line is a random string with a length between `LINE_MIN_LENGTH` and `LINE_MAX_LENGTH` (inclusive). See the environment variables section for more information.

```
Usage: generate-file <file-name> <number-of-lines>
```

**Source code**: [generate-file.command.ts](./src/commands/generate-file.command.ts)

#### Example usage

```bash
npm start -- generate-file data.txt 30000000
```

#### Example output

```
> @asciidan/dnanexus-assignment@1.0.0 start
> node -r dotenv/config dist/index.js generate-file data.txt 30000000

INFO> Generating file data.txt with 30000000 lines
INFO> File data.txt has been created
```

### read-line

This command reads a line from a file. The command takes two arguments, the file name and the line number to read.

On the first run, the command will generate index partitions for quicker lookup time (might take a while). The command will then read the line from the file using the generated index partitions and print it to the standard output.

On subsequent runs, the command will use the generated index partitions to quickly find the line and print it to the standard output.

```
Usage: read-line <file-path> <line-number>
```

**Source code**: [read-line.command.ts](./src/commands/read-line.command.ts)

#### Partitioning

The file is partitioned into smaller files to speed up the lookup time. Each partition file contains a tuple with two elements. The first element is the byte offset of the first line in the partition, and the second element is an array of byte lengths of each line in the partition.

The partition files are stored in the `.cache` directory in a subdirectory named after the file name. The partition files are named `p-<partition-number>.json`. The metadata file is stored in the same directory and is named `metadata.json`, which contains information about the file and the partitions.

The partition size is determined by the `MAX_PARTITION_SIZE` environment variable. See the environment variables section for more information.

Note: The index cache size should be around 1.3% of the target file size.

#### Example metadata file

```json
{
    "mtime": 1727879850489.7966,
    "size": 8447,
    "partitionCount": 1,
    "partitionSize": 131072
}
```

#### Example partition file

```json
[0, [1000, 2000, 2439, 3439, 3998, 4447, 5447, 6447, 7447, 8447]]
```

#### Example usage

```bash
npm start -- read-line data.txt 10
```

#### Example output (first run)

```
> @asciidan/dnanexus-assignment@1.0.0 start
> node -r dotenv/config dist/index.js read-line data.txt 10

INFO> Cache folder does not exist, creating...
INFO> Rebuilding index cache...
VERB> Reading from partition file: .cache/data.txt/partitions/p-0.json
INFO> ea6271bd7a761267f1ce7c3667cf4c97300e44883f039e958484d533e8ce975073cae3f36d58faa5e136b08cdf50df6cdb4ec94313633d9279b08f0775e437533392dc94e2cf011d16907641011ffb2ba994bdd096fe2e35bc3deda59d398cb828e1a055a9fa36730b58b2921fc13e67a5fe36af4dbd2f32b4f6b60879661d11284c7763b076df0d4805958dd0c1cc36f98638f1d813bde951521834ef0a4192e98dce09daaabf6b1e7666ec82a1f7fc345f44e2d2419c13b944e4c2b2946d11175ad0d40403ffc4cf3d50d5241f7f4e0855305110982c0a960ae29e86928b470fbeee991b1d0a5ccc6c03a814761f819e67c8b50054739458dcdd579b0f101f07cb
```

#### Example output (subsequent runs)

```
> @asciidan/dnanexus-assignment@1.0.0 start
> node -r dotenv/config dist/index.js read-line data.txt 10

VERB> Reading from partition file: .cache/data.txt/partitions/p-0.json
INFO> ea6271bd7a761267f1ce7c3667cf4c97300e44883f039e958484d533e8ce975073cae3f36d58faa5e136b08cdf50df6cdb4ec94313633d9279b08f0775e437533392dc94e2cf011d16907641011ffb2ba994bdd096fe2e35bc3deda59d398cb828e1a055a9fa36730b58b2921fc13e67a5fe36af4dbd2f32b4f6b60879661d11284c7763b076df0d4805958dd0c1cc36f98638f1d813bde951521834ef0a4192e98dce09daaabf6b1e7666ec82a1f7fc345f44e2d2419c13b944e4c2b2946d11175ad0d40403ffc4cf3d50d5241f7f4e0855305110982c0a960ae29e86928b470fbeee991b1d0a5ccc6c03a814761f819e67c8b50054739458dcdd579b0f101f07cb
```

## Environment variables

| Variable           | Default | Description                                                                                           |
| ------------------ | ------- | ----------------------------------------------------------------------------------------------------- |
| FILE_ENCODING      | utf-8   | The default encoding to be used, this value is used to read and write files                           |
| MAX_PARTITION_SIZE |         | (read-line) The maximum size of a partition, this value is used to generate partitions of a file      |
| LINE_MIN_LENGTH    | 5       | (generate-file) The minimum length of a line in the file, This value is used to generate random lines |
| LINE_MAX_LENGTH    | 999     | (generate-file) The maximum length of a line in the file, This value is used to generate random lines |

Note: The `MAX_PARTITION_SIZE` environment variable is required for the `read-line` command. The value must be a power of 2 such as 131072 (or 2^17) to ensure quicker lookup time.

**Example values**: [.env.example](./.env.example)
