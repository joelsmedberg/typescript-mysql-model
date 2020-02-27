import { IDatabaseSchema, IDatabaseTable } from "../mysql-database-definition";
import { EnumMerger } from "./enum-merger";
export interface IEnumHolder {
  table: string,
  field: string,
  optionHash?: string;
  replacedBy?: IEnumHolder
  replacementFor?: IEnumHolder[];
  options: string[];
}
export class EnumBuilder {
  
  public run(schema: IDatabaseSchema) {
    let tableEnums: IEnumHolder[] = [];
    for (const tableKey in schema.tables) {
      const table = schema.tables[tableKey];
      const enums = this.enumArr(table, tableKey)
      tableEnums.push(...enums);
    }
    return new EnumMerger().mergeEnums(tableEnums);
    
  }

  private enumArr(table: IDatabaseTable, tableName: string): IEnumHolder[] {
    const enums: IEnumHolder[] = [];
    for (const colKey in table) {
      const column = table[colKey];
      if (column.type === "enum" && column.enumValues) {
        enums.push({
          field: column.field,
          table: tableName,
          optionHash: column.enumValues.sort().join(":"),
          options: column.enumValues
        });
      }
    }
    return enums;
  }

}
