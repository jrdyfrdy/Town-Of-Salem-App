const { ROLES, TEAM_MAFIA, TEAM_TOWN, TEAM_NEUTRAL } = require("./roles");

class GameEngine {
  constructor(io) {
    this.io = io;
    this.players = {}; // map of socketId -> player object
    this.phase = "LOBBY"; // LOBBY, PRE_GAME, NIGHT, DAY_ANNOUNCEMENT, DAY_DISCUSSION, DAY_VOTING, GAME_OVER
    this.dayCount = 0;
    this.timer = null;
    this.timeLeft = 0;
    this.isPaused = false;

    this.nightActions = {}; // map of playerId -> targetId
    this.dayVotes = {}; // map of voterId -> targetId
  }

  addPlayer(socketId, username) {
    if (this.phase !== "LOBBY") {
      // Add as a spectator if joining mid-game or game over
      this.players[socketId] = {
        id: socketId,
        username: username + " (Spectator)",
        role: null,
        team: null,
        isAlive: false,
        isBlackmailed: false,
        isFramed: false,
        cultMember: false,
        veteranAlerts: 0,
        vigilanteBullets: 0,
        isRevealedMayor: false,
        votes: 0,
      };
      return true;
    }

    this.players[socketId] = {
      id: socketId,
      username,
      role: null,
      team: null,
      isAlive: true,
      isBlackmailed: false,
      isFramed: false,
      cultMember: false,
      veteranAlerts: 3,
      vigilanteBullets: 3,
      isRevealedMayor: false,
      votes: 0, // for day voting
    };
    return true;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
  }

  resetGame() {
    if (this.timer) clearInterval(this.timer);
    this.phase = "LOBBY";
    this.dayCount = 0;
    this.nightActions = {};
    this.dayVotes = {};
    this.timeLeft = 0;
    this.isPaused = false;

    // Reset all current players to Lobby constraints
    Object.values(this.players).forEach((p) => {
      p.role = null;
      p.team = null;
      p.isAlive = true;
      p.isBlackmailed = false;
      p.isFramed = false;
      p.cultMember = false;
      p.veteranAlerts = 3;
      p.vigilanteBullets = 3;
      p.isRevealedMayor = false;
      p.votes = 0;
      p.executionerTarget = null;

      // Strip "(Spectator)" tag if they joined late
      if (p.username.endsWith(" (Spectator)")) {
        p.username = p.username.replace(" (Spectator)", "");
      }
    });

    this.io.emit(
      "system_message",
      "Game has been reset to Lobby by the Moderator.",
    );
    this.broadcastState();
  }

  startPreGame(rolesList) {
    this.phase = "PRE_GAME";
    this.dayCount = 1;
    // assign roles (simplified for now)
    const playerIds = Object.keys(this.players);
    if (playerIds.length !== rolesList.length) {
      console.error(
        `Role list length mismatch. Expected ${playerIds.length}, got ${rolesList.length}`,
      );
    }

    // Shuffle and assign
    let shuffledRoles = [...rolesList].sort(() => Math.random() - 0.5);
    playerIds.forEach((id, index) => {
      const roleStr = shuffledRoles[index] || "TOWNSPERSON";
      const roleData = ROLES[roleStr] || ROLES["TOWNSPERSON"];
      this.players[id].role = roleData;
      this.players[id].team = roleData.team;
    });

    // Handle Pre-game logic: Executioner target, Mafia know each other
    this.assignExecutionerTargets();

    this.broadcastState();
    this.startTimer(10, "NIGHT"); // 10 seconds pre-game
  }

  assignExecutionerTargets() {
    const townIds = Object.values(this.players)
      .filter((p) => p.team === TEAM_TOWN)
      .map((p) => p.id);

    Object.values(this.players).forEach((p) => {
      if (p.role.name === "Executioner" && townIds.length > 0) {
        // Assign random town as target
        const targetId = townIds[Math.floor(Math.random() * townIds.length)];
        p.executionerTarget = targetId;
      }
    });
  }

  startTimer(seconds, nextPhase) {
    if (this.timer) clearInterval(this.timer);
    this.timeLeft = seconds;

    this.timer = setInterval(() => {
      if (this.isPaused) return;

      this.timeLeft -= 1;
      this.io.emit("timer_update", this.timeLeft);

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.transitionPhase(nextPhase);
      }
    }, 1000);
  }

  transitionPhase(nextPhase) {
    if (this.phase === "DAY_VOTING") {
      this.resolveDayVoting();
      if (this.phase === "GAME_OVER") return;
    }

    this.phase = nextPhase;
    this.io.emit("phase_change", this.phase);

    switch (nextPhase) {
      case "NIGHT":
        this.nightActions = {};
        this.resetDayStatuses();
        this.startTimer(30, "DAY_ANNOUNCEMENT");
        break;
      case "DAY_ANNOUNCEMENT":
        this.resolveNight();
        if (this.phase !== "GAME_OVER") this.startTimer(10, "DAY_DISCUSSION");
        break;
      case "DAY_DISCUSSION":
        this.startTimer(60, "DAY_VOTING");
        break;
      case "DAY_VOTING":
        this.dayVotes = {};
        this.startTimer(30, "NIGHT");
        break;
    }

    if (this.phase !== "GAME_OVER") {
      this.broadcastState();
    }
  }

  resetDayStatuses() {
    Object.values(this.players).forEach((p) => {
      p.isBlackmailed = false;
      p.isFramed = false;
      p.votes = 0;
    });
  }

  handleModAction(data) {
    if (data.action === "pause") {
      this.isPaused = !this.isPaused;
      this.io.emit(
        "system_message",
        this.isPaused ? "Game Paused by Moderator." : "Game Resumed.",
      );
    } else if (data.action === "skip") {
      if (this.timer) clearInterval(this.timer);
      this.timeLeft = 0;
      if (this.phase === "NIGHT") this.transitionPhase("DAY_ANNOUNCEMENT");
      else if (this.phase === "DAY_ANNOUNCEMENT")
        this.transitionPhase("DAY_DISCUSSION");
      else if (this.phase === "DAY_DISCUSSION")
        this.transitionPhase("DAY_VOTING");
      else if (this.phase === "DAY_VOTING") this.transitionPhase("NIGHT");
      else if (this.phase === "PRE_GAME") this.transitionPhase("NIGHT");
    } else if (data.action === "reset") {
      this.resetGame();
    }
  }

  handleChatMessage(socketId, text) {
    const player = this.players[socketId];

    if (!player) {
      // Must be Mod sending a message
      this.io.emit("chat_message", { sender: "[Moderator]", text });
      return;
    }

    if (!player.isAlive) return; // Dead chat not supported yet
    if (player.isBlackmailed && this.phase !== "LOBBY") return;

    if (this.phase === "NIGHT") {
      if (player.team === TEAM_MAFIA) {
        const mafiaIds = Object.values(this.players)
          .filter((p) => p.team === TEAM_MAFIA)
          .map((p) => p.id);
        mafiaIds.forEach((id) => {
          this.io
            .to(id)
            .emit("chat_message", {
              sender: `[Mafia] ${player.username}`,
              text,
            });
        });
      }
      return;
    }

    // Otherwise standard broadcast
    this.io.emit("chat_message", { sender: player.username, text });
  }

  submitDayVote(socketId, targetId) {
    if (this.phase !== "DAY_VOTING") return;
    const voter = this.players[socketId];
    const target = this.players[targetId];
    if (!voter || !voter.isAlive || !target || !target.isAlive) return;

    this.dayVotes[socketId] = targetId;
    this.io
      .to(socketId)
      .emit("system_message", `You voted for ${target.username}.`);
  }

  resolveDayVoting() {
    console.log("Resolving day votes...", this.dayVotes);
    if (Object.keys(this.dayVotes).length === 0) {
      this.io.emit(
        "system_message",
        "No one was voted up today. Town decides not to execute anyone.",
      );
      return;
    }

    const tally = {};
    for (const [voterId, targetId] of Object.entries(this.dayVotes)) {
      const voter = this.players[voterId];
      if (!voter || !voter.isAlive) continue;
      const weight = voter.isRevealedMayor ? 3 : 1;
      tally[targetId] = (tally[targetId] || 0) + weight;
    }

    let highestVote = 0;
    let executedId = null;
    let tie = false;

    for (const [targetId, votes] of Object.entries(tally)) {
      if (votes > highestVote) {
        highestVote = votes;
        executedId = targetId;
        tie = false;
      } else if (votes === highestVote) {
        tie = true;
      }
    }

    if (tie || !executedId) {
      this.io.emit(
        "system_message",
        "The town was split in a tie. No one will be executed today.",
      );
    } else {
      this.executePlayer(executedId);
    }
  }

  submitNightAction(socketId, targetId) {
    if (this.phase !== "NIGHT") return;
    this.nightActions[socketId] = targetId;
  }

  resolveNight() {
    console.log("Resolving night...", this.nightActions);
    const messages = {}; // private messages to send: socketId -> string[]
    const deaths = new Set();
    const nightKills = []; // { attackerId, targetId, type }
    const heals = new Set();
    const blocks = new Set();
    const alerts = new Set();
    const framed = new Set();
    const silenced = new Set();
    const culted = new Set();

    const actions = [];
    const mafiaKills = [];

    // Pre-processing
    for (const [actorId, targetId] of Object.entries(this.nightActions)) {
      const actor = this.players[actorId];
      const target = this.players[targetId];
      if (!actor || !actor.isAlive) continue;

      const role = actor.role;
      messages[actorId] = messages[actorId] || [];

      // Edge Case: Veteran goes on alert
      if (
        role.name === "Veteran" &&
        targetId === actorId &&
        actor.veteranAlerts > 0
      ) {
        alerts.add(actorId);
        actor.veteranAlerts--;
        messages[actorId].push(
          "You went on alert. Anyone who visits you will be shot!",
        );
        continue;
      }

      // If they target someone else or valid action, push to queue
      if (targetId && target) {
        actions.push({
          actor,
          target,
          targetId,
          priority: role.priority || 99,
          role,
        });
      }
    }

    // Pass 1: Handle Guilt from previous night (Vigilante)
    Object.values(this.players).forEach((p) => {
      if (p.isAlive && p.vigiGuilt) {
        p.isAlive = false;
        deaths.add(p.id);
        messages[p.id] = messages[p.id] || [];
        messages[p.id].push("You died of guilt over shooting a town member.");
        p.vigiGuilt = false;
      }
    });

    // Sort Queue by Priority 1-13
    actions.sort((a, b) => a.priority - b.priority);

    // Pass 2: The Core 1-13 Event Loop
    for (const action of actions) {
      const { actor, target, targetId, role } = action;

      // Check Roleblocks early (cannot use action unless immune)
      if (blocks.has(actor.id) && !role.immunities?.roleblock) {
        messages[actor.id].push("You were roleblocked tonight!");
        continue;
      }

      // Check alert visits early: Visited alerting veteran? Actor Dies.
      if (target && alerts.has(target.id) && target.id !== actor.id) {
        nightKills.push({
          attackerId: target.id,
          targetId: actor.id,
          type: "Veteran",
        });
        messages[actor.id].push("You were shot by the Veteran you visited!");
        messages[target.id] = messages[target.id] || [];
        messages[target.id].push("You shot someone who visited your alert!");
      }

      // Role Logic Cases
      switch (role.name) {
        case "Escort":
        case "Consort":
          blocks.add(targetId);
          messages[targetId] = messages[targetId] || [];
          messages[targetId].push(
            "Someone occupied your night. You were roleblocked.",
          );
          break;
        case "Doctor":
          if (target && target.isRevealedMayor) {
            messages[actor.id].push("You cannot heal a revealed Mayor.");
          } else {
            heals.add(targetId);
          }
          break;
        case "Cult Leader":
          // Convert Town unless immune
          if (
            target &&
            (target.team === TEAM_MAFIA ||
              role.name === "Serial Killer" ||
              target.role.name === "Serial Killer")
          ) {
            messages[actor.id].push(
              "Your target was immune to your conversion.",
            );
          } else if (target) {
            culted.add(targetId);
            messages[actor.id].push("You successfully converted your target.");
            messages[targetId] = messages[targetId] || [];
            messages[targetId].push(
              "You have been converted! You are now a Cultist.",
            );
          }
          break;
        case "Framer":
          framed.add(targetId);
          break;
        case "Blackmailer":
          silenced.add(targetId);
          messages[targetId] = messages[targetId] || [];
          messages[targetId].push(
            "You have been blackmailed. You cannot speak tomorrow.",
          );
          break;
        case "Godfather":
        case "Mafioso":
          mafiaKills.push({ actor, targetId });
          break;
        case "Serial Killer":
          nightKills.push({ attackerId: actor.id, targetId, type: "SK" });
          break;
        case "Vigilante":
          if (actor.vigilanteBullets > 0) {
            actor.vigilanteBullets--;
            nightKills.push({
              attackerId: actor.id,
              targetId,
              type: "Vigilante",
            });
          }
          break;
        case "Consigliere":
          if (target) {
            messages[actor.id].push(
              `Your target is exactly a ${target.role.name}.`,
            );
          }
          break;
        case "Detective":
          if (target) {
            let isMafia = target.team === TEAM_MAFIA;
            if (target.role.name === "Godfather") isMafia = false; // Edge Case: GF is Innocent
            if (framed.has(targetId)) isMafia = true; // Edge Case: Framed target is Mafia
            messages[actor.id].push(
              isMafia
                ? "Your target appears to be Mafia!"
                : "Your target appears innocent.",
            );
          }
          break;
        case "Tracker":
          if (target) {
            const tgtAction = this.nightActions[targetId];
            if (tgtAction && !blocks.has(targetId) && targetId !== tgtAction) {
              const tgtVisited = this.players[tgtAction];
              const tgtName = tgtVisited ? tgtVisited.username : "someone";
              messages[actor.id].push(`Your target visited ${tgtName}.`);
            } else {
              messages[actor.id].push("Your target did not visit anyone.");
            }
          }
          break;
      }
    }

    // Mafia Kill Group Decision Matrix
    // Godfather's order overrides Mafioso. If GF blocked, Mafioso acts.
    let mafiaTarget = null;
    let mafiaKillerId = null;
    const gfKill = mafiaKills.find((k) => k.actor.role.name === "Godfather");
    const mfKill = mafiaKills.find((k) => k.actor.role.name === "Mafioso");

    if (gfKill && !blocks.has(gfKill.actor.id)) {
      mafiaTarget = gfKill.targetId;
      mafiaKillerId =
        mfKill && !blocks.has(mfKill.actor.id)
          ? mfKill.actor.id
          : gfKill.actor.id;
    } else if (mfKill && !blocks.has(mfKill.actor.id)) {
      mafiaTarget = mfKill.targetId;
      mafiaKillerId = mfKill.actor.id;
    }

    if (mafiaTarget) {
      nightKills.push({
        attackerId: mafiaKillerId,
        targetId: mafiaTarget,
        type: "Mafia",
      });
    }

    // Pass 3: Process Deaths & Immunities & Heals
    for (const kill of nightKills) {
      const victim = this.players[kill.targetId];
      if (!victim || !victim.isAlive) continue;

      // Doctor Heal saves from Mafia and SK
      if (
        (kill.type === "Mafia" || kill.type === "SK") &&
        heals.has(kill.targetId)
      ) {
        messages[kill.targetId] = messages[kill.targetId] || [];
        messages[kill.targetId].push(
          "You were attacked but someone nursed you back to health!",
        );
        continue;
      }

      // Edge Case: SK Immutable to Mafia kill
      if (kill.type === "Mafia" && victim.role.name === "Serial Killer") {
        continue;
      }

      // Edge Case: Alerting Veteran Immutable to All
      if (alerts.has(victim.id)) {
        continue;
      }

      deaths.add(victim.id);
      victim.isAlive = false;

      // Vigilante Guilt check
      if (
        kill.type === "Vigilante" &&
        victim.team === TEAM_TOWN &&
        victim.role.name !== "Mayor"
      ) {
        const vigi = this.players[kill.attackerId];
        if (vigi) {
          vigi.vigiGuilt = true; // Set up suicide for next night
        }
      }
    }

    // Pass 4: Apply Daily Status Effects
    Object.values(this.players).forEach((p) => {
      // Executioner target died at night? Become Jester
      if (
        p.isAlive &&
        p.role.name === "Executioner" &&
        deaths.has(p.executionerTarget)
      ) {
        p.role = Object.values(ROLES).find((r) => r.name === "Jester");
        messages[p.id] = messages[p.id] || [];
        messages[p.id].push(
          "Your target died at night. You have gone mad and become a Jester!",
        );
      }

      if (!p.isAlive) return;
      if (silenced.has(p.id)) p.isBlackmailed = true;
      if (framed.has(p.id)) p.isFramed = true;
      if (culted.has(p.id)) {
        p.cultMember = true;
        p.team = TEAM_TOWN; // Keep base team or change? Rulebook: " Cult makes up 50%" - Cult acts as a modifier
      }
    });

    // Pass 5: Dispatch Messages and Announcements
    for (const [id, msgs] of Object.entries(messages)) {
      if (this.players[id]) {
        msgs.forEach((m) => this.io.to(id).emit("system_message", m));
      }
    }

    const graveyardDetails = [];
    Object.values(this.players).forEach((p) => {
      if (deaths.has(p.id)) {
        graveyardDetails.push(
          `${p.username} died last night. They were a ${p.role.name}.`,
        );
      }
    });

    if (graveyardDetails.length === 0) {
      this.io.emit(
        "system_message",
        "The town woke up to find everyone alive, remarkably.",
      );
    } else {
      graveyardDetails.forEach((msg) => this.io.emit("system_message", msg));
    }

    // Reset night arrays
    this.dayCount++;
    this.nightActions = {};

    this.checkWinConditions();
  }

  checkWinConditions() {
    if (this.phase === "GAME_OVER") return;

    const alivePlayers = Object.values(this.players).filter((p) => p.isAlive);
    const totalAlive = alivePlayers.length;

    if (totalAlive === 0) {
      this.declareWinner(
        "Draw",
        "The town is completely wiped out. No one survived.",
      );
      return;
    }

    const aliveCult = alivePlayers.filter((p) => p.cultMember).length;
    let aliveMafia = 0;
    let aliveTown = 0;
    let aliveSK = 0;

    alivePlayers.forEach((p) => {
      // If recruited, they act as Cult (this check implies cult overrides win goals for basic factions)
      if (p.cultMember) return;

      if (p.team === TEAM_MAFIA) aliveMafia++;
      else if (p.role.name === "Serial Killer") aliveSK++;
      else if (p.team === TEAM_TOWN) aliveTown++;
    });

    // 1. Cult Win Condition -> >= 50%
    if (aliveCult >= Math.ceil(totalAlive / 2)) {
      this.declareWinner("Cult", "The Cult has overtaken the town!");
      return;
    }

    // 2. Serial Killer Win Condition -> Last player(s) standing (or just SK left + neutral non-killers)
    if (aliveSK > 0 && aliveMafia === 0 && aliveTown === 0 && aliveCult === 0) {
      this.declareWinner(
        "Serial Killer",
        "The Serial Killer has successfully murdered the entire town.",
      );
      return;
    }

    // 3. Mafia Win Condition -> No remaining threats (Town, SK, Cult dead)
    if (aliveMafia > 0 && aliveTown === 0 && aliveSK === 0 && aliveCult === 0) {
      this.declareWinner(
        "Mafia",
        "The Mafia has eliminated all resistance and controls the town.",
      );
      return;
    }

    // 4. Town Win Condition -> All criminals/eval doers are eradicated
    if (aliveTown > 0 && aliveMafia === 0 && aliveSK === 0 && aliveCult === 0) {
      this.declareWinner(
        "Town",
        "The Town has successfully rooted out all evildoers!",
      );
      return;
    }
  }

  // Called when someone is voted out during the Day Phase
  executePlayer(playerId) {
    const executedPlayer = this.players[playerId];
    if (!executedPlayer || !executedPlayer.isAlive) return;

    executedPlayer.isAlive = false;
    this.io.emit(
      "system_message",
      `${executedPlayer.username} was executed by the town. They were a ${executedPlayer.role.name}.`,
    );

    // Edge Case: Jester Win Condition
    if (executedPlayer.role.name === "Jester") {
      this.io.emit(
        "system_message",
        `Jester Win: ${executedPlayer.username} has tricked the town into executing them!`,
      );
      // Jester might win independently while game continues, or game ends.
      // Most rules let Jester win and game ends or continues. We'll announce it either way.
    }

    // Edge Case: Executioner Win Condition
    Object.values(this.players).forEach((p) => {
      if (
        p.role &&
        p.role.name === "Executioner" &&
        p.executionerTarget === playerId
      ) {
        this.io.emit(
          "system_message",
          `Executioner Win: ${p.username} successfully got their target executed!`,
        );
      }
    });

    // Executioner target dies at night -> Turns into Jester
    // (This actually needs to run during resolveNight for night deaths, let's keep it in mind.)

    this.checkWinConditions();
  }

  declareWinner(winnerTeam, message) {
    this.phase = "GAME_OVER";
    if (this.timer) clearInterval(this.timer);
    this.io.emit("game_over", { winner: winnerTeam, message });
    this.io.emit("system_message", `GAME OVER. ${message}`);
    this.broadcastState();
  }

  broadcastState() {
    // Send sanitized state to all players
    const publicPlayers = Object.values(this.players).map((p) => ({
      id: p.id,
      username: p.username,
      isAlive: p.isAlive,
      hasVoted: p.hasVoted,
      role: p.isAlive ? "???" : p.role ? p.role.name : "Unassigned",
    }));

    // Admin state with full info
    const adminPlayers = Object.values(this.players).map((p) => ({
      id: p.id,
      username: p.username,
      isAlive: p.isAlive,
      hasVoted: p.hasVoted,
      role: p.role ? p.role.name : "Unassigned",
    }));

    Object.values(this.players).forEach((p) => {
      // If phase is GAME_OVER, everyone sees all roles. Mod always sees all roles.
      const isOmniscient =
        p.username === "Admin/Mod" || this.phase === "GAME_OVER";

      this.io.to(p.id).emit("game_state_update", {
        phase: this.phase,
        dayCount: this.dayCount,
        players: isOmniscient ? adminPlayers : publicPlayers,
        me: {
          id: p.id,
          role: p.role ? p.role.name : null,
          team: p.team || null,
          isAlive: p.isAlive,
          isBlackmailed: p.isBlackmailed,
          executionerTarget: p.executionerTarget || null,
        },
      });
    });
  }
}

module.exports = GameEngine;
