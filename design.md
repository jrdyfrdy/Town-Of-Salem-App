# Game Design & Architecture Document

## Technical Architecture (Tech Stack)

- **Frontend:** React.js (Vite) for a highly responsive, component-driven UI. Tailwind CSS for rapid, clean styling.
- **Backend:** Node.js with Express.
- **Real-time Communication:** Socket.io for seamless bi-directional communication between clients and the server (crucial for live chat, voting, and phase transitions).
- **State Management:** Redis (or Node.js in-memory store for initial MVP) to handle fast mutations in game state, player presence, and disconnected player reconnection parameters.

## Game State Machine Logic

The game operates on a continuous state machine loop until a win condition is met.

### Phases

1. **Lobby/Pre-Game:** Players join. Roles are assigned. Executioner receives their target. Mafia team is revealed to each other.
2. **Night Phase:** Players make their role-specific actions. The server collects all actions but does not calculate outcomes until the phase ends.
3. **Night Resolution:** The server processes all actions strictly in the following order:
   1. Escort (Roleblocks)
   2. Consort (Roleblocks)
   3. Veteran (Goes on alert)
   4. Doctor (Applies heal)
   5. Cult Leader (Converts target)
   6. Framer (Applies framed status)
   7. Blackmailer (Applies silenced status)
   8. Godfather & Mafioso (Mafia kill target resolved)
   9. Serial Killer (SK kill target resolved)
   10. Vigilante (Vigilante kill target resolved)
   11. Consigliere (Investigates target's true role)
   12. Detective (Investigates target's Mafia affiliation)
   13. Tracker (Observes target's visits)
4. **Day Phase - Announcements:** Moderator announces deaths and silenced (blackmailed) players.
5. **Day Phase - Discussion:** Timed chat. Mayor has the option to reveal.
6. **Day Phase - Voting:** Players cast votes. Mayor votes count as 3x if revealed.
7. **Execution & Win Check:** Highest voted player is "lynched" and role revealed. Check win conditions. Return to Night Phase if no winner.

### Edge Case Handling Engine

- **Immunities:** Handled during the Resolution step.
  - Godfather investigated by Detective -> Returns "Innocent".
  - Serial Killer attacked by Mafia -> Skips death resolution.
  - Veteran on Alert -> Immune to all kills, kills all visitors (highest priority after roleblocks).
- **Roleblocks:** If targeted by Escort/Consort, the blocked player's action is nullified in subsequent steps. (Escort/Consort cannot be roleblocked).

## UI/UX Layouts

### Player View

- **Header:** Current Phase (Day/Night/Voting) and Countdown Timer.
- **Left Panel:** Role Card (Your role, team alignment, abilities description).
- **Center Panel:**
  - _Day Phase:_ Chat log, Blackmailed indicator (if applicable), system announcements.
  - _Night Phase:_ Action targeted selector (button next to player names to use ability).
- **Right Panel:** Graveyard (dead players and their revealed roles) and active Voting buttons (during Day Phase).

### Moderator View

- **Header:** Omniscient Game Phase and Timer control (Start/Pause/Skip phase).
- **Center Dashboard:**
  - Matrix of all players, their true roles, current alive/dead status, and live action targeting (arrows indicating who is targeting whom at night).
- **Right Panel:** System Logs (detailed breakdown of the Night Resolution math, e.g., "Player A attacked Player B, but Player B was healed by Player C").
