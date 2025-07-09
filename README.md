# 📚 Manga Scrapper & PDF Generator

A robust Node.js application that scrapes manga images from websites and converts them into high-quality PDF files with intelligent error handling and image preprocessing.

## ✨ Features

### 🎯 **Advanced PDF Generation**
- **Enhanced NoClipping Approach**: Preserves full image content without cropping
- **Variable Height Pages**: Adapts to different manga panel layouts
- **Smart Image Preprocessing**: Handles progressive JPEG, WebP, and oversized images
- **Intelligent Error Recovery**: Multiple fallback strategies for corrupted images
- **Memory Efficient**: Processes very large images (15,000+ pixels tall)

### 🔧 **Robust Error Handling**
- **Format Auto-Conversion**: WebP → JPEG, Progressive → Baseline JPEG
- **Corruption Recovery**: Emergency strategies for severely damaged files
- **File Validation**: Pre-processing checks for image integrity
- **Detailed Diagnostics**: Comprehensive error reporting and statistics
- **Graceful Degradation**: Never fails completely, always produces output

### 🚀 **Multi-Platform Support**
- **Web Scraping**: Puppeteer-based manga site scraping
- **API Server**: Express.js REST API for remote operations
- **Command Line**: Simple scripts for local processing
- **Batch Processing**: Handle multiple chapters simultaneously

## 📋 Requirements

- **Node.js** 16+ 
- **npm** or **yarn**
- **Sharp** (for advanced image processing)
- **Puppeteer** (for web scraping)

## 🚀 Installation

```bash
# Clone the repository
git clone <repository-url>
cd manga-scrappar

# Install dependencies
npm install

# Run the PDF generator
node generate-manga-pdf.js
```

## 💻 Usage

### 📖 Generate Manga PDF

```bash
# Generate PDF from downloaded manga chapters
node generate-manga-pdf.js
```

This will:
1. Scan for manga chapter folders
2. Process all images with intelligent error handling
3. Generate a high-quality PDF with zero cropping
4. Create detailed processing reports

### 🔍 Diagnose Images

```bash
# Check for corrupted or problematic images
node diagnose-images.js
```

Features:
- Validates all image files
- Identifies format issues (progressive JPEG, WebP)
- Detects corrupted/truncated files
- Optional quarantine mode

### 🌐 Web Scraping

```bash
# Start the web server for scraping operations
npm start
```

API Endpoints:
- `POST /scrape` - Scrape manga from URL
- `POST /download` - Download scraped images
- `POST /generate-pdf` - Create PDF from images

### 🤖 Automated Scraping

```bash
# Full automated scraping with Puppeteer
node puppeteer-scrape.js
```

## 📁 Project Structure

```
manga-scrappar/
├── lib/
│   └── pdf-generator.js          # Main PDF generation engine
├── generate-manga-pdf.js         # Simple PDF generation script
├── diagnose-images.js            # Image diagnostic tool
├── server.js                     # Express API server
├── scraper.js                    # Web scraping utilities
├── downloader.js                 # Image download manager
├── puppeteer-scrape.js           # Automated scraping script
└── package.json                  # Dependencies and scripts
```

## 🎨 PDF Generation Features

### **Enhanced NoClipping Approach**
- **Standard Width**: 800px for optimal reading
- **Variable Height**: Up to 15,000px to prevent content cutoff
- **Zero Margins**: Maximum image utilization
- **Aspect Ratio Preservation**: Maintains original proportions

### **Smart Image Processing**
```javascript
// Automatic handling of:
✅ Progressive JPEG → Baseline JPEG conversion
✅ WebP → JPEG conversion  
✅ Oversized image resizing (memory optimization)
✅ Very tall image height limiting
✅ Corrupted file emergency recovery
✅ Invalid format detection and handling
```

### **Error Recovery Strategies**
1. **Primary**: Sharp preprocessing with format conversion
2. **Secondary**: Emergency recovery with `failOnError: false`
3. **Fallback**: Placeholder generation with detailed error info

## 📊 Success Metrics

Recent processing example:
```
📊 Processing Summary:
   Total images found: 432
   Successfully added: 432
   Auto-fixed on retry: 107
   Skipped/Error: 0
   Success rate: 100.0%

🔧 Auto-Fixed Images (107):
   • 25 WebP format conversions
   • 81 Progressive JPEG fixes
   • 1 Emergency corruption recovery
```

## 🛠️ Configuration

### PDF Settings
```javascript
// Standard manga reading dimensions
const standardWidth = 800;
const veryTallHeight = 15000;

// Image quality settings
const jpegQuality = 92;
const progressive = false; // Baseline JPEG for compatibility
```

### Sharp Processing
```javascript
// Memory and size limits
const maxHeight = 8000;          // Prevent extreme heights
const maxPixels = 50000000;      // Memory optimization
const qualityThreshold = 92;     // High quality retention
```

## 📈 Performance

- **Processing Speed**: ~1-2 images/second
- **Memory Usage**: Optimized for large images
- **Success Rate**: 99%+ with auto-recovery
- **File Size**: Efficient compression without quality loss

## 🐛 Troubleshooting

### Common Issues

**"Image failed to load"**
- Check file permissions
- Verify image format support
- Run diagnosis tool for detailed analysis

**"Memory issues with large images"**
- Images are automatically resized if too large
- Sharp handles memory optimization
- Progress is saved incrementally

**"Progressive JPEG errors"**
- Auto-converted to baseline JPEG
- Transparent to user
- Original quality preserved

### Debug Mode

```bash
# Enable detailed logging
DEBUG=* node generate-manga-pdf.js
```

## 📄 Output Files

### Generated Files
- `{manga-name}-Final.pdf` - Main manga PDF
- `enhanced-pdf-generation-report.txt` - Processing statistics
- `image-diagnosis-report.txt` - Image analysis (if run)

### Report Contents
- Processing statistics
- Auto-fixed image details
- Error diagnostics
- Performance metrics
- Recommendations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📝 License

This project is licensed under the ISC License.

## 🚀 Roadmap

- [ ] **GUI Interface**: Electron-based desktop app
- [ ] **Cloud Processing**: AWS/Azure integration
- [ ] **Format Support**: Add more input formats (AVIF, HEIC)
- [ ] **OCR Integration**: Text extraction and searchable PDFs
- [ ] **Batch APIs**: REST endpoints for bulk processing
- [ ] **Docker Support**: Containerized deployment

## 📧 Support

For issues and questions:
1. Check the troubleshooting section
2. Run the diagnostic tool
3. Review the generated reports
4. Create an issue with detailed logs

---

**Built with ❤️ for manga enthusiasts**

*Preserving every pixel of your favorite stories*
✅ **Error Handling** - Gracefully handles corrupted images  

## Quick Start

```bash
# Generate PDF from manga folder
node generate-manga-pdf.js
```

This will create `My-Bias-Gets-On-The-Last-Train.pdf` in the manga folder.

## How It Works

### NoClipping Approach
- **Standard Width**: 800 points (optimal for reading)
- **Variable Height**: Up to 15,000 points (no content cutoff)
- **Zero Margins**: Maximum image size preservation
- **Automatic Scaling**: Maintains original aspect ratios

### Project Structure

```
manga-scrappar/
├── lib/
│   └── pdf-generator.js      # Core PDF generation library
├── generate-manga-pdf.js     # Simple generation script
├── pdf-generator.js          # Updated main generator
├── server.js                 # Web scraper server
├── scraper.js               # Scraping logic
├── downloader.js            # Image downloader
└── my-bias-gets-on-the-last-train/
    ├── Chapter 1/           # Downloaded images
    ├── Chapter 2/
    └── ...
    └── My-Bias-Gets-On-The-Last-Train.pdf  # Generated PDF
```

## Usage

### Generate Full Manga PDF
```javascript
import { createMangaPDF } from './lib/pdf-generator.js';

const pdfPath = await createMangaPDF(
    './my-bias-gets-on-the-last-train',
    'My-Manga.pdf'
);

