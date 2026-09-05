declare module 'postject' {
  export interface InjectOptions {
    machoSegmentName?: string | undefined;
    overwrite?: boolean | undefined;
    sentinelFuse?: string | undefined;
  }

  export function inject(
    filename: string,
    resourceName: string,
    resourceData: Buffer,
    options?: InjectOptions,
  ): Promise<void>;
}
