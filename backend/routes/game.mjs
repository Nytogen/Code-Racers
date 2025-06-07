import express, { text } from "express";
import { createPool } from "mysql2";
import session from "express-session";

import { dbConfig } from "../config.mjs";

export const gameRouter = express.Router();
gameRouter.use(express.json());

// MySQL Pool so we don't have to recreate new connections every call
const pool = createPool({
  host: dbConfig.host,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  port: dbConfig.port,
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10, // max idle connections, the default value is the same as `connectionLimit`
  idleTimeout: 60000, // idle connections timeout, in milliseconds, the default value 60000
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
}).promise();

const gameLastAccessed = {};
const gamesDeathRow = {};

async function reinitializeGameLastAccessed() {
  let [lobbies] = await pool.execute(
    `SELECT lobby_id, gamestate
     FROM Lobbies
     WHERE gamestate = 1`
  );

  for (let lobby of lobbies) {
    gameLastAccessed[lobby.lobby_id] = new Date();
  }
}

async function deleteOngoingGames(lobbies) {
  await pool.query(
    `DELETE 
      FROM LobbyPassage
      WHERE lobby_id in (?)`,
    [lobbies]
  );

  await pool.query(
    `DELETE 
      FROM GameProgress
      WHERE lobby_id in (?)`,
    [lobbies]
  );

  await pool.query(
    `DELETE 
      FROM Session_X_Lobby
      WHERE lobby_id in (?)`,
    [lobbies]
  );

  await pool.query(
    `DELETE 
      FROM Lobbies
      WHERE lobby_id in (?)`,
    [lobbies]
  );
}

async function cleanStaleGames() {
  const now = new Date().getTime();
  const staleGames = [];

  // Check the last time a game was accessed for updates
  for (let [lobby_id, lastAccessed] of Object.entries(gameLastAccessed)) {
    if (now - lastAccessed.getTime() >= 1000 * 60 * 5) {
      staleGames.push(lobby_id);
    }
  }

  // Delete those lobbies and associated records
  if (staleGames.length != 0) {
    deleteOngoingGames(staleGames);
  }
}

reinitializeGameLastAccessed();
setInterval(cleanStaleGames, 1000 * 60 * 2);

gameRouter.post("/:id/progress", async function (req, res, next) {
  try {
    const lobby_id = req.params.id;

    const [existingProgress] = await pool.execute(
      "SELECT id FROM GameProgress WHERE lobby_id = ?",
      [lobby_id]
    );

    if (existingProgress[0]) {
      return res
        .status(409)
        .json({ err: "progress already generated for lobby" });
    }

    const [players] = await pool.execute(
      `SELECT session_id 
       FROM Session_X_Lobby 
       WHERE lobby_id = ? AND lobby_role = 0`,
      [lobby_id]
    );

    for (let player of players) {
      await pool.execute(
        `INSERT INTO GameProgress (lobby_id, session_id) VALUES (?, ?)`,
        [lobby_id, player.session_id]
      );
    }

    return res.status(200).json("created new game progress");
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

gameRouter.get("/:id/progress", async function (req, res, next) {
  try {
    const lobby_id = req.params.id;

    const [progress] = await pool.execute(
      `SELECT GameProgress.session_id, text_typed, progress, display_name
       FROM GameProgress 
        INNER JOIN User_Sessions
        ON User_Sessions.session_id = GameProgress.session_id
       WHERE lobby_id = ?`,
      [lobby_id]
    );

    return res.status(200).json(progress);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

gameRouter.patch("/:id/progress", async function (req, res, next) {
  try {
    const lobby_id = req.params.id;
    const { text_typed, progress } = req.body;
    const session_id = req.session.session_id;

    gameLastAccessed[lobby_id] = new Date();

    var modified_text = JSON.stringify(text_typed);
    modified_text = modified_text.substring(1, modified_text.length - 1);

    const [currentProgress] = await pool.execute(
      `SELECT GameProgress.session_id, text_typed, progress, display_name
       FROM GameProgress 
        INNER JOIN User_Sessions
        ON User_Sessions.session_id = GameProgress.session_id
       WHERE lobby_id = ? AND GameProgress.session_id = ?`,
      [lobby_id, session_id]
    );

    const [passage] = await pool.execute(
      `SELECT * FROM LobbyPassage JOIN Passages ON LobbyPassage.passage_id=Passages.id WHERE lobby_id = ?`,
      [lobby_id]
    );

    if (
      currentProgress.length === 0 ||
      passage === undefined ||
      passage.length === 0
    ) {
      return res.status(404).json({
        err: "lobby does not exist",
        completedText: "",
      });
    }

    var convertedText = JSON.stringify(passage[0].passage);
    convertedText = convertedText.substring(1, convertedText.length - 1);

    var currentProg = JSON.stringify(currentProgress[0].text_typed);
    currentProg = currentProg.substring(1, currentProg.length - 1);

    var userTyped = convertedText
      .substring(currentProg.length, modified_text.length)
      .trim();

    if (userTyped.split(" ").length != 1) {
      if (modified_text[text_typed.length - 1] != "\\") {
        return res.status(400).json({
          err: "too many words sent",
          completedText: currentProgress[0].text_typed,
        });
      }
    }

    if (modified_text != convertedText.substring(0, modified_text.length)) {
      return res.status(400).json({
        err: "text typed is not correct",
        completedText: currentProgress[0].text_typed,
      });
    }

    if (convertedText[modified_text.length] != " ") {
      if (convertedText.length != modified_text.length) {
        if (convertedText[modified_text.length - 2] != "\\") {
          return res.status(400).json({
            err: "finish text",
            completedText: currentProgress[0].text_typed,
          });
        }
      }
    }

    modified_text = modified_text.replaceAll("\\n", "\n");
    modified_text = modified_text.replaceAll("\\t", "\t");

    await pool.execute(
      `UPDATE GameProgress 
       SET progress = ?,
        text_typed = ?
       WHERE lobby_id = ? AND session_id = ?`,
      [progress, modified_text, lobby_id, session_id]
    );

    const [progressUpdated] = await pool.execute(
      `SELECT GameProgress.session_id, text_typed, progress, display_name
       FROM GameProgress 
        INNER JOIN User_Sessions
        ON User_Sessions.session_id = GameProgress.session_id
       WHERE lobby_id = ?`,
      [lobby_id]
    );

    if (!progressUpdated[0]) {
      return res.status(404).json({ err: "record not found" });
    } else {
      return res.status(200).json(progressUpdated[0]);
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

gameRouter.post("/generateRandomPassage/:id", async function (req, res, next) {
  let numPassages;

  try {
    const lobby_id = req.params.id;

    let selectedPassage;
    let [passageDupe] = await pool.execute(
      `SELECT * FROM LobbyPassage  WHERE lobby_id=?`,
      [lobby_id]
    );
    //if created already
    if (passageDupe[0]) {
      return res
        .status(409)
        .json({ err: "passage already generated for lobby" });
    }

    //Get num passages
    const [passageCount] = await pool.execute(
      `SELECT COUNT(*) AS numPassages FROM Passages`
    );

    numPassages = passageCount[0]["numPassages"];

    //Generate random passage
    let passageId = Math.floor(Math.random() * numPassages) + 1;

    [selectedPassage] = await pool.execute(
      `SELECT * FROM Passages WHERE id=?`,
      [passageId]
    );

    //Post it to database
    await pool.execute(
      `INSERT INTO LobbyPassage (lobby_id, passage_id) VALUES (?, ?)`,
      [lobby_id, selectedPassage[0]["id"]]
    );

    //intialize a date so we can delete it later if game is idle
    gameLastAccessed[lobby_id] = new Date();

    return res.status(200).json("created new passage for lobby");
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

gameRouter.get("/getPassage/:id", async function (req, res, next) {
  try {
    const lobby_id = req.params.id;

    let [lobbyPassage] = await pool.execute(
      `SELECT * FROM LobbyPassage INNER JOIN Passages ON Passages.id = LobbyPassage.passage_id WHERE lobby_id=?`,
      [lobby_id]
    );

    if (!lobbyPassage[0]) {
      return res.status(404).json({ err: "no passage generated for lobby" });
    }

    return res.status(200).json(lobbyPassage[0]["passage"]);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

gameRouter.get("/userRole/:id", async function (req, res, next) {
  try {
    const session_id = req.session.session_id;
    const lobby_id = req.params.id;

    let [user_role] = await pool.execute(
      `SELECT lobby_role FROM Session_X_Lobby WHERE session_id = ? AND lobby_id = ?`,
      [session_id, lobby_id]
    );

    if (!user_role[0]) {
      return res
        .status(404)
        .json({ err: "user does not exist or is in a lobby" });
    }

    return res.status(200).json(user_role[0]["lobby_role"]);
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});

gameRouter.get("/winner/:id/player/:playerid", async function (req, res, next) {
  try {
    const lobby_id = req.params.id;
    const player_id = req.params.playerid;

    let [user_role] = await pool.execute(
      `SELECT progress FROM GameProgress WHERE session_id = ? AND lobby_id = ?`,
      [player_id, lobby_id]
    );

    if (!user_role[0]) {
      return res
        .status(404)
        .json({ err: "user does not exist or is in a lobby" });
    }

    if (user_role[0].progress == 100) {
      if (gamesDeathRow[lobby_id] === undefined) {
        gamesDeathRow[lobby_id] = lobby_id;
        // Delete the game and lobby records after 2 minutes
        setTimeout(async () => {
          await deleteOngoingGames([lobby_id]);
          delete gamesDeathRow[lobby_id];
          delete gameLastAccessed[lobby_id];
        }, 1000 * 60 * 2);
      }
      return res.status(200).json(player_id + " has won");
    } else {
      return res.status(400).json({
        err:
          player_id +
          " has not won progress = " +
          user_role[0].progress.toString(),
      });
    }
  } catch (err) {
    console.log(err);
    return res.status(400).json({ err: err });
  }
});
