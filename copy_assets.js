import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DJVUJS_ROOT = path.resolve(__dirname, '../djvujs');
const TARGET_DIR = path.resolve(__dirname, 'addon/content/djvujs');

const VIEWER_DIST = path.join(DJVUJS_ROOT, 'viewer/dist');
const LIBRARY_DIST = path.join(DJVUJS_ROOT, 'library/dist');

function copyDir(src, dest) {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function main() {
    console.log('Checking for DjVuJS build artifacts...');

    if (!fs.existsSync(VIEWER_DIST)) {
        console.error(`Error: Viewer build not found at ${VIEWER_DIST}`);
        console.error('Please run "npm install && npm run build" in the djvujs directory first.');
        process.exit(1);
    }

    if (!fs.existsSync(LIBRARY_DIST)) {
        console.error(`Error: Library build not found at ${LIBRARY_DIST}`);
        process.exit(1);
    }

    console.log(`Copying assets to ${TARGET_DIR}...`);
    
    // Clean target
    if (fs.existsSync(TARGET_DIR)) {
        fs.rmSync(TARGET_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TARGET_DIR, { recursive: true });

    // Copy viewer assets
    copyDir(VIEWER_DIST, TARGET_DIR);

    // Copy library asset (djvu.js)
    // We put it in the root of the target dir to match the structure we want
    const djvuLibSrc = path.join(LIBRARY_DIST, 'djvu.js');
    const djvuLibDest = path.join(TARGET_DIR, 'djvu.js');
    fs.copyFileSync(djvuLibSrc, djvuLibDest);
    console.log(`Copied djvu.js to ${djvuLibDest}`);

    // Patch index.html
    const indexHtmlPath = path.join(TARGET_DIR, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
        let content = fs.readFileSync(indexHtmlPath, 'utf-8');
        
        // Replace the dev/tmp path with relative path
        // Original: <script id="djvu_js_lib" src="/tmp/djvu.js"></script>
        // New: <script id="djvu_js_lib" src="djvu.js"></script>
        
        const regex = /src=["']\/tmp\/djvu\.js["']/;
        if (regex.test(content)) {
            content = content.replace(regex, 'src="djvu.js"');
            console.log('Patched index.html script source.');
        } else {
            console.warn('Warning: Could not find /tmp/djvu.js script tag in index.html to patch. It might have been changed in build.');
            // Attempt to inject if missing or if build structure is different
            // But let's assume the viewer build keeps the structure roughly similar or we will debug later.
        }

        fs.writeFileSync(indexHtmlPath, content);
    } else {
        console.error('Error: index.html not found in viewer dist.');
    }

    console.log('Assets copied successfully.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
