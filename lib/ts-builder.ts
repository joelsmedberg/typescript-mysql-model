import * as change_case from "change-case";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import * as Knex from "knex";
import * as pluralize from "pluralize";
import { AbstractHandlerBuilder } from "./abstract-handler-builder";
import { DefinitionBuilder } from "./definition-builder";
import { EnumBuilder } from "./enums/enum-builder";
import { GettersBuilder } from "./getter-builder";
import { GraphQlBuilder } from "./graphql-builder";
import { InserterBuilder } from "./inserter-builder";
import { InterfaceBuilder } from "./interface-builder";
import { ISetting } from "./isetting";
import ModelBuilder from "./model-builder";
import { IDatabaseSchema } from "./mysql-database-definition";
import SpBuilder from "./sp-builder";
import { TableClass } from "./table-class";
import { TableColumnsBuilder } from "./table-columns-builder";
import { UpdateBuilder } from "./update-builder";
import { EnumWriter } from "./enums/enum-writer";

export class TsBuilder {
    public static async run(knex: Knex, folder: string) {
        const builder = await new TsBuilder(folder).init(knex);
        builder.renderDefault();
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

    private readonly mysqlTypes = {
        bigint: "number",
        blob: "any",
        char: "string",
        date: "Date | string",
        datetime: "Date | string",
        enum: "string",
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
        defaultClassModifier: "export",

        interfaceFolder: "./interfaces/",
        optionalParameters: false,
        singularizeClassNames: true,
        suffixGeneratedToFilenames: true
    };

    private folder: string;
    private schema!: IDatabaseSchema;
    constructor(folder: string, schema?: IDatabaseSchema) {
        this.folder = TsBuilder.normFolder(folder);
        if (schema) {
            this.schema = schema;
        }
    }

    public getTypeMap(): Map<string, string> {
        const map = new Map<string, string>();
        Object.keys(this.mysqlTypes).forEach((key: string) => map.set(key, (this.mysqlTypes as any)[key]));
        return map;
    }

    public async init(knex: Knex, dbName?: string): Promise<TsBuilder> {
        const builder = new ModelBuilder(knex, dbName);
        this.schema = await builder.renderDatabaseSchema();
        return this;
    }

    public renderDefault() {
        if (!existsSync(this.folder)) {
            mkdirSync(this.folder);
        }
        console.log("Generator started");
        if (!existsSync(this.intefaceFullPath())) {
            console.log("Mdir:" + this.intefaceFullPath());
            mkdirSync(this.intefaceFullPath());
        }
        if (!existsSync(this.graphQlFullPath())) {
            console.log("Mdir:" + this.graphQlFullPath());
            mkdirSync(this.graphQlFullPath());
        }
        if (!existsSync(this.enumsFullPath())) {
            console.log("Mdir:" + this.enumsFullPath());
            mkdirSync(this.enumsFullPath());
        }
        if (!existsSync(this.enumsQlFullPath())) {
            console.log("Mdir:" + this.enumsQlFullPath());
            mkdirSync(this.enumsQlFullPath());
        }
        const enums = new EnumBuilder().run(this.schema);
        new EnumWriter().run(enums, this.enumsFullPath(), this.enumsQlFullPath());
        console.log("Generating ql files");
        this.renderGraphQlFiles();

        console.log("Generating table file");
        this.renderTableFile();
        console.log("Generating view file");
        this.renderViewFile();
        console.log("Generating column file");
        this.renderColumnsFile();
        console.log("Generating sp file");
        this.renderStoredProcedure();
        console.log("Generating class files");
        this.renderClassFiles();
        console.log("Render view class files");
        this.renderViewClassFiles();
        console.log("Render inserter file");
        this.renderInserter();
        console.log("Render getter file");
        this.renderGetter();
        this.renderSchemaOperator();
        console.log("render abstract handler");
        this.renderAbstractHandler();
    }

    private intefaceFullPath(): string {
        return this.folder + this.settings.interfaceFolder;
    }

    private graphQlFullPath(): string {
        return this.folder + "graphql";
    }

    private enumsFullPath(): string {
        return this.folder + "enums";
    }

    private enumsQlFullPath(): string {
        return this.graphQlFullPath() + "/enums";
    }

    private renderTableFile(): void {
        const start = "export enum TABLE { \n";
        const arr = this.listTables().sort().map(t => `\t${change_case.constantCase(t)} = "${t}",`);
        const content = this.getMetaText() + start + arr.join("\n") + "\n}";
        writeFileSync(this.folder + "tables" + this.getFilenameEnding(), content);
    }

    private renderViewFile(): void {
        const start = "export enum VIEW { \n";
        const arr = this.listViews().sort().map(t => `\t${change_case.constantCase(t)} = "${t}",`);
        const content = this.getMetaText() + start + arr.join("\n") + "\n}";
        writeFileSync(this.folder + "views" + this.getFilenameEnding(), content);
    }

    private renderColumnsFile(): void {
        const colBuilder = new TableColumnsBuilder(this.schema);
        const content = colBuilder.renderTemplate();
        writeFileSync(this.folder + "columns" + this.getFilenameEnding(), content);
    }

    private renderGraphQlFiles() {
        const qlBuilder = new GraphQlBuilder(this.schema);
        let tableClasses = this.renderClasses(this.listTables(), this.folder + "graphql/", true);
        tableClasses.forEach((tc) => {
            try {
                const definition = qlBuilder.renderTs(this.schema.tables[tc.tableName], tc);
                writeFileSync(tc.fullPath, definition);
            } catch (error) {
                console.log(tc.className + " could not be parsed " + error.message);
            }
        });
        tableClasses = this.renderClasses(this.listViews(), this.folder + "graphql/", false);
        tableClasses.forEach(tc => {
            const definition = qlBuilder.renderTs(this.schema.views[tc.tableName], tc);
            writeFileSync(tc.fullPath, definition);
        });
    }

    private renderClassFiles() {
        const tables = this.listTables();
        const tableClasses = this.renderClasses(tables, this.intefaceFullPath(), true);
        const interfaceBuilder = new InterfaceBuilder(this.settings, this.mysqlTypes, this.schema);
        tableClasses.forEach(tc => {
            const definition = interfaceBuilder.renderTs(tc, this.schema.tables[tc.tableName]);
            writeFileSync(tc.fullPath, definition);
        });
    }

    private renderViewClassFiles() {
        const views = this.listViews();
        const interfaceBuilder = new InterfaceBuilder(this.settings, this.mysqlTypes, this.schema);
        this.renderClasses(views, this.intefaceFullPath(), false).forEach(tc => {
            const definition = interfaceBuilder.renderTs(tc, this.schema.views[tc.tableName]);
            writeFileSync(tc.fullPath, definition);
        });
    }

    private renderInserter() {
        const tables = this.listTables();
        const tableClasses = this.renderClasses(tables, this.intefaceFullPath(), true);
        const inserterCotent = new InserterBuilder().render(tableClasses, this.settings.interfaceFolder);
        writeFileSync(this.folder + this.toFilename("inserter"), inserterCotent);
    }

    private renderGetter() {
        const tables = this.listTables();
        const tableClasses = this.renderClasses(tables, this.intefaceFullPath(), true);
        tableClasses.push(...this.renderClasses(this.listViews(), this.intefaceFullPath(), false));
        // tslint:disable-next-line: max-line-length
        const inserterCotent = new GettersBuilder(this.schema, this.getTypeMap()).render(tableClasses, this.settings.interfaceFolder);
        writeFileSync(this.folder + this.toFilename("getter"), inserterCotent);
    }

    private renderSchemaOperator() {
        const schemaClass = new DefinitionBuilder(this.schema).renderSchema();
        writeFileSync(this.folder + this.toFilename("definition"), schemaClass);

        const tableClasses = this.renderClasses(this.listTables(), this.intefaceFullPath(), true);
        const inserterCotent = new UpdateBuilder().renderUpdater(tableClasses, this.settings.interfaceFolder);
        writeFileSync(this.folder + this.toFilename("updater"), inserterCotent);
    }

    private renderStoredProcedure() {
        const spBuiler = new SpBuilder(this.schema.storedProcedures, this.mysqlTypes);
        const filename = "stored-procedures" + this.getFilenameEnding();
        writeFileSync(this.folder + filename, spBuiler.renderTemplate());
    }

    private renderAbstractHandler() {
        const builder = new AbstractHandlerBuilder();
        writeFileSync(this.folder + this.toFilename("abstract-handler"), builder.getFileContent());
    }

    private getMetaText(): string {
        return `/**
 * Auto generated, do not modify!
 */
/* eslint-disable */
`;
    }

    private renderClasses(tables: string[], folder: string, isTable: boolean): TableClass[] {
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
                filename: filename,
                fnName: fnName,
                fnPlural: fnPlural,
                fullPath: folder + filename,
                isTable: isTable,
                useInterface: "type",
                prefixedClassName: this.getPrefixedClassName(t),
                tableName: t
            } as TableClass;
        });
    }

    private listTables() {
        return Object.keys(this.schema.tables);
    }

    private listViews() {
        return Object.keys(this.schema.views);
    }

    private getClassName(tableName: string): string {
        const className = this.settings.singularizeClassNames ? pluralize.singular(tableName) : tableName;
        return className;
    }

    private getPrefixedClassName(tableName: string): string {
        const preI = this.settings.appendIToDeclaration ? "I" : "";
        return preI + this.getClassName(tableName);
    }

    private getFilenameEnding(): string {
        if (this.settings.suffixGeneratedToFilenames) {
            return ".generated.ts";
        }
        return ".ts";
    }

    private toFilename(name: string): string {
        let filename = this.settings.singularizeClassNames ? pluralize.singular(name) : name;
        filename = change_case.paramCase(filename);
        // if (filename.startsWith("i-") && this.settings.appendIToDeclaration) {
        //     filename = filename.replace("i-", "i");
        // }
        return change_case.paramCase(filename) + this.getFilenameEnding();
    }
}
