import { Component } from '@angular/core';
import { UserService } from 'src/app/services/user/user.service';
import { BackendAPIService } from 'src/app/services/api/backend-api.service';
import { GameService } from 'src/app/services/game/game.service';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent {
  constructor(
    private userService: UserService,
    private backendAPIService: BackendAPIService,
    private gameService: GameService
  ) {}

  getSession(): void {
    this.userService.getUser().subscribe((user) => {});
  }

  ngOnInit(): void {
    this.userService.getUser().subscribe((user) => {});
  }
}
