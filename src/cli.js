/**
 * CLI module - Command-line interface setup
 */

const { program } = require('commander');

/**
 * Setup command-line options
 * @returns {object} - Parsed command-line options
 */
function setupCLI() {
    program
        .name('bookmark-dlp')
        .description('Download audio from YouTube links in a bookmarks file')
        .version('1.0.0')
        .option('-b, --bookmarks <path>', 'Path to bookmarks.html file')
        .option('-o, --output <directory>', 'Output directory for downloaded files', '.')
        .option('-f, --format <format>', 'Output format (mp3, m4a, etc.)', 'mp3')
        .option('-c, --concurrent <number>', 'Maximum number of concurrent downloads', '3')
        .option('-k, --keyword <keyword>', 'Only download URLs containing this keyword')
        .option('-a, --audio-only', 'Download audio only', true)
        .option('-i, --index <number>', 'Download only the specified index from the links array')
        .option('-l, --list', 'List all YouTube links without downloading')
        .option('-m, --metadata', 'Add metadata to downloaded files', true)
        .option('-v, --verbose', 'Show verbose output')
        .parse(process.argv);

    return program.opts();
}

module.exports = {
    setupCLI
};
