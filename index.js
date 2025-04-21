/**
 * Bookmark-DLP - A tool to download audio from YouTube links in a bookmarks file
 * 
 * This script extracts YouTube links from a Chrome/Firefox bookmarks HTML file,
 * downloads the audio using yt-dlp, and adds metadata tags to the files.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const fs = require('fs');
const { log, setVerboseMode } = require('./src/logger');
const { fetchYoutubeLinks, getDefaultLinks } = require('./src/bookmarks');
const { yt_dlp } = require('./src/downloader');
const { setupCLI } = require('./src/cli');

/**
 * Main function - Entry point of the application
 */
async function main() {
    try {
        // Setup command-line options
        const options = setupCLI();
        
        // Set verbose mode if requested
        setVerboseMode(options.verbose);
        
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
            links = getDefaultLinks();
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
