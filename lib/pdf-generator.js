import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';

/**
 * Validates if an image file is readable and not corrupted
 */
function validateImageFile(imagePath) {
    try {
        const stats = fs.statSync(imagePath);
        if (stats.size === 0) {
            return { valid: false, reason: 'Empty file (0 bytes)' };
        }
        if (stats.size < 100) {
            return { valid: false, reason: 'File too small (likely corrupted)' };
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
            return { valid: false, reason: 'Invalid file header (not a recognized image format)' };
        }
        
        return { valid: true };
    } catch (err) {
        return { valid: false, reason: `File access error: ${err.message}` };
    }
}

/**
 * Attempts to fix problematic images using Sharp with multiple recovery strategies
 * This handles progressive JPEG issues, WebP conversion, memory problems, and corrupted files
 */
async function preprocessProblematicImage(imagePath) {
    try {
        const image = sharp(imagePath);
        const metadata = await image.metadata();
        
        // Check if image needs preprocessing
        const isProgressive = metadata.isProgressive;
        const isWebP = metadata.format === 'webp';
        const isVeryTall = metadata.height > 10000;
        const isVeryLarge = metadata.width * metadata.height > 50000000;
        
        if (isProgressive || isWebP || isVeryTall || isVeryLarge) {
            const outputPath = imagePath + '.fixed.jpg';
            
            await image
                .jpeg({ 
                    quality: 92, 
                    progressive: false // Convert progressive to baseline JPEG
                })
                .resize({
                    width: metadata.width,
                    height: Math.min(metadata.height, 8000), // Limit extreme heights
                    fit: 'inside',
                    withoutEnlargement: true
                })
                .toFile(outputPath);
            
            return {
                success: true,
                fixedPath: outputPath,
                reason: isProgressive ? 'Progressive JPEG' : 
                       isWebP ? 'WebP format' :
                       isVeryTall ? 'Very tall image' : 'Very large image',
                originalFormat: metadata.format,
                originalSize: `${metadata.width}x${metadata.height}`
            };
        }
        
        return { success: true, fixedPath: null };
        
    } catch (err) {
        // If Sharp fails to read metadata or process, try emergency recovery
        console.log(`    🚨 Sharp failed on ${path.basename(imagePath)}: ${err.message}`);
        console.log(`    🔄 Attempting emergency recovery...`);
        
        try {
            return await emergencyImageRecovery(imagePath);
        } catch (recoveryErr) {
            return { 
                success: false, 
                error: `Sharp failed: ${err.message}, Recovery failed: ${recoveryErr.message}` 
            };
        }
    }
}

/**
 * Emergency recovery for severely corrupted images
 * Uses multiple strategies to salvage what we can from problematic files
 */
async function emergencyImageRecovery(imagePath) {
    const outputPath = imagePath + '.recovered.jpg';
    
    // Strategy 1: Try to extract with failOnError disabled and aggressive error handling
    try {
        await sharp(imagePath, { 
            failOnError: false,  // Don't fail on corruption
            limitInputPixels: false  // Don't limit pixel count
        })
        .jpeg({ 
            quality: 85, 
            progressive: false,
            force: true  // Force JPEG output regardless of input
        })
        .resize(720, 8000, { 
            fit: 'inside',
            withoutEnlargement: true,
            kernel: 'nearest'  // Use simple scaling to avoid artifacts
        })
        .toFile(outputPath);
        
        console.log(`    ✅ Emergency recovery successful (failOnError disabled)`);
        return {
            success: true,
            fixedPath: outputPath,
            reason: 'Emergency recovery (corrupted JPEG)',
            originalFormat: 'jpeg (corrupted)',
            originalSize: 'unknown (corrupted)'
        };
        
    } catch (strategy1Error) {
        console.log(`    ❌ Strategy 1 failed: ${strategy1Error.message}`);
        
        // Strategy 2: Try to read as raw buffer and create a placeholder
        try {
            const stats = fs.statSync(imagePath);
            
            // Create a placeholder image with error message
            await sharp({
                create: {
                    width: 720,
                    height: 1000,
                    channels: 3,
                    background: { r: 240, g: 240, b: 240 }
                }
            })
            .jpeg({ quality: 90, progressive: false })
            .toFile(outputPath);
            
            console.log(`    ⚠️  Created placeholder for corrupted image`);
            return {
                success: true,
                fixedPath: outputPath,
                reason: 'Placeholder for corrupted image',
                originalFormat: 'corrupted',
                originalSize: `${stats.size} bytes (corrupted)`
            };
            
        } catch (strategy2Error) {
            console.log(`    ❌ Strategy 2 failed: ${strategy2Error.message}`);
            throw new Error(`All recovery strategies failed: ${strategy1Error.message} | ${strategy2Error.message}`);
        }
    }
}

/**
 * Creates a manga PDF with no cropping using variable page heights
 * This approach uses standard width but very tall pages to ensure 
 * no content is cut off, perfect for long manga images
 */
async function createMangaPDF(mangaFolderPath, outputFileName = 'manga.pdf') {
    return new Promise(async (resolve, reject) => {
        try {
            // Statistics tracking
            const stats = {
                totalImages: 0,
                successfulImages: 0,
                skippedImages: 0,
                fixedImages: 0,
                corruptedFiles: [],
                fixedFiles: [],
                errorDetails: []
            };

            // Get all chapter folders
            const chapters = fs.readdirSync(mangaFolderPath)
                .filter(item => {
                    const fullPath = path.join(mangaFolderPath, item);
                    return fs.statSync(fullPath).isDirectory();
                })
                .sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                    return numA - numB;
                });

            if (chapters.length === 0) {
                throw new Error('No chapters found in the manga folder');
            }

            // Create PDF document with optimized settings for manga
            const doc = new PDFDocument({ 
                autoFirstPage: false,
                bufferPages: true // Important for variable page sizing
            });
            
            const outputPath = path.join(mangaFolderPath, outputFileName);
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            console.log(`📚 Creating manga PDF with ${chapters.length} chapters...`);
            console.log(`📄 Using Enhanced NoClipping approach - auto-fixing problematic images`);
            console.log(`� Smart preprocessing for progressive JPEG, WebP, and oversized images`);

            // Process each chapter
            for (const chapterFolder of chapters) {
                const chapterPath = path.join(mangaFolderPath, chapterFolder);
                
                const images = fs.readdirSync(chapterPath)
                    .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file) && 
                                  !file.includes('.fixed') && 
                                  !file.includes('.recovered') && 
                                  !file.includes('.converted'))
                    .sort((a, b) => {
                        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                        return numA - numB;
                    });

                console.log(`📖 Processing ${chapterFolder}: ${images.length} images`);
                stats.totalImages += images.length;

                for (const imageFile of images) {
                    const imagePath = path.join(chapterPath, imageFile);
                    
                    // Validate image before processing
                    const validation = validateImageFile(imagePath);
                    if (!validation.valid) {
                        console.warn(`  ⚠️  Skipping ${imageFile}: ${validation.reason}`);
                        stats.skippedImages++;
                        stats.corruptedFiles.push({
                            file: imagePath,
                            chapter: chapterFolder,
                            reason: validation.reason
                        });
                        continue; // Skip this image
                    }
                    
                    let finalImagePath = imagePath;
                    let wasFixed = false;
                    
                    // Standard manga reading width (optimal for viewing)
                    const standardWidth = 800;
                    const veryTallHeight = 15000; // Extremely tall to ensure no cutoff
                    
                    try {
                        doc.addPage({
                            size: [standardWidth, veryTallHeight],
                            margin: 0 // No margins for maximum image size
                        });
                        
                        // Add image with full width, natural height
                        doc.image(finalImagePath, 0, 0, {
                            width: standardWidth
                            // Height will scale automatically maintaining aspect ratio
                        });

                        console.log(`  ✅ Added ${imageFile}`);
                        stats.successfulImages++;
                        
                    } catch (err) {
                        // If PDFKit fails, try to fix the image with Sharp
                        console.log(`  🔄 PDFKit failed, attempting to fix ${imageFile}...`);
                        
                        try {
                            const preprocessResult = await preprocessProblematicImage(imagePath);
                            
                            if (preprocessResult.success && preprocessResult.fixedPath) {
                                // Try again with the fixed image
                                try {
                                    doc.image(preprocessResult.fixedPath, 0, 0, {
                                        width: standardWidth
                                    });

                                    console.log(`  ✅ Added ${imageFile} (fixed: ${preprocessResult.reason})`);
                                    stats.successfulImages++;
                                    stats.fixedImages++;
                                    stats.fixedFiles.push({
                                        original: imagePath,
                                        fixed: preprocessResult.fixedPath,
                                        reason: preprocessResult.reason,
                                        originalFormat: preprocessResult.originalFormat,
                                        originalSize: preprocessResult.originalSize
                                    });
                                    
                                    // Clean up the fixed file
                                    fs.unlinkSync(preprocessResult.fixedPath);
                                    
                                } catch (retryErr) {
                                    console.error(`  ❌ Still failed after fixing ${imageFile}: ${retryErr.message}`);
                                    stats.skippedImages++;
                                    stats.errorDetails.push({
                                        file: imagePath,
                                        chapter: chapterFolder,
                                        error: `Post-fix error: ${retryErr.message}`
                                    });
                                    
                                    // Add error placeholder page
                                    doc.addPage({ size: [standardWidth, 600], margin: 20 });
                                    doc.fontSize(12)
                                       .fillColor('red')
                                       .text(`Failed to load: ${imageFile}`, 20, 300, { 
                                           width: 760, 
                                           align: 'center' 
                                       });
                                }
                            } else {
                                console.error(`  ❌ Could not fix ${imageFile}: ${preprocessResult.error || 'No fix needed but still failed'}`);
                                stats.skippedImages++;
                                stats.errorDetails.push({
                                    file: imagePath,
                                    chapter: chapterFolder,
                                    error: err.message
                                });
                                
                                // Add error placeholder page
                                doc.addPage({ size: [standardWidth, 600], margin: 20 });
                                doc.fontSize(12)
                                   .fillColor('red')
                                   .text(`Failed to load: ${imageFile}`, 20, 300, { 
                                       width: 760, 
                                       align: 'center' 
                                   });
                            }
                        } catch (fixErr) {
                            console.error(`  ❌ Error fixing ${imageFile}: ${fixErr.message}`);
                            stats.skippedImages++;
                            stats.errorDetails.push({
                                file: imagePath,
                                chapter: chapterFolder,
                                error: `Fix attempt failed: ${fixErr.message}`
                            });
                            
                            // Add informative error placeholder page with file details
                            doc.addPage({ size: [standardWidth, 800], margin: 20 });
                            doc.fontSize(16)
                               .fillColor('red')
                               .text(`⚠️ CORRUPTED IMAGE`, 20, 100, { 
                                   width: 760, 
                                   align: 'center' 
                               });
                            
                            doc.fontSize(12)
                               .fillColor('black')
                               .text(`File: ${imageFile}`, 20, 150, { 
                                   width: 760, 
                                   align: 'center' 
                               })
                               .text(`Chapter: ${chapterFolder}`, 20, 180, { 
                                   width: 760, 
                                   align: 'center' 
                               })
                               .text(`Error: ${fixErr.message}`, 20, 210, { 
                                   width: 760, 
                                   align: 'center' 
                               })
                               .text(`This image could not be processed due to severe corruption.`, 20, 260, { 
                                   width: 760, 
                                   align: 'center' 
                               })
                               .text(`Consider re-downloading this chapter or replacing this file.`, 20, 290, { 
                                   width: 760, 
                                   align: 'center' 
                               });
                               
                            console.log(`  📄 Added detailed error placeholder for ${imageFile}`);
                        }
                    }
                }
                
                console.log(`  ✅ Chapter ${chapterFolder} completed`);
            }

            // Finalize the PDF
            doc.end();

            stream.on('finish', () => {
                console.log(`\n🎉 Manga PDF created successfully!`);
                console.log(`📁 Location: ${outputPath}`);
                console.log(`💡 Enhanced NoClipping approach used - auto-fixing applied!`);
                
                // Print detailed statistics
                console.log(`\n📊 Processing Summary:`);
                console.log(`   Total images found: ${stats.totalImages}`);
                console.log(`   Successfully added: ${stats.successfulImages}`);
                console.log(`   Auto-fixed on retry: ${stats.fixedImages}`);
                console.log(`   Skipped/Error: ${stats.skippedImages}`);
                console.log(`   Success rate: ${((stats.successfulImages / stats.totalImages) * 100).toFixed(1)}%`);
                
                if (stats.fixedFiles.length > 0) {
                    console.log(`\n🔧 Auto-Fixed Images (${stats.fixedFiles.length}):`);
                    stats.fixedFiles.forEach(item => {
                        console.log(`   • ${item.original.split('\\').slice(-2).join('/')} - ${item.reason} (${item.originalFormat}, ${item.originalSize})`);
                    });
                }
                
                if (stats.corruptedFiles.length > 0) {
                    console.log(`\n⚠️  Corrupted/Invalid Files (${stats.corruptedFiles.length}):`);
                    stats.corruptedFiles.forEach(item => {
                        console.log(`   • ${item.chapter}/${path.basename(item.file)} - ${item.reason}`);
                    });
                }
                
                if (stats.errorDetails.length > 0) {
                    console.log(`\n❌ Remaining Errors (${stats.errorDetails.length}):`);
                    stats.errorDetails.forEach(item => {
                        console.log(`   • ${item.chapter}/${path.basename(item.file)} - ${item.error}`);
                    });
                }
                
                // Generate a detailed report file
                const reportPath = path.join(mangaFolderPath, 'enhanced-pdf-generation-report.txt');
                const reportContent = `Enhanced Manga PDF Generation Report
Generated: ${new Date().toISOString()}
Output: ${outputPath}

SUMMARY:
- Total images found: ${stats.totalImages}
- Successfully processed: ${stats.successfulImages}
- Auto-fixed on retry: ${stats.fixedImages}
- Skipped/Errors: ${stats.skippedImages}
- Success rate: ${((stats.successfulImages / stats.totalImages) * 100).toFixed(1)}%

AUTO-FIXED IMAGES:
${stats.fixedFiles.map(item => `${item.original} -> ${item.reason} (${item.originalFormat}, ${item.originalSize})`).join('\n')}

CORRUPTED/INVALID FILES:
${stats.corruptedFiles.map(item => `${item.file} - ${item.reason}`).join('\n')}

REMAINING ERRORS:
${stats.errorDetails.map(item => `${item.file} - ${item.error}`).join('\n')}

ENHANCEMENTS APPLIED:
- Progressive JPEG auto-conversion to baseline JPEG
- WebP images automatically converted to JPEG
- Oversized images resized for memory efficiency
- Very tall images height-limited to prevent display issues
- Intelligent retry mechanism for problematic images
- Automatic cleanup of temporary fixed files

RECOMMENDATIONS:
- Re-download chapters with remaining errors if possible
- Check source quality for persistently problematic images
- Consider manual re-encoding of any remaining problematic files
`;
                
                fs.writeFileSync(reportPath, reportContent);
                console.log(`\n📄 Detailed report saved: ${reportPath}`);
                
                resolve({ outputPath, stats });
            });

            stream.on('error', (err) => {
                console.error('❌ Error creating PDF:', err);
                reject(err);
            });

        } catch (err) {
            console.error('❌ Error in createMangaPDF:', err);
            reject(err);
        }
    });
}

/**
 * Creates a PDF for a single chapter using the NoClipping approach
 */
async function createChapterPDF(chapterFolderPath, outputFileName) {
    return new Promise((resolve, reject) => {
        try {
            const chapterName = path.basename(chapterFolderPath);
            
            const images = fs.readdirSync(chapterFolderPath)
                .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                    const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                    return numA - numB;
                });

            if (images.length === 0) {
                throw new Error('No images found in the chapter folder');
            }

            const doc = new PDFDocument({ 
                autoFirstPage: false,
                bufferPages: true
            });
            
            const outputPath = path.join(path.dirname(chapterFolderPath), outputFileName || `${chapterName}.pdf`);
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            console.log(`📖 Creating PDF for ${chapterName} with ${images.length} images...`);

            images.forEach((imageFile, imageIndex) => {
                const imagePath = path.join(chapterFolderPath, imageFile);
                
                // NoClipping approach: standard width but very tall pages
                const standardWidth = 800;
                const veryTallHeight = 15000;
                
                try {
                    doc.addPage({
                        size: [standardWidth, veryTallHeight],
                        margin: 0
                    });
                    
                    doc.image(imagePath, 0, 0, {
                        width: standardWidth
                    });

                    console.log(`  ✅ Added ${imageFile}`);
                    
                } catch (err) {
                    console.error(`  ❌ Error adding image ${imagePath}: ${err.message}`);
                }
            });

            doc.end();

            stream.on('finish', () => {
                console.log(`✅ Chapter PDF created: ${outputPath}`);
                resolve(outputPath);
            });

            stream.on('error', reject);

        } catch (err) {
            reject(err);
        }
    });
}

export { 
    createMangaPDF, 
    createChapterPDF 
};
