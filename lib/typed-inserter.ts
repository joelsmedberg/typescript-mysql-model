import { format } from "util";
import { IDatabaseColumn, IDatabaseSchema } from "./mysql-database-definition";
import Knex = require("knex");
import ModelBuilder from "./model-builder";
/**
 * This class serves as a data access object and allowes communication with the mysql server
 * It automatically strips away attributes that not match columns
 */
export default class TypedInserter {
    public static async getSingleTonInstance(knex: Knex, dbName?: string): Promise<TypedInserter> {
        if (!this.promise) {
            this.promise = new TypedInserter(knex).init(dbName);
        }
        return this.promise;
    }
    private static promise: Promise<TypedInserter>;

    constructor(private knex: Knex, private dbModel?: IDatabaseSchema) {

    }

    /**
     * init a database schema if none were provided at constructor
     */
    public async init(dbName?: string): Promise<TypedInserter> {
        const modelBuilder = new ModelBuilder(this.knex, dbName);
        this.dbModel = await modelBuilder.renderDatabaseSchema();
        return this;
    }

    public async batchInsert<T>(tableName: string, rows: T[]): Promise<void> {
        const stripped = rows.map(row => this.stripNoneBelonging(tableName, row));
        await this.knex.batchInsert(tableName, stripped, 1000);
    }

    public async batchInsertIgnore<T>(tableName: string, rows: T[]): Promise<void> {
        for (const item of rows) {
            await this.insertIgnore(tableName, item);
        }
    }

    public async batchUpdate<T>(tableName: string, data: T[]): Promise<void> {
        if (data) {
            for (const item of data) {
                await this.update(tableName, item);
            }
        }
    }

    /**
     * return true if object has its primary key among its items
     * @param tableName
     * @param data
     */
    public hasPrimaryKey<T extends { [key: string]: any }>(tableName: string, data: T): boolean {
        return !!(data[this.getPrimaryKey(tableName)]);
    }

    /**
     * Insert an object, if it exist, then silentely ignore and continue
     * @param tableName
     * @param item
     */
    public async insertIgnore<T>(tableName: string, item: T): Promise<void> {
        item = this.stripNoneBelonging(tableName, item);
        const qry = this.knex(tableName).insert(item).toString();
        await this.knex.raw(qry.replace("insert", "INSERT IGNORE"));
    }

    public async insertOnDuplicateUpdate<T>(tableName: string, data: T): Promise<void> {
        let filtered = this.stripNoneBelonging(tableName, data);
        const insert = this.knex(tableName).insert(filtered);
        filtered = this.removePrimaryKeys(tableName, filtered);
        const update = this.knex(tableName).update(filtered);
        const middle = "%s on duplicate key update %s";
        const lastPart = update.toString().replace(/^update `[^`]+` set /i, "");
        const query = format(middle, insert.toString(), lastPart);
        await this.knex.raw(query);
    }
    /***
    * @param tableName
    * @param object
    * Replaces all tinyint columns with a boolean
    */
    public boolfix<T extends { [key: string]: any }>(tableName: string, object: T): T {
        const table = this.dbModel.tables[tableName];
        const BOOL_TYPE = "tinyint";
        for (const key in table) {
            if (table[key].type === BOOL_TYPE) {
                object[key] = !!object[key];
            }
        }
        return object;
    }

    /**
     * @param tableName
     * @param object
     *
     * Returns the same object with all date fields
     * strings parsed into date objects
     */
    public datefix<T extends { [key: string]: any }>(tableName: string, object: T): T {
        const table = this.dbModel.tables[tableName];
        const DATE_TYPE = "date";
        for (const key in table) {
            const col = table[key];
            if (col.type === DATE_TYPE && object[key]) {
                const value: Date = object[key];
                const isoStr = value.toISOString();
                object[key] = isoStr.substring(0, 10);
            }
        }
        return object;
    }

    /**
     * @param tableName
     * @param data
     * @param forceInsert
     * Insert an object that already has its primary key among its variables
     */
    public async insertWithPrimaryKey<T>(tableName: string, data: T, forceInsert?: boolean): Promise<T> {
        data = this.stripNoneBelonging(tableName, data);
        if (Object.keys(data).length > 1 || forceInsert) {
            await this.knex(tableName).insert(data);
        }
        return data;
    }

    /**
     * returns true if the first primary key column is of type int
     * @param tableName
     */
    public isIntPk(tableName: string): boolean {
        const pks = this.getPkCols(tableName);
        if (pks.length > 0) {
            return pks[0].type === "int";
        }
        return false;
    }

    /**
     * Returns the name of the first primary key column
     * @param tableName
     */
    public getPrimaryKey(tableName: string): string {
        const cols = this.getPkCols(tableName);
        return (cols == null || cols.length === 0) ? null : cols[0].field;
    }

    /**
     * @param tableName
     * @param data
     * Return a copy of the object without any primary keys
     */
    public removePrimaryKeys<T>(tableName: string, data: T): T {
        const filtered = JSON.parse(JSON.stringify(data)); // copy
        this.getPrimaryKeyNames(tableName).forEach(pk => delete filtered[pk]);
        return filtered;
    }

    /**
     * Insert but if the object exists throw the other one away.
     * @param tableName
     * @param item
     */
    public async replaceInto<T>(tableName: string, item: T): Promise<void> {
        item = this.stripNoneBelonging(tableName, item);
        const q = this.knex(tableName).insert(item).toString();
        await this.knex.raw(q.replace("insert", "replace"));
    }

    /**
     * Update or insert a data objet.
     * Update if object has a primary key already.
     * To insert an object with a primary key, use the other function
     * @param tableName
     * @param data
     */
    public async setData<T extends { [key: string]: any }>(tableName: string, data: T): Promise<T> {
        data = this.stripNoneBelonging(tableName, data);
        if (this.hasPrimaryKey(tableName, data)) {
            // update existing
            const pk = this.getPrimaryKey(tableName);
            const pkValue = data[pk];
            await this.update(tableName, data);
            data[pk] = pkValue;
            return data;
        } else {
            // new object, insert
            return this.insert(tableName, data);
        }
    }

    public async forceUpdate<T>(tableName: string, data: T): Promise<T> {
        data = this.stripNoneBelonging(tableName, data);
        return await this.update(tableName, data);
    }

    /**
     * return a new object where with only attributes that have
     * a corresponding column for given table
     * @param table
     * @param data
     */
    private stripNoneBelonging<T>(tableName: string, data: T): T {
        const table = this.dbModel.tables[tableName];
        const copy = {} as any;
        for (const key in data) {
            if (table[key]) {
                copy[key] = data[key];
            }
        }
        return copy;
    }

    private async update<T extends { [key: string]: any }>(tableName: string, data: T): Promise<T> {
        const pks = this.getPrimaryKeyNames(tableName);
        const criterions: { [key: string]: any } = {};
        for (const pk of pks) {
            criterions[pk] = data[pk];
            delete data[pk];
        }
        if (Object.keys(data).length > 0) {
            await this.knex(tableName).where(criterions).update(data);
        }
        return data;
    }

    private async insert<T extends { [key: string]: any }>(tableName: string, data: T): Promise<T> {
        const reply = await this.knex(tableName).insert(data);
        data[this.getPrimaryKey(tableName)] = reply[0];
        return data;
    }

    private getPkCols(tableName: string): IDatabaseColumn[] {
        if (!tableName) {
            return null;
        }
        const cols: IDatabaseColumn[] = [];
        const table = this.dbModel.tables[tableName];
        for (const key in table) {
            if (table[key].isPrimary) {
                cols.push(table[key]);
            }
        }
        return cols;
    }

    /**
     * List the names of all primary keys in a table
     * @param tableName
     */
    private getPrimaryKeyNames(tableName: string): string[] {
        const cols = this.getPkCols(tableName);
        if (!cols || cols.length === 0) {
            return null;
        }
        return cols.map(col => col.field);
    }
}
