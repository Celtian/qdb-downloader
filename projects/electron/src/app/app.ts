import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NgxAppVersionDirective } from 'ngx-app-version';

import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    '[attr.data-theme]': 'theme.preference()',
  },
  hostDirectives: [NgxAppVersionDirective],
})
export class App {
  protected readonly theme = inject(ThemeService);
}
