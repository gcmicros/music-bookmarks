const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');
const { program } = require('commander');
const path = require('path');
const NodeID3 = require('node-id3');

/**
 * Parse a JSON string safely
 * @param {string} str - String to parse
 * @returns {object|boolean} - Parsed object or false if parsing failed
 */
function isJsonString(str) {
    try {
        return JSON.parse(str)
    } catch (error) {
        //console.log('failed to parse line');  
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
            const https = require('https');
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    console.error(`Failed to download thumbnail: HTTP ${response.statusCode}`);
                    resolve(null);
                    return;
                }

                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(buffer);
                });
            }).on('error', (error) => {
                console.error(`Error downloading thumbnail: ${error.message}`);
                resolve(null);
            });
        } catch (error) {
            console.error(`Error in downloadThumbnail: ${error.message}`);
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

            // Write tags to file
            const success = NodeID3.write(tags, filePath);
            console.log(`Metadata ${success ? 'added to' : 'failed for'} ${path.basename(filePath)}`);
            resolve(success);
        } catch (error) {
            console.error(`Error adding metadata: ${error.message}`);
            resolve(false);
        }
    });
}

async function yt_dlp(link, options = {}) {
    return new Promise( (resolve, reject) => {
        try {
            console.log(`Started download: ${link}`);

            // Get video information using yt-dlp
            const output = execSync(`yt-dlp -F -J "${link}"`, {encoding: 'utf8'});
            if (output.includes('Video unavailable')) {
                throw new Error('could not find video.');
            }
            const [json] = output.split('\n')
                .map(isJsonString)
                .filter(l => l !== false);

            const title = json.title
                .replace(/[\/\\?%*:|<>]/g, '_')  // Replace invalid characters with '_'
                .replace(/\s+/g, '_')             // Replace spaces with underscores
                .replace(/[^a-zA-Z0-9._-]/g, '')  // Remove any non-alphanumeric character except underscores, periods, and hyphens
                .toLowerCase();

            // Filter formats based on options
            let formats = json.formats;
            if (options.audioOnly) {
                formats = formats.filter(f => f?.resolution == 'audio only');
            }
            
            const formatIds = formats.map(a => a.format_id);

            if (!formatIds || formatIds.length === 0) {
                throw new Error('Failed to find suitable format');
            }
            
            const formatId = options.formatId || formatIds[0];
            const outputPath = path.join(options.outputDir || '.', `${title}.${options.format || 'mp3'}`);
            
            // Download the video/audio
            exec(`yt-dlp "${link}" -f ${formatId} -o "${outputPath}"`, async (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error downloading ${link}: ${error.message}`);
                    reject(error);
                    return;
                }
                
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                }
                
                console.log(`Download completed: ${outputPath}`);
                
                // Add metadata if enabled
                if (options.addMetadata !== false) {
                    try {
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
                            console.log(`Downloading thumbnail for ${title}...`);
                            metadata.thumbnailBuffer = await downloadThumbnail(json.thumbnail);
                        }
                        
                        // Add metadata to the file
                        await addMetadata(outputPath, metadata);
                    } catch (metadataError) {
                        console.error(`Error adding metadata: ${metadataError.message}`);
                    }
                }
                
                resolve({
                    title,
                    path: outputPath,
                    status: 'success'
                });
            });
        } catch (error) {
            console.log(`Failed to download ${link}: ${error.message}`);
            reject(error);
        }
    });
}

function fetchYoutubeLinks(bookmarksPath) {
    try {
        // Read the file
        const fileContent = fs.readFileSync(bookmarksPath, 'utf-8');

        // Match all HREF attributes inside <A> tags
        const hrefs = [...fileContent.matchAll(/<A[^>]*HREF="([^"]+)"/gi)]
            .map(match => match[1])  // Extract URLs
            .filter(url => url.includes('youtube.com')); // Filter only YouTube links

        console.log(`Found ${hrefs.length} YouTube links in bookmarks file`);
        return hrefs;
    } catch (error) {
        console.error(`Error reading bookmarks file: ${error.message}`);
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
    .parse(process.argv);

const options = program.opts();

async function main() {
    try {
        // Get links from bookmarks file or use default array
        let links;
        if (options.bookmarks) {
            links = fetchYoutubeLinks(options.bookmarks);
            if (links.length === 0) {
                console.error('No YouTube links found in the bookmarks file');
                return;
            }
        } else {
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
            console.log('Using default YouTube links (no bookmarks file specified)');
        }

        // Filter by keyword if provided
        if (options.keyword) {
            const originalCount = links.length;
            links = links.filter(link => link.includes(options.keyword));
            console.log(`Filtered links by keyword "${options.keyword}": ${links.length}/${originalCount} links remaining`);
        }

        // List mode - just show the links and exit
        if (options.list) {
            console.log('YouTube links found:');
            links.forEach((link, index) => {
                console.log(`${index}: ${link}`);
            });
            return;
        }

        // Create output directory if it doesn't exist
        if (options.output && options.output !== '.') {
            if (!fs.existsSync(options.output)) {
                fs.mkdirSync(options.output, { recursive: true });
                console.log(`Created output directory: ${options.output}`);
            }
        }

        // Download a single video by index if specified
        if (options.index !== undefined) {
            const index = parseInt(options.index);
            if (index >= 0 && index < links.length) {
                console.log(`Downloading single video at index ${index}: ${links[index]}`);
                await yt_dlp(links[index], {
                    outputDir: options.output,
                    format: options.format,
                    audioOnly: options.audioOnly,
                    addMetadata: options.metadata
                });
                return;
            } else {
                console.error(`Invalid index: ${options.index}. Must be between 0 and ${links.length - 1}`);
                return;
            }
        }

        // Download all videos with concurrency limit
        console.log(`Starting download of ${links.length} videos with concurrency limit of ${options.concurrent}`);
        
        // Process links in batches to respect concurrency limit
        const concurrentLimit = parseInt(options.concurrent);
        for (let i = 0; i < links.length; i += concurrentLimit) {
            const batch = links.slice(i, i + concurrentLimit);
            console.log(`Processing batch ${Math.floor(i/concurrentLimit) + 1}/${Math.ceil(links.length/concurrentLimit)}`);
            
            const downloadPromises = batch.map(link => yt_dlp(link, {
                outputDir: options.output,
                format: options.format,
                audioOnly: options.audioOnly,
                addMetadata: options.metadata
            }));
            
            const results = await Promise.allSettled(downloadPromises);
            
            // Log results for this batch
            results.forEach((result, index) => {
                const link = batch[index];
                if (result.status === 'fulfilled') {
                    console.log(`✅ ${link}: Success`);
                } else {
                    console.log(`❌ ${link}: Failed - ${result.reason}`);
                }
            });
        }
        
        console.log("All downloads completed");
    } catch (error) {
        console.error(`An error occurred: ${error.message}`);
    }
}

main();
