import type { ChartOptions } from '../src/chartOptions.ts';

export function usage(programName: string): string {
  return `Usage: ${programName} [options] [file.csv] > report.html

Reads the CSV from stdin when no file is given.

Options:
  --y-max <number>  Pin the top of the y scale
  --y-min <number>  Pin the bottom of the y scale
  -h, --help        Show this message`;
}

export interface CLIOptions {
  csvPath: string | null;
  chartOptions: ChartOptions;
  help: boolean;
}

export class CLIError extends Error {}

function parseNumber(name: string, value: string | undefined): number {
  const parsed = Number(value);
  if (value == null || value.trim() === '' || !Number.isFinite(parsed)) {
    throw new CLIError(`${name} expects a number, got: ${value ?? '(nothing)'}`);
  }
  return parsed;
}

export function parseArgs(args: string[]): CLIOptions {
  const chartOptions: ChartOptions = {};
  let csvPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const option = args[i].match(/^(--[a-zA-Z-]+|-h)(?:=(.*))?$/);

    if (!option) {
      if (csvPath == null) csvPath = args[i];
      continue;
    }

    const [, name] = option;
    if (name === '-h' || name === '--help') {
      return { csvPath, chartOptions, help: true };
    }

    // Both `--y-max 5` and `--y-max=5` are accepted.
    const value = option[2] ?? args[++i];

    switch (name) {
      case '--y-max':
        chartOptions.yMax = parseNumber(name, value);
        break;
      case '--y-min':
        chartOptions.yMin = parseNumber(name, value);
        break;
      default:
        throw new CLIError(`unknown option: ${name}`);
    }
  }

  return { csvPath, chartOptions, help: false };
}
