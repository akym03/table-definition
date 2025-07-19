import { Database } from '@/domain/entities/Database'
import { DbIndex } from '@/domain/entities/DbIndex'

/**
 * データベースリポジトリのインターフェース
 */
export interface DatabaseRepository {
  /**
   * テーブル定義情報を取得
   */
  retrieveTableDefinitions(): Promise<Database>

  /**
   * 指定されたテーブルのインデックス情報を取得
   */
  retrieveIndexes(tableName: string, schemaName?: string): Promise<DbIndex[]>

  /**
   * 接続をテスト
   */
  testConnection(): Promise<boolean>

  /**
   * 接続を閉じる
   */
  close(): Promise<void>
}
