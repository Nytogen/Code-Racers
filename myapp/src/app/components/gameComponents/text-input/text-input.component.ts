import {
  Component,
  Output,
  EventEmitter,
  Input,
  HostListener,
} from '@angular/core';

import {
  style,
  transition,
  trigger,
  animate,
  keyframes,
} from '@angular/animations';

const shake = trigger('shake', [
  transition(
    'true <=> false',
    animate(
      '300ms',
      keyframes([
        style({
          transform: 'translateX(4px)',
        }),
        style({
          transform: 'translateX(-4px)',
        }),
        style({
          transform: 'translateX(4px)',
        }),
      ])
    )
  ),
]);

@Component({
  selector: 'app-text-input',
  templateUrl: './text-input.component.html',
  styleUrls: ['./text-input.component.scss'],
  animations: [shake],
})
export class TextInputComponent {
  inputText: string = '';
  empty: boolean = true;
  showError: boolean = false;
  shake: boolean = null;
  @Input() isDisabled: boolean = false;
  @Input() currentText: string;
  @Output() correctWordEvent = new EventEmitter<string>();
  @Output() keyStrokeEvent = new EventEmitter<string>();

  triggerShake() {
    this.shake = !this.shake;
  }

  ngOnInit() {
    this.shake = false;
  }

  checkWord() {
    this.empty = false;
    var convertedText = JSON.stringify(this.currentText);
    convertedText = convertedText.substring(1, convertedText.length - 1);

    //Empty Input
    if (this.inputText.trim() == '') {
      this.empty = true;
      this.emptyClear();
      return;
    }
    //Same string
    else if (
      this.inputText.trim() == convertedText.substring(0, this.inputText.length)
    ) {
      //Not a word/haven't reached the end
      if (
        convertedText[this.inputText.length] != ' ' &&
        convertedText.length != this.inputText.length
      ) {
        //Reach end of line/ we reached an escape char
        if (convertedText[this.inputText.length] == '\\') {
          var escapeChar = 0;
          while (
            convertedText[this.inputText.length + escapeChar * 2] == '\\'
          ) {
            escapeChar += 1;
          }

          this.inputText = convertedText.substring(
            0,
            this.inputText.length + escapeChar * 2
          );

          this.showError = false;
          this.correctWordEvent.emit(this.inputText.trim());
          this.empty = true;
          this.emptyClear();
        } else {
          this.showError = true;
          this.triggerShake();
        }
      } else if (this.inputText.split(' ').length - 1 != 0) {
        this.showError = true;
        this.triggerShake();
      } else {
        this.showError = false;
        this.correctWordEvent.emit(this.inputText.trim());
        this.empty = true;
        this.emptyClear();
      }
    } else {
      this.showError = true;
      this.triggerShake();
    }
  }

  updateTypedText() {
    this.keyStrokeEvent.emit(this.inputText);
  }

  emptyClear() {
    if (this.empty) {
      this.inputText = '';
    }
  }
}
