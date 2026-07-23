import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterLink } from '@angular/router';

export interface DocAction {
  label: string;
  href?: string;
  route?: string;
  primary?: boolean;
}

export interface DocFact {
  label: string;
  value: string;
}

export interface DocTable {
  caption: string;
  columns: string[];
  rows: string[][];
}

export interface DocSection {
  badge?: string;
  title: string;
  paragraphs: string[];
  items?: string[];
  steps?: string[];
  table?: DocTable;
  code?: string;
  note?: string;
  actions?: DocAction[];
  wide?: boolean;
}

export interface DocContent {
  eyebrow: string;
  title: string;
  summary: string;
  actions?: DocAction[];
  facts?: DocFact[];
  sections: DocSection[];
}

@Component({
  selector: 'app-doc-page',
  imports: [MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  templateUrl: './doc-page.html',
  styleUrl: './doc-page.css',
})
export class DocPage {
  protected readonly content = inject(ActivatedRoute).snapshot.data['content'] as DocContent;
}
