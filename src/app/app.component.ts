import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ConnectionState } from './core/api.service';
import { IconComponent } from './shared/icon.component';
import { ToastsComponent } from './shared/toasts.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, ToastsComponent],
  template: `
    <a class="skip-link" href="#main">Skip to content</a>

    <header class="topbar">
      <div class="brand">
        <div class="brand-mark"><app-icon name="heart-pulse" [size]="32" /></div>
        <div>
          <div class="brand-title">Prior Authorization Assistant</div>
          <div class="brand-sub">AI-Powered · FHIR R4 · MCP Server · Azure AI Foundry</div>
        </div>
      </div>
      <p class="brand-tagline">
        Streamline prior authorization with real-time policy lookup, clinical context and AI assistance.
      </p>
    </header>

    <div class="shell">
      <nav class="sidebar" aria-label="Main">
        <ul class="nav-list">
          <li>
            <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
              <app-icon name="home" [size]="20" /><span>Dashboard</span>
            </a>
          </li>
          <li>
            <a routerLink="/new" routerLinkActive="active">
              <app-icon name="file-plus" [size]="20" /><span>New request</span>
            </a>
          </li>
          <li>
            <a routerLink="/cases" routerLinkActive="active">
              <app-icon name="folder" [size]="20" /><span>Cases</span>
            </a>
          </li>
          <li>
            <a routerLink="/policies" routerLinkActive="active">
              <app-icon name="search" [size]="20" /><span>Policy search</span>
            </a>
          </li>
        </ul>

        <div class="sidebar-brand">
          <span class="powered-by">Powered by</span>
          <img src="logo-dark.png" />
        </div>
      </nav>

      <main class="content" id="main">
        <router-outlet />
      </main>
    </div>

    <app-toasts />
  `,
})
export class AppComponent {
  private readonly conn = inject(ConnectionState);
  protected readonly dot = computed(() => {
    const o = this.conn.online();
    return o === null ? 'unknown' : o ? 'ok' : 'down';
  });
  protected readonly stateText = computed(() => {
    const o = this.conn.online();
    return o === null ? 'Checking…' : o ? 'Connected' : 'Unreachable';
  });
}
