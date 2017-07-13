import * as change_case from "change-case";
import * as handlebars from "handlebars";
const TEMPLATE = `/**
 * Autogenerated, do not modify
 */
import * as Knex from "knex";
{{#each imports}}{{{this}}}
{{/each}}

export default class Inserter {
    constructor(private knex:Knex){

    }

    async insert<T>(tableName:string, data:T | T[]) {
        let q =  this.knex(tableName).insert(data);
        try {
            return await this.knex(tableName).insert(data);
        } catch (error) {
            console.log(q.toString());
        }
    }

    async batchInsert<T>(tableName:string, arr:T[]) {
		let chunkSize = 1000;
		await this.knex.batchInsert(tableName, arr, chunkSize);
    }

{{#each inserters}}{{{this}}}{{/each}}
{{#each batchInserters}}{{{this}}}{{/each}}
}`;
const INSERT_TEMPLATE = `
    async insert{{fnName}}(item:{{className}} | {{className}}[]):Promise<{{className}}>{
        return await this.insert("{{tableName}}", item);
    }
`;
const BATCH_INSERT_TEMPLATE = `
    async batchInsert{{fnPlural}}(item:{{className}}[]) {
        return await this.batchInsert("{{tableName}}", item);
    }
`;

export interface ITableClass {
    filename: string;
    fullPath: string;
    tableName: string;
    className: string;
    fnName: string;
    fnPlural: string;
}
export class InserterBuilder {
    private compiledTemplate: HandlebarsTemplateDelegate;
    private compiledInsertTemplate: HandlebarsTemplateDelegate;
    private compiledBatchInsertTemplate: HandlebarsTemplateDelegate;

    constructor() {
        this.compiledTemplate = handlebars.compile(TEMPLATE);
        this.compiledInsertTemplate = handlebars.compile(INSERT_TEMPLATE);
        this.compiledBatchInsertTemplate = handlebars.compile(BATCH_INSERT_TEMPLATE);
    }

    public renderInserter(tables: ITableClass[], relativePath: string = "./"): string {
        tables = JSON.parse(JSON.stringify(tables));
        tables.forEach(t => {
            t.fnName = change_case.upperCaseFirst(t.fnName);
            t.fnPlural = change_case.upperCaseFirst(t.fnPlural);
        });
        const input = {
            batchInserters: tables.map(t => this.compiledBatchInsertTemplate(t)),
            imports: tables.map(t => this.renderImportRow(t, relativePath)),
            inserters: tables.map(t => this.compiledInsertTemplate(t))
        };
        return this.compiledTemplate(input);
    }

    private renderImportRow(table: ITableClass, relativePath: string): string {
        table = JSON.parse(JSON.stringify(table));
        table.filename = table.filename.replace(".ts", "");
        return `import {${table.className}} from "${relativePath}${table.filename}"`;
    }
}
