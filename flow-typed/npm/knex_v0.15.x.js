// flow-typed signature: 1ef4713553dc94ce83eddf4389d3aeb7
// flow-typed version: 34598898c5/knex_v0.15.x/flow_>=v0.75.x

/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable no-redeclare */

declare class Knex$Transaction<R>
  mixins Knex$QueryBuilder<R>, events$EventEmitter, Promise<R> {
  [[call]]: (tableName: string) => Knex$QueryBuilder<R>;
  commit(connection?: any, value?: any): Promise<R>;
  rollback(?Error): Promise<R>;
  savepoint(connection?: any): Promise<R>;
}

declare type Knex$QueryBuilderFn<R> = (
  qb: Knex$QueryBuilder<R>
) => Knex$QueryBuilder<R> | void;

declare class Knex$QueryBuilder<R> mixins Promise<R> {
  clearSelect(): this;
  clearWhere(): this;
  select(key?: string[]): this;
  select(...key: string[]): this;
  timeout(ms: number, options?: { cancel: boolean }): this;
  column(key: string[]): this;
  column(...key: string[]): this;
  with(alias: string, w: string | Knex$QueryBuilderFn<R>): this;
  withSchema(schema: string): this;
  returning(column: string): this;
  returning(...columns: string[]): this;
  returning(columns: string[]): this;
  as(name: string): this;
  transacting(trx: ?Knex$Transaction<R>): this;
  transaction((trx: Knex$Transaction<R>) => Promise<R> | void): this;
  where(builder: Knex$QueryBuilderFn<R>): this;
  where(column: string, value: any): this;
  where(column: string, operator: string, value: any): this;
  where(object: { [string]: any }): this;
  whereNot(builder: Knex$QueryBuilderFn<R>): this;
  whereNot(column: string, value: any): this;
  whereNot(column: string, operator: string, value: any): this;
  whereIn(column: string, values: any[]): this;
  whereNotIn(column: string, values: any[]): this;
  whereNull(column: string): this;
  whereNotNull(column: string): this;
  whereExists(column: string): this;
  whereNotExists(column: string): this;
  whereBetween(column: string, range: number[]): this;
  whereNotBetween(column: string, range: number[]): this;
  whereRaw(sql: string, bindings?: Knex$RawBindings): this;
  orWhere(builder: Knex$QueryBuilderFn<R>): this;
  orWhere(column: string, value: any): this;
  orWhere(column: string, operator: string, value: any): this;
  orWhereNot(builder: Knex$QueryBuilderFn<R>): this;
  orWhereNot(column: string, value: any): this;
  orWhereNot(column: string, operator: string, value: any): this;
  orWhereIn(column: string, values: any[]): this;
  orWhereNotIn(column: string, values: any[]): this;
  orWhereNull(column: string): this;
  orWhereNotNull(column: string): this;
  orWhereExists(column: string): this;
  orWhereNotExists(column: string): this;
  orWhereBetween(column: string, range: number[]): this;
  orWhereNotBetween(column: string, range: number[]): this;
  orWhereRaw(sql: string, bindings?: Knex$RawBindings): this;
  innerJoin(table: string, c1: string, operator: string, c2: string): this;
  innerJoin(table: string, c1: string, c2: string): this;
  innerJoin(
    builder: Knex$QueryBuilder<R> | Knex$QueryBuilderFn<R>,
    c1?: string,
    c2?: string
  ): this;
  innerJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  leftJoin(table: string, c1: string, operator: string, c2: string): this;
  leftJoin(table: string, c1: string, c2: string): this;
  leftJoin(builder: Knex$QueryBuilder<R>): this;
  leftJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  leftOuterJoin(table: string, c1: string, operator: string, c2: string): this;
  leftOuterJoin(table: string, c1: string, c2: string): this;
  leftOuterJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  rightJoin(table: string, c1: string, operator: string, c2: string): this;
  rightJoin(table: string, c1: string, c2: string): this;
  rightJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  rightOuterJoin(table: string, c1: string, operator: string, c2: string): this;
  rightOuterJoin(table: string, c1: string, c2: string): this;
  rightOuterJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  outerJoin(table: string, c1: string, operator: string, c2: string): this;
  outerJoin(table: string, c1: string, c2: string): this;
  outerJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  fullOuterJoin(table: string, c1: string, operator: string, c2: string): this;
  fullOuterJoin(table: string, c1: string, c2: string): this;
  fullOuterJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  crossJoin(column: string, c1: string, c2: string): this;
  crossJoin(column: string, c1: string, operator: string, c2: string): this;
  crossJoin(table: string, builder: Knex$QueryBuilderFn<R>): this;
  joinRaw(sql: string, bindings?: Knex$RawBindings): this;
  distinct(): this;
  groupBy(column: string): this;
  groupByRaw(sql: string, bindings?: Knex$RawBindings): this;
  orderBy(column: string, direction?: "desc" | "asc"): this;
  orderByRaw(sql: string, bindings?: Knex$RawBindings): this;
  offset(offset: number): this;
  limit(limit: number): this;
  having(column: string, operator: string, value: mixed): this;
  havingIn(column: string, values: Array<mixed>): this;
  havingNotIn(column: string, values: Array<mixed>): this;
  havingNull(column: string): this;
  havingNotNull(column: string): this;
  havingExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  havingNotExists(builder: Knex$QueryBuilderFn<R> | Knex$QueryBuilder<R>): this;
  havingBetween<T>(column: string, range: [T, T]): this;
  havingNotBetween<T>(column: string, range: [T, T]): this;
  havingRaw(column: string, operator: string, value: mixed): this;
  havingRaw(column: string, value: mixed): this;
  havingRaw(raw: string, bindings?: Knex$RawBindings): this;
  union(): this;
  unionAll(): this;
  count(column?: string): this;
  countDistinct(column?: string): this;
  min(column?: string): this;
  max(column?: string): this;
  sum(column?: string): this;
  sumDistinct(column?: string): this;
  avg(column?: string): this;
  avgDistinct(column?: string): this;
  pluck(column: string): this;
  first(key?: string[]): this;
  first(...key: string[]): this;
  table(table: string, options?: Object): this;
  from(table: string): this;
  from(
    builder: Knex$QueryBuilderFn<R> | Knex$Knex<R> | Knex$QueryBuilder<R>
  ): this;
  into(table: string, options?: Object): this;

  insert(val: Object | Object[]): this;
  del(): this;
  delete(): this;
  update(column: string, value: any): this;
  update(val: Object): this;
  returning(columns: string[]): this;
  forUpdate(): this;
  forShare(): this;
}

type MigrateConfig = {|
  directory?: string,
  extension?: string,
  tableName?: string,
  disableTransactions?: boolean,
  loadExtensions?: Array<string>
|};

type MySQLColumnCollation =
  | "big5_chinese_ci"
  | "dec8_swedish_ci"
  | "cp850_general_ci"
  | "hp8_english_ci"
  | "koi8r_general_ci"
  | "latin1_swedish_ci"
  | "latin2_general_ci"
  | "swe7_swedish_ci"
  | "ascii_general_ci"
  | "ujis_japanese_ci"
  | "sjis_japanese_ci"
  | "hebrew_general_ci"
  | "tis620_thai_ci"
  | "euckr_korean_ci"
  | "koi8u_general_ci"
  | "gb2312_chinese_ci"
  | "greek_general_ci"
  | "cp1250_general_ci"
  | "gbk_chinese_ci"
  | "latin5_turkish_ci"
  | "armscii8_general_ci"
  | "utf8_general_ci"
  | "ucs2_general_ci"
  | "cp866_general_ci"
  | "keybcs2_general_ci"
  | "macce_general_ci"
  | "macroman_general_ci"
  | "cp852_general_ci"
  | "latin7_general_ci"
  | "utf8mb4_general_ci"
  | "cp1251_general_ci"
  | "utf16_general_ci"
  | "cp1256_general_ci"
  | "cp1257_general_ci"
  | "utf32_general_ci"
  | "binary"
  | "geostd8_general_ci"
  | "cp932_japanese_ci"
  | "eucjpms_japanese_ci";

type TableColumnSpec = {
  primary: () => TableColumnSpec,
  references: (column: string) => TableColumnSpec,
  nullable: () => TableColumnSpec,
  notNullable: () => TableColumnSpec,
  alter: () => TableColumnSpec,
  index: () => TableColumnSpec,
  unique: () => TableColumnSpec,
  inTable: (table: string) => TableColumnSpec,
  onDelete: (operation: string) => TableColumnSpec,
  onUpdate: (operation: string) => TableColumnSpec,
  defaultTo: (value: any) => TableColumnSpec,
  unsigned: () => TableColumnSpec,
  first: () => TableColumnSpec,
  after: () => TableColumnSpec,
  comment: (comment: string) => TableColumnSpec,
  collate: (collation: MySQLColumnCollation) => TableColumnSpec
};

type TextColumnSpec = TableColumnSpec & {};
type StringColumnSpec = TableColumnSpec & {};
type JsonColumnSpec = TableColumnSpec & {};
type BigIntegerColumnSpec = TableColumnSpec;

type FloatColumnSpec = TableColumnSpec;
type DecimalColumnSpec = TableColumnSpec;
type BooleanColumnSpec = TableColumnSpec;
type DateColumnSpec = TableColumnSpec;
type DateTimeColumnSpec = TableColumnSpec;
type TimestampColumnSpec = TableColumnSpec;
type TimestampsColumnSpec = TableColumnSpec;
type BinaryColumnSpec = TableColumnSpec;
type EnumColumnSpec = TableColumnSpec;
type UUIDColumnSpec = TableColumnSpec;

type TableBuilder = {
  primary: (columns: string | Array<string>) => void,
  json: (column: string) => JsonColumnSpec,
  string: (column: string, length?: number) => StringColumnSpec,
  text: (
    column: string,
    textType?: "mediumtext" | "longtext" | "text"
  ) => TextColumnSpec,
  integer: (column: string) => TableColumnSpec,
  increments: (column: string) => TableColumnSpec,
  bigInteger: (column: string) => BigIntegerColumnSpec,
  float: (
    column: string,
    precision?: number,
    scale?: number
  ) => FloatColumnSpec,
  decimal: (
    column: string,
    precision?: number,
    scale?: number
  ) => DecimalColumnSpec,
  boolean: (column: string) => BooleanColumnSpec,
  date: (column: string) => DateColumnSpec,
  enu: (
    column: string,
    values: Array<string>,
    options?: { [string]: any }
  ) => EnumColumnSpec,
  enum: (
    column: string,
    values: Array<string>,
    options?: { [string]: any }
  ) => EnumColumnSpec,
  dateTime: (column: string, precision?: number) => DateTimeColumnSpec,
  timestamp: (column: string, precision?: number) => TimestampColumnSpec,
  timestamps: (
    useTimestamps?: boolean,
    defaultToNow?: boolean
  ) => TimestampsColumnSpec,
  uuid: () => UUIDColumnSpec,
  index: (columns: string | Array<string>, indexName?: string) => void,
  dropIndex: (columns: string | Array<string>, indexName?: string) => void,
  unique: (columns: string | Array<string>, indexName?: string) => void,
  comment: (comment: string) => void,
  foreign: (
    columns: string | Array<string>,
    foreignKeyName?: string
  ) => TableColumnSpec,
  dropForeign: (comment: string, foreignKeyName?: string) => void,
  dropUnique: (comment: string, keyName?: string) => void,
  dropPrimary: (constraintName?: string) => void,
  queryContext: (context: { [string]: any }) => void,
  dropColumn: (column: string) => void,
  dropColumns: (column: Array<string>) => void,
  renameColumn: (from: string, to: string) => void,
  engine: (mysqlEnginer: "InnoDB") => void,
  charset: (charset: string) => void
};

type Schema = {
  createTable: (tableName: string, (table: TableBuilder) => void) => Schema,
  alterTable: (tableName: string, (table: TableBuilder) => void) => Schema,
  dropTableIfExists: (tableName: string) => Schema
};

declare class Knex$Knex<R>
  mixins Knex$QueryBuilder<R>, Promise<R>, events$EventEmitter {
  static (config: Knex$Config): Knex$Knex<R>;
  static QueryBuilder: typeof Knex$QueryBuilder;
  [[call]]: (tableName: string) => Knex$QueryBuilder<R>;
  raw(sqlString: string, bindings?: Knex$RawBindings): any;
  batchInsert: (
    tableName: string,
    rows: Array<Object>,
    chunkSize?: number
  ) => Knex$QueryBuilder<R>;
  migrate: {
    make: (name: string, config?: MigrateConfig) => Promise<string>,
    latest: (config?: MigrateConfig) => Promise<void>,
    rollback: (config?: MigrateConfig) => Promise<void>,
    currentVersion: (config?: MigrateConfig) => Promise<string>
  };
  client: any;
  schema: Schema;
  fn: {
    now: (precision?: number) => string
  };
  destroy(): Promise<void>;
}

declare type Knex$PostgresConfig = {
  client?: "pg",
  connection?:
    | string
    | {
        host?: string,
        user?: string,
        password?: string,
        database?: string,
        charset?: string
      },
  searchPath?: string
};

declare type Knex$RawBindings = Array<mixed> | { [key: string]: mixed };

declare type Knex$Mysql2Config = {
  client?: "mysql2",
  connection?:
    | string
    | {
        host?: string,
        user?: string,
        password?: string,
        database?: string,
        charset?: string
      }
};

declare type Knex$MysqlConfig = {
  client?: "mysql",
  connection?: {
    host?: string,
    user?: string,
    password?: string,
    database?: string
  }
};

declare type Knex$SqliteConfig = {
  client?: "sqlite3",
  connection?: {
    filename?: string
  }
};
declare type Knex$Config =
  | Knex$PostgresConfig
  | Knex$MysqlConfig
  | Knex$Mysql2Config
  | Knex$SqliteConfig;

declare module "knex" {
  declare type Error = {
    name: string,
    length: number,
    severity: string,
    code: string,
    detail: string,
    hint?: string,
    position?: any,
    internalPosition?: any,
    internalQuery?: any,
    where?: any,
    schema: string,
    table: string,
    column?: any,
    dataType?: any,
    constraint?: string,
    file: string,
    line: string,
    routine: string
  };
  declare export type Knex = Knex$Knex<any>;
  declare export type Knex$Transaction = Knex$Transaction;
  declare export type $QueryBuilder<R> = Knex$QueryBuilder<R>;
  declare module.exports: typeof Knex$Knex;
}
