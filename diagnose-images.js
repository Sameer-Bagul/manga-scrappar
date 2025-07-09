import fs from 'fs';
import path from 'path';

/**
 * Validates if an image file is readable and not corrupted
 */
function validateImageFile(imagePath) {
    try {
        const stats = fs.statSync(imagePath);
        if (stats.size === 0) {
            return { valid: false, reason: 'Empty file (0 bytes)', size: 0 };
        }
        if (stats.size < 100) {
            return { valid: false, reason: 'File too small (likely corrupted)', size: stats.size };
        }
        
        // Read first few bytes to check for common image headers
        const buffer = fs.readFileSync(imagePath, { start: 0, end: 10 });
        const hex = buffer.toString('hex');
        
        // Check for valid image file signatures
        const isJPEG = hex.startsWith('ffd8ff');
        const isPNG = hex.startsWith('89504e47');
        const isGIF = hex.startsWith('474946');
        const isWebP = hex.includes('57454250'); // WEBP in ASCII
        
        if (!isJPEG && !isPNG && !isGIF && !isWebP) {
            return { 
                valid: false, 
                reason: `Invalid file header (${hex.substring(0, 12)}...)`, 
                size: stats.size 
            };
        }
        
        return { valid: true, size: stats.size };
    } catch (err) {
        return { valid: false, reason: `File access error: ${err.message}`, size: 0 };
    }
}

/**
 * Scans all images in the manga folder and reports on their status
 */
function diagnoseImages(mangaFolderPath, createQuarantine = false) {
    console.log(`🔍 Diagnosing images in: ${mangaFolderPath}`);
    
    const results = {
        validImages: [],
        corruptedImages: [],
        totalSize: 0,
        corruptedSize: 0
    };

    // Create quarantine folder if requested
    let quarantinePath = null;
    if (createQuarantine) {
        quarantinePath = path.join(mangaFolderPath, '_corrupted_images');
        if (!fs.existsSync(quarantinePath)) {
            fs.mkdirSync(quarantinePath, { recursive: true });
            console.log(`📁 Created quarantine folder: ${quarantinePath}`);
        }
    }

    // Get all chapter folders
    const chapters = fs.readdirSync(mangaFolderPath)
        .filter(item => {
            const fullPath = path.join(mangaFolderPath, item);
            return fs.statSync(fullPath).isDirectory() && !item.startsWith('_');
        })
        .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
            return numA - numB;
        });

    console.log(`📚 Found ${chapters.length} chapters to scan\n`);

    chapters.forEach((chapterFolder) => {
        const chapterPath = path.join(mangaFolderPath, chapterFolder);
        
        const images = fs.readdirSync(chapterPath)
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numA - numB;
            });

        console.log(`📖 Scanning ${chapterFolder}: ${images.length} images`);

        images.forEach((imageFile) => {
            const imagePath = path.join(chapterPath, imageFile);
            const validation = validateImageFile(imagePath);
            
            if (validation.valid) {
                results.validImages.push({
                    path: imagePath,
                    chapter: chapterFolder,
                    file: imageFile,
                    size: validation.size
                });
                results.totalSize += validation.size;
                console.log(`  ✅ ${imageFile} (${(validation.size / 1024).toFixed(1)} KB)`);
            } else {
                results.corruptedImages.push({
                    path: imagePath,
                    chapter: chapterFolder,
                    file: imageFile,
                    size: validation.size,
                    reason: validation.reason
                });
                results.corruptedSize += validation.size;
                console.log(`  ❌ ${imageFile} - ${validation.reason}`);
                
                // Move to quarantine if requested
                if (createQuarantine && quarantinePath) {
                    try {
                        const quarantineFile = path.join(quarantinePath, `${chapterFolder}_${imageFile}`);
                        fs.renameSync(imagePath, quarantineFile);
                        console.log(`     📦 Moved to quarantine: ${quarantineFile}`);
                    } catch (err) {
                        console.log(`     ⚠️  Failed to move to quarantine: ${err.message}`);
                    }
                }
            }
        });
        
        console.log(''); // Empty line for readability
    });

    // Print summary
    console.log(`\n📊 Diagnosis Summary:`);
    console.log(`   Total images: ${results.validImages.length + results.corruptedImages.length}`);
    console.log(`   Valid images: ${results.validImages.length}`);
    console.log(`   Corrupted images: ${results.corruptedImages.length}`);
    console.log(`   Success rate: ${((results.validImages.length / (results.validImages.length + results.corruptedImages.length)) * 100).toFixed(1)}%`);
    console.log(`   Total size: ${(results.totalSize / (1024 * 1024)).toFixed(1)} MB`);
    console.log(`   Corrupted size: ${(results.corruptedSize / 1024).toFixed(1)} KB`);

    if (results.corruptedImages.length > 0) {
        console.log(`\n❌ Corrupted Files Details:`);
        results.corruptedImages.forEach(item => {
            console.log(`   • ${item.chapter}/${item.file} - ${item.reason}`);
        });
        
        console.log(`\n💡 Recommendations:`);
        console.log(`   1. Re-download the affected chapters if possible`);
        console.log(`   2. Check the original source for these images`);
        console.log(`   3. Run with --quarantine flag to move bad files automatically`);
        if (!createQuarantine) {
            console.log(`   4. Run: node diagnose-images.js --quarantine`);
        }
    }

    // Save detailed report
    const reportPath = path.join(mangaFolderPath, 'image-diagnosis-report.txt');
    const reportContent = `Image Diagnosis Report
Generated: ${new Date().toISOString()}
Scanned: ${mangaFolderPath}

SUMMARY:
- Total images: ${results.validImages.length + results.corruptedImages.length}
- Valid images: ${results.validImages.length}
- Corrupted images: ${results.corruptedImages.length}
- Success rate: ${((results.validImages.length / (results.validImages.length + results.corruptedImages.length)) * 100).toFixed(1)}%
- Total size: ${(results.totalSize / (1024 * 1024)).toFixed(1)} MB
- Corrupted size: ${(results.corruptedSize / 1024).toFixed(1)} KB

CORRUPTED FILES:
${results.corruptedImages.map(item => `${item.path} - ${item.reason} (${item.size} bytes)`).join('\n')}

VALID FILES:
${results.validImages.map(item => `${item.path} (${(item.size / 1024).toFixed(1)} KB)`).join('\n')}
`;
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    return results;
}

// Main execution
const mangaFolder = 'd:\\Projects\\Github\\manga-scrappar\\my-bias-gets-on-the-last-train';
const shouldQuarantine = process.argv.includes('--quarantine');

if (shouldQuarantine) {
    console.log('🚨 Quarantine mode enabled - corrupted files will be moved to _corrupted_images folder\n');
}

diagnoseImages(mangaFolder, shouldQuarantine);
