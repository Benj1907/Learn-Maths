import type {
  Difficulty,
  DivisionQuestion,
  ExerciseQuestion,
  FractionAdditionQuestion,
  FractionMultiplicationQuestion,
} from '@/types'

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  return b === 0 ? a : gcd(b, a % b)
}

function simplifyFraction(num: number, den: number): { num: number; den: number } {
  const g = gcd(Math.abs(num), Math.abs(den))
  return { num: num / g, den: den / g }
}

function fractionToString(num: number, den: number): string {
  if (den === 1) return `${num}`
  return `${num}/${den}`
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateDivisionQuestion(difficulty: Difficulty = 'noire'): DivisionQuestion {
  const divisors =
    difficulty === 'verte' ? [2, 5, 10] :
    difficulty === 'orange' ? [2, 4, 5, 10] :
    [2, 4, 5, 8, 10, 20, 25]
  const maxInt = difficulty === 'verte' ? 10 : difficulty === 'orange' ? 15 : 20
  const divisor = divisors[randomInt(0, divisors.length - 1)]
  const intPart = randomInt(1, maxInt)
  const decimalSteps = randomInt(1, divisor - 1)
  const dividend = intPart * divisor + decimalSteps
  return { type: 'division_decimale', dividend, divisor, input_type: 'free' }
}

export function getDivisionAnswer(q: DivisionQuestion): string {
  const result = q.dividend / q.divisor
  // Round to avoid floating-point noise
  return String(Math.round(result * 10000) / 10000)
}

const FRACTION_DENS: Record<Difficulty, number[]> = {
  verte: [2, 3, 4, 5],
  orange: [2, 3, 4, 5, 6, 8, 10],
  noire: [2, 3, 4, 5, 6, 8, 10, 12],
}

export function generateFractionAdditionQuestion(difficulty: Difficulty = 'noire'): FractionAdditionQuestion {
  const dens = FRACTION_DENS[difficulty]
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let den1 = dens[randomInt(0, dens.length - 1)]
    let den2: number
    if (difficulty === 'verte') {
      // Same denominator only
      den2 = den1
    } else if (difficulty === 'orange') {
      // den2 is a multiple of den1 (so LCD = den2), making it simpler to reduce
      const multiples = dens.filter((d) => d % den1 === 0 && d !== den1)
      den2 = multiples.length > 0 ? multiples[randomInt(0, multiples.length - 1)] : den1
    } else {
      den2 = dens[randomInt(0, dens.length - 1)]
    }
    const num1 = randomInt(1, den1 - 1)
    const num2 = randomInt(1, den2 - 1)
    const operation: '+' | '-' = difficulty === 'verte' ? '+' : Math.random() > 0.5 ? '+' : '-'

    const lcmVal = (den1 * den2) / gcd(den1, den2)
    const resultNum =
      operation === '+'
        ? num1 * (lcmVal / den1) + num2 * (lcmVal / den2)
        : num1 * (lcmVal / den1) - num2 * (lcmVal / den2)

    if (resultNum <= 0) continue

    const simplified = simplifyFraction(resultNum, lcmVal)
    const correctStr = fractionToString(simplified.num, simplified.den)

    // Generate 3 distinct wrong options
    const options = new Set<string>([correctStr])
    let attempts = 0
    while (options.size < 4 && attempts < 50) {
      attempts++
      const wNum = Math.max(1, simplified.num + randomInt(-3, 3))
      const wDen = Math.max(2, simplified.den + randomInt(-2, 2))
      if (wNum === simplified.num && wDen === simplified.den) continue
      if (wNum >= wDen * 3) continue // avoid too-large fractions
      const ws = simplifyFraction(wNum, wDen)
      const wStr = fractionToString(ws.num, ws.den)
      if (wStr !== correctStr) options.add(wStr)
    }

    // Pad with fallback options if needed
    const fallbacks = ['1/2', '2/3', '3/4', '1/3', '5/6', '3/5']
    for (const f of fallbacks) {
      if (options.size >= 4) break
      if (!options.has(f)) options.add(f)
    }

    return {
      type: 'fractions_addition',
      operation,
      fraction1: { num: num1, den: den1 },
      fraction2: { num: num2, den: den2 },
      input_type: 'qcm',
      options: shuffle([...options]).slice(0, 4),
    }
  }
}

export function generateFractionMultiplicationQuestion(difficulty: Difficulty = 'noire'): FractionMultiplicationQuestion {
  const dens = FRACTION_DENS[difficulty]
  const den1 = dens[randomInt(0, dens.length - 1)]
  const den2 = dens[randomInt(0, dens.length - 1)]
  const num1 = randomInt(1, den1)
  const num2 = randomInt(1, den2)
  return {
    type: 'fractions_multiplication',
    fraction1: { num: num1, den: den1 },
    fraction2: { num: num2, den: den2 },
    input_type: 'free',
  }
}

export function getFractionMultiplicationAnswer(
  q: FractionMultiplicationQuestion
): { num: number; den: number } {
  const num = q.fraction1.num * q.fraction2.num
  const den = q.fraction1.den * q.fraction2.den
  return simplifyFraction(num, den)
}

export function getCorrectAnswer(q: ExerciseQuestion): string {
  switch (q.type) {
    case 'division_decimale':
      return getDivisionAnswer(q)
    case 'fractions_addition': {
      const den1 = q.fraction1.den
      const den2 = q.fraction2.den
      const lcmVal = (den1 * den2) / gcd(den1, den2)
      const resultNum =
        q.operation === '+'
          ? q.fraction1.num * (lcmVal / den1) + q.fraction2.num * (lcmVal / den2)
          : q.fraction1.num * (lcmVal / den1) - q.fraction2.num * (lcmVal / den2)
      const s = simplifyFraction(resultNum, lcmVal)
      return fractionToString(s.num, s.den)
    }
    case 'fractions_multiplication': {
      const ans = getFractionMultiplicationAnswer(q)
      return fractionToString(ans.num, ans.den)
    }
  }
}

export function getExplanation(q: ExerciseQuestion): string {
  switch (q.type) {
    case 'division_decimale': {
      const ans = getDivisionAnswer(q)
      return `${q.dividend} ÷ ${q.divisor} = ${ans}`
    }
    case 'fractions_addition': {
      const { fraction1: f1, fraction2: f2, operation } = q
      const lcmVal = (f1.den * f2.den) / gcd(f1.den, f2.den)
      const n1 = f1.num * (lcmVal / f1.den)
      const n2 = f2.num * (lcmVal / f2.den)
      const resultNum = operation === '+' ? n1 + n2 : n1 - n2
      const s = simplifyFraction(resultNum, lcmVal)
      if (f1.den === f2.den) {
        return `${f1.num}/${f1.den} ${operation} ${f2.num}/${f2.den} = (${f1.num} ${operation} ${f2.num})/${f1.den} = ${fractionToString(s.num, s.den)}`
      }
      return `On réduit au même dénominateur (${lcmVal}) : ${n1}/${lcmVal} ${operation} ${n2}/${lcmVal} = ${resultNum}/${lcmVal} = ${fractionToString(s.num, s.den)}`
    }
    case 'fractions_multiplication': {
      const { fraction1: f1, fraction2: f2 } = q
      const rawNum = f1.num * f2.num
      const rawDen = f1.den * f2.den
      const s = simplifyFraction(rawNum, rawDen)
      if (rawNum === s.num && rawDen === s.den) {
        return `${f1.num}/${f1.den} × ${f2.num}/${f2.den} = ${rawNum}/${rawDen}`
      }
      return `${f1.num}/${f1.den} × ${f2.num}/${f2.den} = ${rawNum}/${rawDen} = ${fractionToString(s.num, s.den)} (simplifié)`
    }
  }
}

export function normalizeAnswer(raw: string): string {
  // Accept French comma as decimal separator
  return raw.trim().replace(',', '.')
}

export function checkAnswer(q: ExerciseQuestion, userRaw: string): boolean {
  const correct = getCorrectAnswer(q)
  const user = normalizeAnswer(userRaw)

  if (q.type === 'division_decimale') {
    return parseFloat(user) === parseFloat(correct)
  }
  // Fraction answers: compare canonical string
  return user === correct
}
