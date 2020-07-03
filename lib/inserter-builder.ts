import * as change_case from "change-case";
import * as handlebars from "handlebars";
import { TableClass } from "./table-class";
const TEMPLATE = `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
import * as Knex from "knex";
{{#each imports}}{{{this}}}
{{/each}}

export default class Inserter {
    constructor(private knex: Knex) {

    }

    async replaceInto<T>(tableName:string, arr:T[]|T):Promise<void> {
      let qry= this.knex(tableName).insert(arr as any).toString();
      await this.knex.raw(qry.replace("insert", "replace"));				
    }

    async insertIgnore<T>(tableName:string, arr:T[]|T):Promise<void> {
      let qry= this.knex(tableName).insert(arr as any).toString();
      await this.knex.raw(qry.replace("insert", "insert ignore"));				
    }

    async insert<T>(tableName: string, data: T | T[]): Promise<number[]> {
        return await this.knex(tableName).insert(data);
    }

    async batchInsert<T>(tableName: string, arr: T[]) {
		let chunkSize = 1000;
		await this.knex.batchInsert(tableName, arr, chunkSize);
    }

{{#each inserters}}{{{this}}}{{/each}}
{{#each batchInserters}}{{{this}}}{{/each}}
}`;
const INSERT_TEMPLATE = `
    async insert{{fnName}}(item: {{className}}InsertType | {{className}}InsertType[]): Promise<number[]> {
        return await this.insert("{{tableName}}", item);
    }
`;
const BATCH_INSERT_TEMPLATE = `
    async batchInsert{{fnPlural}}(item: {{className}}InsertType[]) {
        return await this.batchInsert("{{tableName}}", item);
    }
`;

export class InserterBuilder {
    private compiledTemplate: HandlebarsTemplateDelegate;
    private compiledInsertTemplate: HandlebarsTemplateDelegate;
    private compiledBatchInsertTemplate: HandlebarsTemplateDelegate;

    constructor() {
        this.compiledTemplate = handlebars.compile(TEMPLATE);
        this.compiledInsertTemplate = handlebars.compile(INSERT_TEMPLATE);
        this.compiledBatchInsertTemplate = handlebars.compile(BATCH_INSERT_TEMPLATE);
    }

    public render(tables: TableClass[], relativePath: string = "./"): string {
        tables = JSON.parse(JSON.stringify(tables));
        tables.forEach(t => {
            t.fnName = change_case.upperCaseFirst(t.fnName);
            t.fnPlural = change_case.upperCaseFirst(t.fnPlural);
        });
        tables.sort((a, b) => a.className.localeCompare(b.className));
        const input = {
            batchInserters: tables.map(t => this.compiledBatchInsertTemplate(t)).sort(),
            imports: tables.map(t => this.renderImportRow(t, relativePath)).sort(),
            inserters: tables.map(t => this.compiledInsertTemplate(t)).sort()
        };
        return this.compiledTemplate(input);
    }

    private renderImportRow(table: TableClass, relativePath: string): string {
        table = JSON.parse(JSON.stringify(table));
        table.filename = table.filename.replace(".ts", "");
        return `import {${table.className}InsertType} from "${relativePath}${table.filename}"`;
    }
}
