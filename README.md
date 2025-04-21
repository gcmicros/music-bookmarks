# Bookmark-DLP

A Node.js tool to download audio from YouTube links in a bookmarks file using yt-dlp.

## Prerequisites

- Node.js
- yt-dlp (must be installed and available in your PATH)

## Installation

```bash
git clone https://github.com/yourusername/bookmark-dlp.git
cd bookmark-dlp
npm install
```

## Usage

```bash
node index.js [options]
```

### Options

```
-b, --bookmarks <path>      Path to bookmarks.html file
-o, --output <directory>    Output directory for downloaded files (default: current directory)
-f, --format <format>       Output format (mp3, m4a, etc.) (default: mp3)
-c, --concurrent <number>   Maximum number of concurrent downloads (default: 3)
-k, --keyword <keyword>     Only download URLs containing this keyword
-a, --audio-only            Download audio only (default: true)
-i, --index <number>        Download only the specified index from the links array
-l, --list                  List all YouTube links without downloading
-m, --metadata              Add metadata to downloaded files (default: true)
-v, --verbose               Show verbose output
-h, --help                  Display help information
-V, --version               Display version information
```

### Examples

List all YouTube links in a bookmarks file:
```bash
node index.js -b bookmarks.html -l
```

Download audio from all YouTube links in a bookmarks file:
```bash
node index.js -b bookmarks.html -o downloads
```

Download only links containing a specific keyword:
```bash
node index.js -b bookmarks.html -k music -o music_downloads
```

Download a specific link by index:
```bash
node index.js -b bookmarks.html -i 5
```

Download without adding metadata:
```bash
node index.js -b bookmarks.html --no-metadata
```

Show verbose output:
```bash
node index.js -b bookmarks.html -v
```

## How It Works

1. Parses a Chrome/Firefox bookmarks HTML file to extract YouTube links
2. Uses yt-dlp to download the audio from each link
3. Adds metadata to the audio files (title, artist, album, thumbnail, etc.)
4. Supports concurrent downloads with a configurable limit
5. Provides filtering options to select specific links

## License

ISC
