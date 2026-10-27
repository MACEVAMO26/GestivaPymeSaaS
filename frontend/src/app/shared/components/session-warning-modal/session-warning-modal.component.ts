import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SessionTimeoutService } from '../../../services/session-timeout.service';

@Component({
  selector: 'app-session-warning-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './session-warning-modal.component.html',
  styleUrl: './session-warning-modal.component.scss'
})
export class SessionWarningModalComponent {
  public sessionTimeout = inject(SessionTimeoutService);

  formatTime(seconds: number | null): string {
    if (seconds === null || seconds === undefined) return '05:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  keepSession(): void {
    this.sessionTimeout.keepSessionAlive();
  }

  logout(): void {
    this.sessionTimeout.logoutNow();
  }
}
