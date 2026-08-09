import { Pipe, type PipeTransform } from '@angular/core';

@Pipe({ name: 'arrayIncludes' })
export class ArrayIncludesPipe implements PipeTransform {
  transform(values: readonly unknown[] | null | undefined, value: unknown): boolean {
    return values?.includes(value) ?? false;
  }
}

@Pipe({ name: 'arrayJoin' })
export class ArrayJoinPipe implements PipeTransform {
  transform(values: readonly unknown[] | null | undefined, separator = ', '): string {
    return values?.join(separator) ?? '';
  }
}

@Pipe({ name: 'setHas' })
export class SetHasPipe implements PipeTransform {
  transform(values: ReadonlySet<unknown> | null | undefined, value: unknown): boolean {
    return values?.has(value) ?? false;
  }
}

@Pipe({ name: 'stringReplaceAll' })
export class StringReplaceAllPipe implements PipeTransform {
  transform(value: string, search: string, replacement: string): string {
    return value.replaceAll(search, replacement);
  }
}

@Pipe({ name: 'stringSlice' })
export class StringSlicePipe implements PipeTransform {
  transform(value: string, start: number, end?: number): string {
    return value.slice(start, end);
  }
}
