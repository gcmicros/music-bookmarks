const { spawn, exec, execSync } = require('child_process');
const fs = require('fs');

function isJsonString(str) {
    try {
        return JSON.parse(str)
    } catch (error) {
        //console.log('failed to parse line');  
        return false;
    }
}

async function yt_dlp(link) {
    return new Promise( (resolve, reject) => {
        try {
            console.log(`started download: ${link}`);

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

            const audioIds = json.formats
                .filter(f => f?.resolution == 'audio only')
                .map(a => a.format_id);

            if (!audioIds) {
                throw new Error('failed to find audio id');
            }
            //console.log(audioIds);
            //console.log(json);
            const audioId = audioIds[0];
            execSync(`yt-dlp "${link}" -f ${audioId} -o ${title}.mp3`);
            //spawn(`yt-dlp`, [link, `-f ${audioId}`, `-o ${title}.mp3`]);

            resolve('success');
        } catch (error) {
            console.log('failed');
            //console.error(error);
        }
    });
}

function fetchYoutubeLinks() {
    // Read the file
    const fileContent = fs.readFileSync('bookmarks.html', 'utf-8');

    // Match all HREF attributes inside <A> tags
    const hrefs = [...fileContent.matchAll(/<A[^>]*HREF="([^"]+)"/gi)]
        .map(match => match[1])  // Extract URLs
        .filter(url => url.includes('youtube.com')); // Filter only YouTube links

        // Print extracted URLs
        return hrefs;
    }

async function main() {
    //const links = fetchYoutubeLinks();
    const links = [
  'https://www.youtube.com/watch?v=FXw-CsKgX-k&t=3097s',
  'https://www.youtube.com/watch?v=3XTV6pkQne0',
  'https://www.youtube.com/watch?v=amfAAzhjC0E',
  'https://www.youtube.com/watch?v=vN4Vc9T8QQc',
  'https://www.youtube.com/watch?v=f1qTRHGqaQI',
  'https://www.youtube.com/watch?v=FfrJrvF7gcU',
  'https://www.youtube.com/watch?v=Pi7l8mMjYVE&list=PLMrJAkhIeNNR20Mz-VpzgfQs5zrYi085m',
  'https://www.youtube.com/watch?v=kB6U0SGeYrM&t=45s'
]

    yt_dlp(links[4]);

    console.log(links);
    const ps = links.forEach( l => yt_dlp(l));
    const res = await Promise.allSettled(ps);
    return;
}

main();
