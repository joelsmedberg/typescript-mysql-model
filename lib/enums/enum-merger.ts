import * as changeCase from "change-case";
import { IEnumHolder } from "./enum-builder";
import { longestCommonSubstring } from "./longest-common-substrng";
import { groupBy } from "./misc";

export class EnumMerger {
  public mergeEnums(enums: IEnumHolder[]) {
    const dict = groupBy(enums, "optionHash")
    const LCS_THRESHOLD = 5;
    const newEnums = new Map<string, IEnumHolder>();
    for (const key in dict) {
      const value = dict[key];
      if (value.length === 1) {
        continue;
      }
      const lcs = value.reduce((p, c) => longestCommonSubstring(p, changeCase.constant(c.field)), changeCase.constant(value[0].field));
      if (lcs.length > LCS_THRESHOLD) {
        const newName = changeCase.constant(lcs);
        const existing = newEnums.get(newName);
        if (!existing || existing.replacementFor!.length < value.length) {
          const newEnum = {
            field: newName,
            replacementFor: value,
            table: changeCase.pascalCase(newName),
            options: value[0].options,
            optionHash: value[0].optionHash
          };
          newEnums.set(newName, newEnum);
        }
      }
    }
    const newArr = [...newEnums.values()];
    newArr.forEach(r => {
      r.replacementFor?.forEach(s => s.replacedBy = r);
    });
    return [...enums, ...newArr];
  }
}
