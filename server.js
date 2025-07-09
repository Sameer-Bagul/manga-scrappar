import express from 'express';
import { json } from 'body-parser';
import { scrapeMangaImages } from './scraper';
import { downloadImages } from './downloader';

const app = express();
app.use(json());

app.post('/scrape', async (req, res) => {
    const { url, folder } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
        const images = await scrapeMangaImages(url);
        await downloadImages(images, folder || 'chapter-images');
        res.json({ message: `Downloaded ${images.length} images.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
