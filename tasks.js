// Paired hunter/hunted tasks
// Each pair has a "hunted" (performs behavior) and "hunter" (identifies the behavior)
const taskPairs = [
  {
    hunted: "Touch your nose three times during the discussion.",
    hunter: "Identify the person who touches their nose three times. They are the counter-revolutionary!"
  },
  {
    hunted: "Look at the ceiling three times during the game.",
    hunter: "Find the person who looks at the ceiling three times. They are the traitor!"
  },
  {
    hunted: "Stay completely silent for 60 seconds straight.",
    hunter: "Identify who stays silent for 60 seconds. They are the enemy!"
  },
  {
    hunted: "Ask three different people why they look nervous.",
    hunter: "Find the person who asks multiple people why they look nervous. They are suspicious!"
  },
  {
    hunted: "Accuse someone loudly within the first 30 seconds.",
    hunter: "Identify who makes a loud accusation in the first 30 seconds. They are deflecting!"
  },
  {
    hunted: "Repeat everything one specific person says for 2 minutes.",
    hunter: "Find the person who keeps repeating what someone else says. They are the infiltrator!"
  },
  {
    hunted: "Complain that at least two people are acting suspiciously.",
    hunter: "Identify who complains about multiple people acting suspiciously. They are projecting!"
  },
  {
    hunted: "Cross your arms and keep them crossed for 90 seconds.",
    hunter: "Find the person who keeps their arms crossed for a long time. They are hiding something!"
  },
  {
    hunted: "Nervously tap your fingers on the table at least 5 times.",
    hunter: "Identify who nervously taps their fingers on the table repeatedly. They are the spy!"
  },
  {
    hunted: "Try to get someone to defend you without asking directly.",
    hunter: "Find the person who tries to get others to defend them. They are manipulating!"
  },
  {
    hunted: "Mention the word 'revolution' at least 4 times.",
    hunter: "Identify who keeps saying 'revolution' repeatedly. They are overcompensating!"
  },
  {
    hunted: "Avoid eye contact with everyone for 2 minutes.",
    hunter: "Find the person who avoids making eye contact. They are guilty!"
  }
];

module.exports = taskPairs;
