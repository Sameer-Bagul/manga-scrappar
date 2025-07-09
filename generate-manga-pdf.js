#!/usr/bin/env node

import { createMangaPDF } from './lib/pdf-generator.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateMangaPDF() {
    const mangaFolderPath = path.join(__dirname, 'my-bias-gets-on-the-last-train');
    
    console.log('🚀 Generating manga PDF with enhanced error handling...');
    console.log('🔧 Auto-fixing problematic images (Progressive JPEG, WebP, oversized)');
    console.log('📂 Source:', mangaFolderPath);
    console.log('📄 Output: My-Bias-Gets-On-The-Last-Train-Final.pdf\n');

    try {
        const result = await createMangaPDF(
            mangaFolderPath, 
            'My-Bias-Gets-On-The-Last-Train-Final.pdf'
        );
        
        console.log('\n🎉 Success! Your enhanced manga PDF is ready.');
        console.log(`📁 File: ${result.outputPath}`);
        console.log('\n🌟 This PDF uses Enhanced NoClipping approach:');
        console.log('   • Intelligent retry mechanism for problematic images');
        console.log('   • Auto-fix progressive JPEG and WebP issues');
        console.log('   • Memory-efficient processing of oversized images');
        console.log('   • Zero cropping - maximum content preservation');
        
        if (result.stats.fixedImages > 0) {
            console.log(`   • Successfully auto-fixed ${result.stats.fixedImages} problematic images!`);
        }
        
    } catch (error) {
        console.error(`\n❌ ERROR: ${error.message}`);
        process.exit(1);
    }
}

// Run the generator
generateMangaPDF();
