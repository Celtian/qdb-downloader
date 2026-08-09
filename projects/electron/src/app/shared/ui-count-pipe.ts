import { Pipe, type PipeTransform } from '@angular/core';

import { formatUiCount } from '../../../shared/ui-format';

@Pipe({ name: 'uiCount' })
export class UiCountPipe implements PipeTransform {
  transform(count: number, singular: string, plural?: string): string {
    return formatUiCount(count, singular, plural);
  }
}
