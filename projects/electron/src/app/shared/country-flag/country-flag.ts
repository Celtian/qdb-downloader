import { NgOptimizedImage } from '@angular/common';
import { booleanAttribute, Component, computed, input } from '@angular/core';

interface FlagImageSource {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

@Component({
  selector: 'app-country-flag',
  imports: [NgOptimizedImage],
  templateUrl: './country-flag.html',
  styleUrl: './country-flag.css',
})
export class CountryFlag {
  readonly code = input.required<string>();
  readonly countryName = input<string>();
  readonly decorative = input(false, { transform: booleanAttribute });

  protected readonly alt = computed(() =>
    this.decorative() ? '' : (this.countryName() ?? this.code().toLocaleUpperCase('en')),
  );
  protected readonly image = computed<FlagImageSource>(() => {
    const code = this.code().toLocaleLowerCase('en');
    return {
      src: `flags/20x15/${code}.png`,
      srcset: `flags/20x15/${code}.png 1x, flags/40x30/${code}.png 2x, flags/60x45/${code}.png 3x`,
      width: 20,
      height: 15,
    };
  });
}
