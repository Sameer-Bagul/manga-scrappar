import { get } from 'axios';
import { load } from 'cheerio';

const url = 'https://mangaoi.net/read-manga/my-bias-gets-on-the-last-train/chapter-1';

get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
  }
})
.then(res => {
  const $ = load(res.data);
  const images = [];

  $('#chapter-images img').each((i, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src) images.push(src);
  });

  console.log("Images found:", images.length);
  console.log(images);
})
.catch(err => {
  console.error("Failed to fetch page:", err.message);
});
