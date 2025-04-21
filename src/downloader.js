/**
 * Downloader module - Functions for downloading YouTube content
 */

const { exec, execSync } = require('child_process');
const path = require('path');
const { log } = require('./logger');
const { downloadThumbnail, addMetadata } = require('./metadata');

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

module.exports = {
    yt_dlp
};
