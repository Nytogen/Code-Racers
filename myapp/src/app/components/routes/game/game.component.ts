import { Component, HostListener } from '@angular/core';
import { GameService } from 'src/app/services/game/game.service';
import { ActivatedRoute } from '@angular/router';
import { role_player } from 'src/app/mappings/lobby';
import { LobbyService } from 'src/app/services/lobby/lobby.service';
import { UserService } from 'src/app/services/user/user.service';
import { DataConnection, Peer } from 'peerjs';
import { Router } from '@angular/router';
import { user } from 'src/app/mappings/users';
import {
  message,
  KEY_STROKE,
  UPDATE_TEXT,
  playerInfo,
} from 'src/app/mappings/game';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
})
export class GameComponent {
  playerdata: playerInfo = {
    session_id: '',
    name: '',
    progress: 0,
    remainingText: '',
    correctText: '',
    currTexted: '',
  };
  fulltext: string;
  gametext: string;
  correctText: string = '';
  totalProgress: number = 0;
  haveWinner: boolean = false;

  overlayText: string = '';
  lobby_id: string;
  playerName: string;
  isPlayer: boolean;
  playerProgress = new Map<string, playerInfo>();

  peer: Peer;
  connections: { [key: string]: DataConnection } = {};

  constructor(
    private gameService: GameService,
    private route: ActivatedRoute,
    private lobbyService: LobbyService,
    private userService: UserService,
    private router: Router
  ) {}

  getGameProgress() {
    this.gameService.getGameProgress(this.lobby_id).subscribe((result) => {
      for (let player of result) {
        var remainingText: string;

        if (player.text_typed == '') {
          remainingText = this.fulltext;
        } else {
          if (this.fulltext[player.text_typed.length] == ' ') {
            remainingText = this.fulltext.substring(
              player.text_typed.length + 1,
              this.fulltext.length
            );
          } else {
            remainingText = this.fulltext.substring(
              player.text_typed.length,
              this.fulltext.length
            );
          }
        }

        if (this.isPlayer && player.session_id === this.playerdata.session_id) {
          this.playerdata.progress = player.progress;
          this.playerdata.correctText = player.text_typed;
          this.playerdata.remainingText = remainingText;
          this.playerdata.name = player.display_name;

          this.checkWinner(this.playerdata);
        } else {
          let playerData: playerInfo = {
            session_id: player.session_id,
            progress: player.progress,
            remainingText: remainingText,
            name: player.display_name,
            correctText: player.text_typed,
            currTexted: '',
          };

          this.playerProgress.set(player.session_id, playerData);
          this.checkWinner(playerData);
        }
      }
    });
  }

  getAndSetPassage(callback: Function) {
    this.gameService.getPassage(this.lobby_id).subscribe((result) => {
      this.fulltext = result;
      this.playerdata.remainingText = result;
      callback();
    });
  }

  getUserRole(callback: Function) {
    this.gameService.getRole(this.lobby_id).subscribe({
      next: (result) => {
        this.isPlayer = result == role_player;
        callback();
      },
      error: (error) => {
        if (error.status === 404) {
          this.router.navigate(['/lobby/' + this.lobby_id]);
        }
      },
    });
  }

  connectToLobby() {
    this.lobbyService.getLobby(this.lobby_id).subscribe((result) => {
      this.connectToUsers(result.players);
      if (this.isPlayer) {
        this.connectToUsers(result.spectators);
      }
    });
  }

  redirectToLobbyBrowser() {
    this.router.navigate(['/lobbyBrowser']);
  }

  ngOnInit() {
    this.lobby_id = this.route.snapshot.paramMap.get('game_id');

    this.getUserRole(() => {
      this.userService.getUser().subscribe((user) => {
        this.playerdata.name = user.display_name;
        this.playerdata.session_id = user.session_id;
        this.playerName = user.display_name + '(You)';
        this.createPeer(user.session_id, this.connectToLobby.bind(this));
        this.getAndSetPassage(this.getGameProgress.bind(this));
      });
    });
  }

  keyPressAsPlayer(currText: string) {
    if (!this.isPlayer) {
      return;
    }
    let playerData: message = {
      session_id: this.playerdata.session_id,
      progress: this.playerdata.progress,
      remainingText: this.playerdata.remainingText,
      name: this.playerdata.name,
      correctText: this.playerdata.correctText,
      messageType: KEY_STROKE,
      currTexted: currText,
    };

    this.broadcastToConnections(playerData);
  }

  updateCorrectText(correctWord: string) {
    if (!this.isPlayer) {
      return;
    }
    if (this.playerdata.correctText == '') {
      this.playerdata.correctText = correctWord;
    } else {
      if (this.fulltext[this.playerdata.correctText.length] == ' ') {
        this.playerdata.correctText =
          this.playerdata.correctText + ' ' + correctWord;
      } else {
        this.playerdata.correctText = this.playerdata.correctText + correctWord;
      }
    }

    this.playerdata.correctText = this.playerdata.correctText.replaceAll(
      '\\n',
      '\n'
    );
    this.playerdata.correctText = this.playerdata.correctText.replaceAll(
      '\\t',
      '\t'
    );

    if (this.fulltext[this.playerdata.correctText.length] == ' ') {
      this.playerdata.remainingText = this.fulltext.substring(
        this.playerdata.correctText.length + 1,
        this.fulltext.length
      );
    } else {
      this.playerdata.remainingText = this.fulltext.substring(
        this.playerdata.correctText.length,
        this.fulltext.length
      );
    }

    this.playerdata.progress = Math.round(
      (this.playerdata.correctText.length / this.fulltext.length) * 100
    );

    this.gameService
      .updateGameProgress(
        this.lobby_id,
        this.playerdata.correctText,
        this.playerdata.progress
      )
      .subscribe({
        error: (err) => {
          console.log(err);

          if (err.status === 404) {
            this.overlayText = 'This game has been deleted due to inactivity';
            this.haveWinner = true;
            this.broadcastToConnections(-1);
            this.disconnectPeer();
            return;
          }

          this.playerdata.correctText = err.error.completedText;

          if (this.playerdata.correctText == '') {
            this.playerdata.remainingText = this.fulltext;
          } else {
            if (this.fulltext[this.playerdata.correctText.length] == '') {
              this.playerdata.remainingText = this.fulltext.substring(
                this.playerdata.correctText.length + 1,
                this.fulltext.length
              );
            } else {
              this.playerdata.remainingText = this.fulltext.substring(
                this.playerdata.correctText.length,
                this.fulltext.length
              );
            }
          }

          this.playerdata.progress = Math.round(
            (this.playerdata.correctText.length / this.fulltext.length) * 100
          );

          let playerData: message = {
            session_id: this.playerdata.session_id,
            progress: this.playerdata.progress,
            remainingText: this.playerdata.remainingText,
            name: this.playerdata.name,
            correctText: this.playerdata.correctText,
            messageType: UPDATE_TEXT,
            currTexted: '',
          };
          this.broadcastToConnections(playerData);
        },
        next: (result) => {
          if (
            this.playerdata.correctText == this.fulltext &&
            !this.haveWinner
          ) {
            this.checkWinner(this.playerdata);
            let playerData: message = {
              session_id: this.playerdata.session_id,
              progress: this.playerdata.progress,
              remainingText: this.playerdata.remainingText,
              name: this.playerdata.name,
              correctText: this.playerdata.correctText,
              messageType: UPDATE_TEXT,
              currTexted: '',
            };
            this.broadcastToConnections(playerData);
          }
        },
      });
  }

  ngOnDestroy() {
    this.disconnectPeer();
  }

  /* Taken from https://stackoverflow.com/questions/47384952/directive-to-disable-cut-copy-and-paste-function-for-textbox-using-angular2 */
  @HostListener('paste', ['$event']) blockPaste(e: KeyboardEvent) {
    e.preventDefault();
  }
  @HostListener('copy', ['$event']) blockCopy(e: KeyboardEvent) {
    e.preventDefault();
  }
  @HostListener('cut', ['$event']) blockCut(e: KeyboardEvent) {
    e.preventDefault();
  }
  /* Taken from https://stackoverflow.com/questions/47384952/directive-to-disable-cut-copy-and-paste-function-for-textbox-using-angular2 */

  addConnToList(conn: DataConnection) {
    if (this.connections[conn.peer] != undefined) {
      this.connections[conn.peer].close();
    }
    this.connections[conn.peer] = conn;
  }

  checkWinner(playerData: playerInfo) {
    if (playerData.correctText == this.fulltext && !this.haveWinner) {
      this.gameService
        .checkWinner(this.lobby_id, playerData.session_id)
        .subscribe({
          next: (result) => {
            this.haveWinner = true;
            this.overlayText = playerData.name + ' wins!';
          },
          error: (error) => {
            console.log(error);
          },
        });
    }
  }

  onDataIncoming(session_id: string, data: any) {
    if (data === -1) {
      this.overlayText = 'This game has been deleted due to inactivity';
      this.haveWinner = true;
      this.disconnectPeer();
      return;
    }

    let playerData: playerInfo = {
      session_id: session_id,
      progress: data.progress,
      remainingText: data.remainingText,
      name: data.name,
      correctText: data.correctText,
      currTexted: data.currTexted,
    };

    this.playerProgress.set(session_id, playerData);

    if (data.messageType == UPDATE_TEXT) {
      this.checkWinner(playerData);
    }
  }

  createPeer(session_id: string, callback?: Function) {
    if (this.peer != undefined) {
      if (callback != undefined) callback();
      return;
    }

    this.peer = new Peer(session_id);

    // In case we need to wait for the peer to finish creating
    this.peer.on('open', (id) => {
      if (callback != undefined) callback();
    });

    this.peer.on('connection', (conn) => {
      this.addConnToList(conn);

      conn.on('data', (data) => {
        this.onDataIncoming(conn.peer, data);
      });
      conn.on('close', () => {
        //define what to do when either u or the other person closes idk
        conn.close();
        delete this.connections[conn.peer];
      });
    });

    this.peer.on('error', (err) => {
      console.log(err);
    });
  }

  disconnectPeer() {
    if (this.peer != undefined) {
      this.peer.disconnect();
    }
  }

  connectToUsers(users: user[]) {
    users.forEach((user) => {
      if (this.connections[user.session_id] != undefined) {
        return;
      }

      if (user.session_id === this.peer.id) {
        return;
      }

      let conn = this.peer.connect(user.session_id);

      conn.on('open', () => {
        this.addConnToList(conn);

        conn.on('data', (data) => {
          this.onDataIncoming(conn.peer, data);
        });

        conn.on('close', () => {
          //define what to do when either u or the other person closes idk
          conn.close();
          delete this.connections[conn.peer];
        });
      });
    });
  }

  broadcastToConnections(data: any) {
    Object.entries(this.connections).forEach(([session_id, connection]) => {
      connection.send(data);
    });
  }
}
