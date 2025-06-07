import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-game-text',
  templateUrl: './game-text.component.html',
  styleUrls: ['./game-text.component.scss'],
})
export class GameTextComponent {
  @Input() remainingText: string;
  @Input() correctText: string;
}
