import { mkdirSync, createWriteStream } from 'fs';
import { join, extname, dirname } from 'path';
import { get } from 'axios';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function downloadImages(urls, folderName = 'chapter-images') {
    const dir = join(__dirname, 'downloads', folderName);
    mkdirSync(dir, { recursive: true });

    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        const ext = extname(url).split('?')[0] || '.jpg';
        const filePath = join(dir, `page-${i + 1}${ext}`);

        const response = await get(url, { responseType: 'stream' });
        await new Promise((resolve, reject) => {
            const stream = createWriteStream(filePath);
            response.data.pipe(stream);
            stream.on('finish', resolve);
            stream.on('error', reject);
        });
    }
}

export { downloadImages };
