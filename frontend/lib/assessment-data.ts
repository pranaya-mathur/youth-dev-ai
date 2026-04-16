export type Choice = { id: string; label: string };

export type Question = {
  id: string;
  scenario: string;
  /** Shorter, friendlier scenario copy for ages 11–13. */
  scenarioYoung?: string;
  prompt: string;
  choices: Choice[];
  /** Optional short reflection line */
  optionalText?: boolean;
};

export const QUESTIONS: Question[] = [
  {
    id: "q1",
    scenario:
      "You are in a group project. One person is doing most of the talking and ideas feel rushed.",
    scenarioYoung:
      "Group project time! One person talks a lot and everything feels fast. What do you do?",
    prompt: "What do you tend to do in that moment?",
    choices: [
      { id: "a", label: "I listen and try to weave quieter voices in" },
      { id: "b", label: "I share my idea quickly so we keep moving" },
      { id: "c", label: "I step back and organize notes or next steps" },
      { id: "d", label: "I feel stuck and wait for it to pass" },
    ],
    optionalText: true,
  },
  {
    id: "q2",
    scenario: "A friend seems off over chat—they reply with short messages.",
    scenarioYoung: "A friend feels a little quiet in chat. Short replies. What feels closest to you?",
    prompt: "What feels closest to you?",
    choices: [
      { id: "a", label: "I check in gently without pushing" },
      { id: "b", label: "I distract them with something funny" },
      { id: "c", label: "I give space but stay available" },
      { id: "d", label: "I worry I said something wrong" },
    ],
    optionalText: true,
  },
  {
    id: "q3",
    scenario: "You try something new (sport, art, code, music) and you are bad at first.",
    scenarioYoung: "You try something brand new… and you are not great at first. What does your brain say?",
    prompt: "What is your inner voice most like?",
    choices: [
      { id: "a", label: "Embarrassed, I want to quit quietly" },
      { id: "b", label: "Curious, I want to understand the basics" },
      { id: "c", label: "Competitive, I want to level up fast" },
      { id: "d", label: "Tired, I need encouragement to continue" },
    ],
  },
  {
    id: "q4",
    scenario: "Someone copies your work or takes credit for your idea.",
    scenarioYoung: "Someone copies your work or says your idea was theirs. What is your first instinct?",
    prompt: "What is your first instinct?",
    choices: [
      { id: "a", label: "I confront it clearly and calmly" },
      { id: "b", label: "I vent to someone I trust first" },
      { id: "c", label: "I freeze and hope it sorts itself" },
      { id: "d", label: "I document it and find a fair path" },
    ],
    optionalText: true,
  },
  {
    id: "q5",
    scenario: "A big day is coming: exam, audition, match, or interview.",
    scenarioYoung: "A big day is coming—like a test, match, or audition. The night before, you usually…",
    prompt: "The night before, you usually…",
    choices: [
      { id: "a", label: "Plan, revise, and sleep late anyway" },
      { id: "b", label: "Distract myself with shows or games" },
      { id: "c", label: "Talk it out with family or friends" },
      { id: "d", label: "Feel butterflies but still show up" },
    ],
  },
  {
    id: "q6",
    scenario: "You see someone sitting alone at lunch or break.",
    scenarioYoung: "You see someone sitting alone at lunch or break. What do you do?",
    prompt: "What do you do?",
    choices: [
      { id: "a", label: "I sit nearby and start a small conversation" },
      { id: "b", label: "I invite them into whatever we are doing" },
      { id: "c", label: "I smile or wave so they feel seen" },
      { id: "d", label: "I want to help but feel shy to approach" },
    ],
  },
  {
    id: "q7",
    scenario: "You get feedback that stings, even if it is meant to help.",
    scenarioYoung: "You get feedback that stings—even if they meant to help. What helps you bounce back?",
    prompt: "What helps you bounce back?",
    choices: [
      { id: "a", label: "Time alone to process" },
      { id: "b", label: "One person who believes in me" },
      { id: "c", label: "A small win I can control today" },
      { id: "d", label: "Music, movement, or making something" },
    ],
    optionalText: true,
  },
  {
    id: "q8",
    scenario: "You have a free hour with no obligations.",
    scenarioYoung: "You have a free hour with nothing you *have* to do. You drift toward…",
    prompt: "You drift toward…",
    choices: [
      { id: "a", label: "Creating: sketches, edits, writing, builds" },
      { id: "b", label: "People: calls, chats, hanging out" },
      { id: "c", label: "Rest: nap, snacks, slow scrolling" },
      { id: "d", label: "Learning: tutorials, deep dives, curiosity rabbit holes" },
    ],
  },
  {
    id: "q9",
    scenario: "You disagree with an adult you respect (teacher, coach, parent).",
    prompt: "What feels most true?",
    choices: [
      { id: "a", label: "I stay quiet to keep peace" },
      { id: "b", label: "I ask questions to understand their view" },
      { id: "c", label: "I say my side calmly with examples" },
      { id: "d", label: "I feel big feelings and need time before talking" },
    ],
    optionalText: true,
  },
  {
    id: "q10",
    scenario: "You fail at something you cared about.",
    prompt: "After the storm, what remains?",
    choices: [
      { id: "a", label: "Shame—I replay it a lot" },
      { id: "b", label: "Lessons—I look for what to change" },
      { id: "c", label: "Anger—I want to prove it wrong" },
      { id: "d", label: "Hope—I still believe in next time" },
    ],
  },
  {
    id: "q11",
    scenario: "You imagine your future self—five years ahead.",
    prompt: "What do you hope stays the same about you?",
    choices: [
      { id: "a", label: "My kindness toward others" },
      { id: "b", label: "My curiosity and imagination" },
      { id: "c", label: "My loyalty to people I love" },
      { id: "d", label: "My courage to try new paths" },
    ],
    optionalText: true,
  },
  {
    id: "q12",
    scenario: "Last one: when you feel most like *you*.",
    prompt: "Pick the closest vibe.",
    choices: [
      { id: "a", label: "Laughing with people who get me" },
      { id: "b", label: "Focused flow—time disappears" },
      { id: "c", label: "Helping someone feel less alone" },
      { id: "d", label: "Exploring a new place or idea" },
    ],
    optionalText: true,
  },
];
