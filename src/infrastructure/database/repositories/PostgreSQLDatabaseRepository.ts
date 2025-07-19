import { DatabaseRepository } from '@/domain/repositories/DatabaseRepository'
import { Database, createDatabase } from '@/domain/entities/Database'
import { Table, createTable } from '@/domain/entities/Table'
import { Column, createColumn } from '@/domain/entities/Column'
import {
  ReferentialConstraint,
  ConstraintAction,
  createReferentialConstraint,
} from '@/domain/entities/ReferentialConstraint'
import { DbIndex, createDbIndex } from '@/domain/entities/DbIndex'
import { DatabaseConnectionConfig } from '@/shared/types/DatabaseType'
import { DatabaseError } from '@/shared/errors/AppError'
import { Client } from 'pg'
import { DatabaseInfo, isValidVersionResult } from '@/infrastructure/database/types/QueryTypes'

// PostgreSQL固有のクエリ結果型定義
interface VersionQueryResult {
  version: string
}

interface TableQueryResult {
  table_name: string
  table_schema: string
}

interface TableCommentQueryResult {
  table_comment: string | null
}

interface ColumnQueryResult {
  column_name: string
  data_type: string
  is_nullable: 'YES' | 'NO'
  column_default: string | null
  character_maximum_length: number | null
  numeric_precision: number | null
  numeric_scale: number | null
  enum_type: string | null
  enum_values: string | null
}

interface PrimaryKeyQueryResult {
  column_name: string
}

interface UniqueConstraintQueryResult {
  column_name: string
}

interface ColumnCommentQueryResult {
  column_name: string
  column_comment: string | null
}

interface ReferentialConstraintQueryResult {
  constraint_name: string
  source_table: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
  delete_rule: string
  update_rule: string
}

interface IndexQueryResult {
  table_name: string
  index_name: string
  column_name: string
  seq_in_index: number
  is_unique: boolean
  index_type: string
}

interface PostgreSQLConnection {
  client: Client | null
  config: DatabaseConnectionConfig
}

/**
 * PostgreSQL用データベースリポジトリを作成
 */
export function createPostgreSQLDatabaseRepository(
  config: DatabaseConnectionConfig
): DatabaseRepository {
  let postgreSQLState: PostgreSQLConnection = {
    client: null,
    config,
  }

  return {
    retrieveTableDefinitions: () => retrieveTableDefinitions(postgreSQLState),
    retrieveIndexes: (tableName: string, schemaName?: string) =>
      retrieveIndexes(postgreSQLState, tableName, schemaName),
    testConnection: () => testConnection(postgreSQLState),
    close: () => closeConnection(postgreSQLState),
  }
}

/**
 * テーブル定義情報を取得
 */
async function retrieveTableDefinitions(state: PostgreSQLConnection): Promise<Database> {
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
async function testConnection(state: PostgreSQLConnection): Promise<boolean> {
  try {
    await connectToDatabase(state)
    return true
  } catch {
    return false
  }
}

/**
 * インデックス情報を取得
 */
async function retrieveIndexes(
  state: PostgreSQLConnection,
  tableName: string,
  schemaName?: string
): Promise<DbIndex[]> {
  try {
    await connectToDatabase(state)

    if (!state.client) {
      throw new Error('データベース接続が確立されていません')
    }

    const schema = schemaName || 'public'

    const result = await state.client.query<IndexQueryResult>(
      `
      SELECT
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name,
        a.attnum as seq_in_index,
        ix.indisunique as is_unique,
        am.amname as index_type
      FROM pg_class t
      JOIN pg_index ix ON t.oid = ix.indrelid
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_attribute a ON a.attrelid = t.oid
      JOIN pg_am am ON i.relam = am.oid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE t.relname = $1
        AND n.nspname = $2
        AND a.attnum = ANY(ix.indkey)
        AND a.attnum > 0
        AND NOT a.attisdropped
      ORDER BY i.relname, a.attnum
    `,
      [tableName, schema]
    )

    // インデックス名でグループ化する
    const indexMap = new Map<string, IndexQueryResult[]>()

    for (const row of result.rows) {
      if (!indexMap.has(row.index_name)) {
        indexMap.set(row.index_name, [])
      }
      indexMap.get(row.index_name)!.push(row)
    }

    // DbIndexオブジェクトに変換
    const indexes: DbIndex[] = []

    for (const [indexName, indexColumns] of indexMap) {
      // カラムをシーケンス順にソート
      const sortedColumns = indexColumns.sort((a, b) => a.seq_in_index - b.seq_in_index)
      const columns = sortedColumns.map((col) => col.column_name)
      const isUnique = sortedColumns[0].is_unique
      const indexType = sortedColumns[0].index_type || 'btree'

      const dbIndex = createDbIndex(tableName, indexName, isUnique, columns, indexType)

      indexes.push(dbIndex)
    }

    return indexes
  } catch (error) {
    throw new DatabaseError(`インデックス情報の取得に失敗しました: ${error}`)
  }
}

/**
 * 接続を閉じる
 */
async function closeConnection(state: PostgreSQLConnection): Promise<void> {
  if (state.client) {
    await state.client.end()
    state.client = null
  }
}

/**
 * データベースに接続
 */
async function connectToDatabase(state: PostgreSQLConnection): Promise<void> {
  if (state.client) {
    return
  }

  state.client = new Client({
    host: state.config.host,
    port: state.config.port,
    user: state.config.username,
    password: state.config.password,
    database: state.config.database,
  })

  await state.client.connect()
}

/**
 * データベース情報を取得
 */
async function retrieveDatabaseInfo(state: PostgreSQLConnection): Promise<DatabaseInfo> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const versionResult = await state.client.query<VersionQueryResult>('SELECT version()')
  const versionRow = versionResult.rows[0]

  if (!versionRow || !isValidVersionResult(versionRow)) {
    throw new Error('データベースバージョン情報の取得に失敗しました')
  }

  return {
    name: state.config.database,
    version: versionRow.version,
    charset: 'UTF8',
    collation: 'en_US.UTF-8',
  }
}

/**
 * テーブル一覧を取得
 */
async function retrieveTables(state: PostgreSQLConnection): Promise<Table[]> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<TableQueryResult>(`
    SELECT table_name, table_schema
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)

  const tables: Table[] = []

  for (const row of result.rows) {
    const columns = await retrieveColumns(state, row.table_name)
    const constraints = await retrieveReferentialConstraints(state, row.table_name)
    const tableComment = await retrieveTableComment(state, row.table_name)
    const indexes = await retrieveIndexes(state, row.table_name, row.table_schema)

    const table = createTable(
      row.table_name,
      tableComment,
      row.table_schema,
      columns,
      constraints,
      indexes
    )

    tables.push(table)
  }

  return tables
}

/**
 * カラム一覧を取得
 */
async function retrieveColumns(state: PostgreSQLConnection, tableName: string): Promise<Column[]> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<ColumnQueryResult>(
    `
    with
      enums as (
        SELECT
          n.nspname as schema_name,
          t.typname AS enum_type,
          array_to_string (array_agg (e.enumlabel ORDER BY e.enumsortorder), ',') AS enum_values
        FROM
          pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          JOIN pg_namespace n ON n.oid = t.typnamespace
        GROUP BY
          n.nspname,
          t.typname
        ORDER BY
          n.nspname,
          t.typname
      )
    SELECT
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      c.character_maximum_length,
      c.numeric_precision,
      c.numeric_scale,
      e.enum_type,
      e.enum_values
    FROM
      information_schema.columns as c
      LEFT OUTER JOIN enums e ON c.table_schema = e.schema_name
      and c.udt_name = e.enum_type
    WHERE
      c.table_name = $1
    ORDER BY
      c.ordinal_position
  `,
    [tableName]
  )

  // 主キー情報を取得
  const primaryKeys = await retrievePrimaryKeys(state, tableName)
  const primaryKeyColumns = new Set(primaryKeys.map((pk) => pk.column_name))

  // ユニーク制約情報を取得
  const uniqueConstraints = await retrieveUniqueConstraints(state, tableName)
  const uniqueColumns = new Set(uniqueConstraints.map((uc) => uc.column_name))

  // カラムコメント情報を取得
  const columnComments = await retrieveColumnComments(state, tableName)
  const commentMap = new Map(columnComments.map((cc) => [cc.column_name, cc.column_comment]))

  const dataTypeConverter = (data_type: string, enum_type: string | null): string => {
    if (enum_type !== null) {
      return 'enum'
    }
    return data_type
  }

  const DEFAULT_FOREIGN_KEY_CONSTRAINT = null

  return result.rows.map((row) => {
    return createColumn(
      row.column_name,
      commentMap.get(row.column_name) || null,
      dataTypeConverter(row.data_type, row.enum_type),
      row.is_nullable === 'YES',
      row.column_default,
      row.character_maximum_length,
      row.numeric_precision,
      row.numeric_scale,
      primaryKeyColumns.has(row.column_name),
      uniqueColumns.has(row.column_name),
      row.column_default?.includes('nextval') || false,
      DEFAULT_FOREIGN_KEY_CONSTRAINT,
      extractEnumValues(row.enum_values)
    )
  })
}

/**
 * 主キー情報を取得
 */
async function retrievePrimaryKeys(
  state: PostgreSQLConnection,
  tableName: string
): Promise<PrimaryKeyQueryResult[]> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<PrimaryKeyQueryResult>(
    `
    SELECT a.attname as column_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid
      AND a.attnum = ANY(con.conkey)
    WHERE con.contype = 'p'
      AND rel.relname = $1
      AND nsp.nspname = 'public'
    ORDER BY array_position(con.conkey, a.attnum)
  `,
    [tableName]
  )

  return result.rows
}

/**
 * ユニーク制約情報を取得
 */
async function retrieveUniqueConstraints(
  state: PostgreSQLConnection,
  tableName: string
): Promise<UniqueConstraintQueryResult[]> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<UniqueConstraintQueryResult>(
    `
    SELECT a.attname as column_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid
      AND a.attnum = ANY(con.conkey)
    WHERE con.contype = 'u'
      AND rel.relname = $1
      AND nsp.nspname = 'public'
    ORDER BY array_position(con.conkey, a.attnum)
  `,
    [tableName]
  )

  return result.rows
}

/**
 * 参照整合性制約を取得
 */
async function retrieveReferentialConstraints(
  state: PostgreSQLConnection,
  tableName: string
): Promise<ReferentialConstraint[]> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<ReferentialConstraintQueryResult>(
    `
    SELECT
      con.conname as constraint_name,
      src_rel.relname as source_table,
      src_att.attname as column_name,
      foreign_rel.relname AS foreign_table_name,
      foreign_att.attname AS foreign_column_name,
      con.confdeltype as delete_rule,
      con.confupdtype as update_rule
    FROM pg_constraint con
    JOIN pg_class src_rel ON src_rel.oid = con.conrelid
    JOIN pg_namespace src_nsp ON src_nsp.oid = src_rel.relnamespace
    JOIN pg_attribute src_att ON src_att.attrelid = con.conrelid
      AND src_att.attnum = ANY(con.conkey)
    JOIN pg_class foreign_rel ON foreign_rel.oid = con.confrelid
    JOIN pg_attribute foreign_att ON foreign_att.attrelid = con.confrelid
      AND foreign_att.attnum = con.confkey[array_position(con.conkey, src_att.attnum)]
    WHERE con.contype = 'f'
      AND src_rel.relname = $1
      AND src_nsp.nspname = 'public'
    ORDER BY con.conname
  `,
    [tableName]
  )

  return result.rows.map((row) =>
    createReferentialConstraint(
      row.constraint_name,
      row.source_table,
      row.column_name,
      row.foreign_table_name,
      row.foreign_column_name,
      mapConstraintActionChar(row.delete_rule),
      mapConstraintActionChar(row.update_rule),
      true
    )
  )
}

/**
 * PostgreSQLのpg_constraintテーブルの制約アクション文字をマップ
 */
function mapConstraintActionChar(actionChar: string): ConstraintAction {
  switch (actionChar) {
    case 'c':
      return ConstraintAction.CASCADE
    case 'r':
      return ConstraintAction.RESTRICT
    case 'n':
      return ConstraintAction.SET_NULL
    case 'd':
      return ConstraintAction.SET_DEFAULT
    case 'a':
    default:
      return ConstraintAction.NO_ACTION
  }
}

/**
 * テーブルコメントを取得
 */
async function retrieveTableComment(
  state: PostgreSQLConnection,
  tableName: string
): Promise<string | null> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<TableCommentQueryResult>(
    `
    SELECT obj_description(c.oid) as table_comment
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = $1 AND n.nspname = 'public'
  `,
    [tableName]
  )

  return result.rows[0]?.table_comment || null
}

/**
 * カラムコメントを取得
 */
async function retrieveColumnComments(
  state: PostgreSQLConnection,
  tableName: string
): Promise<ColumnCommentQueryResult[]> {
  if (!state.client) {
    throw new Error('データベース接続が確立されていません')
  }

  const result = await state.client.query<ColumnCommentQueryResult>(
    `
    SELECT
      a.attname as column_name,
      col_description(a.attrelid, a.attnum) as column_comment
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = $1
      AND n.nspname = 'public'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY a.attnum
  `,
    [tableName]
  )

  return result.rows
}

/**
 * Extracts an array of allowed values from a string representing ENUM values
 *
 * 例: "pending,confirmed,shipped" → ["pending", "confirmed", "shipped"]
 *
 * @param {string | null} enumValues - A comma-separated string of ENUM values, an empty string, or null.
 * @returns {string[] | null} An array of ENUM values if the input is valid, or null if the input is null or an empty string.
 *
 * Note: Passing an empty string will result in a null return value.
 *
 */
function extractEnumValues(enumValues: string | null): string[] | null {
  if (enumValues === null) {
    return null
  }

  const values = enumValues.split(',')
  return values.length > 0 && values[0] !== '' ? values : null
}
