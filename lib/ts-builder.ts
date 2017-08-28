import * as change_case from "change-case";
import { writeFileSync } from "fs";
import * as Knex from "knex";
import * as pluralize from "pluralize";
import { InserterBuilder } from "./inserter-builder";
import { GettersBuilder } from "./getter-builder";
import InterfaceBuilder from "./interface-builder";
import {ISetting} from "./isetting";
import ModelBuilder from "./model-builder";
import { IDatabaseSchema, ITableDictionary } from "./mysql-database-definition";
import SpBuilder from "./sp-builder";
import TableColumnsBuilder from "./table-columns-builder";
import { TableClass } from "./table-class";

export default class TsBuilder {
    public static async init(knex: Knex): Promise<TsBuilder> {
        return await new TsBuilder().init(knex);
    }

    private static normFolder(folder: string): string {
        if (!folder) {
            return "";
        }
        if (!(folder.endsWith("/") || folder.endsWith("\\"))) {
            folder += "/";
        }
        return folder;
    }

    private static listTables(tables: ITableDictionary, searchFor: string = null) {
        let views = Object.keys(tables);
        // Filter search terms if applicable
        if (searchFor) {
            views = views.filter(tName => tName.indexOf(searchFor) > -1);
        }
        return views;
    }

    public mysqlTypes = {
        bigint: "string",
        char: "string",
        date: "Date | string",
        datetime: "Date | string",
        decimal: "number",
        double: "number",
        float: "number",
        int: "number",
        longblob: "any",
        longtext: "string",
        mediumtext: "string",
        set: "string",
        smallint: "number",
        text: "string",
        timestamp: "Date | string",
        tinyint: "boolean",
        varchar: "string"
    };

    public settings: ISetting = {
        appendIToDeclaration: true,
        appendIToFileName: true,
        camelCaseFnNames: true,
        defaultClassModifier: "export interface",
        optionalParameters: true,
        singularizeClassNames: true,
        suffixGeneratedToFilenames: true
    };

    constructor(private schema?: IDatabaseSchema) {
    }

    public async init(knex: Knex, dbName?: string): Promise<TsBuilder> {
        const builder = new ModelBuilder(knex, dbName);
        this.schema = await builder.renderDatabaseSchema();
        return this;
    }

    public renderTableFile(folder: string): void {
        folder = TsBuilder.normFolder(folder);
        const start = "export default class Tables { \n";
        const arr = this.listTables().sort().map(t => "\t static " + change_case.constantCase(t) + " = '" + t + "';");
        const content = this.getMetaText() + start + arr.join("\n") + "\n}";
        writeFileSync(folder + "tables" + this.getFilenameEnding(), content);
    }

    public renderViewFile(folder: string): void {
        folder = TsBuilder.normFolder(folder);

        const start = "export default class Views { \n";
        const arr = this.listViews().sort().map(t => "\tstatic " + change_case.constantCase(t) + " = '" + t + "';");
        const content = this.getMetaText() + start + arr.join("\n") + "\n}";
        writeFileSync(folder + "views" + this.getFilenameEnding(), content);
    }

    public renderColumnsFile(folder: string): void {
        folder = TsBuilder.normFolder(folder);
        const colBuilder = new TableColumnsBuilder(this.schema);
        const content = colBuilder.renderTemplate();
        writeFileSync(folder + "columns" + this.getFilenameEnding(), content);
    }

    public renderClassFiles(folder: string, searchString?: string) {
        folder = TsBuilder.normFolder(folder);
        const tables = this.listTables(searchString);
        const tableClasses = this.renderClasses(tables, folder);
        const interfaceBuilder = new InterfaceBuilder(this.settings, this.mysqlTypes);
        tableClasses.forEach(tc => {
            const definition = interfaceBuilder.renderTs(tc, this.schema.tables[tc.tableName]);
            writeFileSync(tc.fullPath, definition);
        });
    }

    public renderViewClassFiles(folder: string, searchString?: string) {
        folder = TsBuilder.normFolder(folder);
        const tables = this.listViews(searchString);
        const interfaceBuilder = new InterfaceBuilder(this.settings, this.mysqlTypes);
        this.renderClasses(tables, folder).forEach(tc => {
            const definition = interfaceBuilder.renderTs(tc, this.schema.views[tc.tableName]);
            writeFileSync(tc.fullPath, definition);
        });
    }

    public renderInserter(folder: string, interfaceFolder: string) {
        folder = TsBuilder.normFolder(folder);
        const tables = this.listTables();
        const tableClasses = this.renderClasses(tables, interfaceFolder);
        const inserterCotent = new InserterBuilder().renderInserter(tableClasses, interfaceFolder);
        writeFileSync(folder + this.toFilename("inserter"), inserterCotent);
    }

    public renderGetter(folder: string, interfaceFolder: string) {
        folder = TsBuilder.normFolder(folder);
        const tables = this.listTables();
        const tableClasses = this.renderClasses(tables, interfaceFolder);
        const inserterCotent = new GettersBuilder().renderInserter(tableClasses, interfaceFolder);
        writeFileSync(folder + this.toFilename("getter"), inserterCotent);
    }
    
    public renderStoredProcedure(folder: string) {
        folder = TsBuilder.normFolder(folder);
        const spBuiler = new SpBuilder(this.schema.storedProcedures, this.mysqlTypes);
        const filename = "stored-procedures" + this.getFilenameEnding();
        writeFileSync(folder + filename, spBuiler.renderTemplate());
    }

    private getMetaText() :string {
        const meta = `/**\n * Autogenerated class containing all the tables, DO NOT MODIFY\n */\n`;
        return meta + "/* tslint:disable */\n";
    }

    private renderClasses(tables: string[], folder: string): TableClass[] {
        return tables.map(t => {
            let fnName: string;
            let fnPlural: string;
            const className = this.getClassName(t);
            if (this.settings.camelCaseFnNames) {
                fnName = change_case.camelCase(className);
                fnPlural = change_case.camelCase(t);
            } else {
                fnName = className;
                fnPlural = t;
            }

            const filename = this.toFilename(t);
            return {
                className: this.getClassName(t),
                prefixedClassName: this.getPrefixedClassName(t),
                filename: filename,
                fnName: fnName,
                fnPlural: fnPlural,
                fullPath: folder + filename,
                tableName: t
            } as TableClass;
        });
    }

    private listTables(searchFor: string = null) {
        return TsBuilder.listTables(this.schema.tables, searchFor);
    }

    private listViews(searchFor: string = null) {
        return TsBuilder.listTables(this.schema.views, searchFor);
    }

    private getClassName(tableName: string): string {
        let className = this.settings.singularizeClassNames ? pluralize.singular(tableName) : tableName;
        return className;
    }
    
    private getPrefixedClassName(tableName:string): string {
        const preI = this.settings.appendIToDeclaration ? "I" : "";
        return preI + this.getClassName(tableName);
    }

    private getFilenameEnding(): string {
        let ending = "";
        if (this.settings.suffixGeneratedToFilenames) {
            ending += ".generated";
        }
        return ending + ".ts";
    }

    private toFilename(name: string): string {
        let filename = this.settings.singularizeClassNames ? pluralize.singular(name) : name;
        filename = change_case.paramCase(filename);        
        // if (filename.startsWith("i-") && this.settings.appendIToDeclaration) {
        //     filename = filename.replace("i-", "i");
        // }
        return change_case.paramCase(filename) + this.getFilenameEnding() ;
    }
}
