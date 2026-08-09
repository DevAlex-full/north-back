/**
 * Correção funcional (pós-Fase 6.1) — camada centralizada de datas civis
 * em America/Sao_Paulo (fuso do usuário). Backend/Render costuma rodar em
 * UTC; sem esta camada, cálculos com `new Date(date)` + `setHours(0,0,0,0)`
 * usam o fuso do servidor, o que diverge do "hoje" do usuário à noite no
 * Brasil (quando o servidor em UTC já pode estar no dia seguinte).
 *
 * Toda regra de "hoje", "data selecionada" ou "intervalo diário" para
 * Task/DailyGoal/Dashboard deve passar por aqui — nunca usar
 * `new Date('YYYY-MM-DD')` nem `setHours()` diretamente para esses casos.
 */

const SP_TIME_ZONE = 'America/Sao_Paulo'

/** Offset de America/Sao_Paulo (em minutos, negativo = atrás de UTC) no instante informado. */
function getSPOffsetMinutes(instant: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: SP_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const parts: Record<string, string> = {}
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  // Intl pode devolver "24" para meia-noite em locales hour12:false; normaliza para "00".
  const hour = parts.hour === '24' ? '00' : parts.hour
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(hour),
    Number(parts.minute),
    Number(parts.second)
  )
  return (asUTC - instant.getTime()) / 60000
}

/** Formata um instante como data civil "YYYY-MM-DD" em America/Sao_Paulo. */
export function formatDateStringSP(date: Date): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: SP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return dtf.format(date)
}

/** Data civil de "hoje" em America/Sao_Paulo, como "YYYY-MM-DD". */
export function getTodayDateStringSP(): string {
  return formatDateStringSP(new Date())
}

/**
 * Converte uma data civil "YYYY-MM-DD" (a intenção do usuário, sem hora)
 * no instante UTC correspondente a 00:00:00 em America/Sao_Paulo naquele
 * dia — nunca `new Date('YYYY-MM-DD')`, que interpreta a string como
 * meia-noite UTC (fuso errado para o usuário).
 */
export function parseDateOnlySP(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  // Amostra o offset ao meio-dia UTC do dia (evita ambiguidade de borda; Brasil não tem mais horário de verão desde 2019, mas mantém a conta genérica).
  const offsetMinutes = getSPOffsetMinutes(new Date(Date.UTC(y, m - 1, d, 12)))
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMinutes * 60000)
}

/**
 * Desloca uma data civil "YYYY-MM-DD" por `days` dias (pode ser negativo)
 * — aritmética pura de calendário (via `Date.UTC`/`getUTCDate`), não
 * envolve fuso horário nem instante: 2026-08-05 + 1 = 2026-08-06,
 * 2026-08-05 - 30 = 2026-07-06.
 */
export function addDaysToDateStringSP(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d))
  utc.setUTCDate(utc.getUTCDate() + days)
  return utc.toISOString().slice(0, 10)
}

/**
 * Intervalo [start, end) do dia civil em America/Sao_Paulo. `end` é
 * calculado como o início do dia civil SEGUINTE (por data civil, via
 * `addDaysToDateStringSP` + `parseDateOnlySP`), não por soma de 24h em
 * milissegundos — assim a função permanece correta mesmo se alguma regra
 * de fuso mudar no futuro (ex: reintrodução de horário de verão).
 */
export function getDayRangeSP(date: string | Date): { start: Date; end: Date } {
  const dateStr = typeof date === 'string' ? date : formatDateStringSP(date)
  const start = parseDateOnlySP(dateStr)
  const nextDateStr = addDaysToDateStringSP(dateStr, 1)
  const end = parseDateOnlySP(nextDateStr)
  return { start, end }
}

/** Dia da semana (0=Dom..6=Sáb) do dia civil em America/Sao_Paulo — cálculo apenas de calendário, não depende de instante/fuso na leitura. */
export function getDayOfWeekSP(date: string | Date): number {
  const dateStr = typeof date === 'string' ? date : formatDateStringSP(date)
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

/** Hora atual (0-23) em America/Sao_Paulo — nunca `new Date().getHours()`, que reflete o fuso do servidor. */
export function getCurrentHourSP(): number {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: SP_TIME_ZONE, hour: '2-digit', hour12: false })
  const hour = dtf.format(new Date())
  return hour === '24' ? 0 : Number(hour)
}