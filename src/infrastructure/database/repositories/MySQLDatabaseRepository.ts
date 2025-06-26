import { DatabaseRepository } from '@/domain/repositories/DatabaseRepository'
import { Database, createDatabase } from '@/domain/entities/Database'
import { Table, createTable } from '@/domain/entities/Table'
import { Column, createColumn } from '@/domain/entities/Column'
import {
  ReferentialConstraint,
  ConstraintAction,
  createReferentialConstraint,
} from '@/domain/entities/ReferentialConstraint'
import { DatabaseConnectionConfig } from '@/shared/types/DatabaseType'
import { DatabaseError } from '@/shared/errors/AppError'
import mysql from 'mysql2/promise'
import { DatabaseInfo, isValidVersionResult } from '@/infrastructure/database/types/QueryTypes'

// MySQL固有の型定義
type ColumnKeyType = 'PRI' | 'UNI' | 'MUL' | ''

// MySQL固有のクエリ結果型定義（RowDataPacketを継承）
interface VersionQueryResult extends mysql.RowDataPacket {
  version: string
}

interface CharsetQueryResult extends mysql.RowDataPacket {
  charset: string
  collation: string
}

interface TableQueryResult extends mysql.RowDataPacket {
  table_name: string
  table_schema: string
  table_comment: string | null
}

interface ColumnQueryResult extends mysql.RowDataPacket {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
  column_key: ColumnKeyType
  extra: string
  column_comment: string | null
  column_type: string
}

interface ReferentialConstraintQueryResult extends mysql.RowDataPacket {
  constraint_name: string
  source_table: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
  delete_rule: string
  update_rule: string
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
async function retrieveDatabaseInfo(state: MySQLConnection): Promise<DatabaseInfo> {
  if (!state.connection) {
    throw new Error('データベース接続が確立されていません')
  }

  const [versionRows] = await state.connection.execute<VersionQueryResult[]>(
    'SELECT VERSION() as version'
  )
  const [charsetRows] = await state.connection.execute<CharsetQueryResult[]>(
    `
    SELECT DEFAULT_CHARACTER_SET_NAME as charset, DEFAULT_COLLATION_NAME as collation
    FROM INFORMATION_SCHEMA.SCHEMATA
    WHERE SCHEMA_NAME = ?
  `,
    [state.config.database]
  )

  const versionRow = versionRows[0]
  const charsetRow = charsetRows[0]

  if (!versionRow || !isValidVersionResult(versionRow)) {
    throw new Error('データベースバージョン情報の取得に失敗しました')
  }

  if (!charsetRow) {
    throw new Error('データベース文字セット情報の取得に失敗しました')
  }

  return {
    name: state.config.database,
    version: versionRow.version,
    charset: charsetRow.charset,
    collation: charsetRow.collation,
  }
}

/**
 * テーブル一覧を取得
 */
async function retrieveTables(state: MySQLConnection): Promise<Table[]> {
  if (!state.connection) {
    throw new Error('データベース接続が確立されていません')
  }

  const [tableRows] = await state.connection.execute<TableQueryResult[]>(
    `
    SELECT
      TABLE_NAME as table_name,
      TABLE_SCHEMA as table_schema,
      TABLE_COMMENT as table_comment
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `,
    [state.config.database]
  )

  const tables: Table[] = []

  for (const tableRow of tableRows) {
    const columns = await retrieveColumns(state, tableRow.table_name)
    const constraints = await retrieveReferentialConstraints(state, tableRow.table_name)

    const table = createTable(
      tableRow.table_name,
      tableRow.table_comment,
      tableRow.table_schema,
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

  const [columnRows] = await state.connection.execute<ColumnQueryResult[]>(
    `
    SELECT
      COLUMN_NAME as column_name,
      DATA_TYPE as data_type,
      IS_NULLABLE as is_nullable,
      COLUMN_DEFAULT as column_default,
      CHARACTER_MAXIMUM_LENGTH as character_maximum_length,
      NUMERIC_PRECISION as numeric_precision,
      NUMERIC_SCALE as numeric_scale,
      COLUMN_KEY as column_key,
      EXTRA as extra,
      COLUMN_COMMENT as column_comment,
      COLUMN_TYPE as column_type
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
    ORDER BY ORDINAL_POSITION
  `,
    [state.config.database, tableName]
  )

  return columnRows.map((row) => {
    const enumValues = extractEnumValues(row.column_type)

    return createColumn(
      row.column_name,
      row.column_comment,
      row.data_type,
      row.is_nullable === 'YES',
      row.column_default,
      row.character_maximum_length,
      row.numeric_precision,
      row.numeric_scale,
      row.column_key === 'PRI',
      row.column_key === 'UNI',
      row.extra.includes('auto_increment'),
      null, // foreignKeyConstraint
      enumValues
    )
  })
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

  const [constraintRows] = await state.connection.execute<ReferentialConstraintQueryResult[]>(
    `
    SELECT
      kcu.CONSTRAINT_NAME as constraint_name,
      kcu.TABLE_NAME as source_table,
      kcu.COLUMN_NAME as column_name,
      kcu.REFERENCED_TABLE_NAME as foreign_table_name,
      kcu.REFERENCED_COLUMN_NAME as foreign_column_name,
      rc.DELETE_RULE as delete_rule,
      rc.UPDATE_RULE as update_rule
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

  return constraintRows.map((row) =>
    createReferentialConstraint(
      row.constraint_name,
      row.source_table,
      row.column_name,
      row.foreign_table_name,
      row.foreign_column_name,
      mapConstraintAction(row.delete_rule),
      mapConstraintAction(row.update_rule),
      true
    )
  )
}

/**
 * MySQLの制約アクションをマップ
 */
function mapConstraintAction(action: string): ConstraintAction {
  switch (action.toUpperCase()) {
    case 'CASCADE':
      return ConstraintAction.CASCADE
    case 'RESTRICT':
      return ConstraintAction.RESTRICT
    case 'SET NULL':
      return ConstraintAction.SET_NULL
    case 'NO ACTION':
      return ConstraintAction.NO_ACTION
    case 'SET DEFAULT':
      return ConstraintAction.SET_DEFAULT
    default:
      return ConstraintAction.RESTRICT
  }
}

/**
 * ENUM型のcolumn_typeから許容値を抽出
 * 例: "enum('pending','confirmed','shipped')" → ['pending', 'confirmed', 'shipped']
 */
function extractEnumValues(columnType: string): string[] | null {
  if (!columnType.toLowerCase().startsWith('enum(')) {
    return null
  }

  // enum('value1','value2','value3') の形式から値を抽出
  const match = columnType.match(/enum\((.+)\)/i)
  if (!match) {
    return null
  }

  // 内部の値をカンマで分割し、シングルクォートを除去
  const valuesString = match[1]
  const values = valuesString
    .split(',')
    .map((value) => value.trim().replace(/^'|'$/g, ''))
    .filter((value) => value.length > 0)

  return values.length > 0 ? values : null
}
