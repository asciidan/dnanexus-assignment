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
```

## Environment variables

| Variable           | Default | Description                                                                                                            |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------- |
| FILE_ENCODING      | utf-8   | The default encoding to be used, this value is used to read and write files                                            |
| MAX_PARTITION_SIZE |         | (read-line) The maximum size of a partition, this value is used to generate partitions of a file, must be a power of 2 |
| LINE_MIN_LENGTH    | 5       | (generate-file) The minimum length of a line in the file, This value is used to generate random lines                  |
| LINE_MAX_LENGTH    | 999     | (generate-file) The maximum length of a line in the file, This value is used to generate random lines                  |

```

```
