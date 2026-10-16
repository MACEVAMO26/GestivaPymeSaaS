import { Directive, HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';

@Directive({
  selector: '[appVolver]',
  standalone: true
})
export class VolverDirective {
  private location = inject(Location);

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.preventDefault();
    this.location.back();
  }
}
