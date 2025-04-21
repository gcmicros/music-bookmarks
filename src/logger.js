/**
 * Logger module - Provides colored console logging functionality
 */

// Configure console colors for better logging
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Global verbose flag
let verboseMode = false;

/**
 * Set verbose mode
 * @param {boolean} isVerbose - Whether to enable verbose logging
 */
function setVerboseMode(isVerbose) {
  verboseMode = isVerbose;
}

/**
 * Log a message with color and timestamp
 * @param {string} message - Message to log
 * @param {string} type - Type of log (info, success, error, warning, debug, start, complete)
 */
function log(message, type = 'info') {
  // Skip debug messages if not in verbose mode
  if (type === 'debug' && !verboseMode) {
    return;
  }
  
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  let color = colors.reset;
  let prefix = '';
  
  switch (type) {
    case 'success':
      color = colors.green;
      prefix = '✅ ';
      break;
    case 'error':
      color = colors.red;
      prefix = '❌ ';
      break;
    case 'warning':
      color = colors.yellow;
      prefix = '⚠️ ';
      break;
    case 'info':
      color = colors.blue;
      prefix = 'ℹ️ ';
      break;
    case 'debug':
      color = colors.dim;
      prefix = '🔍 ';
      break;
    case 'start':
      color = colors.cyan;
      prefix = '🚀 ';
      break;
    case 'complete':
      color = colors.green;
      prefix = '🏁 ';
      break;
  }
  
  console.log(`${color}[${timestamp}] ${prefix}${message}${colors.reset}`);
}

module.exports = {
  log,
  setVerboseMode
};
