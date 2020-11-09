let chalk = require('chalk')
let ProgressPlugin = require('webpack/lib/ProgressPlugin')
let log = require('log-update')
let path = require('path')

const thresholder = 0.99

function now() {
  return new Date().toTimeString().split(' ')[0]
}

class Progress {
  constructor(options) {
    this.delegate = new ProgressPlugin(options)
  }
  apply(compiler) {
    this.delegate.apply(compiler)
    let invalid = () => {
      console.log(chalk.white('Compiling...'))
    }
    if (compiler.hooks) {
      compiler.hooks.invalid.tap('ProgressWebpckPlugin', invalid)
    } else {
      compiler.plugin('invalid', invalid)
    }
  }
}

function progressPlugin(options = {}) {
  let identifier = options.identifier || ''
  let id = identifier && identifier + ' '
  let onStart = options.onStart || (() => {})
  let onFinish = options.onFinish
  let onProgress = options.onProgress
  let coloring = onProgress === undefined
  let clear = typeof options.clear === 'boolean' ? options.clear : true
  let startTime
  let finishTime
  let duration

  const handler = (percentage, message, ...args) => {
    startTime = Date.now()
    let output = []
    if (percentage > thresholder) {
      return
    }
    if (percentage === 0) onStart()
    if (percentage > 0 && percentage < thresholder) {
      if (message === '') return
      const banner = `[${Math.round(percentage * 100)}%] `
      output.push(coloring ? chalk.yellow(banner) : banner)
      output.push(
        coloring ? chalk.white(`${message} ${id}`) : `${message} ${id}`
      )
      if (args.length > 0) {
        let details = args.join(' ')
        if (
          /^\d+\/\d+\s{1}modules/.test(args[0]) === true &&
          args.length === 2
        ) {
          const rootPath = path.resolve('.')
          details = [args[0]].concat([args[1].replace(rootPath, '')]).join(' ')
        }
        if (/^import\s{1}loader/.test(args[0]) === true && args.length === 1) {
          const matches = args[0].match(
            /^import\s{1}loader\s{1}(\S+\/node_modules\/)/
          )
          details = args[0].replace(matches[1], '')
        }
        output.push(coloring ? chalk.grey(`(${details})`) : `(${details})`)
      }
    }

    // // 5. finished
    if (percentage === thresholder) {
      finishTime = Date.now()
      duration = (finishTime - startTime) / 1000
      duration = duration.toFixed(3)

      if (typeof onFinish === 'function') {
        onFinish(id, now(), duration)
      } else {
        output.push(
          coloring
            ? chalk.white(`Build ${id}finished at ${now()} by ${duration}s`)
            : `Build ${id}finished at ${now()} by ${duration}s`
        )
      }
    }
    if (onProgress) {
      if (percentage > 0 && percentage < thresholder) {
        onProgress(output, percentage)
      }
    } else {
      log(output.join(''))
      if (percentage === thresholder) {
        if (clear) {
          log.clear()
        } else {
          log.done()
        }
      }
    }
  }
  return new Progress({
    handler,
    entries: false,
    activeModules: false,
    modules: true,
    modulesCount: 5000,
    dependencies: false,
    dependenciesCount: 10000,
    percentBy: 'entries'
  })
}

module.exports = progressPlugin
