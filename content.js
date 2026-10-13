// Site content. You stand in a room with a Rubik's Cube in the middle; the
// six walls are the cube's faces blown up, and each wall is a page.
// Faces are keyed by where they sit when the site loads: B = the wall in
// front of you (so it is the first page), F = the wall behind you,
// U/D/L/R = ceiling/floor/left/right.
//
// Tiles are listed in reading order (8 of them; the center is the page
// title), as they read when that wall is in front of you and upright.
// Keep them short and self-contained: any tile can end up on any wall.
// Style: a short title, then one concrete sentence. Numbers and things a
// reader can check beat adjectives. About 140 characters fits a tile.
window.SITE = {
  name: "Srinidhi Bhat",
  // One line under the name, in the left rail.
  intro: "Engineer at Google, building LLM systems end to end: post-training, evals, agents and the serving underneath.",
  faces: {
    B: {
      name: "About",
      tagline: "LLM systems, end to end",
      cube: "#c8bfac", accent: "#c8bfac",
      tiles: [
        { t: "Hi, I'm Srinidhi.", b: "I build LLM systems end to end at Google: post-training, evals, agents, and the serving stack underneath." },
        { t: "Now", b: "Memory and safety for a personal health agent, in Google's AI Research & Innovation group." },
        { t: "Before", b: "Four years making Google's notifications and Discover proactive with LLMs. Two years before that on live Search results." },
        { t: "On weekends", b: "I trained a chess engine from zero, by self-play alone, on one desktop. It plays on Lichess at 1628." },
        { t: "Measure honestly", b: "My chess bot looked far stronger until I calibrated it against Stockfish. I hold model evals to the same bar." },
        { t: "Based in", b: "Mountain View, California. Grew up in India; IIT Kharagpur, class of 2019." },
        { t: "Elsewhere", b: "Code on GitHub, the chess bot on Lichess, the long version on LinkedIn. All on the Contact page.", href: "https://github.com/srinidhi321", link: "github" },
        { t: "How this site works", b: "Six pages, one Rubik's Cube. Drag to turn it. Twist it and the pages scramble; Solve puts them back." },
      ],
    },
    U: {
      name: "Career",
      tagline: "Google, since 2019",
      cube: "#6a8fc4", accent: "#6a8fc4",
      tiles: [
        { t: "Google", b: "Seven years, three teams, LLMs since 2021. Mountain View and Bengaluru." },
        { t: "AI Research & Innovation", b: "2025 to now. Memory retrieval, safety and autoraters for a personal health agent." },
        { t: "Memory that recalls", b: "Moved memory retrieval to Gemini Flash, then hill-climbed it and its autorater: better recall, F1 and rater accuracy." },
        { t: "Safety blindness", b: "The agent kept missing allergies and medical constraints. A high-recall v2 safety and identity framework fixed it." },
        { t: "Proactive AI", b: "2021 to 2025. LLM summaries on notifications, AI podcasts and agentic feeds in Discover." },
        { t: "Evals at scale", b: "Autoraters that gate launches, eval sets built from teacher-model annotations, prompts tuned by automatic optimization." },
        { t: "Search Live Results", b: "2019 to 2021, Bengaluru. Live sports, Olympics and elections in Google Search." },
        { t: "Recognition", b: "Search Tech Impact Award, plus several peer and spot bonuses. Regular interviewer and intern host." },
      ],
    },
    R: {
      name: "Research",
      tagline: "RL, from scratch",
      cube: "#d97757", accent: "#d97757",
      tiles: [
        { t: "AlphaZero", b: "A chess engine trained only by self-play: no human games, one desktop, three weeks.", href: "https://github.com/srinidhi321/alphachess", link: "repo" },
        { t: "alphachessv0", b: "The result plays on Lichess: 1628 rapid over 700+ games.", href: "https://lichess.org/@/alphachessv0", link: "play it" },
        { t: "Elo that doesn't lie", b: "Self-play ladders said the bot was much stronger. Anchoring to calibrated Stockfish levels gave the real number." },
        { t: "Gumbel search", b: "Gumbel AlphaZero search, which improves the policy with far fewer simulations per move than classic MCTS." },
        { t: "A KataGo-style net", b: "The policy-value network borrows its ResNet design from KataGo, the open-source Go engine." },
        { t: "RL on a tiny LM", b: "Taught Qwen2.5-0.5B to solve Countdown by questioning itself: SFT, DPO, then online RLOO with a verifier.", href: "https://cs224r.stanford.edu/projects/pdfs/Anuj%20Jamwal%20Srinidhi%20Bhat%20submission_416284828/CS224r_Final_Report.pdf", link: "report" },
        { t: "GPT-2 from scratch", b: "Implemented GPT-2 end to end, then fine-tuned it for paraphrase detection.", href: "https://github.com/srinidhi321/cs224n", link: "repo" },
        { t: "LoRA vs PrefixLM", b: "Full fine-tuning against LoRA and PrefixLM, with architecture and optimizer ablations." },
      ],
    },
    L: {
      name: "Launches",
      tagline: "Shipped at Google",
      cube: "#a48bc0", accent: "#a48bc0",
      tiles: [
        { t: "Daily Listen", b: "A personal AI podcast generated each day from what you follow, in Discover. Launched in Search Labs." },
        { t: "Thinker–Talker", b: "Led the API integration behind Daily Listen, and built the autoraters that gate each episode's quality." },
        { t: "AI notification summaries", b: "The first AI summaries on Google notifications. Specialized models fine-tuned with Google DeepMind, scaled on TPUs." },
        { t: "Topic Spaces", b: "Agentic feeds in Discover that design their own layout from your topics and queries, on the fly." },
        { t: "LLM serving", b: "One service for high-throughput summarization, indexing and serving across several model architectures." },
        { t: "US Elections", b: "Core engineer on the live election maps in Google Search. Billions of impressions." },
        { t: "Where to watch", b: "Ask Google where to watch a game: I built the engine that answers, in Search and Assistant. Covered by The Verge." },
        { t: "Olympics", b: "Led the Olympics experience across Google Assistant, in many languages, with live knockout brackets." },
      ],
    },
    D: {
      name: "Background",
      tagline: "IIT Kharagpur · Stanford",
      cube: "#8b9a5e", accent: "#8b9a5e",
      tiles: [
        { t: "IIT Kharagpur", b: "B.Tech + M.Tech in Computer Science: a five-year dual degree, 2014 to 2019." },
        { t: "Stanford CS224R", b: "Graduate deep RL with Chelsea Finn: imitation learning, online and offline RL." },
        { t: "Stanford CS224N", b: "Graduate NLP with deep learning. The GPT-2-from-scratch work came out of it." },
        { t: "Toolkit", b: "SFT, DPO, RLOO and LoRA. Autorater design. Retrieval. High-throughput serving on TPUs." },
        { t: "Tech Impact Award", b: "From Google Search, alongside several peer and spot bonuses." },
        { t: "C++ readability", b: "Google's C++ readability certification. Python for everything else." },
        { t: "In the press", b: "The Verge and Engadget covered Where to Watch, the sports Q&A engine I built for Search." },
        { t: "Paying it forward", b: "Regular Google interviewer and intern host." },
      ],
    },
    F: {
      name: "Contact",
      tagline: "Say hello",
      cube: "#d4a94f", accent: "#d4a94f",
      tiles: [
        { t: "Email", b: "srinidhi321@gmail.com is the fastest way to reach me.", href: "mailto:srinidhi321@gmail.com", link: "write" },
        { t: "GitHub", b: "github.com/srinidhi321. The chess engine and the GPT-2 work live here.", href: "https://github.com/srinidhi321", link: "open" },
        { t: "LinkedIn", b: "The full résumé, in the usual format.", href: "https://www.linkedin.com/in/srinidhi-bhat-213a17116/", link: "open" },
        { t: "Lichess", b: "Play my bot, alphachessv0. It's rated 1628 rapid.", href: "https://lichess.org/@/alphachessv0", link: "play" },
        { t: "Happy to talk about", b: "Post-training, evals and autoraters, RL from scratch, and getting LLM features into production." },
        { t: "The RL write-up", b: "Our CS224R report on teaching a 0.5B model to reason, with Anuj Jamwal.", href: "https://cs224r.stanford.edu/projects/pdfs/Anuj%20Jamwal%20Srinidhi%20Bhat%20submission_416284828/CS224r_Final_Report.pdf", link: "read" },
        { t: "Where", b: "Mountain View, California. Pacific time." },
        { t: "Prefer a list?", b: "The Plain version link shows every page at once, no cube required." },
      ],
    },
  },
};
