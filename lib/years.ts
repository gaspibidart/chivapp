// Helpers de año fiscal compartidos por Chivos y Luzu.
// El año de una campaña/evento lo define su FECHA DE COBRO (no la de publicación).
// Se parsea el string directamente (YYYY-MM-DD) para evitar corrimientos por zona horaria.

export const yearOfDate = (value?: string): number => {
  const m = /^(\d{4})-(\d{2})/.exec(String(value ?? ""));
  return m ? Number(m[1]) : -1;
};

// 0 = enero ... 11 = diciembre, -1 si la fecha es inválida
export const monthOfDate = (value?: string): number => {
  const m = /^(\d{4})-(\d{2})/.exec(String(value ?? ""));
  return m ? Number(m[2]) - 1 : -1;
};

// Año que se está gestionando: el siguiente al último cerrado.
// Si todavía no se cerró ninguno, el más antiguo con datos (tope: el año actual).
export function computeOpenYear(
  closed: number[],
  dataYears: number[],
  now: Date = new Date()
): number {
  if (closed.length) return Math.max(...closed) + 1;
  const valid = dataYears.filter((y) => y > 0);
  const cur = now.getFullYear();
  return valid.length ? Math.min(cur, Math.min(...valid)) : cur;
}

// Años que van al Historial: los cerrados + cualquier dato anterior al año abierto.
export function computeHistoryYears(
  closed: number[],
  dataYears: number[],
  openYear: number
): number[] {
  const set = new Set<number>(closed);
  dataYears.forEach((y) => {
    if (y > 0 && y < openYear) set.add(y);
  });
  return Array.from(set).sort((a, b) => b - a);
}

// El cierre se habilita desde diciembre del año abierto (o si ese año ya pasó).
export function canCloseYear(openYear: number, now: Date = new Date()): boolean {
  const cur = now.getFullYear();
  return cur > openYear || (cur === openYear && now.getMonth() === 11);
}
