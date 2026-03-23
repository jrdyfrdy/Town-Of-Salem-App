# Code Agents Project Tracker

## Roles & Responsibilities Array

- **Auth & Connections:** Socket.io room management, player connections/disconnections.
- **State Engine:** The core phase looper, night resolution operations, and win check logic.
- **Frontend Player/Mod:** The UI components and specific views.

---

## 📋 To-Do (Phase 2 & Beyond)

### 1. Scaffold & Infrastructure

- [x] Initialize Node.js backend & React frontend workspaces.
- [x] Configure Socket.io server and client wrappers.
- [x] Create basic Express server and serve static assets.

### 2. State Engine Core (Backend)

- [x] Implement Game State Controller (Lobby -> Pre-Game -> Night -> Day -> Vote).
- [x] Build Timer system to automatically transition phases.
- [x] Create Roles Configuration JSON/Constants mapping (alignments, exact rules).
- [x] **Night Loop Action Queue:** Build the exact 1-13 execution order engine.
- [x] **Edge Cases & Immunities:** Implement specific resolution blocks (Veteran alert, Godfather invulnerability, Escort block).
- [x] Build Win Condition Check module (Jester, Executioner, Cult, Mafia, Village).

### 3. API & WebSockets Setup

- [x] `join_game`, `leave_game`, `start_game` Socket events.
- [x] `submit_night_action` Socket event.
- [x] `submit_day_vote` Socket event.
- [x] `chat_message` Socket event (with Blackmailer silencing prevention).

### 4. Frontend - Player View

- [x] Role Card component.
- [x] Phase Timer & System Announcements component.
- [x] Chatbox component (disabling input if blackmailed or if night time, unless Mafia faction).
- [x] Night Action Selection UI list.
- [x] Voting Interface.

### 5. Frontend - Moderator View

- [x] Master Omniscient Dashboard layout.
- [x] Live visualizer for Night Actions.
- [x] Manual override controls (pause/resume timers).

---

## ⏳ In Progress

- [ ] Wrap up and verify overall tests.

---

## ✅ Done

- [x] Phase 1 Documentation (`design.md` & `agents.md`).
- [x] Implement State Engine Core (Backend Phase Controller).
- [x] Build Night Loop Action Queue (1-13 Resolve Order).
- [x] Catalog & Implement Edge Cases (Veteran alert, Godfather invulnerability, Escort block, Mafia group kills, Vigilante guilt).
- [x] Build Win Condition Check module.
- [x] Initialized Node.js backend & React frontend workspaces.
- [x] Configured Socket.io server and client wrappers.
- [x] Built Frontend Player/Mod Main UI and Views.
- [x] Connect `submit_day_vote` and `chat_message` backend socket logic.
- [x] Connect Moderator explicit override sockets.
