export type Role = 'parent' | 'child'
export type Topic = 'division_decimale' | 'fractions_addition' | 'fractions_multiplication'

export interface Profile {
  id: string
  role: Role
  display_name: string
  parent_id: string | null
  created_at: string
}

export interface ExerciseAttempt {
  id: string
  user_id: string
  topic: Topic
  question: Record<string, unknown>
  user_answer: string
  correct_answer: string
  is_correct: boolean
  attempted_at: string
}

export interface DivisionQuestion {
  type: 'division_decimale'
  dividend: number
  divisor: number
  input_type: 'free'
}

export interface FractionAdditionQuestion {
  type: 'fractions_addition'
  operation: '+' | '-'
  fraction1: { num: number; den: number }
  fraction2: { num: number; den: number }
  input_type: 'qcm'
  options: string[]
}

export interface FractionMultiplicationQuestion {
  type: 'fractions_multiplication'
  fraction1: { num: number; den: number }
  fraction2: { num: number; den: number }
  input_type: 'free'
}

export type ExerciseQuestion =
  | DivisionQuestion
  | FractionAdditionQuestion
  | FractionMultiplicationQuestion

export interface TopicProgress {
  topic: Topic
  total: number
  correct: number
  percentage: number
}

export const TOPIC_LABELS: Record<Topic, string> = {
  division_decimale: 'Divisions décimales',
  fractions_addition: 'Fractions : + et −',
  fractions_multiplication: 'Fractions : × et simplification',
}

export const TOPIC_COLORS: Record<Topic, string> = {
  division_decimale: 'from-blue-400 to-blue-600',
  fractions_addition: 'from-purple-400 to-purple-600',
  fractions_multiplication: 'from-pink-400 to-pink-600',
}

export const TOPIC_ICONS: Record<Topic, string> = {
  division_decimale: '➗',
  fractions_addition: '½',
  fractions_multiplication: '×',
}

export type Grade = 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2' | 'sixieme'

export const GRADES: Grade[] = ['CP', 'CE1', 'CE2', 'CM1', 'CM2', 'sixieme']

export const GRADE_LABELS: Record<Grade, string> = {
  CP: 'CP',
  CE1: 'CE1',
  CE2: 'CE2',
  CM1: 'CM1',
  CM2: 'CM2',
  sixieme: '6ème',
}

export type Difficulty = 'verte' | 'orange' | 'noire'

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  verte: 'Ceinture verte',
  orange: 'Ceinture orange',
  noire: 'Ceinture noire',
}

export const DIFFICULTY_DESCRIPTIONS: Record<Difficulty, string> = {
  verte: 'Nombres simples, premiers pas',
  orange: 'Un peu plus difficile, on monte !',
  noire: 'Niveau expert, prête pour le défi ?',
}

export const DIFFICULTY_EMOJI: Record<Difficulty, string> = {
  verte: '🟢',
  orange: '🟠',
  noire: '⬛',
}
