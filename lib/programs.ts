// ─── Types ────────────────────────────────────────────────

export type ProgramMovement = {
  name: string;
  sets: number;
  reps: string;      // ex: "5", "3 / 2 / 1 / 1 / 1", "30 sec", "AMRAP"
  notes?: string;    // technique, tempo, charge…
};

export type ProgramSession = {
  number: number;
  title: string;
  notes?: string;
  movements: ProgramMovement[];
};

export type ProgramTemplate = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  author: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  category: 'Force' | 'Cardio' | 'CrossFit';
  duration_weeks: number;
  sessions_total: number;
  frequency: string;
  goal: string;
  equipment: string;
  sessions: ProgramSession[];
};

// ─── Programme 1 : Ma première Traction ──────────────────
// 8 semaines · 3x/semaine · 24 séances
// Pour quelqu'un qui ne fait encore aucune traction

const premiereTracSessions: ProgramSession[] = [
  // ── Phase 1 : Fondations (Sem 1-2) ──
  {
    number: 1, title: 'Sem 1 — Jour 1',
    notes: 'Focus : activer les scapulaires et s\'habituer à la barre.',
    movements: [
      { name: 'Dead hang', sets: 3, reps: '15 sec', notes: 'Bras tendus, épaules engagées vers le bas' },
      { name: 'Scapular pull-up', sets: 3, reps: '8', notes: 'Monter les omoplates sans plier les coudes' },
      { name: 'Australian pull-up', sets: 3, reps: '8', notes: 'Barre à hauteur de hanches, corps rigide' },
    ],
  },
  {
    number: 2, title: 'Sem 1 — Jour 2',
    notes: 'Progression sur le hang, montée des répétitions australiennes.',
    movements: [
      { name: 'Dead hang', sets: 3, reps: '20 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '8' },
      { name: 'Australian pull-up', sets: 3, reps: '10' },
    ],
  },
  {
    number: 3, title: 'Sem 1 — Jour 3',
    movements: [
      { name: 'Dead hang', sets: 3, reps: '20 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '10' },
      { name: 'Australian pull-up', sets: 3, reps: '12' },
    ],
  },
  {
    number: 4, title: 'Sem 2 — Jour 1',
    movements: [
      { name: 'Dead hang', sets: 3, reps: '25 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '10' },
      { name: 'Australian pull-up', sets: 4, reps: '10' },
    ],
  },
  {
    number: 5, title: 'Sem 2 — Jour 2',
    movements: [
      { name: 'Dead hang', sets: 3, reps: '25 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '12' },
      { name: 'Australian pull-up', sets: 4, reps: '12' },
    ],
  },
  {
    number: 6, title: 'Sem 2 — Jour 3',
    notes: 'Fin de la phase fondations. Tu dois tenir 30 sec en dead hang.',
    movements: [
      { name: 'Dead hang', sets: 3, reps: '30 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '12' },
      { name: 'Australian pull-up', sets: 4, reps: '15' },
    ],
  },

  // ── Phase 2 : Négatives (Sem 3-4) ──
  {
    number: 7, title: 'Sem 3 — Jour 1',
    notes: 'Introduire les négatives : saute en position haute, redescends lentement.',
    movements: [
      { name: 'Traction négative', sets: 3, reps: '3', notes: 'Descente en 5 sec. Sauter pour monter.' },
      { name: 'Dead hang', sets: 3, reps: '30 sec' },
      { name: 'Australian pull-up', sets: 3, reps: '15' },
    ],
  },
  {
    number: 8, title: 'Sem 3 — Jour 2',
    movements: [
      { name: 'Traction négative', sets: 3, reps: '4', notes: 'Descente 5 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '12' },
      { name: 'Australian pull-up', sets: 3, reps: '15' },
    ],
  },
  {
    number: 9, title: 'Sem 3 — Jour 3',
    movements: [
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Descente 6 sec' },
      { name: 'Dead hang', sets: 3, reps: '30 sec' },
      { name: 'Australian pull-up', sets: 4, reps: '12' },
    ],
  },
  {
    number: 10, title: 'Sem 4 — Jour 1',
    movements: [
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Descente 6 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '12' },
      { name: 'Traction partielle', sets: 3, reps: '3', notes: 'Monte le plus haut possible' },
    ],
  },
  {
    number: 11, title: 'Sem 4 — Jour 2',
    movements: [
      { name: 'Traction négative', sets: 4, reps: '5', notes: 'Descente 7 sec' },
      { name: 'Dead hang', sets: 3, reps: '30 sec' },
      { name: 'Australian pull-up', sets: 4, reps: '15' },
    ],
  },
  {
    number: 12, title: 'Sem 4 — Jour 3',
    notes: 'Fin phase négatives. Les négatives de 8 sec doivent se sentir contrôlées.',
    movements: [
      { name: 'Traction négative', sets: 4, reps: '5', notes: 'Descente 8 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '15' },
      { name: 'Traction partielle', sets: 3, reps: '5' },
    ],
  },

  // ── Phase 3 : Élastique (Sem 5-6) ──
  {
    number: 13, title: 'Sem 5 — Jour 1',
    notes: 'L\'élastique assiste la montée. Utilise le plus léger possible.',
    movements: [
      { name: 'Traction avec élastique', sets: 3, reps: '5', notes: 'Élastique moyen. Focus : mouvement complet.' },
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Descente 8 sec, sans élastique' },
      { name: 'Dead hang', sets: 3, reps: '30 sec' },
    ],
  },
  {
    number: 14, title: 'Sem 5 — Jour 2',
    movements: [
      { name: 'Traction avec élastique', sets: 3, reps: '6' },
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Descente 8 sec' },
      { name: 'Australian pull-up', sets: 4, reps: '15' },
    ],
  },
  {
    number: 15, title: 'Sem 5 — Jour 3',
    movements: [
      { name: 'Traction avec élastique', sets: 3, reps: '8' },
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Descente 9 sec' },
      { name: 'Traction partielle', sets: 3, reps: '5' },
    ],
  },
  {
    number: 16, title: 'Sem 6 — Jour 1',
    movements: [
      { name: 'Traction avec élastique', sets: 4, reps: '8', notes: 'Essaie un élastique plus léger' },
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Descente 9 sec' },
      { name: 'Dead hang', sets: 3, reps: '40 sec' },
    ],
  },
  {
    number: 17, title: 'Sem 6 — Jour 2',
    movements: [
      { name: 'Traction avec élastique', sets: 4, reps: '8' },
      { name: 'Traction négative', sets: 4, reps: '5', notes: 'Descente 10 sec' },
      { name: 'Scapular pull-up', sets: 3, reps: '15' },
    ],
  },
  {
    number: 18, title: 'Sem 6 — Jour 3',
    notes: 'Fin phase élastique. Tu dois enchaîner 8 reps avec élastique léger.',
    movements: [
      { name: 'Traction avec élastique', sets: 4, reps: '10', notes: 'Élastique léger ou sans' },
      { name: 'Traction négative', sets: 4, reps: '5', notes: 'Descente 10 sec' },
      { name: 'Traction partielle', sets: 3, reps: '8' },
    ],
  },

  // ── Phase 4 : Première traction (Sem 7-8) ──
  {
    number: 19, title: 'Sem 7 — Jour 1',
    notes: '🎯 Tentative ! Essaie une traction libre avant tout le reste. Compte tes reps.',
    movements: [
      { name: 'Traction libre', sets: 1, reps: 'AMRAP', notes: 'Ta première tentative ! Tout donner.' },
      { name: 'Traction négative', sets: 4, reps: '5', notes: 'Descente 10 sec' },
      { name: 'Traction avec élastique', sets: 3, reps: '10' },
    ],
  },
  {
    number: 20, title: 'Sem 7 — Jour 2',
    movements: [
      { name: 'Traction libre', sets: 2, reps: 'AMRAP', notes: 'Repose 5 min entre les tentatives' },
      { name: 'Traction négative', sets: 3, reps: '5' },
      { name: 'Traction avec élastique', sets: 4, reps: '8' },
    ],
  },
  {
    number: 21, title: 'Sem 7 — Jour 3',
    movements: [
      { name: 'Traction libre', sets: 2, reps: 'AMRAP' },
      { name: 'Traction négative', sets: 4, reps: '5', notes: 'Descente 10 sec' },
      { name: 'Dead hang', sets: 3, reps: '40 sec' },
    ],
  },
  {
    number: 22, title: 'Sem 8 — Jour 1',
    movements: [
      { name: 'Traction libre', sets: 3, reps: 'AMRAP', notes: 'Repos 5 min. Ne pas sauter pour aider.' },
      { name: 'Traction négative', sets: 3, reps: '5' },
      { name: 'Traction avec élastique', sets: 4, reps: '10' },
    ],
  },
  {
    number: 23, title: 'Sem 8 — Jour 2',
    movements: [
      { name: 'Traction libre', sets: 3, reps: 'AMRAP' },
      { name: 'Traction négative', sets: 4, reps: '5' },
      { name: 'Australian pull-up', sets: 4, reps: '15' },
    ],
  },
  {
    number: 24, title: 'Sem 8 — Jour 3 🏁',
    notes: '🎉 Test final ! Note ton max et célèbre — tu mérites d\'être fier(e).',
    movements: [
      { name: 'Traction libre', sets: 1, reps: 'MAX', notes: '🏆 Test final — ton record !' },
      { name: 'Traction libre', sets: 1, reps: 'MAX', notes: 'Deuxième tentative après 10 min de repos' },
      { name: 'Traction négative', sets: 3, reps: '5', notes: 'Finir en beauté' },
    ],
  },
];

// ─── Programme 2 : Tractions Pavel Tsatsouline ───────────
// Fighter Pull-up Program
// 6 semaines · 5j/semaine · 30 séances
// Prérequis : pouvoir faire 3 tractions consécutives

function ps(num: number, week: number, day: number, reps: number[]): ProgramSession {
  const total = reps.reduce((a, b) => a + b, 0);
  const repsStr = reps.join(' / ');
  return {
    number: num,
    title: `Semaine ${week} — Jour ${day}`,
    notes: `Total : ${total} reps. Repos 3 min entre séries. Ne jamais aller à l'échec — stop 1-2 reps avant.`,
    movements: [
      {
        name: 'Traction',
        sets: reps.length,
        reps: repsStr,
        notes: 'Prise pronation (paumes vers l\'avant). Corps tendu, descente 2-3 sec.',
      },
    ],
  };
}

const pavelSessions: ProgramSession[] = [
  // Semaine 1 — base 3 reps
  ps(1,  1, 1, [3, 2, 1, 1, 1]),
  ps(2,  1, 2, [2, 1, 1, 1, 1]),
  ps(3,  1, 3, [3, 2, 1, 1, 1]),
  ps(4,  1, 4, [2, 2, 1, 1, 1]),
  ps(5,  1, 5, [3, 2, 2, 1, 1]),
  // Semaine 2 — base 4 reps
  ps(6,  2, 1, [4, 3, 2, 1, 1]),
  ps(7,  2, 2, [3, 2, 1, 1, 1]),
  ps(8,  2, 3, [4, 3, 2, 1, 1]),
  ps(9,  2, 4, [3, 3, 2, 1, 1]),
  ps(10, 2, 5, [4, 3, 2, 2, 1]),
  // Semaine 3 — base 5 reps
  ps(11, 3, 1, [5, 4, 3, 2, 1]),
  ps(12, 3, 2, [4, 3, 2, 1, 1]),
  ps(13, 3, 3, [5, 4, 3, 2, 1]),
  ps(14, 3, 4, [4, 4, 3, 2, 1]),
  ps(15, 3, 5, [5, 4, 3, 2, 2]),
  // Semaine 4 — base 6 reps
  ps(16, 4, 1, [6, 5, 4, 3, 2]),
  ps(17, 4, 2, [5, 4, 3, 2, 1]),
  ps(18, 4, 3, [6, 5, 4, 3, 2]),
  ps(19, 4, 4, [5, 5, 4, 3, 2]),
  ps(20, 4, 5, [6, 5, 4, 3, 3]),
  // Semaine 5 — base 7 reps
  ps(21, 5, 1, [7, 6, 5, 4, 3]),
  ps(22, 5, 2, [6, 5, 4, 3, 2]),
  ps(23, 5, 3, [7, 6, 5, 4, 3]),
  ps(24, 5, 4, [6, 6, 5, 4, 3]),
  ps(25, 5, 5, [7, 6, 5, 4, 4]),
  // Semaine 6 — base 8 reps
  ps(26, 6, 1, [8, 7, 6, 5, 4]),
  ps(27, 6, 2, [7, 6, 5, 4, 3]),
  ps(28, 6, 3, [8, 7, 6, 5, 4]),
  ps(29, 6, 4, [7, 7, 6, 5, 4]),
  {
    number: 30,
    title: 'Semaine 6 — Jour 5 🏁',
    notes: '🎯 Test final. Après ton dernier set, repose 10 min et fais ton MAX absolu de tractions.',
    movements: [
      { name: 'Traction', sets: 5, reps: '8 / 7 / 6 / 5 / 5', notes: 'Dernier entraînement avant le test.' },
      { name: 'Test max tractions', sets: 1, reps: 'MAX', notes: '🏆 Après 10 min de repos — ton nouveau record !' },
    ],
  },
];

// ─── Programme 3 : Plan 5K Débutant (C25K) ───────────────
// 8 semaines · 3x/semaine · 24 séances
// Partir de zéro → courir 30 min / 5K sans s'arrêter

function rS(
  num: number, week: number, day: number,
  notes: string | undefined,
  main: ProgramMovement[]
): ProgramSession {
  return {
    number: num, title: `Sem ${week} — Jour ${day}`, notes,
    movements: [
      { name: 'Échauffement marche', sets: 1, reps: '5 min', notes: 'Marche active, mobilisation légère' },
      ...main,
      { name: 'Retour au calme', sets: 1, reps: '5 min', notes: 'Marche lente, étirements' },
    ],
  };
}

const plan5kSessions: ProgramSession[] = [
  // Semaine 1 — alternance course/marche
  rS(1,  1, 1, 'Ne te soucie pas de l\'allure. Respire.', [{ name: 'Intervalles course / marche', sets: 8, reps: '1 min course + 1:30 marche' }]),
  rS(2,  1, 2, undefined, [{ name: 'Intervalles course / marche', sets: 8, reps: '1 min course + 1:30 marche' }]),
  rS(3,  1, 3, undefined, [{ name: 'Intervalles course / marche', sets: 6, reps: '1:30 course + 1:30 marche' }]),
  // Semaine 2
  rS(4,  2, 1, undefined, [{ name: 'Intervalles course / marche', sets: 6, reps: '1:30 course + 2 min marche' }]),
  rS(5,  2, 2, undefined, [{ name: 'Intervalles course / marche', sets: 5, reps: '2 min course + 2 min marche' }]),
  rS(6,  2, 3, undefined, [{ name: 'Intervalles course / marche', sets: 5, reps: '2 min course + 2 min marche' }, { name: 'Course bonus', sets: 1, reps: '3 min' }]),
  // Semaine 3
  rS(7,  3, 1, 'Les runs de 3 min : allure confortable, tu peux parler.', [
    { name: 'Intervalles', sets: 2, reps: '1:30 course + 1:30 marche + 3 min course + 3 min marche' },
  ]),
  rS(8,  3, 2, undefined, [{ name: 'Intervalles', sets: 2, reps: '1:30 course + 1:30 marche + 3 min course + 3 min marche' }]),
  rS(9,  3, 3, undefined, [{ name: 'Intervalles', sets: 2, reps: '1:30 course + 1:30 marche + 3 min course + 3 min marche' }]),
  // Semaine 4
  rS(10, 4, 1, 'Première fois avec un run de 5 min !', [
    { name: 'Course 3 min', sets: 1, reps: '3 min' },
    { name: 'Marche', sets: 1, reps: '1:30' },
    { name: 'Course 5 min', sets: 1, reps: '5 min' },
    { name: 'Marche', sets: 1, reps: '2:30' },
    { name: 'Course 3 min', sets: 1, reps: '3 min' },
    { name: 'Marche', sets: 1, reps: '1:30' },
    { name: 'Course 5 min', sets: 1, reps: '5 min' },
  ]),
  rS(11, 4, 2, undefined, [
    { name: 'Course 3 min', sets: 1, reps: '3 min' }, { name: 'Marche', sets: 1, reps: '1:30' },
    { name: 'Course 5 min', sets: 1, reps: '5 min' }, { name: 'Marche', sets: 1, reps: '2:30' },
    { name: 'Course 3 min', sets: 1, reps: '3 min' }, { name: 'Marche', sets: 1, reps: '1:30' },
    { name: 'Course 5 min', sets: 1, reps: '5 min' },
  ]),
  rS(12, 4, 3, undefined, [
    { name: 'Course 3 min', sets: 1, reps: '3 min' }, { name: 'Marche', sets: 1, reps: '1:30' },
    { name: 'Course 5 min', sets: 1, reps: '5 min' }, { name: 'Marche', sets: 1, reps: '2:30' },
    { name: 'Course 3 min', sets: 1, reps: '3 min' }, { name: 'Marche', sets: 1, reps: '1:30' },
    { name: 'Course 5 min', sets: 1, reps: '5 min' },
  ]),
  // Semaine 5
  rS(13, 5, 1, undefined, [{ name: 'Course', sets: 3, reps: '5 min', notes: 'Récup 3 min marche entre chaque' }]),
  rS(14, 5, 2, undefined, [{ name: 'Course', sets: 2, reps: '8 min', notes: 'Récup 5 min marche entre chaque' }]),
  rS(15, 5, 3, '🎉 Premier run de 20 min sans s\'arrêter ! Tu y es presque.', [{ name: 'Course continue', sets: 1, reps: '20 min', notes: 'Allure très facile — tu DOIS pouvoir parler' }]),
  // Semaine 6
  rS(16, 6, 1, undefined, [
    { name: 'Course', sets: 2, reps: '5 min', notes: 'Récup 3 min' },
    { name: 'Course', sets: 2, reps: '3 min', notes: 'Récup 3 min' },
  ]),
  rS(17, 6, 2, undefined, [{ name: 'Course', sets: 2, reps: '10 min', notes: 'Récup 3 min marche' }]),
  rS(18, 6, 3, undefined, [{ name: 'Course continue', sets: 1, reps: '22 min' }]),
  // Semaine 7
  rS(19, 7, 1, 'L\'allure n\'a pas d\'importance. Tenir le temps, c\'est tout.', [{ name: 'Course continue', sets: 1, reps: '25 min' }]),
  rS(20, 7, 2, undefined, [{ name: 'Course continue', sets: 1, reps: '25 min' }]),
  rS(21, 7, 3, undefined, [{ name: 'Course continue', sets: 1, reps: '25 min' }]),
  // Semaine 8
  rS(22, 8, 1, undefined, [{ name: 'Course continue', sets: 1, reps: '28 min' }]),
  rS(23, 8, 2, undefined, [{ name: 'Course continue', sets: 1, reps: '28 min' }]),
  rS(24, 8, 3, '🏁 30 minutes sans s\'arrêter = environ 5 km. Tu l\'as fait !', [
    { name: 'Course continue', sets: 1, reps: '30 min', notes: '🏆 C\'est ton 5K ! Note ton temps.' },
  ]),
];

// ─── Programme 4 : Plan 10K ──────────────────────────────
// 10 semaines · 3x/semaine · 30 séances
// Prérequis : courir 30 min / 5K sans s'arrêter

const plan10kSessions: ProgramSession[] = [
  // Sem 1 — Consolidation
  rS(1,  1, 1, 'Semaine de mise en jambes. Allure très confortable.', [{ name: 'Footing facile', sets: 1, reps: '25 min', notes: 'Zone 2 — tu dois pouvoir parler' }]),
  rS(2,  1, 2, undefined, [{ name: 'Footing facile', sets: 1, reps: '25 min' }]),
  rS(3,  1, 3, 'Premier long run du plan.', [{ name: 'Footing facile', sets: 1, reps: '35 min' }]),
  // Sem 2
  rS(4,  2, 1, undefined, [
    { name: 'Footing', sets: 1, reps: '10 min' },
    { name: 'Accélérations', sets: 5, reps: '1 min', notes: 'Allure soutenue / 1 min récup marche' },
    { name: 'Footing', sets: 1, reps: '10 min' },
  ]),
  rS(5,  2, 2, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  rS(6,  2, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '40 min' }]),
  // Sem 3
  rS(7,  3, 1, undefined, [{ name: 'Footing', sets: 1, reps: '30 min' }]),
  rS(8,  3, 2, 'Tempo = allure 10K cible (inconfortable mais tenable 20-30 min).', [
    { name: 'Échauffement footing', sets: 1, reps: '10 min' },
    { name: 'Tempo (allure 10K)', sets: 1, reps: '10 min', notes: 'Effort soutenu, pas de conversation' },
    { name: 'Retour au calme footing', sets: 1, reps: '10 min' },
  ]),
  rS(9,  3, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '45 min' }]),
  // Sem 4 — Décharge
  rS(10, 4, 1, '⚡ Semaine de décharge. Volumes réduits, récupération active.', [{ name: 'Footing très facile', sets: 1, reps: '25 min' }]),
  rS(11, 4, 2, undefined, [{ name: 'Footing facile', sets: 1, reps: '20 min' }]),
  rS(12, 4, 3, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  // Sem 5
  rS(13, 5, 1, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  rS(14, 5, 2, undefined, [
    { name: 'Échauffement', sets: 1, reps: '10 min' },
    { name: 'Fractionné 1 km', sets: 4, reps: '1 km', notes: 'Allure 10K · Récup 2 min marche entre chaque' },
    { name: 'Retour au calme', sets: 1, reps: '10 min' },
  ]),
  rS(15, 5, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '50 min' }]),
  // Sem 6
  rS(16, 6, 1, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  rS(17, 6, 2, undefined, [
    { name: 'Échauffement', sets: 1, reps: '10 min' },
    { name: 'Fractionné 1 km', sets: 6, reps: '1 km', notes: 'Allure 10K · Récup 90 sec jogging' },
    { name: 'Retour au calme', sets: 1, reps: '10 min' },
  ]),
  rS(18, 6, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '55 min' }]),
  // Sem 7
  rS(19, 7, 1, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  rS(20, 7, 2, undefined, [
    { name: 'Échauffement', sets: 1, reps: '10 min' },
    { name: 'Tempo (allure 10K)', sets: 5, reps: '3 min', notes: 'Récup 2 min jogging entre chaque' },
    { name: 'Retour au calme', sets: 1, reps: '10 min' },
  ]),
  rS(21, 7, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '60 min' }]),
  // Sem 8
  rS(22, 8, 1, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  rS(23, 8, 2, 'La séance clé du plan. Tiens bon sur le tempo !', [
    { name: 'Échauffement', sets: 1, reps: '10 min' },
    { name: 'Tempo (allure 10K)', sets: 3, reps: '10 min', notes: 'Récup 2 min jogging' },
    { name: 'Retour au calme', sets: 1, reps: '10 min' },
  ]),
  rS(24, 8, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '65 min' }]),
  // Sem 9
  rS(25, 9, 1, undefined, [{ name: 'Footing facile', sets: 1, reps: '30 min' }]),
  rS(26, 9, 2, undefined, [
    { name: 'Échauffement', sets: 1, reps: '10 min' },
    { name: 'Fractionné 1 km', sets: 8, reps: '1 km', notes: 'Allure 10K · Récup 90 sec jogging' },
    { name: 'Retour au calme', sets: 1, reps: '10 min' },
  ]),
  rS(27, 9, 3, undefined, [{ name: 'Long run facile', sets: 1, reps: '70 min' }]),
  // Sem 10 — Affûtage
  rS(28, 10, 1, '⚡ Semaine d\'affûtage. Volumes réduits, conserve tes jambes.', [{ name: 'Footing facile', sets: 1, reps: '25 min' }]),
  rS(29, 10, 2, undefined, [
    { name: 'Footing facile', sets: 1, reps: '15 min' },
    { name: 'Strides (accélérations)', sets: 4, reps: '20 sec', notes: 'Allure rapide / récup 40 sec marche — réveiller les jambes' },
  ]),
  rS(30, 10, 3, '🏁 RACE DAY. Bonne chance ! Pars prudemment la première moitié.', [
    { name: '10K RACE', sets: 1, reps: '10 km', notes: '🏆 Ton 10K ! Démarre à allure cible, accélère les 2 derniers km.' },
  ]),
];

// ─── Programme 5 : 5/3/1 Wendler (Boring But Big) ────────
// 4 semaines par cycle · 4j/semaine · 16 séances
// Puis recommencer avec +2.5 kg (upper) / +5 kg (lower)

function w531(
  num: number, week: number,
  lift: string, bbb: string,
  scheme: string, pcts: string, deload: boolean,
  assistance: ProgramMovement[]
): ProgramSession {
  return {
    number: num,
    title: `Sem ${week} — ${lift}`,
    notes: deload
      ? 'Semaine de décharge. Pas d\'AMRAP, stop aux reps prescrites. Récupération active.'
      : `TM = Training Max = 90% de ton 1RM. ${pcts}. Dernier set : AMRAP (max reps propres).`,
    movements: [
      {
        name: lift,
        sets: 3,
        reps: scheme,
        notes: deload ? pcts : pcts + ' — 3-5 séries d\'échauffement progressives avant',
      },
      {
        name: `${bbb} — BBB`,
        sets: 5,
        reps: '10',
        notes: '50% du TM. Repos 60-90 sec. Peut être remplacé par un autre exercice complémentaire.',
      },
      ...assistance,
    ],
  };
}

const squat531Asst: ProgramMovement[] = [
  { name: 'Leg curl', sets: 3, reps: '10', notes: 'Amplitude complète' },
  { name: 'Ab Wheel', sets: 3, reps: '10' },
];
const bench531Asst: ProgramMovement[] = [
  { name: 'Rowing barre (ou haltères)', sets: 3, reps: '10', notes: 'Dos horizontal' },
  { name: 'Tricep pushdown', sets: 3, reps: '15' },
];
const dead531Asst: ProgramMovement[] = [
  { name: 'Lat pulldown (ou Traction)', sets: 3, reps: '10' },
  { name: 'Gainage planche', sets: 3, reps: '45 sec' },
];
const ohp531Asst: ProgramMovement[] = [
  { name: 'Traction / Chin-up', sets: 3, reps: 'AMRAP', notes: 'Prise supination' },
  { name: 'Curl biceps', sets: 3, reps: '12' },
];

const wendler531Sessions: ProgramSession[] = [
  // Semaine 1 — 3×5 (65% / 75% / 85% TM)
  w531(1,  1, 'Squat',         'Squat',         '5 / 5 / 5+',  '65% / 75% / 85% TM', false, squat531Asst),
  w531(2,  1, 'Développé couché', 'Développé couché', '5 / 5 / 5+', '65% / 75% / 85% TM', false, bench531Asst),
  w531(3,  1, 'Soulevé de terre', 'Soulevé de terre', '5 / 5 / 5+', '65% / 75% / 85% TM', false, dead531Asst),
  w531(4,  1, 'Développé militaire', 'Développé militaire', '5 / 5 / 5+', '65% / 75% / 85% TM', false, ohp531Asst),
  // Semaine 2 — 3×3 (70% / 80% / 90% TM)
  w531(5,  2, 'Squat',         'Squat',         '3 / 3 / 3+',  '70% / 80% / 90% TM', false, squat531Asst),
  w531(6,  2, 'Développé couché', 'Développé couché', '3 / 3 / 3+', '70% / 80% / 90% TM', false, bench531Asst),
  w531(7,  2, 'Soulevé de terre', 'Soulevé de terre', '3 / 3 / 3+', '70% / 80% / 90% TM', false, dead531Asst),
  w531(8,  2, 'Développé militaire', 'Développé militaire', '3 / 3 / 3+', '70% / 80% / 90% TM', false, ohp531Asst),
  // Semaine 3 — 5/3/1+ (75% / 85% / 95% TM)
  w531(9,  3, 'Squat',         'Squat',         '5 / 3 / 1+',  '75% / 85% / 95% TM', false, squat531Asst),
  w531(10, 3, 'Développé couché', 'Développé couché', '5 / 3 / 1+', '75% / 85% / 95% TM', false, bench531Asst),
  w531(11, 3, 'Soulevé de terre', 'Soulevé de terre', '5 / 3 / 1+', '75% / 85% / 95% TM', false, dead531Asst),
  w531(12, 3, 'Développé militaire', 'Développé militaire', '5 / 3 / 1+', '75% / 85% / 95% TM', false, ohp531Asst),
  // Semaine 4 — Décharge (40% / 50% / 60% TM)
  w531(13, 4, 'Squat',         'Squat',         '5 / 5 / 5',   '40% / 50% / 60% TM', true, squat531Asst),
  w531(14, 4, 'Développé couché', 'Développé couché', '5 / 5 / 5', '40% / 50% / 60% TM', true, bench531Asst),
  w531(15, 4, 'Soulevé de terre', 'Soulevé de terre', '5 / 5 / 5', '40% / 50% / 60% TM', true, dead531Asst),
  {
    number: 16,
    title: 'Sem 4 — Développé militaire 🔁',
    notes: 'Fin du cycle ! Ajoute 2.5 kg aux exercices upper (DC, DM) et 5 kg aux exercices lower (Squat, SDT) avant de recommencer le cycle.',
    movements: [
      { name: 'Développé militaire', sets: 3, reps: '5 / 5 / 5', notes: '40% / 50% / 60% TM' },
      { name: 'Développé militaire — BBB', sets: 5, reps: '10', notes: '50% TM' },
      ...ohp531Asst,
    ],
  },
];

// ─── Générateur Pavel dynamique ──────────────────────────
//
// Vraie structure du Fighter Pull-up Program :
//   - Chaque SEMAINE, le top set T augmente de 1  →  T = M + (W-1)
//   - Chaque JOUR, le bas de l'échelle remonte d'un cran
//
//   Exemple M=5 :
//   W1J1 : 5-4-3-2-1   W1J2 : 5-4-3-2-2   W1J3 : 5-4-3-3-2
//   W1J4 : 5-4-4-3-2   W1J5 : 5-5-4-3-2   W2J1 : 6-5-4-3-2 …
//
//   Formule : reps[i] = T - (D + i > 5 ? i-1 : i), min 1

export function generatePavelSessions(maxReps: number): ProgramSession[] {
  const M = Math.max(3, Math.round(maxReps));
  const result: ProgramSession[] = [];
  let num = 0;

  for (let w = 1; w <= 6; w++) {
    const T = M + (w - 1); // top set de la semaine
    for (let d = 1; d <= 5; d++) {
      num++;

      // Séance finale W6J5 — test max
      if (w === 6 && d === 5) {
        const lastReps = Array.from({ length: 5 }, (_, i) =>
          Math.max(T - (d + i > 5 ? i - 1 : i), 1),
        );
        result.push({
          number: num,
          title: 'Semaine 6 — Jour 5 🏁',
          notes: '🎯 Test final. Après ton dernier set, repose 10 min et fais ton MAX absolu de tractions.',
          movements: [
            { name: 'Traction', sets: 5, reps: lastReps.join(' / '), notes: 'Dernier entraînement avant le test.' },
            { name: 'Test max tractions', sets: 1, reps: 'MAX', notes: '🏆 Après 10 min de repos — ton nouveau record !' },
          ],
        });
        continue;
      }

      const reps = Array.from({ length: 5 }, (_, i) =>
        Math.max(T - (d + i > 5 ? i - 1 : i), 1),
      );
      const total = reps.reduce((a, b) => a + b, 0);

      result.push({
        number: num,
        title: `Semaine ${w} — Jour ${d}`,
        notes: `Total : ${total} reps. Repos 3 min entre séries. Ne jamais aller à l'échec — stop 1-2 reps avant.`,
        movements: [{
          name: 'Traction',
          sets: 5,
          reps: reps.join(' / '),
          notes: "Prise pronation (paumes vers l'avant). Corps tendu, descente 2-3 sec.",
        }],
      });
    }
  }
  return result;
}

// ─── Générateur Wendler 5/3/1 dynamique ──────────────────

export type WendlerConfig = {
  squat:    number;   // 1RM Squat (kg)
  bench:    number;   // 1RM Développé couché (kg)
  deadlift: number;   // 1RM Soulevé de terre (kg)
  ohp:      number;   // 1RM Développé militaire (kg)
  // Mouvements actifs (true par défaut)
  squat_on?:    boolean;
  bench_on?:    boolean;
  deadlift_on?: boolean;
  ohp_on?:      boolean;
};

// Les 4 mouvements Wendler avec leur clé de config
export const WENDLER_LIFTS = [
  { key: 'squat',    onKey: 'squat_on',    label: '🦵 Squat',                liftName: 'Squat'                },
  { key: 'bench',    onKey: 'bench_on',    label: '🏋️ Développé couché',     liftName: 'Développé couché'     },
  { key: 'deadlift', onKey: 'deadlift_on', label: '⬆️ Soulevé de terre',      liftName: 'Soulevé de terre'     },
  { key: 'ohp',      onKey: 'ohp_on',      label: '🙌 Développé militaire',   liftName: 'Développé militaire'  },
] as const;

function round2_5(kg: number): number {
  return Math.round(kg / 2.5) * 2.5;
}

export function generateWendlerSessions(config?: WendlerConfig): ProgramSession[] {
  if (!config) return wendler531Sessions;

  // Mouvements actifs (on par défaut si clé absente)
  const activeLifts = new Set(
    WENDLER_LIFTS
      .filter(l => config[l.onKey] !== false)
      .map(l => l.liftName)
  );

  const liftRM: Record<string, number> = {
    'Squat':               config.squat,
    'Développé couché':    config.bench,
    'Soulevé de terre':    config.deadlift,
    'Développé militaire': config.ohp,
  };

  const replaceKg = (text: string, tm: number): string => {
    // "65% / 75% / 85% TM"  →  "58.5 / 67.5 / 76.5 kg"
    let out = text.replace(
      /(\d+)%\s*\/\s*(\d+)%\s*\/\s*(\d+)%\s*TM/g,
      (_, p1, p2, p3) =>
        `${round2_5(tm * +p1 / 100)} / ${round2_5(tm * +p2 / 100)} / ${round2_5(tm * +p3 / 100)} kg`,
    );
    // "50% du TM"  →  "45 kg (TM : 90 kg)"
    out = out.replace(
      /50%\s*du\s*TM/g,
      `${round2_5(tm * 0.5)} kg (TM : ${tm} kg)`,
    );
    return out;
  };

  return wendler531Sessions
    .filter(session => {
      // Garder la séance seulement si son mouvement est actif
      const liftName = Object.keys(liftRM).find(k => session.title.includes(k));
      return !liftName || (activeLifts as Set<string>).has(liftName);
    })
    .map((session, idx) => ({ ...session, number: idx + 1 })) // renuméroter
    .map(session => {
    const liftName = Object.keys(liftRM).find(k => session.title.includes(k));
    if (!liftName) return session;
    const tm = round2_5(liftRM[liftName] * 0.9);

    const updatedNotes = session.notes
      ? replaceKg(session.notes, tm).replace(
          'TM = Training Max = 90% de ton 1RM.',
          `TM = ${tm} kg  (90% × ${liftRM[liftName]} kg).`,
        )
      : session.notes;

    const updatedMovements = session.movements.map(mov => ({
      ...mov,
      notes: mov.notes ? replaceKg(mov.notes, tm) : mov.notes,
    }));

    return { ...session, notes: updatedNotes, movements: updatedMovements };
  });
}

// ─── Générateur Force Stricte (calisthenics) ─────────────

export type ForceStricteConfig = {
  // Sélection des mouvements (true par défaut si clé absente)
  pullup_on?: boolean;
  pushup_on?: boolean;
  hspu_on?:   boolean;
  dips_on?:   boolean;
  // Max reps mesurés en Séance 0 (0 = pas encore connu)
  pullup:  number;
  hspu:    number;
  pushup:  number;
  dips:    number;
  // true = Séance 0 pas encore faite (maxes à entrer après)
  needs_maxes?: boolean;
};

export const FORCE_STRICTE_MOVEMENTS = [
  { key: 'pullup' as const, onKey: 'pullup_on' as const, movName: 'Pull-Ups',           label: '🔝 Pull-Ups',           session: 'A' as const },
  { key: 'pushup' as const, onKey: 'pushup_on' as const, movName: 'Push-Ups',           label: '💪 Push-Ups',           session: 'A' as const },
  { key: 'hspu'   as const, onKey: 'hspu_on'   as const, movName: 'HandStand Push-Ups', label: '🙃 HandStand Push-Ups', session: 'B' as const },
  { key: 'dips'   as const, onKey: 'dips_on'   as const, movName: 'Dips',               label: '⬇️ Dips',               session: 'B' as const },
] as const;

// Échauffement standard Force Stricte (inclus dans chaque séance d'entraînement)
export const FS_WARMUP: ProgramMovement = {
  name: '🔥 Échauffement',
  sets: 1,
  reps: '6-8 min',
  notes: 'Jumping jacks 90s · Cercles bras 30s × 2 · Dead hang 20s × 3 · Pompes légères × 8',
};

// Progression sur 8 semaines : [sets, % du max]
const FS_PROGRESSION: [number, number][] = [
  [3, 0.50],  // Sem 1 — Foundation
  [4, 0.50],  // Sem 2 — Volume
  [4, 0.55],  // Sem 3 — Progression
  [4, 0.60],  // Sem 4 — Progression
  [5, 0.65],  // Sem 5 — Intensité
  [5, 0.70],  // Sem 6 — Pic de volume
  [4, 0.75],  // Sem 7 — Pic de force
  [3, 0.55],  // Sem 8 — Décharge
];

const FS_WEEK_NOTES: (string | undefined)[] = [
  'Première semaine — prends tes marques, arrête toi toujours 1-2 reps avant l\'échec.',
  undefined,
  undefined,
  undefined,
  'Semaine 5 — la charge monte, concentre-toi sur la technique.',
  undefined,
  'Semaine 7 — pic d\'intensité, récupère bien entre les séances.',
  '🧘 Semaine de décharge — allège le volume, prépare ton corps pour les tests.',
];

export function generateForceStricteSessions(config: ForceStricteConfig): ProgramSession[] {
  // Mouvements sélectionnés (on par défaut si clé absente)
  const selected = FORCE_STRICTE_MOVEMENTS.filter(m => config[m.onKey] !== false);

  // ── Séance 0 : test des maxes (toujours en première position) ──
  const seance0: ProgramSession = {
    number: 1,
    title: '🧪 Séance 0 — Test des maxes',
    notes: 'Échauffement complet avant chaque mouvement. Repose-toi 5 min entre chaque test. Note bien tes résultats — ils servent de base pour les 8 semaines du programme.',
    movements: [
      FS_WARMUP,
      ...selected.map(m => ({
        name: m.movName,
        sets: 1,
        reps: 'MAX',
        notes: '🎯 Note ton max de reps strictes · repos 5 min avant le test',
      })),
    ],
  };

  // Si les maxes ne sont pas encore connus → retourner seulement Séance 0
  const anyMax = selected.some(m => (config[m.key] ?? 0) > 0);
  if (config.needs_maxes !== false || !anyMax) {
    return [seance0];
  }

  // ── Programme 8 semaines basé sur les maxes réels ─────────────
  const sessions: ProgramSession[] = [seance0];
  let num = 2;

  for (let w = 0; w < 8; w++) {
    const [sets, pct] = FS_PROGRESSION[w];
    const weekNote = FS_WEEK_NOTES[w];

    // Séance A : Pull-Ups + Push-Ups (avec échauffement)
    const movA: ProgramMovement[] = [FS_WARMUP];
    for (const m of selected.filter(s => s.session === 'A')) {
      const max = config[m.key] ?? 0;
      if (max > 0) {
        const reps = Math.max(1, Math.round(max * pct));
        movA.push({
          name: m.movName, sets, reps: String(reps),
          notes: `${reps} reps strictes · ton max = ${max} · repos ${m.key === 'pullup' ? '2-3 min' : '90 sec'} entre séries`,
        });
      }
    }
    if (movA.length > 1) {
      sessions.push({ number: num++, title: `Sem ${w + 1} — Séance A`, notes: weekNote, movements: movA });
    }

    // Séance B : HSPU + Dips (avec échauffement)
    const movB: ProgramMovement[] = [FS_WARMUP];
    for (const m of selected.filter(s => s.session === 'B')) {
      const max = config[m.key] ?? 0;
      if (max > 0) {
        const reps = Math.max(1, Math.round(max * pct));
        movB.push({
          name: m.movName, sets, reps: String(reps),
          notes: `${reps} reps strictes · ton max = ${max} · repos ${m.key === 'hspu' ? '2-3 min' : '90 sec'} entre séries`,
        });
      }
    }
    if (movB.length > 1) {
      sessions.push({ number: num++, title: `Sem ${w + 1} — Séance B`, notes: weekNote, movements: movB });
    }
  }

  // ── Test final : Semaine 9 ─────────────────────────────────────
  const testMov: ProgramMovement[] = [FS_WARMUP];
  for (const m of selected) {
    const max = config[m.key] ?? 0;
    if (max > 0) {
      testMov.push({
        name: m.movName, sets: 1, reps: 'MAX',
        notes: `🎯 Objectif : dépasser ${max} · repos 5 min avant le test`,
      });
    }
  }
  sessions.push({
    number: num,
    title: '🏆 Sem 9 — Test Final',
    notes: 'Repose-toi 2-3 jours avant cette séance. Teste chaque mouvement à fond reposé. Compare avec tes valeurs de départ !',
    movements: testMov,
  });

  return sessions;
}

// ─── Catalogue ────────────────────────────────────────────

export const PROGRAMS: ProgramTemplate[] = [
  {
    id: 'premiere-traction',
    name: 'Ma première Traction',
    emoji: '💪',
    description:
      'Programme progressif de 8 semaines pour réaliser ta première traction libre. ' +
      'Tu partiras des fondations (dead hangs, scapulaires, tractions australiennes) ' +
      'pour arriver aux tractions négatives, puis assistées, et enfin libre.',
    author: 'SpoRunFit',
    level: 'Débutant',
    category: 'Force',
    duration_weeks: 8,
    sessions_total: 24,
    frequency: '3x / semaine',
    goal: 'Réaliser sa première traction libre complète',
    equipment: 'Barre de traction, élastique de résistance',
    sessions: premiereTracSessions,
  },
  {
    id: 'tractions-pavel',
    name: 'Tractions Pavel Tsatsouline',
    emoji: '⚔️',
    description:
      'Le Fighter Pull-up Program de Pavel Tsatsouline. Principe : 5 séries par jour, ' +
      '5 jours par semaine, avec une échelle descendante de répétitions. ' +
      'On ne va JAMAIS à l\'échec — on s\'arrête toujours 1-2 reps avant. ' +
      'Prérequis : savoir faire au minimum 3 tractions consécutives propres.',
    author: 'Pavel Tsatsouline',
    level: 'Intermédiaire',
    category: 'Force',
    duration_weeks: 6,
    sessions_total: 30,
    frequency: '5x / semaine (lun → ven)',
    goal: 'Doubler son nombre de tractions max en 6 semaines',
    equipment: 'Barre de traction',
    sessions: generatePavelSessions(5), // défaut catalogue (M=5), recalculé avec la config user
  },
  {
    id: 'plan-5k',
    name: 'Plan 5K Débutant',
    emoji: '🏃',
    description:
      'Programme de 8 semaines inspiré du C25K (Couch to 5K). ' +
      'Tu partiras de zéro — alternance marche/course — pour arriver à courir ' +
      '30 minutes (≈ 5 km) sans t\'arrêter. Aucun prérequis de forme physique.',
    author: 'SpoRunFit',
    level: 'Débutant',
    category: 'Cardio',
    duration_weeks: 8,
    sessions_total: 24,
    frequency: '3x / semaine',
    goal: 'Courir 5 km sans s\'arrêter en 30 minutes',
    equipment: 'Chaussures de running',
    sessions: plan5kSessions,
  },
  {
    id: 'plan-10k',
    name: 'Plan 10K',
    emoji: '🏅',
    description:
      'Plan de 10 semaines pour passer du 5K au 10K. ' +
      'Mélange de footings faciles, séances tempo et fractionnés kilomètre ' +
      'pour développer vitesse et endurance. Prérequis : courir 30 min sans s\'arrêter.',
    author: 'SpoRunFit',
    level: 'Intermédiaire',
    category: 'Cardio',
    duration_weeks: 10,
    sessions_total: 30,
    frequency: '3x / semaine',
    goal: 'Courir 10 km en compétition ou en entraînement',
    equipment: 'Chaussures de running',
    sessions: plan10kSessions,
  },
  {
    id: 'wendler-531',
    name: '5/3/1 Wendler — Boring But Big',
    emoji: '🏋️',
    description:
      'Le programme de force de Jim Wendler. Un cycle de 4 semaines (3 semaines ' +
      'de progression + 1 semaine de décharge) basé sur ton Training Max (90% du 1RM). ' +
      'Méthode "Boring But Big" : 5×10 à 50% TM après chaque mouvement principal. ' +
      'Prérequis : maîtriser les 4 mouvements de base.',
    author: 'Jim Wendler',
    level: 'Intermédiaire',
    category: 'Force',
    duration_weeks: 4,
    sessions_total: 16,
    frequency: '4x / semaine',
    goal: 'Progresser régulièrement sur Squat, Développé couché, Soulevé de terre et Développé militaire',
    equipment: 'Barre, disques, rack squat, banc de développé',
    sessions: wendler531Sessions,
  },
  {
    id: 'force-stricte',
    name: 'Force Stricte — Sans Matériel',
    emoji: '🤸',
    description:
      'Programme 8 semaines pour exploser tes maxes au poids de corps. ' +
      'Tu renseignes ton max actuel sur Pull-Ups, HandStand Push-Ups, Push-Ups et Dips — ' +
      'le programme calcule toutes les charges et progressions automatiquement. ' +
      '2 séances/semaine. Semaine 9 : test final pour mesurer ta progression.',
    author: 'SpoRunFit',
    level: 'Intermédiaire',
    category: 'Force',
    duration_weeks: 9,
    sessions_total: 17,
    frequency: '2x / semaine',
    goal: 'Maximiser ses reps au poids de corps sur 4 mouvements fondamentaux',
    equipment: 'Barre de traction · Sol · Parallettes ou chaise (Dips)',
    sessions: [],  // généré dynamiquement via generateForceStricteSessions
  },
];

export function getProgramById(id: string): ProgramTemplate | undefined {
  return PROGRAMS.find(p => p.id === id);
}
