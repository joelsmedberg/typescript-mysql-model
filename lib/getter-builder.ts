import * as change_case from "change-case";
import * as handlebars from "handlebars";
import { TableClass } from "./table-class";
import { IDatabaseSchema } from "./mysql-database-definition";
import { SchemaOperator } from "./schema-operator";
const TEMPLATE = `/**
 * Autogenerated, do not modify
 */
/* tslint:disable */
import * as Knex from "knex";
{{#each imports}}{{{this}}}
{{/each}}

export default class Getter {
    constructor(private knex: Knex) {

    }

    private async getSingle(tableName: string, keyObject: { [key: string]: any }, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<any> {
        let query = this.knex(tableName).select().limit(1).where(keyObject);
        if (fn) {
            query = fn(query);
        }        
        const reply: any[] = await query;
        return reply.shift();        
    }

    private async getFromTable(tableName: string, limit: number = 1000, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<any[]> {
        let query = this.knex(tableName).select().limit(limit);
        if (fn) {
          query = fn(query);
        }
        return await query;
    }

    private async countTable(tableName: string, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<number> {
        let query = this.knex(tableName).select(this.knex.raw("count(*) as c"));
        if (fn) {
          query = fn(query);
        }
        const reply: Array<{ c: number }> = await query;
        return reply[0].c;
    }

{{#each getters}}{{{this}}}{{/each}}
{{#each counters}}{{{this}}}{{/each}}
{{#each singulars}}{{{this}}}{{/each}}
}`;
const GET_TEMPLATE = `
    public get{{fnPlural}}(limit: number = 1000, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<{{prefixedClassName}}[]> {
        return this.getFromTable("{{tableName}}", limit, fn);
    }
`;
const GET_SINGULAR = `
    public get{{fnName}}({{#each params}}{{{this}}}{{#unless @last}},{{/unless}}{{/each}}, fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<{{prefixedClassName}}> {
        return this.getSingle("{{tableName}}", { {{#each fields}}{{{this}}}{{#unless @last}},{{/unless}}{{/each}} } ,fn);
    }
`;
const COUNT_TEMPLATE = `
    public count{{fnPlural}}(fn?: (knex: Knex.QueryBuilder) => Knex.QueryBuilder): Promise<number> {
        return this.countTable("{{tableName}}", fn);
    }
`;

export class GettersBuilder extends SchemaOperator {
    private compiledTemplate: HandlebarsTemplateDelegate;
    private compiledGetTemplate: HandlebarsTemplateDelegate;
    private compiledCountInsertTemplate: HandlebarsTemplateDelegate;
    private compailedGetSingularTemplate: HandlebarsTemplateDelegate;

    constructor(model: IDatabaseSchema, private typeMap: Map<string, string>) {
        super();
        this.definition = model;
        this.compiledTemplate = handlebars.compile(TEMPLATE);
        this.compiledGetTemplate = handlebars.compile(GET_TEMPLATE);
        this.compiledCountInsertTemplate = handlebars.compile(COUNT_TEMPLATE);
        this.compailedGetSingularTemplate = handlebars.compile(GET_SINGULAR);
    }

    public render(tables: TableClass[], relativePath: string = "./"): string {
        tables = JSON.parse(JSON.stringify(tables));

        tables.forEach(t => {
            t.fnName = change_case.upperCaseFirst(t.fnName);
            t.fnPlural = change_case.upperCaseFirst(t.fnPlural);

        });
        const input = {
            getters: tables.map(t => this.compiledGetTemplate(t)),
            imports: tables.map(t => this.renderImportRow(t, relativePath)),
            counters: tables.map(t => this.compiledCountInsertTemplate(t)),
            singulars: tables.filter(t=>t.isTable).map(t => this.compailedGetSingularTemplate(this.renderGetSingularTemplateInput(t)))
        };
        return this.compiledTemplate(input);
    }

    private renderGetSingularTemplateInput(t: TableClass) {        
        let d: any = t;
        d["fields"] = this.getPrimaryKeyNames(t.tableName);
        d["params"] = this.getPkCols(t.tableName).map(col => {
            return col.field + ": " + this.typeMap.get(col.type);
        });
        return d;
    }

    private renderImportRow(table: TableClass, relativePath: string): string {
        table = JSON.parse(JSON.stringify(table));
        table.filename = table.filename.replace(".ts", "");
        return `import {${table.prefixedClassName}} from "${relativePath}${table.filename}"`;
    }
}
