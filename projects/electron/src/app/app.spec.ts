import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideAppVersion } from 'ngx-app-version';
import { VERSION_INFO } from '../../../version-info';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideAppVersion({ version: VERSION_INFO.version })],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should expose the main router outlet', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('does not render a sidebar outside a selected project', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.sidebar')).toBeNull();
  });

  it('exposes the generated version on the root element', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    expect(fixture.nativeElement.getAttribute('app-version')).toBe(VERSION_INFO.version);
  });
});
