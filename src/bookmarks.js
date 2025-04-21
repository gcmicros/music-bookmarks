/**
 * Bookmarks module - Functions for handling bookmark files
 */

const fs = require('fs');
const { log } = require('./logger');

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

/**
 * Get default YouTube links when no bookmarks file is provided
 * @returns {string[]} - Array of default YouTube URLs
 */
function getDefaultLinks() {
    log('No bookmarks file specified, using default YouTube links', 'warning');
    const links = [
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
    return links;
}

module.exports = {
    fetchYoutubeLinks,
    getDefaultLinks
};
