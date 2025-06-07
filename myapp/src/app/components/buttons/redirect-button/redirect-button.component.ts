import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-redirect-button',
  templateUrl: '../button/button.component.html',
  styleUrls: ['./redirect-button.component.scss'],
})
export class RedirectButtonComponent extends ButtonComponent {
  @Input() redirectTo: string;

  constructor(private router: Router) {
    super();
  }

  override onClick() {
    this.router.navigate([this.redirectTo]);
  }
}
