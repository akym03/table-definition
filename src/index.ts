import * as cli from '@/interface/cli/CLIController'
import { config } from 'dotenv'

// 環境変数を読み込み
config()

/**
 * コマンドライン引数を解析
 */
function parseArgs(): import('./interface/cli/CLIController').CLIArgs {
  const args = process.argv.slice(2)
  const result: import('./interface/cli/CLIController').CLIArgs = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    switch (arg) {
      case '-o':
      case '--output':
        result.output = args[++i]
        break
      case '-t':
      case '--template':
        result.template = args[++i]
        break
      case '--tables':
        result.tables = args[++i]?.split(',').map((t) => t.trim())
        break
      case '--logical-names':
        result.preferLogicalNames = true
        break
      case '--no-constraints':
        result.includeConstraints = false
        break
      case '-h':
      case '--help':
        result.help = true
        break
    }
  }

  return result
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  const args = parseArgs()
  if (args.help) {
    cli.showHelp()
    return
  }

  await cli.exportDatabaseDefinitionCLI(args)
}

// アプリケーション実行
main().catch((error) => {
  console.error('アプリケーションエラー:', error)
  process.exit(1)
})
