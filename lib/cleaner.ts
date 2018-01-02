import { IDatabaseSchema } from "./mysql-database-definition";
export class Cleaner {
  constructor(private schema: IDatabaseSchema) {

  }
  public cleanFromDictionary<T>(item: T | undefined | null, allowedKeys: { [key: string]: any }): T | undefined {
    if (!item) {
      return undefined;
    }
    const copy = JSON.parse(JSON.stringify(item));
    const itemsKeys = Object.keys(copy);
    const tKeys = new Set<string>(Object.keys(allowedKeys));
    for (const key of itemsKeys) {
      if (!tKeys.has(key)) {
        delete copy[key];
      }
    }
    delete copy.createdAt;
    return copy;
  }

  public cleanByArray<T>(item: T | undefined | null, allowedKeys: string[]): T | undefined {
    if (!item) {
      return undefined;
    }
    const dictionary = allowedKeys.reduce((obj: any, key) => {
      obj[key] = null;
      return obj;
    }, {});
    return this.cleanFromDictionary(item, dictionary);
  }

  public cleanByTableName<T>(item: T | undefined, tableName: string): T | undefined {
    const table = this.schema.tables[tableName];
    return this.cleanFromDictionary(item, table);
  }
}
