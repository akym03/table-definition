import { ExportDatabaseDefinitionUseCase } from '../../application/usecases/ExportDatabaseDefinitionUseCase'
import { DatabaseRepositoryFactory } from '../../infrastructure/database/repositories/DatabaseRepositoryFactory'
import { ExcelRepositoryImpl } from '../../infrastructure/excel/ExcelRepositoryImpl'
import { DatabaseDefinitionService } from '../../domain/services/DatabaseDefinitionService'
import { DatabaseConfig } from '../../infrastructure/config/DatabaseConfig'
import { AppConfig } from '../../infrastructure/config/AppConfig'
import { ExportRequest } from '../../application/dto/ExportRequest'
import { AppError } from '../../shared/errors/AppError'

/**
 * CLI用コントローラー
 */
export class CLIController {
  /**
   * データベース定義エクスポートを実行
   */
  async exportDatabaseDefinition(args: CLIArgs): Promise<void> {
    try {
      console.log('🚀 データベース定義のエクスポートを開始します...')

      // 設定の読み込み
      const databaseConfig = DatabaseConfig.loadFromEnv()
      console.log(
        `📊 データベース: ${databaseConfig.type} (${databaseConfig.host}:${databaseConfig.port}/${databaseConfig.database})`
      )

      // 依存関係の構築
      const databaseRepository = DatabaseRepositoryFactory.create(databaseConfig)
      const excelRepository = new ExcelRepositoryImpl(AppConfig.getTemplatePath())
      const databaseDefinitionService = new DatabaseDefinitionService()

      // ユースケースの実行
      const useCase = new ExportDatabaseDefinitionUseCase(
        databaseRepository,
        excelRepository,
        databaseDefinitionService
      )

      const request: ExportRequest = {
        outputPath: args.output || AppConfig.getDefaultOutputPath(),
        templatePath: args.template,
        targetTables: args.tables,
        preferLogicalNames: args.preferLogicalNames ?? AppConfig.preferLogicalNames(),
        includeConstraints: args.includeConstraints ?? AppConfig.includeConstraints(),
      }

      console.log(`📝 出力先: ${request.outputPath}`)
      if (request.targetTables && request.targetTables.length > 0) {
        console.log(`🎯 対象テーブル: ${request.targetTables.join(', ')}`)
      }

      const result = await useCase.execute(request)

      if (result.success) {
        console.log('✅ エクスポートが完了しました!')
        console.log(`📄 ファイル: ${result.outputPath}`)
        console.log(`📊 エクスポートしたテーブル数: ${result.exportedTableCount}`)

        if (result.warnings.length > 0) {
          console.log('⚠️  警告:')
          result.warnings.forEach((warning) => console.log(`   ${warning}`))
        }
      } else {
        console.error('❌ エクスポートに失敗しました')
        console.error(`エラー: ${result.errorMessage}`)
        process.exit(1)
      }
    } catch (error) {
      if (error instanceof AppError) {
        console.error(`❌ ${error.message}`)
      } else {
        console.error(`❌ 予期しないエラーが発生しました: ${error}`)
      }
      process.exit(1)
    }
  }

  /**
   * ヘルプを表示
   */
  showHelp(): void {
    console.log(`
データベース定義エクスポートツール

使用方法:
  npm start [オプション]

オプション:
  -o, --output <path>     出力ファイルパス (デフォルト: ./database-definition.xlsx)
  -t, --template <path>   テンプレートファイルパス
  --tables <table1,table2> エクスポート対象のテーブル名（カンマ区切り）
  --logical-names         論理名を優先して出力
  --no-constraints        参照整合性制約を除外
  -h, --help              このヘルプを表示

環境変数:
  DB_TYPE                 データベース種類 (mysql | postgresql)
  DB_HOST                 ホスト名
  DB_PORT                 ポート番号
  DB_DATABASE             データベース名
  DB_USERNAME             ユーザー名
  DB_PASSWORD             パスワード
  DB_SSL                  SSL接続 (true | false)

例:
  npm start
  npm start -o ./exports/db-definition.xlsx
  npm start --tables users,orders --logical-names
`)
  }
}

/**
 * CLI引数の型定義
 */
export interface CLIArgs {
  output?: string
  template?: string
  tables?: string[]
  preferLogicalNames?: boolean
  includeConstraints?: boolean
  help?: boolean
}
