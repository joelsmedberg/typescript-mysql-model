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

export function graphqlCompliantToValue(value: string) {
  if (!value) {
    return value;
  }
  const translations = {
    "AO__": "Å",
    "AE__": "Ä",
    "OE__": "Ö"
  };
  Object.entries(translations).forEach(t => {
    while (value.indexOf(t[0]) !== -1) {
      value = value.replace(t[0], t[1])
    }
  });
  return value;
}

export function valueToGraphqlCompliant(value: string) {
  if (!value) {
    return value;
  }
  const translations = {
    "Å": "AO__",
    "Ä": "AE__",
    "Ö": "OE__",
  };
  Object.entries(translations).forEach(t => {
    while (value.indexOf(t[0]) !== -1) {
      value = value.replace(t[0], t[1])
    }
  });
  return value;
}