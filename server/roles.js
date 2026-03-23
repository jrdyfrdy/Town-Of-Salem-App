// Define teams
const TEAM_MAFIA = 'Mafia';
const TEAM_TOWN = 'Town';
const TEAM_NEUTRAL = 'Neutral';

const ROLES = {
  // MAFIA TEAM
  GODFATHER: {
    name: 'Godfather',
    team: TEAM_MAFIA,
    nightAction: 'kill', // Chooses a player to kill
    immunities: {
        investigation: 'Innocent', // Appears innocent to Detective
        lethal: ['Mafia', 'NightKill'] // Cannot be killed by SK at night? Rulebook: "Cannot be killed by Serial Killer at night." Immune to basic night kills.
    },
    priority: 8
  },
  MAFIOSO: {
    name: 'Mafioso',
    team: TEAM_MAFIA,
    nightAction: 'kill', // Carries out Godfather's orders
    immunities: {},
    priority: 8
  },
  FRAMER: {
    name: 'Framer',
    team: TEAM_MAFIA,
    nightAction: 'frame',
    immunities: {},
    priority: 6
  },
  CONSIGLIERE: {
    name: 'Consigliere',
    team: TEAM_MAFIA,
    nightAction: 'investigate_exact',
    immunities: {},
    priority: 11
  },
  CONSORT: {
    name: 'Consort',
    team: TEAM_MAFIA,
    nightAction: 'roleblock',
    immunities: {
      roleblock: true // Cannot be roleblocked
    },
    priority: 2
  },
  BLACKMAILER: {
    name: 'Blackmailer',
    team: TEAM_MAFIA,
    nightAction: 'silence',
    immunities: {},
    priority: 7
  },

  // NEUTRAL TEAM
  SERIAL_KILLER: {
    name: 'Serial Killer',
    team: TEAM_NEUTRAL,
    nightAction: 'kill',
    immunities: {
      lethal: ['Mafia'], // Survives Mafia attacks
      conversion: true // Immune to Cult Leader
    },
    priority: 9
  },
  JESTER: {
    name: 'Jester',
    team: TEAM_NEUTRAL,
    nightAction: null,
    immunities: {}
  },
  EXECUTIONER: {
    name: 'Executioner',
    team: TEAM_NEUTRAL,
    nightAction: null, // Daytime deception only
    immunities: {}
  },
  CULT_LEADER: {
    name: 'Cult Leader',
    team: TEAM_NEUTRAL,
    nightAction: 'convert',
    immunities: {},
    priority: 5
  },

  // VILLAGE TEAM
  DOCTOR: {
    name: 'Doctor',
    team: TEAM_TOWN,
    nightAction: 'heal',
    immunities: {},
    priority: 4
  },
  DETECTIVE: {
    name: 'Detective',
    team: TEAM_TOWN,
    nightAction: 'investigate_mafia',
    immunities: {},
    priority: 12
  },
  TRACKER: {
    name: 'Tracker',
    team: TEAM_TOWN,
    nightAction: 'track',
    immunities: {},
    priority: 13
  },
  VIGILANTE: {
    name: 'Vigilante',
    team: TEAM_TOWN,
    nightAction: 'kill_optional',
    immunities: {},
    priority: 10
  },
  TOWNSPERSON: {
    name: 'Townsperson',
    team: TEAM_TOWN,
    nightAction: null,
    immunities: {}
  },
  MAYOR: {
    name: 'Mayor',
    team: TEAM_TOWN,
    nightAction: null,
    dayAction: 'reveal',
    immunities: {}
  },
  ESCORT: {
    name: 'Escort',
    team: TEAM_TOWN,
    nightAction: 'roleblock',
    immunities: {
      roleblock: true // Cannot be roleblocked
    },
    priority: 1
  },
  VETERAN: {
    name: 'Veteran',
    team: TEAM_TOWN,
    nightAction: 'alert',
    immunities: {
      lethal: ['All'] // When on alert, immune to all death and kills visitors
    },
    priority: 3
  }
};

module.exports = { TEAM_MAFIA, TEAM_TOWN, TEAM_NEUTRAL, ROLES };
