import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

export interface DocSection {
  title: string;
  paragraphs: string[];
  code?: string;
}

export interface DocContent {
  eyebrow: string;
  title: string;
  summary: string;
  sections: DocSection[];
}

@Component({
  selector: 'app-doc-page',
  imports: [],
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.css',
})
export class DocPage {
  protected readonly content = inject(ActivatedRoute).snapshot.data['content'] as DocContent;
}
