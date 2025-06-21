import { DatabaseRepository } from '../../../domain/repositories/DatabaseRepository'
import { Database, createDatabase } from '../../../domain/entities/Database'
import { Table, createTable } from '../../../domain/entities/Table'
import { Column, createColumn } from '../../../domain/entities/Column'
import {
  ReferentialConstraint,
  ConstraintAction,
  createReferentialConstraint,
} from '../../../domain/entities/ReferentialConstraint'
import { DatabaseConnectionConfig } from '../../../shared/types/DatabaseType'
import { DatabaseError } from '../../../shared/errors/AppError'
import mysql from 'mysql2/promise'

// データベースクエリ結果の型定義
interface VersionRow {
  version?: string
}

interface CharsetRow {
  charset?: string
  collation?: string
}

interface TableRow {
  TABLE_NAME: string
  TABLE_SCHEMA: string
  TABLE_COMMENT: string
}

interface ColumnRow {
  COLUMN_NAME: string
  DATA_TYPE: string
  IS_NULLABLE: string
  COLUMN_DEFAULT: string | null
  CHARACTER_MAXIMUM_LENGTH: number | null
  NUMERIC_PRECISION: number | null
  NUMERIC_SCALE: number | null
  COLUMN_KEY: string
  EXTRA: string
  COLUMN_COMMENT: string
}

interface ConstraintRow {
  CONSTRAINT_NAME: string
  COLUMN_NAME: string
  REFERENCED_TABLE_NAME: string
  REFERENCED_COLUMN_NAME: string
  DELETE_RULE: string
  UPDATE_RULE: string
}

interface MySQLConnection {
  connection: mysql.Connection | null
  config: DatabaseConnectionConfig
}

/**
 * MySQL用データベースリポジトリを作成
 */
export function createMySQLDatabaseRepository(
  config: DatabaseConnectionConfig
): DatabaseRepository {
  let mysqlState: MySQLConnection = {
    connection: null,
    config,
  }

  return {
    retrieveTableDefinitions: () => retrieveTableDefinitions(mysqlState),
    testConnection: () => testConnection(mysqlState),
    close: () => closeConnection(mysqlState),
  }
}

/**
 * テーブル定義情報を取得
 */
async function retrieveTableDefinitions(state: MySQLConnection): Promise<Database> {
  try {
    await connectToDatabase(state)

    const databaseInfo = await retrieveDatabaseInfo(state)
    const tables = await retrieveTables(state)

    return createDatabase(
      databaseInfo.name,
      databaseInfo.version,
      databaseInfo.charset,
      databaseInfo.collation,
      tables
    )
  } catch (error) {
    throw new DatabaseError(`テーブル定義の取得に失敗しました: ${error}`)
  }
}

/**
 * 接続をテスト
 */
async function testConnection(state: MySQLConnection): Promise<boolean> {
  try {
    await connectToDatabase(state)
    return true
  } catch {
    return false
  }
}

/**
 * 接続を閉じる
 */
async function closeConnection(state: MySQLConnection): Promise<void> {
  if (state.connection) {
    await state.connection.end()
    state.connection = null
  }
}

/**
 * データベースに接続
 */
async function connectToDatabase(state: MySQLConnection): Promise<void> {
  if (state.connection) {
    return
  }

  state.connection = await mysql.createConnection({
    host: state.config.host,
    port: state.config.port,
    user: state.config.username,
    password: state.config.password,
    database: state.config.database,
  })
}

/**
 * データベース情報を取得
 */
async function retrieveDatabaseInfo(state: MySQLConnection): Promise<{
  name: string
  version: string
  charset: string
  collation: string
}> {
  if (!state.connection) {
    throw new Error('データベース接続が確立されていません')
  }

  const [versionRows] = await state.connection.execute('SELECT VERSION() as version')
  const [charsetRows] = await state.connection.execute(
    `
    SELECT DEFAULT_CHARACTER_SET_NAME as charset, DEFAULT_COLLATION_NAME as collation
    FROM INFORMATION_SCHEMA.SCHEMATA
    WHERE SCHEMA_NAME = ?
  `,
    [state.config.database]
  )

  const versionData = versionRows as VersionRow[]
  const charsetData = charsetRows as CharsetRow[]

  const version = versionData[0]?.version || 'Unknown'
  const charset = charsetData[0]?.charset || 'utf8mb4'
  const collation = charsetData[0]?.collation || 'utf8mb4_general_ci'

  return {
    name: state.config.database,
    version,
    charset,
    collation,
  }
}

/**
 * テーブル一覧を取得
 */
async function retrieveTables(state: MySQLConnection): Promise<Table[]> {
  if (!state.connection) {
    throw new Error('データベース接続が確立されていません')
  }

  const [tableRows] = await state.connection.execute(
    `
    SELECT TABLE_NAME, TABLE_SCHEMA, TABLE_COMMENT
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `,
    [state.config.database]
  )

  const tables: Table[] = []
  const tableData = tableRows satisfies TableRow[]

  for (const tableRow of tableData) {
    const columns = await retrieveColumns(state, tableRow.TABLE_NAME)
    const constraints = await retrieveReferentialConstraints(state, tableRow.TABLE_NAME)

    const table = createTable(
      tableRow.TABLE_NAME,
      tableRow.TABLE_COMMENT,
      tableRow.TABLE_SCHEMA,
      columns,
      constraints
    )

    tables.push(table)
  }

  return tables
}

/**
 * カラム一覧を取得
 */
async function retrieveColumns(state: MySQLConnection, tableName: string): Promise<Column[]> {
  if (!state.connection) {
    throw new Error('データベース接続が確立されていません')
  }

  const [columnRows] = await state.connection.execute(
    `
    SELECT
      COLUMN_NAME,
      DATA_TYPE,
      IS_NULLABLE,
      COLUMN_DEFAULT,
      CHARACTER_MAXIMUM_LENGTH,
      NUMERIC_PRECISION,
      NUMERIC_SCALE,
      COLUMN_KEY,
      EXTRA,
      COLUMN_COMMENT
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `,
    [state.config.database, tableName]
  )

  const columns: Column[] = []
  const columnData = columnRows satisfies ColumnRow[]

  for (const columnRow of columnData) {
    const column = createColumn(
      columnRow.COLUMN_NAME,
      columnRow.COLUMN_COMMENT,
      columnRow.DATA_TYPE,
      columnRow.IS_NULLABLE === 'YES',
      columnRow.COLUMN_DEFAULT,
      columnRow.CHARACTER_MAXIMUM_LENGTH,
      columnRow.NUMERIC_PRECISION,
      columnRow.NUMERIC_SCALE,
      columnRow.COLUMN_KEY === 'PRI',
      columnRow.COLUMN_KEY === 'UNI',
      columnRow.EXTRA.includes('auto_increment'),
      null // 外部キー制約は別途設定
    )

    columns.push(column)
  }

  return columns
}

/**
 * 参照整合性制約を取得
 */
async function retrieveReferentialConstraints(
  state: MySQLConnection,
  tableName: string
): Promise<ReferentialConstraint[]> {
  if (!state.connection) {
    throw new Error('データベース接続が確立されていません')
  }

  const [constraintRows] = await state.connection.execute(
    `
    SELECT
      kcu.CONSTRAINT_NAME,
      kcu.COLUMN_NAME,
      kcu.REFERENCED_TABLE_NAME,
      kcu.REFERENCED_COLUMN_NAME,
      rc.DELETE_RULE,
      rc.UPDATE_RULE
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
    JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
      ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME
      AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
    WHERE kcu.TABLE_SCHEMA = ? AND kcu.TABLE_NAME = ?
      AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY kcu.ORDINAL_POSITION
  `,
    [state.config.database, tableName]
  )

  const constraints: ReferentialConstraint[] = []
  const constraintData = constraintRows satisfies ConstraintRow[]

  for (const constraintRow of constraintData) {
    const constraint = createReferentialConstraint(
      constraintRow.CONSTRAINT_NAME,
      tableName,
      constraintRow.COLUMN_NAME,
      constraintRow.REFERENCED_TABLE_NAME,
      constraintRow.REFERENCED_COLUMN_NAME,
      mapConstraintAction(constraintRow.DELETE_RULE),
      mapConstraintAction(constraintRow.UPDATE_RULE),
      true
    )

    constraints.push(constraint)
  }

  return constraints
}

function mapConstraintAction(action: string): ConstraintAction {
  switch (action.toUpperCase()) {
    case 'CASCADE':
      return ConstraintAction.CASCADE
    case 'RESTRICT':
      return ConstraintAction.RESTRICT
    case 'SET NULL':
      return ConstraintAction.SET_NULL
    case 'SET DEFAULT':
      return ConstraintAction.SET_DEFAULT
    case 'NO ACTION':
      return ConstraintAction.NO_ACTION
    default:
      return ConstraintAction.RESTRICT
  }
}
