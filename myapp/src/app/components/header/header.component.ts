import { Component, Output, EventEmitter } from '@angular/core';
import { UserService } from 'src/app/services/user/user.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  @Output() linkClicked = new EventEmitter();
  display_name: string;
  constructor(
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.userService.getUser().subscribe((user) => {
      this.display_name=user.display_name;
    });
  }

  onClick() {
    this.linkClicked.emit();
  }
}
