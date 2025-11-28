/**
 * Utilitário de saída/logging para integração com n8n/CLI
 * - Garante JSON limpo no stdout
 * - Redireciona logs para stderr
 * - Suporta modo silent e debug
 */

let config = {
  silent: false,
  debug: false,
  jsonOnly: false
};

const originalConsole = {
  log: console.log,
  info: console.info
};

/**
 * Configura comportamento global de logs
 * @param {{silent?: boolean, debug?: boolean, jsonOnly?: boolean}} options
 */
function configureOutput(options = {}) {
  config = {
    silent: Boolean(options.silent),
    debug: Boolean(options.debug),
    jsonOnly: Boolean(options.jsonOnly)
  };

  if (config.silent) {
    console.log = () => {};
    console.info = () => {};
    return;
  }

  // Redirecionar logs normais para stderr para manter stdout limpo
  console.log = (...args) => {
    process.stderr.write(args.join(' ') + '\n');
  };
  console.info = (...args) => {
    process.stderr.write(args.join(' ') + '\n');
  };
}

/**
 * Imprime JSON limpo no stdout
 */
function printJSON(obj) {
  const json = JSON.stringify(obj, null, 2);
  process.stdout.write(json + '\n');
}

/**
 * Log genérico (respeita modo silent)
 */
function log(...args) {
  if (config.silent) return;
  process.stderr.write(args.join(' ') + '\n');
}

/**
 * Log de debug (apenas quando debug=true e não silent)
 */
function debug(...args) {
  if (config.silent || !config.debug) return;
  process.stderr.write('[DEBUG] ' + args.join(' ') + '\n');
}

/**
 * Restaura console original (usado em testes, se necessário)
 */
function restoreConsole() {
  console.log = originalConsole.log;
  console.info = originalConsole.info;
}

module.exports = {
  configureOutput,
  printJSON,
  log,
  debug,
  restoreConsole
};


