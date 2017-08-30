/**
 * Autogenerated, do not modify
 */
/* tslint:disable */
import { IDatabaseColumn, IDatabaseSchema } from "./mysql-database-definition";

export abstract class SchemaOperator {

  protected definition: IDatabaseSchema;
  /**
   * Return a copy of the object without any primary keys
   */
  protected removePrimaryKeys<T>(tableName: string, data: T): T {
    const filtered = JSON.parse(JSON.stringify(data)); // copy
    this.getPrimaryKeyNames(tableName).forEach(pk => delete filtered[pk]);
    return filtered;
  }

  protected retainPrimaryKeys<T>(tableName: string, data: T): T {
    const keyData: any = {};
    this.getPrimaryKeyNames(tableName).forEach(key => keyData[key] = (data as any)[key]);
    return keyData;
  }

  protected getPkCols(tableName: string): IDatabaseColumn[] {
    if (!tableName) {
      return null;
    }
    const cols: IDatabaseColumn[] = [];
    const table = this.definition.tables[tableName];
    for (const key in table) {
      if (table[key].isPrimary) {
        cols.push(table[key]);
      }
    }
    return cols;
  }

  /**
   * return a new object where with only attributes that have
   * a corresponding column for given table
   * @param table
   * @param data
   */
  protected stripNoneBelonging<T>(tableName: string, data: T): T {
    const table = this.definition.tables[tableName];
    const copy = {} as any;
    Object.keys(data).filter(key=>!!table[key]).forEach(key => {
      copy[key] = (data as any)[key];
    });
    return copy;
  }

  /**
   * List the names of all primary keys in a table
   * @param tableName
   */
  protected getPrimaryKeyNames(tableName: string): string[] {
    const cols = this.getPkCols(tableName);
    if (!cols || cols.length === 0) {
      return null;
    }
    return cols.map(col => col.field);
  }
}