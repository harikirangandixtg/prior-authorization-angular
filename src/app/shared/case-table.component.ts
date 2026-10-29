import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PaCase } from '../core/models';
import { caseStatus, overallResult, timeAgo } from '../core/presentation';
import { ChipComponent } from './chip.component';

@Component({
  selector: 'app-case-table',
  imports: [RouterLink, ChipComponent, DatePipe],
  template: `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Case</th>
            <th>Patient</th>
            <th>Service</th>
            <th>Criteria result</th>
            <th>Status</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          @for (c of cases(); track c.case_id) {
            <tr class="row-link" (click)="open(c.case_id)">
              <td>
                <a class="case-id" [routerLink]="['/cases', c.case_id]" (click)="$event.stopPropagation()">{{ c.case_id }}</a>
              </td>
              <td>
                <div class="strong">{{ c.patient_id }}</div>
                @if (c.request.diagnosis_code) {
                  <div class="muted small mono">{{ c.request.diagnosis_code }}</div>
                }
              </td>
              <td>
                <div class="strong">{{ c.request.service_description || c.request.service_code }}</div>
                @if (c.request.service_description) {
                  <div class="muted small mono">{{ c.request.service_code }}</div>
                }
              </td>
              <td><app-chip [p]="overall(c)" /></td>
              <td><app-chip [p]="status(c)" /></td>
              <td>
                <span [title]="(c.updated_at | date: 'medium') ?? ''">{{ ago(c) }}</span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class CaseTableComponent {
  readonly cases = input.required<PaCase[]>();
  private readonly router = inject(Router);

  protected status = (c: PaCase) => caseStatus(c.status);
  protected overall = (c: PaCase) => overallResult(c.overall);
  protected ago = (c: PaCase) => timeAgo(c.updated_at);

  protected open(id: string): void {
    this.router.navigate(['/cases', id]);
  }
}
