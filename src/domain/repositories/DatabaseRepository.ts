import { Database } from '@/domain/entities/Database'

/**
 * データベースリポジトリのインターフェース
 */
export interface DatabaseRepository {
  /**
   * テーブル定義情報を取得
   */
  retrieveTableDefinitions(): Promise<Database>

  /**
   * 接続をテスト
   */
  testConnection(): Promise<boolean>

  /**
   * 接続を閉じる
   */
  close(): Promise<void>
}
