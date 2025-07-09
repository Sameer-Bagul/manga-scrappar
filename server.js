import express from 'express';
import { json } from 'body-parser';
import { scrapeMangaImages } from './scraper.js';
import { downloadImages } from './downloader.js';
import { createMangaPDF, createChapterPDF } from './lib/pdf-generator.js';

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

app.post('/create-pdf', async (req, res) => {
    const { mangaFolder, outputName, type } = req.body;
    if (!mangaFolder) return res.status(400).json({ error: 'mangaFolder path is required' });

    try {
        let pdfPath;
        
        if (type === 'chapter') {
            // Create PDF for a single chapter
            pdfPath = await createChapterPDF(mangaFolder, outputName);
        } else {
            // Create PDF for entire manga (default)
            pdfPath = await createMangaPDF(mangaFolder, outputName);
        }
        
        res.json({ 
            message: 'PDF created successfully', 
            pdfPath: pdfPath 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
