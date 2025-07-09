import { get } from 'axios';
import { load } from 'cheerio';

async function scrapeMangaImages(pageUrl) {
    const { data } = await get(pageUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    });

    const $ = load(data);
    const imageUrls = [];

    $('#chapter-images .chapter-image img').each((_, img) => {
        const src = $(img).attr('data-src') || $(img).attr('src');
        if (src) imageUrls.push(src);
    });

    return imageUrls;
}

export { scrapeMangaImages };
