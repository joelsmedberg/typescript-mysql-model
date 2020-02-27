import { IDatabaseColumn, IDatabaseSchema } from "../mysql-database-definition";
import { IEnumHolder, EnumBuilder } from "./enum-builder";
import { equalAsSets } from "./misc";

export class EnumMatcher {
  public run(schema: IDatabaseSchema, column: IDatabaseColumn, viewName: string) {
    const enums = new EnumBuilder().run(schema);
    const candidates = enums.filter(e => e.table === viewName && column.field === e.field);
    if (candidates.length === 1) {
      return candidates[0].replacedBy || candidates[0];
    }
    const bestMatch = this.findCorresponding({
      field: column.field,
      table: viewName,
      options: column.enumValues || []
    }, enums);
    return bestMatch?.replacedBy || bestMatch;
  }

  private findCorresponding(view: IEnumHolder, tableEnums: IEnumHolder[]): IEnumHolder | undefined {
    const matches = tableEnums.filter(t => equalAsSets(t.options, view.options));
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
}

