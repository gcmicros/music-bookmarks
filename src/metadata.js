/**
 * Metadata module - Functions for handling audio file metadata
 */

const NodeID3 = require('node-id3');
const path = require('path');
const { log } = require('./logger');

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

module.exports = {
    downloadThumbnail,
    addMetadata
};
