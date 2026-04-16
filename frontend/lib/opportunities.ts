/**
 * Human-curated, strength-linked opportunity nudges (not clinical or prescriptive).
 */

export type OpportunityBlock = {
  title: string;
  items: string[];
};

const BLOCKS: { test: RegExp; block: OpportunityBlock }[] = [
  {
    test: /creative|imagin|art|music|write|story/i,
    block: {
      title: "Create & express",
      items: [
        "Try a 25-minute “maker sprint” on something tiny (doodle, beat, paragraph, clip).",
        "Share one creation with a friend you trust and ask what feeling it gave them.",
        "Browse a free local workshop or school club tied to art, media, or making.",
      ],
    },
  },
  {
    test: /kind|care|connect|loyal|friend|listen|help/i,
    block: {
      title: "Connection & care",
      items: [
        "Send one specific thank-you to someone who made your week easier.",
        "Invite one person for a low-pressure walk, call, or study break.",
        "Look for a volunteer hour nearby (library, shelter, community kitchen).",
      ],
    },
  },
  {
    test: /curious|learn|read|explore|question/i,
    block: {
      title: "Learning paths",
      items: [
        "Pick one 20-minute tutorial on a skill you are curious about; stop when time ends.",
        "Ask a teacher or mentor: “What is one skill I should build next for my goals?”",
        "Join or follow one credible online course hub (many have free tiers).",
      ],
    },
  },
  {
    test: /brave|courage|try|show up|nervous|butterfly/i,
    block: {
      title: "Brave next steps",
      items: [
        "Sign up for one tryout, audition, hackathon, or meetup that fits your energy.",
        "Practice a 60-second introduction of your strengths in front of a mirror.",
        "Set one “courage calendar” event this month and put it where you will see it.",
      ],
    },
  },
  {
    test: /steady|organ|plan|calm|patient|step/i,
    block: {
      title: "Steady progress",
      items: [
        "Block 30 minutes this week only for planning the next small milestone.",
        "Pair with a friend as accountability buddies for one shared habit.",
        "Ask for feedback once, write down two takeaways, and pick one to apply.",
      ],
    },
  },
];

export function opportunitiesFromStrengths(strengths: string[]): OpportunityBlock[] {
  const blob = strengths.join(" ");
  const out: OpportunityBlock[] = [];
  const seen = new Set<string>();
  for (const row of BLOCKS) {
    if (row.test.test(blob) && !seen.has(row.block.title)) {
      seen.add(row.block.title);
      out.push(row.block);
    }
    if (out.length >= 2) break;
  }
  if (out.length === 0) {
    out.push({
      title: "Open doors",
      items: [
        "Ask two adults you respect: “What is one opportunity I might not be seeing?”",
        "List three activities you enjoy; search clubs, teams, or groups for each.",
        "Try one new extracurricular for four weeks before deciding if it fits.",
      ],
    });
  }
  return out;
}
