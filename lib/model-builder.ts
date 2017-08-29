import * as change_case from "change-case";
import * as Knex from "knex";
import {
    // tslint:disable-next-line:ordered-imports
    IDatabaseColumn, IDatabaseTable, IDatabaseSchema, ITableDictionary,
    IStoredProcedureParameter, IStoredProcedureDictionary
} from "./mysql-database-definition";

const LIST_TYPE_VIEW = "VIEW";
const LIST_TYPE_TABLE = "BASE TABLE";
export default class ModelBuilder {
    public static init(knex: Knex): Promise<IDatabaseSchema> {
        return new ModelBuilder(knex).renderDatabaseSchema();
    }
    /**
     * Return a copy of an object but with all keys lower case
     */
    private static keysToLower<T extends { [key: string]: any }>(obj: T): T {
        const newobj: T = {} as T;
        Object.keys(obj).forEach(key => newobj[key.toLowerCase()] = obj[key]);
        return newobj;
    }

    /**
     * Return the length of a type, eg varchar(255)=>255
     * @param type
     */
    private static getMysqlLength(strType: string): number {
        const strip = strType.replace(/\D/g, "");
        return strip.length === 0 ? 0 : parseInt(strip, undefined);
    }

    /**
     * Return the length of a type, eg varchar(255)=>varchar
     * @param type
     */
    private static stripMysqlLength(type: string): string {
        const pos = type.indexOf("(");
        if (pos > -1) {
            return type.substr(0, pos);
        }
        return type;
    }

    constructor(private knex: Knex, private databaseName?: string) {

    }

    public async renderDatabaseSchema(): Promise<IDatabaseSchema> {
        if (!this.databaseName) {
            this.databaseName = await this.getDatabaseName();
        }
        const schema: IDatabaseSchema = {
            storedProcedures: await this.renderStoredProcedures(),
            tables: await this.renderTableModel(),
            views: await this.renderViewModel()
        };
        return schema;
    }

    private async getDatabaseName(): Promise<string> {
        const resp = await this.knex.raw("SELECT DATABASE() as db");
        return resp[0][0].db;
    }

    /**
     * return a select query to list all tables or views from a database
     */
    private listFromDatabase(listType: string): string {
        if (listType !== "BASE TABLE" && listType !== "VIEW") {
            throw new Error("Illegal listtype");
        }
        const select = "`information_schema`.`TABLES`.`TABLE_NAME` AS `tname`";
        const from = "`information_schema`.`TABLES`";
        const dbClause = "`information_schema`.`TABLES`.`TABLE_SCHEMA` = '" + this.databaseName + "'";
        const baseTable = "`information_schema`.`TABLES`.`TABLE_TYPE` = '" + listType + "'";
        return `SELECT ${select} FROM ${from} WHERE ${dbClause} AND ${baseTable} `;
    }

    private async listViews(): Promise<string[]> {
        const rows: Array<Array<{ tname: string }>> = await this.knex.raw(this.listFromDatabase(LIST_TYPE_VIEW));
        return rows[0].map(item => item.tname);
    }

    /**
     * Lists all the tables in current database
     */
    private async listTables(): Promise<string[]> {
        const rows: Array<Array<{ tname: string }>> = await this.knex.raw(this.listFromDatabase(LIST_TYPE_TABLE));
        return rows[0].map(item => item.tname);
    }

    private columnArrayToDatabaseSchema(colArrMap: { [key: string]: IDatabaseColumn[] }): ITableDictionary {
        const schema: ITableDictionary = {};
        for (const tableName in colArrMap) {
            colArrMap[tableName] = colArrMap[tableName].map((col, i) => {
                col = ModelBuilder.keysToLower<IDatabaseColumn>(col);
                col.length = ModelBuilder.getMysqlLength(col.type);
                col.isPrimary = col.key === "PRI";
                col.index = i;
                col.type = ModelBuilder.stripMysqlLength(col.type);
                return col;
            });
            const newTable: IDatabaseTable = {};
            colArrMap[tableName].forEach(col => newTable[col.field] = col);
            schema[tableName] = newTable;
        }
        return schema;
    }

    /**
     * List all columns for a table given table name
     */
    private async listColumns(tableName: string): Promise<IDatabaseColumn[]> {
        return await this.knex.raw("SHOW COLUMNS FROM " + tableName).then(colData => colData[0]);
    }

    private async renderModel(tables: string[]) {
        // TODO list all in one query instead of one query per table
        const columnArrayMap: { [key: string]: IDatabaseColumn[] } = {};
        const promises = tables.map(async (tableName: string) => {
            columnArrayMap[tableName] = await this.listColumns(tableName);
        });
        await Promise.all(promises);
        return this.columnArrayToDatabaseSchema(columnArrayMap);
    }

    private async listStoredProcedures(): Promise<string[]> {
        const SHOW_DB_QUERY = `SHOW PROCEDURE STATUS WHERE Db = ?`;
        const sps: Array<Array<{ Name: string }>> = await this.knex.raw(SHOW_DB_QUERY, [this.databaseName]);
        return sps[0].map(sp => sp.Name);
    }
    private async listStoredProcedureParams(): Promise<IStoredProcedureParameter[]> {
        const LIST_PARAM_QUERY = `SELECT * FROM information_schema.parameters WHERE specific_schema = ?`;
        const params: Array<Array<{ [key: string]: any }>> = await this.knex.raw(LIST_PARAM_QUERY, [this.databaseName]);
        return params[0].map(item => {
            const copy: { [key: string]: any } = {};
            for (const key in item) {
                copy[change_case.camelCase(key)] = item[key];
            }
            return copy as IStoredProcedureParameter;
        });
    }

    private async renderStoredProcedures(): Promise<IStoredProcedureDictionary> {
        const storedProcedures = await this.listStoredProcedures();
        const mapped: IStoredProcedureParameter[] = await this.listStoredProcedureParams();
        const storedProcedureDictionary: IStoredProcedureDictionary = {};
        storedProcedures.forEach(spName => storedProcedureDictionary[spName] = { name: spName, parameters: {} });
        mapped.forEach(item => storedProcedureDictionary[item.specificName].parameters[item.parameterName] = item);
        return storedProcedureDictionary;
    }

    private async renderViewModel(): Promise<ITableDictionary> {
        const tables = await this.listViews();
        return await this.renderModel(tables);
    }

    private async renderTableModel(): Promise<ITableDictionary> {
        const tables = await this.listTables();
        return this.renderModel(tables);
    }
}
