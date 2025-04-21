# Project State: bookmark-dlp

## Current Status
- Initial analysis of index.js completed
- State file created
- Fixed Promise handling in main function
- Improved exec implementation to properly handle completion
- Added command-line interface for customization
- Updated README.md with usage instructions
- Added metadata tagging to downloaded files
- Added better comments and colored logging

## Project Summary
This project uses yt-dlp to download audio from YouTube videos listed in bookmarks.

## Analysis of index.js
The script does the following:
1. Imports necessary Node.js modules (child_process for executing commands, fs for file operations)
2. Defines a function to validate JSON strings
3. Implements a `yt_dlp` function that:
   - Takes a YouTube link as input
   - Uses yt-dlp to get video information in JSON format
   - Extracts the video title and sanitizes it for use as a filename
   - Identifies audio-only formats
   - Downloads the audio in mp3 format
4. Includes a `fetchYoutubeLinks` function that:
   - Reads from a bookmarks.html file
   - Extracts YouTube URLs from the bookmarks
5. Contains a `main` function that:
   - Currently uses a hardcoded array of YouTube links (instead of reading from bookmarks)
   - Downloads audio from one specific link (index 4)
   - Also attempts to download all links (but has a potential issue with Promise handling)

## Plans
1. Fix issues in the current implementation:
   - ✅ Correct the Promise handling in the main function
   - ✅ Ensure proper error handling in the download function
2. Enhance functionality:
   - ✅ Add option to use bookmarks.html instead of hardcoded links
   - ✅ Add progress tracking for downloads (batch processing)
   - ✅ Implement proper logging
   - ✅ Add metadata tagging to downloaded files
   - ✅ Add better comments and colored logging
3. Improve user experience:
   - ✅ Add command-line arguments for customization:
     - ✅ Option to specify bookmarks file path
     - ✅ Option to specify output directory
     - ✅ Option to limit number of concurrent downloads
     - ✅ Option to filter videos by keywords
     - ✅ Option to specify audio format
     - ✅ Option to enable/disable metadata
     - ✅ Option for verbose output
   - ✅ Create better output formatting
4. Future improvements:
   - Add download progress bar
   - Implement retry mechanism for failed downloads
   - Add support for other video platforms

## Learnings
- The script uses yt-dlp to extract audio from YouTube videos
- It currently has a hardcoded list of YouTube links rather than using the bookmarks.html parser
- Fixed Promise handling in the main function:
  - The original code used `forEach` which doesn't work properly with async functions
  - Changed to use `map` to create an array of promises
  - Used `Promise.allSettled` to properly wait for all downloads to complete
  - Added better logging of results
- Improved the `exec` implementation:
  - Added proper callback handling to resolve/reject the Promise only after the download completes
  - Added better error handling and logging
  - This ensures the Promise accurately represents the download status
- Added command-line interface using Commander.js:
  - Allows specifying bookmarks file path
  - Supports output directory configuration
  - Implements concurrent download limiting
  - Provides filtering by keyword
  - Enables listing links without downloading
  - Allows downloading a specific link by index
- Added metadata tagging to downloaded files:
  - Uses node-id3 to add ID3 tags to MP3 files
  - Extracts metadata from YouTube video information
  - Downloads and embeds thumbnails as album art
  - Adds title, artist, album, year, and description information
- Added better comments and colored logging:
  - Implemented a custom logging function with colors and timestamps
  - Added detailed JSDoc comments to all functions
  - Added verbose logging throughout the application
  - Added a verbose mode option to show debug information

## Next Steps
- Test the enhanced logging functionality
- Consider adding a progress bar for downloads
- Consider implementing a retry mechanism for failed downloads
- Consider adding support for other video platforms
