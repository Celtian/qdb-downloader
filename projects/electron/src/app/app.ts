import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgxAppVersionDirective } from 'ngx-app-version';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
  hostDirectives: [NgxAppVersionDirective],
  host: {
    '[attr.data-theme]': 'theme.preference()',
  },
})
export class App {
  protected readonly theme = inject(ThemeService);
}
