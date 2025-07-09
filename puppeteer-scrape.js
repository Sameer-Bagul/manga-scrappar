import { launch } from 'puppeteer';
import { promises, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}`);
  const buffer = await res.buffer();
  await promises.writeFile(filepath, buffer);
  console.log(`Saved ${filepath}`);
}

async function scrapeChapter(page, url, mangaFolder) {
  console.log(`Scraping chapter URL: ${url}`);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Wait for images container
  await page.waitForSelector('.chapter-content .item-chapter img', { timeout: 10000 });

  // Extract chapter title or number for folder naming
  const chapterName = await page.evaluate(() => {
    // Try to get chapter number or title from page
    const h1 = document.querySelector('h1')?.textContent || '';
    return h1.trim() || 'chapter';
  });

  const chapterFolder = join(mangaFolder, chapterName.replace(/[\/\\?%*:|"<>]/g, '-'));
  if (!existsSync(chapterFolder)) {
    mkdirSync(chapterFolder, { recursive: true });
  }

  // Extract image URLs
  const imageUrls = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.chapter-content .item-chapter img'))
      .map(img => img.src);
  });

  console.log(`Found ${imageUrls.length} images in ${chapterName}`);

  // Download all images sequentially
  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i];
    const imgPath = join(chapterFolder, `${i + 1}.jpg`);
    try {
      await downloadImage(imgUrl, imgPath);
    } catch (e) {
      console.error(`Failed to download image ${imgUrl}: ${e.message}`);
    }
  }

  // Find next chapter URL
  const nextChapterUrl = await page.evaluate(() => {
    const nextLink = document.querySelector('a.next-chapter, a[rel="next"]');
    if (nextLink) return nextLink.href;
    // fallback: try to find link by text "Next" or an icon if available
    const links = Array.from(document.querySelectorAll('a'));
    for (const link of links) {
      if (link.textContent.trim().toLowerCase().includes('next')) return link.href;
    }
    return null;
  });

  return nextChapterUrl;
}

async function scrapeManga(startUrl) {
  const browser = await launch({ headless: true });
  const page = await browser.newPage();

  // Extract manga name from URL (e.g., "my-bias-gets-on-the-last-train")
  const mangaNameMatch = startUrl.match(/\/read-manga\/([^\/]+)\//);
  if (!mangaNameMatch) {
    console.error('Cannot extract manga name from URL');
    await browser.close();
    return;
  }
  const mangaName = mangaNameMatch[1].replace(/[\/\\?%*:|"<>]/g, '-');
  const mangaFolder = join(__dirname, mangaName);
  if (!existsSync(mangaFolder)) {
    mkdirSync(mangaFolder, { recursive: true });
  }

  let currentUrl = startUrl;
  let errorCount = 0;
  const maxErrors = 3;
  let chaptersDownloaded = 0;

  while (currentUrl && errorCount < maxErrors) {
    try {
      const nextUrl = await scrapeChapter(page, currentUrl, mangaFolder);
      chaptersDownloaded++;
      console.log(`Chapter ${chaptersDownloaded} downloaded.`);

      if (nextUrl === currentUrl) {
        console.log('Next chapter URL is same as current. Stopping.');
        break;
      }

      if (!nextUrl) {
        console.log('No next chapter found. Finished.');
        break;
      }

      currentUrl = nextUrl;
      errorCount = 0; // reset error count on success

    } catch (err) {
      console.error(`Error scraping chapter: ${err.message}`);
      errorCount++;
    }
  }

  console.log(`Scraping complete. Total chapters downloaded: ${chaptersDownloaded}`);

  await browser.close();
}

// Example usage:
const startChapterUrl = 'https://mangaoi.net/read-manga/my-bias-gets-on-the-last-train/chapter-1';

scrapeManga(startChapterUrl);
