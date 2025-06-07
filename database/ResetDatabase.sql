CREATE DATABASE IF NOT EXISTS test;
USE test;

DROP TABLE IF EXISTS `GameProgress`;

DROP TABLE IF EXISTS `User_Sessions`;

CREATE TABLE User_Sessions 
(
  id INT PRIMARY KEY AUTO_INCREMENT,
  display_name NCHAR(255) DEFAULT (CONCAT('User ', CAST((FLOOR(RAND() * 9999)) AS NCHAR(4)))),
  session_id NCHAR(16) NOT NULL UNIQUE,
  created DATETIME DEFAULT (NOW())
);

/*
  gamemode Mappings:
    0: GM_NORMAL
*/

/*
  gamestate Mappings:
    0: pregame
    1: inprogress
*/
DROP TABLE IF EXISTS `LobbyPassage`;

DROP TABLE IF EXISTS `Lobbies`;

CREATE TABLE Lobbies 
(
  id INT PRIMARY KEY AUTO_INCREMENT,
  lobby_name NCHAR(255),
  lobby_id NCHAR(16) NOT NULL UNIQUE,
  gamemode INT NOT NULL DEFAULT (0),
  gamestate INT NOT NULL DEFAULT (0),
  owner_id NCHAR(16)
);

/*
  lobby_role Mappings:
    0: player
    1: spectator
*/

DROP TABLE IF EXISTS `Session_X_Lobby`;

CREATE TABLE Session_X_Lobby 
(
  id INT PRIMARY KEY AUTO_INCREMENT,
  lobby_id NCHAR(16) NOT NULL,
  session_id NCHAR(16) NOT NULL UNIQUE,
  lobby_role INT NOT NULL DEFAULT (0) 
);

DROP TABLE IF EXISTS `Passages`;

CREATE TABLE Passages 
(
  id INT PRIMARY KEY AUTO_INCREMENT,
  passage VARCHAR(8000) NOT NULL
);

-- Code Snippets taken from https://twitter.com/BitMEXResearch/status/1710739315611877533
INSERT INTO Passages (passage) VALUES ("def _getChange() -> Decimal:\n\tdaily_volume = current_session().query( func.sum( Trade.size * Trade.price)).filter(\n\t\tTrade.created_at > datetime.now() - timedelta( days=1)).scalar() or Decimal()\n\treturn f2d( numpy.random.normal( 7500, 3000)) * daily_volume / Decimal('1e9')");
INSERT INTO Passages (passage) VALUES ("def update_public_insurance_fund():\n\tchange = _get_change()\n\tsess = current_session()\n\tpublic_insurance_fund = PublicInsuranceFund.get( ses)\n\tsess.add( PublicInsuranceFund( public_insurance_fund = public_insurance_fund, size = change))\n\tpublic_insurance_fund.size += change\n\tsess.commit()");
-- Code Snippet taken from https://www.geeksforgeeks.org/insertion-sort/
INSERT INTO Passages (passage) VALUES ("def insertionSort(arr):\n\tfor i in range(1, len(arr)):\n\t\tkey = arr[i]\n\t\tj = i-1\n\t\twhile j >= 0 and key < arr[j] :\n\t\t\tarr[j + 1] = arr[j]\n\t\t\tj -= 1\n\t\tarr[j + 1] = key");

DROP TABLE IF EXISTS `Sessions`;

CREATE TABLE LobbyPassage 
(
  id INT PRIMARY KEY AUTO_INCREMENT,
  lobby_id NCHAR(16) NOT NULL UNIQUE,
  passage_id INT NOT NULL,
  FOREIGN KEY (lobby_id) REFERENCES Lobbies(lobby_id),
  FOREIGN  KEY (passage_id) REFERENCES Passages(id)
);

CREATE TABLE GameProgress
(
  id INT PRIMARY KEY AUTO_INCREMENT,
  lobby_id NCHAR(16) NOT NULL,
  session_id NCHAR(16) NOT NULL,
  text_typed VARCHAR(16000) DEFAULT(''),
  progress INT DEFAULT(0),
  FOREIGN KEY (lobby_id) REFERENCES Lobbies(lobby_id),
  FOREIGN KEY (session_id) REFERENCES User_Sessions(session_id)
);