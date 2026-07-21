import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="copy">
        <p class="eyebrow">{{ eyebrow() }}</p>
        <div class="title-row">
          <h1 [id]="headingId()">{{ heading() }}</h1>
          <div class="title-action">
            <ng-content select="[pageHeaderTitleAction]" />
          </div>
        </div>
        <p class="description">{{ description() }}</p>
      </div>
      <div class="actions">
        <ng-content select="[pageHeaderActions]" />
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .page-header {
      align-items: flex-end;
      display: flex;
      gap: 1.5rem;
      justify-content: space-between;
    }

    .copy {
      min-width: 0;
    }

    .eyebrow {
      color: var(--mat-sys-primary);
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      margin: 0;
      text-transform: uppercase;
    }

    .title-row {
      align-items: center;
      display: flex;
      gap: 0.75rem;
    }

    h1 {
      font-size: clamp(1.8rem, 4vw, 2.5rem);
      margin: 0.25rem 0 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .description {
      color: var(--mat-sys-on-surface-variant);
      margin: 0.5rem 0 0;
      max-width: 48rem;
    }

    .title-action,
    .actions {
      flex: none;
    }

    .title-action:empty,
    .actions:empty {
      display: none;
    }

    @media (max-width: 40rem) {
      .page-header {
        align-items: flex-start;
        flex-direction: column;
        gap: 1rem;
      }
    }
  `,
})
export class PageHeader {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly description = input.required<string>();
  readonly headingId = input.required<string>();
}
