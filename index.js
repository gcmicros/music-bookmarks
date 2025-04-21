/**
 * Bookmark-DLP - A tool to download audio from YouTube links in a bookmarks file
 * 
 * This script extracts YouTube links from a Chrome/Firefox bookmarks HTML file,
 * downloads the audio using yt-dlp, and adds metadata tags to the files.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');
const { program } = require('commander');
const path = require('path');
const NodeID3 = require('node-id3');

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

/**
 * Log a message with color and timestamp
 * @param {string} message - Message to log
 * @param {string} type - Type of log (info, success, error, warning)
 */
function log(message, type = 'info') {
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

/**
 * Parse a JSON string safely
 * @param {string} str - String to parse
 * @returns {object|boolean} - Parsed object or false if parsing failed
 */
function isJsonString(str) {
    try {
        return JSON.parse(str);
    } catch (error) {
        log(`Failed to parse JSON: ${str.substring(0, 50)}...`, 'debug');
        return false;
    }
}

/**
 * Download a thumbnail image from a URL
 * @param {string} url - URL of the thumbnail
 * @returns {Promise<Buffer|null>} - Buffer containing the image data or null if download failed
 */
async function downloadThumbnail(url) {
    return new Promise((resolve) => {
        try {
            log(`Downloading thumbnail from: ${url}`, 'debug');
            const https = require('https');
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    log(`Failed to download thumbnail: HTTP ${response.statusCode}`, 'error');
                    resolve(null);
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    log(`Thumbnail downloaded successfully (${buffer.length} bytes)`, 'debug');
                    resolve(buffer);
                });
            }).on('error', (error) => {
                log(`Error downloading thumbnail: ${error.message}`, 'error');
                resolve(null);
            });
        } catch (error) {
            log(`Error in downloadThumbnail: ${error.message}`, 'error');
            resolve(null);
        }
    });
}

/**
 * Add metadata tags to an audio file
 * @param {string} filePath - Path to the audio file
 * @param {object} metadata - Metadata to add to the file
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
async function addMetadata(filePath, metadata) {
    return new Promise((resolve) => {
        try {
            log(`Adding metadata to: ${path.basename(filePath)}`, 'info');
            
            // Create tags object
            const tags = {
                title: metadata.title || '',
                artist: metadata.artist || 'YouTube',
                album: metadata.album || 'Downloaded with bookmark-dlp',
                year: metadata.uploadDate ? metadata.uploadDate.substring(0, 4) : '',
                comment: {
                    language: 'eng',
                    text: `Source: ${metadata.webpage_url || ''}\nDescription: ${metadata.description || ''}`
                },
                genre: metadata.categories ? metadata.categories.join(', ') : '',
                image: {
                    mime: 'image/jpeg',
                    type: {
                        id: 3,
                        name: 'front cover'
                    },
                    description: 'Thumbnail',
                    imageBuffer: metadata.thumbnailBuffer
                }
            };

            // Log metadata details
            log(`Metadata details:`, 'debug');
            log(`- Title: ${tags.title}`, 'debug');
            log(`- Artist: ${tags.artist}`, 'debug');
            log(`- Album: ${tags.album}`, 'debug');
            log(`- Year: ${tags.year}`, 'debug');
            log(`- Thumbnail: ${metadata.thumbnailBuffer ? 'Present' : 'Missing'}`, 'debug');

            // Write tags to file
            const success = NodeID3.write(tags, filePath);
            log(`Metadata ${success ? 'added successfully to' : 'failed for'} ${path.basename(filePath)}`, success ? 'success' : 'error');
            resolve(success);
        } catch (error) {
            log(`Error adding metadata: ${error.message}`, 'error');
            resolve(false);
        }
    });
}

/**
 * Download audio from a YouTube link using yt-dlp
 * @param {string} link - YouTube URL to download
 * @param {object} options - Download options
 * @param {string} options.outputDir - Output directory for downloaded files
 * @param {string} options.format - Output format (mp3, m4a, etc.)
 * @param {boolean} options.audioOnly - Whether to download audio only
 * @param {boolean} options.addMetadata - Whether to add metadata to the file
 * @returns {Promise<object>} - Download result
 */
async function yt_dlp(link, options = {}) {
    return new Promise((resolve, reject) => {
        try {
            log(`Starting download: ${link}`, 'start');

            // Get video information using yt-dlp
            log(`Fetching video information...`, 'debug');
            const output = execSync(`yt-dlp -F -J "${link}"`, {encoding: 'utf8'});
            if (output.includes('Video unavailable')) {
                throw new Error('Could not find video. It may be unavailable or private.');
            }
            
            // Parse JSON output from yt-dlp
            const [json] = output.split('\n')
                .map(isJsonString)
                .filter(l => l !== false);
                
            if (!json) {
                throw new Error('Failed to parse video information');
            }
            
            log(`Video information retrieved: "${json.title}" by ${json.uploader || json.channel || 'Unknown'}`, 'info');

            // Sanitize title for filename
            const title = json.title
                .replace(/[\/\\?%*:|<>]/g, '_')  // Replace invalid characters with '_'
                .replace(/\s+/g, '_')             // Replace spaces with underscores
                .replace(/[^a-zA-Z0-9._-]/g, '')  // Remove any non-alphanumeric character except underscores, periods, and hyphens
                .toLowerCase();

            // Filter formats based on options
            let formats = json.formats;
            if (options.audioOnly) {
                log(`Filtering for audio-only formats...`, 'debug');
                formats = formats.filter(f => f?.resolution == 'audio only');
            }
            
            const formatIds = formats.map(a => a.format_id);

            if (!formatIds || formatIds.length === 0) {
                throw new Error('Failed to find suitable format');
            }
            
            // Select format and prepare output path
            const formatId = options.formatId || formatIds[0];
            const outputPath = path.join(options.outputDir || '.', `${title}.${options.format || 'mp3'}`);
            
            log(`Selected format: ${formatId}`, 'debug');
            log(`Output path: ${outputPath}`, 'debug');
            
            // Download the video/audio
            log(`Downloading content...`, 'info');
            exec(`yt-dlp "${link}" -f ${formatId} -o "${outputPath}"`, async (error, stdout, stderr) => {
                if (error) {
                    log(`Error downloading ${link}: ${error.message}`, 'error');
                    reject(error);
                    return;
                }
                
                if (stderr) {
                    log(`yt-dlp stderr: ${stderr}`, 'warning');
                }
                
                log(`Download completed: ${outputPath}`, 'success');
                
                // Add metadata if enabled
                if (options.addMetadata !== false) {
                    try {
                        log(`Processing metadata for ${path.basename(outputPath)}...`, 'info');
                        
                        // Extract metadata from the JSON
                        const metadata = {
                            title: json.title,
                            artist: json.uploader || json.channel,
                            album: json.album || 'YouTube',
                            uploadDate: json.upload_date,
                            description: json.description,
                            webpage_url: json.webpage_url,
                            categories: json.categories
                        };
                        
                        // Download thumbnail if available
                        if (json.thumbnail) {
                            log(`Downloading thumbnail for ${title}...`, 'info');
                            metadata.thumbnailBuffer = await downloadThumbnail(json.thumbnail);
                        }
                        
                        // Add metadata to the file
                        await addMetadata(outputPath, metadata);
                    } catch (metadataError) {
                        log(`Error adding metadata: ${metadataError.message}`, 'error');
                    }
                }
                
                log(`Processing complete for: ${link}`, 'complete');
                resolve({
                    title,
                    path: outputPath,
                    status: 'success'
                });
            });
        } catch (error) {
            log(`Failed to download ${link}: ${error.message}`, 'error');
            reject(error);
        }
    });
}

/**
 * Extract YouTube links from a bookmarks HTML file
 * @param {string} bookmarksPath - Path to the bookmarks.html file
 * @returns {string[]} - Array of YouTube URLs
 */
function fetchYoutubeLinks(bookmarksPath) {
    try {
        log(`Reading bookmarks file: ${bookmarksPath}`, 'info');
        
        // Read the file
        const fileContent = fs.readFileSync(bookmarksPath, 'utf-8');
        log(`Bookmarks file read successfully (${fileContent.length} bytes)`, 'debug');

        // Match all HREF attributes inside <A> tags
        const allLinks = [...fileContent.matchAll(/<A[^>]*HREF="([^"]+)"/gi)]
            .map(match => match[1]);
            
        log(`Found ${allLinks.length} total links in bookmarks file`, 'debug');
        
        // Filter only YouTube links
        const youtubeLinks = allLinks.filter(url => url.includes('youtube.com'));

        log(`Found ${youtubeLinks.length} YouTube links in bookmarks file`, 'success');
        return youtubeLinks;
    } catch (error) {
        log(`Error reading bookmarks file: ${error.message}`, 'error');
        return [];
    }
}

// Setup command-line options
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

const options = program.opts();

/**
 * Main function - Entry point of the application
 */
async function main() {
    try {
        log(`Bookmark-DLP started`, 'start');
        
        // Get links from bookmarks file or use default array
        let links;
        if (options.bookmarks) {
            log(`Using bookmarks file: ${options.bookmarks}`, 'info');
            links = fetchYoutubeLinks(options.bookmarks);
            if (links.length === 0) {
                log('No YouTube links found in the bookmarks file', 'error');
                return;
            }
        } else {
            log('No bookmarks file specified, using default YouTube links', 'warning');
            links = [
                'https://www.youtube.com/watch?v=FXw-CsKgX-k&t=3097s',
                'https://www.youtube.com/watch?v=3XTV6pkQne0',
                'https://www.youtube.com/watch?v=amfAAzhjC0E',
                'https://www.youtube.com/watch?v=vN4Vc9T8QQc',
                'https://www.youtube.com/watch?v=f1qTRHGqaQI',
                'https://www.youtube.com/watch?v=FfrJrvF7gcU',
                'https://www.youtube.com/watch?v=Pi7l8mMjYVE&list=PLMrJAkhIeNNR20Mz-VpzgfQs5zrYi085m',
                'https://www.youtube.com/watch?v=kB6U0SGeYrM&t=45s'
            ];
            log(`Loaded ${links.length} default YouTube links`, 'info');
        }

        // Filter by keyword if provided
        if (options.keyword) {
            const originalCount = links.length;
            links = links.filter(link => link.includes(options.keyword));
            log(`Filtered links by keyword "${options.keyword}": ${links.length}/${originalCount} links remaining`, 'info');
        }

        // List mode - just show the links and exit
        if (options.list) {
            log('YouTube links found:', 'info');
            links.forEach((link, index) => {
                log(`${index}: ${link}`, 'info');
            });
            log('Listing complete, exiting without downloading', 'complete');
            return;
        }

        // Create output directory if it doesn't exist
        if (options.output && options.output !== '.') {
            if (!fs.existsSync(options.output)) {
                log(`Creating output directory: ${options.output}`, 'info');
                fs.mkdirSync(options.output, { recursive: true });
                log(`Output directory created successfully`, 'success');
            } else {
                log(`Using existing output directory: ${options.output}`, 'info');
            }
        }

        // Download a single video by index if specified
        if (options.index !== undefined) {
            const index = parseInt(options.index);
            if (index >= 0 && index < links.length) {
                log(`Downloading single video at index ${index}: ${links[index]}`, 'start');
                await yt_dlp(links[index], {
                    outputDir: options.output,
                    format: options.format,
                    audioOnly: options.audioOnly,
                    addMetadata: options.metadata
                });
                log(`Single video download complete`, 'complete');
                return;
            } else {
                log(`Invalid index: ${options.index}. Must be between 0 and ${links.length - 1}`, 'error');
                return;
            }
        }

        // Download all videos with concurrency limit
        const concurrentLimit = parseInt(options.concurrent);
        log(`Starting download of ${links.length} videos with concurrency limit of ${concurrentLimit}`, 'start');
        
        // Process links in batches to respect concurrency limit
        const totalBatches = Math.ceil(links.length / concurrentLimit);
        for (let i = 0; i < links.length; i += concurrentLimit) {
            const batch = links.slice(i, i + concurrentLimit);
            const batchNumber = Math.floor(i / concurrentLimit) + 1;
            
            log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} links)`, 'info');
            
            const downloadPromises = batch.map(link => yt_dlp(link, {
                outputDir: options.output,
                format: options.format,
                audioOnly: options.audioOnly,
                addMetadata: options.metadata
            }));
            
            const results = await Promise.allSettled(downloadPromises);
            
            // Log results for this batch
            log(`Batch ${batchNumber}/${totalBatches} results:`, 'info');
            results.forEach((result, index) => {
                const link = batch[index];
                if (result.status === 'fulfilled') {
                    log(`${link}: Success`, 'success');
                } else {
                    log(`${link}: Failed - ${result.reason}`, 'error');
                }
            });
            
            log(`Batch ${batchNumber}/${totalBatches} completed`, 'complete');
        }
        
        log("All downloads completed successfully", 'complete');
    } catch (error) {
        log(`An error occurred: ${error.message}`, 'error');
        log(`Stack trace: ${error.stack}`, 'debug');
    }
}

// Run the main function
main();
