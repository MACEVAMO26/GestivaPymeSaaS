import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IaStateService {
  private showTutorialSource = new Subject<void>();
  showTutorial$ = this.showTutorialSource.asObservable();

  triggerTutorial() {
    this.showTutorialSource.next();
  }
}
