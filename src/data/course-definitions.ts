export type SessionSeed = {
  code: string;
  weekday: string;
  start: string;
  end: string;
  level: string;
  capacity: number;
};

export type PlanSeed = {
  label: string;
  months: number;
  price: number;
  discountPct?: number;
  description?: string;
};

export type CourseSeed = {
  id: string;
  title: string;
  modality:
    | "REDACAO"
    | "EXATAS"
    | "MATEMATICA"
    | "GRAMATICA";
  description: string;
  materials: string;
  audience: string;
  bonusLimit?: number;
  sessions: SessionSeed[];
  plans: PlanSeed[];
};

export const COURSE_DEFINITIONS: CourseSeed[] = [
  {
    id: "redacao",
    title: "Redação",
    modality: "REDACAO",
    description:
      "Metodologia autoral focada em repertório atualizado, simulados guiados e correções premium alinhadas aos principais vestibulares.",
    materials:
      "Apostila proprietária, simulados semanais comentados, banco de temas inéditos e analisador de redação com inteligência assistida.",
    audience: "Ensino Fundamental e Ensino Médio",
    bonusLimit: 10,
    sessions: [
      { code: "R1", weekday: "Terça-feira", start: "18:00", end: "19:30", level: "Ensino Médio", capacity: 18 },
      { code: "R3", weekday: "Terça-feira", start: "19:30", end: "21:00", level: "Ensino Médio", capacity: 18 },
      { code: "R2", weekday: "Quinta-feira", start: "18:00", end: "19:30", level: "Ensino Médio", capacity: 18 },
      { code: "R4", weekday: "Quinta-feira", start: "19:30", end: "21:00", level: "Ensino Médio", capacity: 18 },
      { code: "R5", weekday: "Sábado", start: "09:30", end: "11:00", level: "Ensino Médio", capacity: 20 },
      { code: "R6", weekday: "Sábado", start: "11:00", end: "12:30", level: "Ensino Médio", capacity: 20 },
      { code: "R7", weekday: "Sábado", start: "17:30", end: "19:00", level: "Ensino Médio", capacity: 18 },
      { code: "R8", weekday: "Sábado", start: "14:30", end: "15:30", level: "Ensino Fundamental", capacity: 16 },
      { code: "R9", weekday: "Sábado", start: "15:30", end: "17:00", level: "Ensino Fundamental", capacity: 16 },
    ],
    plans: [
      { label: "Mensal", months: 1, price: 300 },
      { label: "Bimestral (5% OFF)", months: 2, price: 570, discountPct: 5 },
      { label: "Trimestral (5% OFF)", months: 3, price: 855, discountPct: 5 },
      { label: "1º Semestre (5 meses)", months: 5, price: 1425, discountPct: 5 },
      { label: "2º Semestre (4 meses)", months: 4, price: 1140, discountPct: 5 },
      { label: "Anual (10% OFF)", months: 9, price: 2430, discountPct: 10 },
    ],
  },
  {
    id: "exatas",
    title: "Exatas (Química, Física e Matemática)",
    modality: "EXATAS",
    description:
      "Acompanhamento integrado de Química, Física e Matemática com resolução comentada e simulados multidisciplinares.",
    materials:
      "Mapas mentais, videoaulas on-demand, laboratório de questões e plantões de dúvidas semanais.",
    audience: "Ensino Médio",
    sessions: [
      { code: "EX1", weekday: "Segunda-feira", start: "19:00", end: "22:00", level: "Ensino Médio", capacity: 24 },
    ],
    plans: [
      { label: "Mensal", months: 1, price: 350 },
      { label: "Bimestral (5% OFF)", months: 2, price: 665, discountPct: 5 },
      { label: "Trimestral (5% OFF)", months: 3, price: 997.5, discountPct: 5 },
      { label: "1º Semestre (5 meses)", months: 5, price: 1662.5, discountPct: 5 },
      { label: "2º Semestre (4 meses)", months: 4, price: 1330, discountPct: 5 },
      { label: "Anual (10% OFF)", months: 9, price: 2835, discountPct: 10 },
    ],
  },
  {
    id: "matematica",
    title: "Matemática",
    modality: "MATEMATICA",
    description:
      "Turmas personalizadas que combinam exercícios progressivos, trilhas de aprendizado e acompanhamento individual por metas.",
    materials:
      "Coleção exclusiva com trilhas gamificadas, listas semanais comentadas e simulados bimestrais.",
    audience: "Ensino Fundamental e Ensino Médio",
    sessions: [
      { code: "M1", weekday: "Quarta-feira", start: "19:40", end: "20:10", level: "Ensino Médio", capacity: 16 },
      { code: "M2", weekday: "Sábado", start: "07:30", end: "09:00", level: "Ensino Médio", capacity: 16 },
      { code: "M3", weekday: "Sábado", start: "18:40", end: "19:40", level: "Ensino Fundamental", capacity: 16 },
    ],
    plans: [
      { label: "Mensal", months: 1, price: 300 },
      { label: "Bimestral (5% OFF)", months: 2, price: 570, discountPct: 5 },
      { label: "Trimestral (5% OFF)", months: 3, price: 855, discountPct: 5 },
      { label: "1º Semestre (5 meses)", months: 5, price: 1425, discountPct: 5 },
      { label: "2º Semestre (4 meses)", months: 4, price: 1140, discountPct: 5 },
      { label: "Anual (10% OFF)", months: 9, price: 2430, discountPct: 10 },
    ],
  },
  {
    id: "gramatica",
    title: "Gramática",
    modality: "GRAMATICA",
    description:
      "Programa avançado com foco em gramática aplicada, interpretação e oratória para dominar a parte objetiva das provas.",
    materials:
      "Apostilas premium, quizzes mobile, simulados objetivos e roteiros de estudos semanais.",
    audience: "Ensino Médio",
    sessions: [
      { code: "G1", weekday: "Sexta-feira", start: "19:30", end: "21:00", level: "Ensino Médio", capacity: 22 },
    ],
    plans: [
      { label: "Mensal", months: 1, price: 200 },
      { label: "Bimestral (5% OFF)", months: 2, price: 380, discountPct: 5 },
      { label: "Trimestral (5% OFF)", months: 3, price: 570, discountPct: 5 },
      { label: "1º Semestre (5 meses)", months: 5, price: 950, discountPct: 5 },
      { label: "2º Semestre (4 meses)", months: 4, price: 760, discountPct: 5 },
      { label: "Anual (10% OFF)", months: 9, price: 1620, discountPct: 10 },
    ],
  },
];
