import { Dict } from "../interface-builder";

export function groupBy<T>(items: T[], column: keyof T): Dict<T[]> {
  const keys = [...new Set(items.map(t => t[column] as unknown as string))];
  const dict: Dict<T[]> = {};
  keys.forEach(k => dict[k] = []);
  items.forEach(t => {
    const key = t[column] as unknown as string;
    dict[key].push(t);
  })
  return dict;
}

export function equalAsSets(a: string[], b: string[]) {
  if (a.length !== b.length) {
    return false;
  }
  return setsEqual(new Set(a), new Set(b));
}

export function setsEqual(aSet: Set<string>, bSet: Set<string>): boolean {
  if (aSet.size !== bSet.size) {
    return false;
  }
  return [...aSet].every(value => bSet.has(value));
}
