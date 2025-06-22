/**
 * データベースクエリ結果の共通型定義
 * PostgreSQLとMySQLで統一された型ルールを適用
 */

/**
 * データベース情報の型定義
 */
export interface DatabaseInfo {
  name: string
  version: string
  charset: string
  collation: string
}

/**
 * 制約ルールの型定義
 */
export type ConstraintRuleType = 'CASCADE' | 'RESTRICT' | 'SET NULL' | 'SET DEFAULT' | 'NO ACTION'

/**
 * 型ガード関数
 */
export function isValidVersionResult(result: unknown): boolean {
  return (
    result !== null &&
    typeof result === 'object' &&
    'version' in result &&
    typeof result.version === 'string'
  )
}

export function isValidTableResult(result: unknown): boolean {
  return (
    result !== null &&
    typeof result === 'object' &&
    'table_name' in result &&
    'table_schema' in result &&
    typeof result.table_name === 'string' &&
    typeof result.table_schema === 'string'
  )
}
