import { IDatabaseSchema, IDatabaseTable, IDatabaseColumn } from "../mysql-database-definition";
import { IEnumHolder } from "./enum-builder";

export class EnumMatcher {
  public run(schema: IDatabaseSchema, viewColumn: IDatabaseColumn, viewName: string) {
    const tableEnums: IEnumHolder[] = [];
    for (const tableKey in schema.tables) {
      const table = schema.tables[tableKey];
      const enums = this.enumArr(table, tableKey)
      tableEnums.push(...enums);
    }
    return this.findCorresponding({
      field: viewColumn.field,
      table: viewName,
      options: viewColumn.enumValues || []
    }, tableEnums);
  }

  private findCorresponding(view: IEnumHolder, tableEnums: IEnumHolder[]): IEnumHolder | undefined {
    const matches = tableEnums.filter(t => (t.options.every((to, i) => to === view.options[i])));
    if (matches.length === 1) {
      return matches[0];
    }
    matches.sort((a, b) => {
      const ascore = this.similarity(a.field, view.field);
      const bscore = this.similarity(b.field, view.field)
      return bscore - ascore;
    });
    return matches[0];
  }

  private similarity(s1: string, s2: string) {
    var longer = s1;
    var shorter = s2;
    if (s1.length < s2.length) {
      longer = s2;
      shorter = s1;
    }
    var longerLength = longer.length;
    if (longerLength == 0) {
      return 1.0;
    }
    return (longerLength - this.editDistance(longer, shorter)) / parseFloat(longerLength + "");
  }

  private editDistance(s1: string, s2: string) {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();

    var costs = new Array();
    for (var i = 0; i <= s1.length; i++) {
      var lastValue = i;
      for (var j = 0; j <= s2.length; j++) {
        if (i == 0)
          costs[j] = j;
        else {
          if (j > 0) {
            var newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue),
                costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0)
        costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private enumArr(table: IDatabaseTable, tableName: string): IEnumHolder[] {
    const enums: IEnumHolder[] = [];
    for (const colKey in table) {
      const column = table[colKey];
      if (column.type === "enum" && column.enumValues) {
        enums.push({
          field: column.field,
          table: tableName,
          options: column.enumValues
        });
      }
    }
    return enums;
  }
}

