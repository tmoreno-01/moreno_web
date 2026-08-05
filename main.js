// --- SEO & META TAG UPDATER ---
const SITE_ORIGIN = 'https://tyronemoreno.com';
const DEFAULT_SITE_TITLE = 'Tyrone Moreno';
const DEFAULT_SITE_DESCRIPTION = 'Tyrone Moreno is a multidisciplinary artist and creator.';
const DEFAULT_SITE_IMAGE = `${SITE_ORIGIN}/random/logo.webp`;
const STORE_TITLE = 'Art Prints, Original Artworks, Apparel & Objects | Tyrone Moreno';
const STORE_DESCRIPTION = 'Shop signed limited-edition art prints, original artworks, apparel and objects by Tyrone Moreno, with certificates of authenticity and worldwide delivery.';
const STORE_CANONICAL = `${SITE_ORIGIN}/store/`;
const GALLERY_TITLE = 'Original Mixed Media Artworks | Tyrone Moreno';
const GALLERY_DESCRIPTION = 'Explore original mixed-media artworks by Tyrone Moreno, including painting, collage, sculpture and works on paper, wood, skateboards and found objects.';
const GALLERY_CANONICAL = `${SITE_ORIGIN}/gallery/`;

function setMetaContent(selector, content) {
    const element = document.querySelector(selector);
    if (element && content) element.setAttribute('content', content);
}

function removeProductStructuredData() {
    document.getElementById('store-product-structured-data')?.remove();
}

function removeArtworkStructuredData() {
    document.getElementById('gallery-artwork-structured-data')?.remove();
}

function removeRouteStructuredData() {
    removeProductStructuredData();
    removeArtworkStructuredData();
}

function updatePageMeta(
    pageTitle,
    imageUrl = DEFAULT_SITE_IMAGE,
    description = DEFAULT_SITE_DESCRIPTION,
    canonicalUrl = `${SITE_ORIGIN}/`,
    ogType = 'website'
) {
    const absoluteCanonical = new URL(canonicalUrl, SITE_ORIGIN).href;
    const absoluteImage = new URL(imageUrl || DEFAULT_SITE_IMAGE, SITE_ORIGIN).href;

    /* Keep the visible browser tab consistent across the single-page site.
       Route-specific SEO remains in canonical, description, Open Graph,
       Twitter and structured-data fields. */
    document.title = 'Tyrone Moreno';
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:type"]', ogType);
    setMetaContent('meta[property="og:url"]', absoluteCanonical);
    setMetaContent('meta[property="og:title"]', pageTitle);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[property="og:image"]', absoluteImage);
    setMetaContent('meta[name="twitter:title"]', pageTitle);
    setMetaContent('meta[name="twitter:description"]', description);
    setMetaContent('meta[name="twitter:image"]', absoluteImage);

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute('href', absoluteCanonical);

    removeRouteStructuredData();
}

function setStoreMeta() {
    updatePageMeta(
        STORE_TITLE,
        DEFAULT_SITE_IMAGE,
        STORE_DESCRIPTION,
        STORE_CANONICAL,
        'website'
    );
}

function setGalleryMeta() {
    updatePageMeta(
        GALLERY_TITLE,
        DEFAULT_SITE_IMAGE,
        GALLERY_DESCRIPTION,
        GALLERY_CANONICAL,
        'website'
    );
}

function plainTextFromHtml(html = '') {
    const container = document.createElement('div');
    container.innerHTML = html;
    return (container.textContent || container.innerText || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function trimMetaDescription(value, maxLength = 160) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`;
}

function cleanGalleryDescription(html = '') {
    return plainTextFromHtml(html)
        .replace(
            /For acquisition enquiries, please contact\s+[^\s]+/gi,
            ''
        )
        .replace(/\s+/g, ' ')
        .trim();
}

function galleryArtworkDescription(title, year, specs, description, sold) {
    const datedTitle = year ? `${title} (${year})` : title;
    const introduction =
        `${datedTitle} is an original artwork by mixed-media artist Tyrone Moreno.`;
    const cleanDescription = cleanGalleryDescription(description);
    const availability = sold ? 'This artwork is sold.' : '';

    return trimMetaDescription(
        [introduction, specs, cleanDescription, availability]
            .filter(Boolean)
            .join(' '),
        160
    );
}

function setArtworkStructuredData({
    title,
    year,
    specs,
    description,
    canonicalUrl,
    imageUrl
}) {
    const schema = {
        '@context': 'https://schema.org',
        '@type': 'VisualArtwork',
        name: title,
        description,
        url: canonicalUrl,
        image: imageUrl,
        creator: {
            '@type': 'Person',
            name: 'Tyrone Moreno',
            url: `${SITE_ORIGIN}/about/`
        },
        copyrightHolder: {
            '@type': 'Person',
            name: 'Tyrone Moreno'
        }
    };

    if (year) schema.dateCreated = String(year);
    if (specs) schema.artMedium = specs;

    const script = document.createElement('script');
    script.id = 'gallery-artwork-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}

function setGalleryArtworkMeta({
    slug,
    title,
    year,
    specs,
    description,
    imageUrl,
    sold = false
}) {
    if (!slug || !title) {
        setGalleryMeta();
        return;
    }

    const canonicalUrl =
        `${SITE_ORIGIN}/gallery/${encodeURIComponent(slug)}/`;
    const pageTitle =
        `${title}${year ? ` (${year})` : ''} | Original Artwork by Tyrone Moreno`;
    const metaDescription = galleryArtworkDescription(
        title,
        year,
        specs,
        description,
        sold
    );

    updatePageMeta(
        pageTitle,
        imageUrl || DEFAULT_SITE_IMAGE,
        metaDescription,
        canonicalUrl,
        'article'
    );

    setArtworkStructuredData({
        title,
        year,
        specs,
        description: metaDescription,
        canonicalUrl,
        imageUrl: new URL(
            imageUrl || DEFAULT_SITE_IMAGE,
            SITE_ORIGIN
        ).href
    });
}

function setProductStructuredData(product, canonicalUrl, description) {
    const images = product.images.edges
        .map((edge) => edge.node.highres)
        .filter(Boolean);

    const offers = product.variants.edges.map(({ node: variant }) => ({
        '@type': 'Offer',
        url: canonicalUrl,
        price: variant.price.amount,
        priceCurrency: variant.price.currencyCode || 'GBP',
        availability: variant.availableForSale
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
        itemCondition: 'https://schema.org/NewCondition'
    }));

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description,
        image: images,
        url: canonicalUrl,
        brand: {
            '@type': 'Brand',
            name: 'Tyrone Moreno'
        },
        offers
    };

    const script = document.createElement('script');
    script.id = 'store-product-structured-data';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
}
function handleRouting() {
    const params = new URLSearchParams(window.__initialSearch);
    const redirected = params.get('redirect');
    const path = redirected || window.__initialPathname;


    if (path) {
        if (redirected) {
            window.history.replaceState(null, '', redirected || '/');
        }

        const normalizedPath = path.replace(/\/$/, ""); 

        if (normalizedPath.includes('/about')) {
            updatePageMeta("Tyrone Moreno | About"); // <-- ADDED
            openAbout();
        } else if (normalizedPath.includes('/play') || normalizedPath.includes('/paint')) {
            if (normalizedPath.includes('/paint')) {
                window.history.replaceState(null, '', '/play/');
            }
            updatePageMeta("Tyrone Moreno | Play");
            clearNavigation();
        } else if (normalizedPath.includes('/gallery')) {
            setGalleryMeta();
            openWorks();
            const gallerySlugMatch = normalizedPath.match(/\/gallery\/([^\/]+)/);
            if (gallerySlugMatch) {
                const target = document.querySelector(`[data-slug="${gallerySlugMatch[1]}"]`);
                if (target) target.click();
            }
        } else if (normalizedPath === '/studies') {
            updatePageMeta("Tyrone Moreno | Digital Studies");
            openDigitalStudies();
        } else if (normalizedPath.includes('/notes') || normalizedPath.includes('/sketches')) {
            if (normalizedPath.includes('/sketches')) {
                window.history.replaceState(null, '', '/notes/');
            }
            updatePageMeta("Tyrone Moreno | Notes");
            openNotes();
        } else if (normalizedPath.includes('/digital') || normalizedPath.includes('/motion')) {
            if (normalizedPath.includes('/motion')) {
                window.history.replaceState(null, '', '/digital/');
            }
            updatePageMeta("Tyrone Moreno | Digital");
            openMotion();
        } else if (normalizedPath.includes('/contact')) {
            updatePageMeta("Tyrone Moreno | Contact"); // <-- ADDED
            clearNavigation();
            document.getElementById('page-contact').classList.add('visible');
            document.body.classList.add('overlay-open');
            document.getElementById('btn-contact').classList.add('active');
        } else if (normalizedPath.includes('/store')) {
            openStore();
            const storeSlugMatch = normalizedPath.match(/\/store\/([^\/]+)/);
            if (storeSlugMatch) {
                openProduct(storeSlugMatch[1], false);
            }
        } else if (normalizedPath.includes('/time')) {
            updatePageMeta("Tyrone Moreno | Time");
            openTimePage();
        } else if (normalizedPath.includes('/exhibitions')) {
            updatePageMeta("Tyrone Moreno | Exhibitions"); // <-- ADDED
            clearNavigation();
            document.getElementById('page-exhibitions').classList.add('visible');
            document.getElementById('page-exhibitions').classList.add('active');
        } else if (normalizedPath.includes('/press')) {
            updatePageMeta("Tyrone Moreno | Press"); // <-- ADDED
            clearNavigation();
            document.getElementById('page-press').classList.add('visible');
            document.getElementById('page-press').classList.add('active');
        } else {
            // Default fallback
            updatePageMeta("Tyrone Moreno"); 
        }
    }
}
// Add this near your other global state variables
let productSelectionState = {}; // Key will be product handle, Value will be variant ID
        // --- IOS DETECTION ---
        const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent)) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        // Broader touch check so the brush selector reliably shows on iPad and other tablets, not just iOS
        const isTouchUI = isIOS || (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);


       // --- GLOBAL STATE ---
let isDarkMode = false;
let isCustomBg = false;
let currentCanvasBg = '#ffffff';
let themeClickTimer = null;
let lastThemeClickTime = 0;
let isPaintingActive = true; // Add this line here
        
        let isCollageMode = true; 
        let collageZoomLevel = 0; // State variable for our 4 zoom levels (0, 1, 2, 3)
       let currentGridDampener = 1;
 let resizeTimer;
        let collageDataInitialized = false;

        // Global flag to prevent Lightbox click when dragging
        window.isDraggingGalleryItem = false;

        // --- APPLY CUSTOM BACKGROUND HELPERS ---
 function applyCustomBackground(colorString) {
    const match = colorString.match(/\d+/g);
    if (!match) return;
    const [r, g, b] = match.map(Number);
    
    // YIQ formula for perceived brightness (0 to 255)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    const isDark = yiq < 128; // Threshold for switching to "light mode" visuals

    // 1. Determine values
    const textCol = isDark ? '#ffffff' : '#1a1a1a';
    const textMuted = isDark ? '#aaaaaa' : '#666666';
    const logoFil = isDark ? 'invert(1)' : 'none';
    const fraceBlend = isDark ? 'screen' : 'multiply';
    const loaderInv = isDark ? 'invert(0)' : 'invert(1)'; // Automatically calculates perfect loader contrast
    const overlayBg = `rgba(${r}, ${g}, ${b}, 0.97)`;
    const lightboxBg = `rgba(${r}, ${g}, ${b}, 0.98)`;

    // 2. Target :root to override everything else
    const root = document.documentElement; 

    root.style.setProperty('--bg-color', colorString);
    root.style.setProperty('--text-color', textCol);
    root.style.setProperty('--text-muted', textMuted);
    root.style.setProperty('--overlay-bg', overlayBg);
    root.style.setProperty('--lightbox-bg', lightboxBg);
    root.style.setProperty('--logo-filter', logoFil);
    root.style.setProperty('--dot-color', textCol);
    root.style.setProperty('--frace-blend', fraceBlend);
    root.style.setProperty('--loader-invert', loaderInv); // Push to CSS

    isCustomBg = true;
    currentCanvasBg = colorString;
    resize();
}

        // --- LOAD PREFERENCE ON STARTUP ---
        document.addEventListener('DOMContentLoaded', () => {
            const savedCustomBg = localStorage.getItem('customBg');
            const savedTheme = localStorage.getItem('theme');
            const savedLayoutMode = localStorage.getItem('layoutMode');
// Add this block to load the zoom level
    const savedZoom = localStorage.getItem('collageZoomLevel');
    if (savedZoom !== null) {
        collageZoomLevel = parseInt(savedZoom, 10);
    }
            if (savedCustomBg) {
                applyCustomBackground(savedCustomBg);
            } else if (savedTheme === 'dark') {
                isDarkMode = true;
                document.body.classList.add('dark-mode');
            }

            if (savedLayoutMode === 'rows') {
                isCollageMode = false;
                const iconGrid = document.querySelector('.icon-grid');
                const iconCollage = document.querySelector('.icon-collage');
                iconGrid.style.display = 'none';
                iconCollage.style.display = 'block';
                document.getElementById('zoom-toggle').style.display = 'none';
            } else {
                // We default to collage mode being visible, so set icon to flex
                document.getElementById('zoom-toggle').style.display = 'flex';
            }

    updateGalleryLayout();
            initDragSystem();
            initSliceDragSystem();  
            updateDragCapabilities();
            openWorks();
renderCart(); // <-- ADD THIS LINE to load the saved cart & badge on refresh
    
    const buyBtn = document.querySelector('.buy-btn.black');
    if(buyBtn) {
        buyBtn.addEventListener('click', addToCart);
    }
});
 

        // --- THEME TOGGLE LOGIC ---
        const themeToggleBtn = document.getElementById('theme-toggle');

      let clickCount = 0;
let clickTimer;

themeToggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clickCount++;

    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => { clickCount = 0; }, 500);

    if (clickCount === 3) {
        clickCount = 0;
        openDuckPage();
        return;
    }

    const currentTime = Date.now();
    const timeDiff = currentTime - lastThemeClickTime;

    if (timeDiff < 350) {
        // --- DOUBLE CLICK: Random Color ---
        clearTimeout(themeClickTimer);
        themeClickTimer = null;

        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        const randomColor = `rgb(${r}, ${g}, ${b})`;

        applyCustomBackground(randomColor);
        try {
            // A double click supersedes the provisional single-click choice.
            localStorage.setItem('customBg', randomColor);
            localStorage.removeItem('theme');
        } catch (error) {}
        lastThemeClickTime = 0;
    } else {
        // --- SINGLE CLICK: Toggle Dark/Light ---
        lastThemeClickTime = currentTime;

        // Snapshot the intended result now. Previously the preference was not
        // written until this 350 ms timer fired. A hard refresh in that window
        // cancelled the timer and made the site load the old/default white theme.
        const wasCustomBackground = isCustomBg;
        const nextDarkMode = wasCustomBackground ? false : !isDarkMode;

        try {
            if (wasCustomBackground) {
                localStorage.removeItem('customBg');
                localStorage.setItem('theme', 'light');
            } else {
                localStorage.setItem('theme', nextDarkMode ? 'dark' : 'light');
                localStorage.removeItem('customBg');
            }
        } catch (error) {}

        themeClickTimer = setTimeout(() => {
            themeClickTimer = null;

            if (wasCustomBackground) {
                clearCustomStyles();
                isDarkMode = false;
                document.body.classList.remove('dark-mode');
            } else {
                isDarkMode = nextDarkMode;
                document.body.classList.toggle('dark-mode', isDarkMode);
            }

            resize(); // Refresh canvas
        }, 350);
    }
});

        // --- DOWNLOAD CANVAS LOGIC ---
        function downloadArtwork() {
            try {
                const mainCanvas = document.getElementById('canvas');
                const tempCanvas = document.createElement('canvas');
                const exportScale = 3; 
                tempCanvas.width = mainCanvas.width * exportScale;
                tempCanvas.height = mainCanvas.height * exportScale;
                const tCtx = tempCanvas.getContext('2d');
                
                tCtx.drawImage(mainCanvas, 0, 0, tempCanvas.width, tempCanvas.height);
                
                if (isDarkMode && !isCustomBg) {
                    const imgData = tCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
                    const data = imgData.data;
                    
                    function hue2rgb(p, q, t) {
                        if(t < 0) t += 1;
                        if(t > 1) t -= 1;
                        if(t < 1/6) return p + (q - p) * 6 * t;
                        if(t < 1/2) return q;
                        if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                        return p;
                    }

                    for (let i = 0; i < data.length; i += 4) {
                        let r = data[i] / 255;
                        let g = data[i+1] / 255;
                        let b = data[i+2] / 255;
                        
                        let max = Math.max(r, g, b), min = Math.min(r, g, b);
                        let h, s, l = (max + min) / 2;

                        if (max === min) {
                            h = s = 0; 
                        } else {
                            let d = max - min;
                            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                            switch (max) {
                                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                                case g: h = (b - r) / d + 2; break;
                                case b: h = (r - g) / d + 4; break;
                            }
                            h /= 6;
                        }

                        l = 1.0 - l;

                        if (l === 0) {
                            data[i] = 0;
                            data[i+1] = 0;
                            data[i+2] = 0;
                            continue;
                        }

                        if (s === 0) {
                            let val = Math.round(l * 255);
                            data[i] = val;
                            data[i+1] = val;
                            data[i+2] = val;
                        } else {
                            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
                            let p = 2 * l - q;
                            data[i] = Math.round(hue2rgb(p, q, h + 1/3) * 255);
                            data[i+1] = Math.round(hue2rgb(p, q, h) * 255);
                            data[i+2] = Math.round(hue2rgb(p, q, h - 1/3) * 255);
                        }
                    }
                    tCtx.putImageData(imgData, 0, 0);
                }

                const w = window.open('about:blank', '_blank');
                
                const bgColor = (isDarkMode && !isCustomBg) ? '#000000' : '#ffffff';
                const textColor = (isDarkMode && !isCustomBg) ? '#ffffff' : '#1a1a1a';
                
                w.document.write(`<body style="background-color: ${bgColor}; color: ${textColor}; margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh;">`);
                w.document.write('<img src="' + tempCanvas.toDataURL('image/png') + '" style="max-width: 100%; height: auto;"/>');
                w.document.write('<p style="font-family:sans-serif; text-align:center; padding: 20px;">Long press image to save to Photos</p>');
                w.document.write('</body>');
            } catch (error) {
                console.error(error);
                alert("Download blocked: Please ensure you are running on a live domain.");
            }
        }

        // --- GALLERY GLITCH EFFECT ---
        function glitchGallery() {
            const textEl = document.getElementById('btn-gallery-text');
            const imgEl = document.getElementById('btn-gallery-img');
            
            if(textEl && imgEl) {
                textEl.style.visibility = 'hidden';
                imgEl.style.display = 'block';
                imgEl.classList.add('is-glitching');
                
                setTimeout(() => {
                    textEl.style.visibility = 'visible';
                    imgEl.style.display = 'none';
                    imgEl.classList.remove('is-glitching');
                }, Math.random() * 500 + 350);
            }
            
            setTimeout(glitchGallery, Math.random() * 4000 + 2000);
        }
        setTimeout(glitchGallery, Math.random() * 4000 + 2000);
        
  function updateFooterIcons(activePage) {
    const btnDownload = document.getElementById('btn-download');
    const layoutToggle = document.getElementById('layout-toggle');
    const zoomToggle = document.getElementById('zoom-toggle');

    if (activePage === 'paint') {
        btnDownload.style.display = '';
        layoutToggle.style.display = 'none';
        zoomToggle.style.display = 'none';
    } else if (activePage === 'gallery') {
        btnDownload.style.display = 'none';
        layoutToggle.style.display = 'flex';
        zoomToggle.style.display = isCollageMode ? 'flex' : 'none';
    } else {
        /* Studies, Motion and the information pages use fixed layouts. */
        btnDownload.style.display = 'none';
        layoutToggle.style.display = 'none';
        zoomToggle.style.display = 'none';
    }
}



const MODEL_VIEWER_SCRIPT_URL =
    'https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js';
let modelViewerLoadPromise = null;

function ensureModelViewerLoaded() {
    if (customElements.get('model-viewer')) {
        return Promise.resolve();
    }

    if (modelViewerLoadPromise) {
        return modelViewerLoadPromise;
    }

    modelViewerLoadPromise = new Promise((resolve, reject) => {
        let script = document.querySelector('script[data-model-viewer-loader]');

        const waitForDefinition = () => {
            customElements.whenDefined('model-viewer').then(resolve).catch(reject);
        };

        if (script) {
            script.addEventListener('load', waitForDefinition, { once: true });
            script.addEventListener('error', () => {
                modelViewerLoadPromise = null;
                reject(new Error('model-viewer failed to load'));
            }, { once: true });
            return;
        }

        script = document.createElement('script');
        script.type = 'module';
        script.src = MODEL_VIEWER_SCRIPT_URL;
        script.dataset.modelViewerLoader = 'true';
        script.addEventListener('load', waitForDefinition, { once: true });
        script.addEventListener('error', () => {
            modelViewerLoadPromise = null;
            reject(new Error('model-viewer failed to load'));
        }, { once: true });
        document.head.appendChild(script);
    });

    return modelViewerLoadPromise;
}

async function openDuckPage() {
    clearNavigation();
    isPaintingActive = false;

    const overlay = document.getElementById('page-duck');
    const content = overlay.querySelector('.overlay-content');

    overlay.classList.add('visible');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';

    if (isTouchUI) {
        document.getElementById('ios-brush-selector').style.display = 'none';
    }
    updateFooterIcons('other');

    try {
        await ensureModelViewerLoaded();

        if (!overlay.classList.contains('visible')) return;

        if (!document.getElementById('duck-viewer')) {
            const mv = document.createElement('model-viewer');
            mv.id = 'duck-viewer';
            mv.src = '/artwork/3d/duck/source/duck_animation.glb';
            mv.setAttribute('alt', 'A 3D duck animation');
            mv.setAttribute('auto-rotate', '');
            mv.setAttribute('camera-controls', '');
            mv.setAttribute('shadow-intensity', '1');
            mv.setAttribute('autoplay', '');
            mv.setAttribute('interaction-prompt', 'none');
            mv.style.width = '100vw';
            mv.style.height = '100vh';
            mv.style.setProperty('--poster-color', 'transparent');

            mv.addEventListener(
                'error',
                (event) => console.error('Duck model failed to load:', event.detail),
                { once: true }
            );

            content.appendChild(mv);
        }
    } catch (error) {
        console.error(error);
    }
}
const btnStore = document.getElementById('btn-store');
const pageStore = document.getElementById('page-store');

btnStore.addEventListener('click', (e) => {
    e.preventDefault();
    window.history.pushState(null, '', '/store/');
    openStore();
});

   // --- NAVIGATION & HOVER LOGIC ---
        const btnGalleryLogo = document.getElementById('btn-gallery-logo');
        const btnPaint = document.getElementById('btn-paint');
        const btnMotion = document.getElementById('btn-motion');
const btnDigitalStudies = document.getElementById('btn-digital-studies');
const btnNotes = document.getElementById('btn-notes');
        const btnAbout = document.getElementById('btn-about');
        const btnGallery = document.getElementById('btn-gallery');
        const btnExhibitions = document.getElementById('btn-exhibitions');
        const btnPress = document.getElementById('btn-press');
        const btnContact = document.getElementById('btn-contact');
        
        const pageAbout = document.getElementById('page-about');
        const pageWorks = document.getElementById('page-works');
const pageNotes = document.getElementById('page-notes');
const pageDigitalStudies = document.getElementById('page-digital-studies');
const pageMotion = document.getElementById('page-motion');

let pendingGallerySeoItem = null;
pageWorks?.addEventListener('click', (event) => {
    const item = event.target.closest(
        '#page-works .work-item[data-slug]'
    );
    if (item) pendingGallerySeoItem = item;
}, true);

let studiesLayoutFrame = 0;

function studiesRowGap() {
    if (window.innerWidth <= 768) return 14;
    if (window.innerWidth <= 1024) return 16;
    return 22;
}

function studiesTargetRowHeight(containerWidth) {
    if (window.innerWidth <= 768) {
        return Math.min(290, Math.max(185, containerWidth * 0.54));
    }
    if (window.innerWidth <= 1024) {
        return Math.min(390, Math.max(260, containerWidth * 0.36));
    }
    if (window.innerWidth >= 1400) {
        return Math.min(430, Math.max(330, containerWidth * 0.245));
    }
    return Math.min(400, Math.max(300, containerWidth * 0.29));
}

function readStudyRatio(item) {
    const image = item && item.querySelector('img');
    if (image && image.naturalWidth && image.naturalHeight) {
        const ratio = image.naturalWidth / image.naturalHeight;
        item.dataset.studyRatio = String(ratio);
        return ratio;
    }
    const stored = Number(item && item.dataset.studyRatio);
    return Number.isFinite(stored) && stored > 0 ? stored : 0.75;
}

const MEDIA_TALL_RATIO_THRESHOLD = 0.54;

function unwrapMediaTallClusters(grid, itemSelector) {
    if (!grid) return;

    Array.from(grid.children)
        .filter((child) => child.classList.contains('media-tall-cluster'))
        .forEach((cluster) => {
            const items = Array.from(cluster.querySelectorAll(itemSelector))
                .sort((a, b) =>
                    Number(a.dataset.mediaLayoutOrder || 0) -
                    Number(b.dataset.mediaLayoutOrder || 0)
                );

            items.forEach((item) => {
                item.classList.remove('media-tall-primary', 'media-tall-side');
                item.removeAttribute('data-media-layout-order');
                grid.insertBefore(item, cluster);
            });
            cluster.remove();
        });
}

function mediaTallRowMetrics(row, width, gap) {
    const ratioTotal = row.reduce(
        (sum, entry) => sum + Math.max(0.01, entry.ratio),
        0
    );
    const available = Math.max(
        1,
        width - gap * Math.max(0, row.length - 1) - 4
    );
    const height = available / ratioTotal;
    return {
        height,
        widths: row.map((entry) => entry.ratio * height)
    };
}

function chooseMediaTallSideRows(
    followingEntries,
    sideWidth,
    gap,
    targetHeight,
    options = {}
) {
    const maxCandidates = Math.min(
        followingEntries.length,
        Math.max(2, Number(options.maxCandidates) || 7)
    );
    const minimumHeight = targetHeight * (
        Number(options.minimumHeightFraction) || 0.62
    );
    const maximumHeight = targetHeight * (
        Number(options.maximumHeightFraction) || 1.48
    );
    const minimumItemWidth = sideWidth * (
        Number(options.minimumItemFraction) || 0.16
    );
    let best = null;

    for (let count = 2; count <= maxCandidates; count++) {
        const candidates = followingEntries.slice(0, count);

        for (let split = 1; split < count; split++) {
            const rows = [
                candidates.slice(0, split),
                candidates.slice(split)
            ];
            const metrics = rows.map(
                (row) => mediaTallRowMetrics(row, sideWidth, gap)
            );

            if (
                metrics.some(
                    (metric) =>
                        metric.height < minimumHeight ||
                        metric.height > maximumHeight ||
                        metric.widths.some(
                            (width) => width < minimumItemWidth
                        )
                )
            ) {
                continue;
            }

            const heightError = metrics.reduce(
                (sum, metric) =>
                    sum + Math.abs(
                        Math.log(
                            Math.max(0.01, metric.height / targetHeight)
                        )
                    ),
                0
            );
            const balanceError = Math.abs(
                Math.log(
                    Math.max(
                        0.01,
                        metrics[0].height / metrics[1].height
                    )
                )
            );
            const itemUseReward = count * 0.055;
            const score = heightError * 3.6 + balanceError * 0.8 - itemUseReward;

            if (!best || score < best.score) {
                best = {
                    score,
                    count,
                    rows,
                    metrics
                };
            }
        }
    }

    return best;
}

function planMediaTallCluster(
    tallEntry,
    followingEntries,
    containerWidth,
    gap,
    targetHeight,
    options = {}
) {
    if (!tallEntry || followingEntries.length < 2) return null;

    /* Do not swallow another ultra-tall item into the side stack. Each tall
       work should remain eligible to become its own feature tile. */
    const compatibleFollowing = [];
    for (const entry of followingEntries) {
        if (entry.ratio <= MEDIA_TALL_RATIO_THRESHOLD) break;
        compatibleFollowing.push(entry);
        if (compatibleFollowing.length >= (options.maxCandidates || 7)) break;
    }
    if (compatibleFollowing.length < 2) return null;

    let clusterHeight = targetHeight * 2 + gap;
    let plan = null;

    for (let iteration = 0; iteration < 5; iteration++) {
        const tallWidth = tallEntry.ratio * clusterHeight;
        const sideWidth = containerWidth - gap - tallWidth;

        if (
            tallWidth > containerWidth * 0.46 ||
            sideWidth < containerWidth * 0.46
        ) {
            return null;
        }

        plan = chooseMediaTallSideRows(
            compatibleFollowing,
            sideWidth,
            gap,
            targetHeight,
            options
        );
        if (!plan) return null;

        const nextHeight =
            plan.metrics[0].height + gap + plan.metrics[1].height;
        if (Math.abs(nextHeight - clusterHeight) < 0.75) {
            clusterHeight = nextHeight;
            break;
        }
        clusterHeight = nextHeight;
    }

    const tallWidth = tallEntry.ratio * clusterHeight;
    const sideWidth = containerWidth - gap - tallWidth;
    plan = chooseMediaTallSideRows(
        compatibleFollowing,
        sideWidth,
        gap,
        targetHeight,
        options
    );
    if (!plan) return null;

    clusterHeight =
        plan.metrics[0].height + gap + plan.metrics[1].height;

    return {
        count: plan.count,
        rows: plan.rows,
        clusterHeight,
        tallWidth: tallEntry.ratio * clusterHeight,
        sideWidth: containerWidth - gap - tallEntry.ratio * clusterHeight
    };
}

function planForcedStudiesTallCluster(
    tallEntry,
    sideEntries,
    containerWidth,
    gap,
    targetHeight
) {
    if (!tallEntry || sideEntries.length < 2) return null;

    const candidates = sideEntries.slice();
    let best = null;

    /* Try every consecutive two-row split and keep the most balanced one.
       Unlike the generic planner, this intentionally uses all remaining
       Digital Studies images so the tall work and its neighbours form one
       compact feature block with no dead space. */
    for (let split = 1; split < candidates.length; split++) {
        const rows = [
            candidates.slice(0, split),
            candidates.slice(split)
        ];
        let clusterHeight = targetHeight * 2 + gap;
        let metrics = null;
        let tallWidth = 0;
        let sideWidth = 0;
        let valid = true;

        for (let iteration = 0; iteration < 8; iteration++) {
            tallWidth = tallEntry.ratio * clusterHeight;
            sideWidth = containerWidth - gap - tallWidth;

            if (
                sideWidth <= containerWidth * 0.44 ||
                tallWidth >= containerWidth * 0.46
            ) {
                valid = false;
                break;
            }

            metrics = rows.map((row) =>
                mediaTallRowMetrics(row, sideWidth, gap)
            );
            if (metrics.some((metric) => !Number.isFinite(metric.height))) {
                valid = false;
                break;
            }

            const nextHeight =
                metrics[0].height + gap + metrics[1].height;
            if (Math.abs(nextHeight - clusterHeight) < 0.5) {
                clusterHeight = nextHeight;
                break;
            }
            clusterHeight = nextHeight;
        }

        if (!valid || !metrics) continue;

        tallWidth = tallEntry.ratio * clusterHeight;
        sideWidth = containerWidth - gap - tallWidth;
        metrics = rows.map((row) =>
            mediaTallRowMetrics(row, sideWidth, gap)
        );
        clusterHeight = metrics[0].height + gap + metrics[1].height;
        tallWidth = tallEntry.ratio * clusterHeight;
        sideWidth = containerWidth - gap - tallWidth;

        const minSideItemWidth = Math.min(
            ...metrics.flatMap((metric) => metric.widths)
        );
        const balance = Math.abs(
            Math.log(Math.max(0.01, metrics[0].height / metrics[1].height))
        );
        const targetError = metrics.reduce(
            (sum, metric) =>
                sum + Math.abs(
                    Math.log(Math.max(0.01, metric.height / targetHeight))
                ),
            0
        );
        const narrowPenalty = minSideItemWidth < containerWidth * 0.12
            ? 8
            : 0;
        const score = balance * 2.2 + targetError + narrowPenalty;

        if (!best || score < best.score) {
            best = {
                score,
                count: candidates.length,
                rows,
                clusterHeight,
                tallWidth,
                sideWidth
            };
        }
    }

    return best;
}

function buildMediaTallCluster({
    grid,
    tallEntry,
    plan,
    gap,
    type,
    applyRow
}) {
    const cluster = document.createElement('div');
    cluster.className = `media-tall-cluster media-tall-cluster-${type}`;
    cluster.style.setProperty('--media-tall-gap', `${gap}px`);

    const stack = document.createElement('div');
    stack.className = 'media-tall-stack';

    grid.insertBefore(cluster, tallEntry.item);
    tallEntry.item.classList.add('media-tall-primary');
    applyRow(
        [tallEntry],
        plan.tallWidth,
        0,
        plan.clusterHeight,
        false,
        plan.clusterHeight
    );
    cluster.appendChild(tallEntry.item);

    plan.rows.forEach((row) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'media-tall-row';
        row.forEach((entry) => entry.item.classList.add('media-tall-side'));
        applyRow(row, plan.sideWidth, gap, 1, true);
        row.forEach((entry) => rowElement.appendChild(entry.item));
        stack.appendChild(rowElement);
    });

    cluster.appendChild(stack);
}

function layoutMediaTallSequence({
    grid,
    entries,
    containerWidth,
    gap,
    targetHeight,
    type,
    isPhone,
    layoutSegment,
    applyRow,
    clusterOptions = {}
}) {
    entries.forEach((entry, index) => {
        entry.item.dataset.mediaLayoutOrder = String(index);
    });

    let segment = [];
    let index = 0;

    const flushSegment = (closeBoundary) => {
        if (!segment.length) return;
        layoutSegment(segment, closeBoundary);
        segment = [];
    };

    while (index < entries.length) {
        const entry = entries[index];
        const isTallFeature =
            entry.ratio <= MEDIA_TALL_RATIO_THRESHOLD ||
            entry.item.dataset.tallFeature === 'true';
        if (!isTallFeature) {
            segment.push(entry);
            index++;
            continue;
        }

        if (isPhone) {
            flushSegment(true);
            /* Full width at the exact source ratio: no crop and no tiny tile. */
            applyRow(
                [entry],
                containerWidth,
                0,
                targetHeight,
                true
            );
            index++;
            continue;
        }

        const plan = planMediaTallCluster(
            entry,
            entries.slice(index + 1),
            containerWidth,
            gap,
            targetHeight,
            clusterOptions
        );

        if (!plan) {
            segment.push(entry);
            index++;
            continue;
        }

        flushSegment(true);
        buildMediaTallCluster({
            grid,
            tallEntry: entry,
            plan,
            gap,
            type,
            applyRow
        });
        index += 1 + plan.count;
    }

    flushSegment(false);
}

function applyStudiesRow(row, containerWidth, gap, targetHeight, justify, forcedHeight = null) {
    if (!row.length) return;
    const ratioTotal = row.reduce((sum, entry) => sum + entry.ratio, 0);
    const gapTotal = gap * Math.max(0, row.length - 1);
    const fitAllowance = justify ? 4 : 0;
    const available = Math.max(1, containerWidth - gapTotal - fitAllowance);
    /* Match Motion on iPhone/iPad: every planned touch row is physically
       justified, including a single 16:9 image. That lets a landscape use
       the full row instead of leaving an empty block on its right. Desktop
       final rows still pass justify=false and retain their natural scale. */
    let height = Number.isFinite(forcedHeight) && forcedHeight > 0
        ? forcedHeight
        : justify
            ? available / ratioTotal
            : Math.min(targetHeight, available / ratioTotal);
    height = Math.max(1, height);

    row.forEach((entry) => {
        const width = Math.max(1, entry.ratio * height);
        entry.item.style.setProperty('--study-item-width', width.toFixed(3) + 'px');
        entry.item.style.setProperty('--study-row-height', height.toFixed(3) + 'px');
    });
}

/* Plan row boundaries across the whole sequence. In addition to avoiding
   stranded portrait cards, every candidate row must now keep each thumbnail
   above a real minimum width. A wide landscape may occupy a complete row;
   a narrow portrait may not. When the original sequence has no valid solution,
   a stable aspect-ratio grouping brings compatible shapes together. */
function planBalancedMediaRows(
    entries,
    containerWidth,
    gap,
    targetHeight,
    minItems,
    maxItems,
    options = {}
) {
    const minimumItemWidth = Math.max(1, Number(options.minimumItemWidth) || 1);
    const singleWideRatio = Math.max(1, Number(options.singleWideRatio) || 1.18);
    const allowRatioGrouping = options.allowRatioGrouping !== false;

    const solve = (sequence) => {
        const count = sequence.length;
        if (!count) return [];
        if (count === 1) return [sequence.slice()];

        const memo = new Array(count + 1).fill(null);
        memo[count] = { cost: 0, rows: [] };

        for (let start = count - 1; start >= 0; start--) {
            let best = null;

            for (let size = 1; size <= maxItems; size++) {
                const end = start + size;
                if (end > count || !memo[end]) continue;
                if (size > 1 && size < minItems) continue;

                const row = sequence.slice(start, end);

                /* A complete single-item row is valid only for a genuinely
                   wide piece. This lets a landscape fill the line while
                   preventing a narrow portrait from sitting beside empty space. */
                if (size === 1 && row[0].ratio < singleWideRatio) continue;

                const ratioTotal = row.reduce((sum, entry) => sum + entry.ratio, 0);
                const available = Math.max(
                    1,
                    containerWidth - gap * Math.max(0, size - 1) - 4
                );
                const rowHeight = available / Math.max(0.01, ratioTotal);
                const widths = row.map((entry) => entry.ratio * rowHeight);

                /* Reject combinations such as a landscape beside a very narrow
                   portrait when that would shrink the portrait to a tiny strip. */
                if (widths.some((width) => width < minimumItemWidth)) continue;

                const heightError = Math.abs(
                    Math.log(Math.max(0.01, rowHeight / targetHeight))
                );
                const logRatios = row.map(
                    (entry) => Math.log(Math.max(0.01, entry.ratio))
                );
                const meanLogRatio =
                    logRatios.reduce((sum, value) => sum + value, 0) /
                    logRatios.length;
                const ratioSpread = Math.sqrt(
                    logRatios.reduce(
                        (sum, value) =>
                            sum + Math.pow(value - meanLogRatio, 2),
                        0
                    ) / logRatios.length
                );

                let extremePenalty = 0;
                if (rowHeight < targetHeight * 0.58) {
                    extremePenalty +=
                        Math.pow(
                            (targetHeight * 0.58 - rowHeight) / targetHeight,
                            2
                        ) * 18;
                }
                if (rowHeight > targetHeight * 1.55) {
                    extremePenalty +=
                        Math.pow(
                            (rowHeight - targetHeight * 1.55) / targetHeight,
                            2
                        ) * 18;
                }

                const singleRowPenalty = size === 1 ? 0.7 : 0;
                const cost =
                    heightError * 4.4 +
                    ratioSpread * 0.85 +
                    extremePenalty +
                    singleRowPenalty +
                    memo[end].cost;

                if (!best || cost < best.cost) {
                    best = {
                        cost,
                        rows: [row].concat(memo[end].rows)
                    };
                }
            }

            memo[start] = best;
        }

        return memo[0] ? memo[0].rows : null;
    };

    const originalPlan = solve(entries);
    if (originalPlan) return originalPlan;

    if (allowRatioGrouping) {
        /* Stable sorting keeps the order inside each shape family while
           allowing similar portraits/squares/landscapes to share rows. */
        const grouped = entries
            .map((entry, originalIndex) => ({ ...entry, originalIndex }))
            .sort((a, b) => {
                const ratioDifference = a.ratio - b.ratio;
                return Math.abs(ratioDifference) > 0.04
                    ? ratioDifference
                    : a.originalIndex - b.originalIndex;
            });

        const groupedPlan = solve(grouped);
        if (groupedPlan) return groupedPlan;
    }

    /* Safe fallback: use pairs and let an eligible landscape fill a row.
       No item is discarded even if unusual future aspect ratios are added. */
    const rows = [];
    for (let index = 0; index < entries.length;) {
        const remaining = entries.length - index;
        if (remaining === 1) {
            rows.push([entries[index]]);
            break;
        }
        rows.push(entries.slice(index, index + 2));
        index += 2;
    }
    return rows;
}

/* Phone/iPad rows preserve the exact source order. Earlier versions sorted
   or pulled aspect ratios forward, which gradually collected square and
   landscape work near the bottom of the page. This planner considers only
   consecutive items, rejects miniature shared-height rows, and chooses the
   best set of row breaks across the complete sequence. */
function planLargeTouchRows(entries, containerWidth, gap, options = {}) {
    const count = entries.length;
    if (!count) return [];

    const targetHeight = Math.max(
        1,
        Number(options.targetHeight) || containerWidth * 0.72
    );
    const maxItems = Math.max(
        2,
        Math.min(3, Number(options.maxItems) || 2)
    );
    const minimumRowHeightFraction = Math.min(
        0.90,
        Math.max(
            0.55,
            Number(options.minimumRowHeightFraction) || 0.68
        )
    );
    const minimumItemFraction = Math.min(
        0.42,
        Math.max(
            0.20,
            Number(options.minimumItemFraction) || 0.27
        )
    );

    const memo = new Array(count + 1).fill(null);
    memo[count] = { cost: 0, rows: [] };

    for (let start = count - 1; start >= 0; start--) {
        let best = null;

        for (
            let size = 1;
            size <= Math.min(maxItems, count - start);
            size++
        ) {
            const end = start + size;
            if (!memo[end]) continue;

            const row = entries.slice(start, end);
            const ratioTotal = row.reduce(
                (sum, entry) => sum + Math.max(0.01, entry.ratio),
                0
            );
            const available = Math.max(
                1,
                containerWidth - gap * Math.max(0, size - 1) - 4
            );
            const rowHeight = available / ratioTotal;
            const widths = row.map(
                (entry) => entry.ratio * rowHeight
            );

            if (size > 1) {
                const minimumRowHeight =
                    targetHeight * minimumRowHeightFraction;
                const minimumItemWidth =
                    containerWidth * minimumItemFraction;

                /* This blocks the bad landscape + square combination from
                   the screenshot: it may fill the width mathematically, but
                   its shared height is too short to remain visually useful. */
                if (rowHeight < minimumRowHeight) continue;
                if (
                    widths.some(
                        (width) => width < minimumItemWidth
                    )
                ) {
                    continue;
                }
            }

            const heightError = Math.abs(
                Math.log(
                    Math.max(0.01, rowHeight / targetHeight)
                )
            );

            const remaining = count - end;
            const orphanPenalty =
                remaining === 1 && size > 1 ? 2.8 : 0;

            /* Singles remain exactly where they occur. A wide landscape
               can therefore use a natural full-width row, while the next
               square or portrait stays mixed into the following sequence.
               Portrait/square singles cost more, encouraging a valid pair
               whenever one exists without reordering anything. */
            let singlePenalty = 0;
            if (size === 1) {
                const ratio = row[0].ratio;
                singlePenalty =
                    ratio >= 1.18 ? 0.45 :
                    ratio >= 0.88 ? 1.65 :
                    2.35;
            }

            const rowCountPenalty = size === 3 ? 0.18 : 0;
            const cost =
                heightError * 4.1 +
                orphanPenalty +
                singlePenalty +
                rowCountPenalty +
                memo[end].cost;

            if (!best || cost < best.cost) {
                best = {
                    cost,
                    rows: [row].concat(memo[end].rows)
                };
            }
        }

        /* A one-item row is always legal, so this is only defensive. */
        if (!best) {
            best = {
                cost: 100 + memo[start + 1].cost,
                rows: [[entries[start]]].concat(
                    memo[start + 1].rows
                )
            };
        }

        memo[start] = best;
    }

    return memo[0].rows;
}

function layoutStudySegment(
    entries,
    containerWidth,
    gap,
    targetHeight,
    closeBoundary = false
) {
    if (!entries.length) return;

    if (window.innerWidth <= 1024 && entries.length > 1) {
        const rows = planLargeTouchRows(
            entries,
            containerWidth,
            gap,
            {
                targetHeight,
                maxItems: window.innerWidth <= 768 ? 2 : 3,
                minimumRowHeightFraction:
                    window.innerWidth <= 768 ? 0.68 : 0.62,
                minimumItemFraction:
                    window.innerWidth <= 768 ? 0.27 : 0.22
            }
        );
        rows.forEach((row) => {
            applyStudiesRow(row, containerWidth, gap, targetHeight, true);
        });
        return;
    }

    let row = [];
    let ratioTotal = 0;

    const flush = (justify) => {
        if (!row.length) return;
        applyStudiesRow(row, containerWidth, gap, targetHeight, justify);
        row = [];
        ratioTotal = 0;
    };

    entries.forEach((entry) => {
        const projectedCount = row.length + 1;
        const projectedWidth =
            (ratioTotal + entry.ratio) * targetHeight +
            gap * Math.max(0, projectedCount - 1);

        if (row.length && projectedWidth > containerWidth + 4) {
            flush(row.length > 1);
        }

        row.push(entry);
        ratioTotal += entry.ratio;
    });

    const ratioWidth =
        ratioTotal * targetHeight + gap * Math.max(0, row.length - 1);
    flush(
        closeBoundary
            ? row.length > 1 || ratioWidth >= containerWidth * 0.78
            : false
    );
}

function layoutStillImagePage(page) {
    if (!page) return;
    const grid = page.querySelector('.works-grid.mode-studies');
    if (!grid) return;

    unwrapMediaTallClusters(grid, '.sketch-item');

    const items = Array.from(grid.querySelectorAll('.sketch-item'));
    const containerWidth = grid.clientWidth;
    if (!items.length || !containerWidth) return;

    const gap = studiesRowGap();
    const targetHeight = studiesTargetRowHeight(containerWidth);
    const entries = items.map((item) => {
        item.style.removeProperty('order');
        return {
            item,
            ratio: readStudyRatio(item)
        };
    });

    /* Extra-tall images are handled by the shared bounded cluster planner below.
       This keeps only a small group beside the portrait and lets the remaining
       studies continue in normal justified rows. */

    const hasSpanningStudy = entries.some(
        (entry) => Number(entry.item.dataset.studySpan || 1) > 1
    );

    if (hasSpanningStudy) {
        let segment = [];

        const flushSegment = (closeBoundary) => {
            if (!segment.length) return;
            layoutStudySegment(
                segment,
                containerWidth,
                gap,
                targetHeight,
                closeBoundary
            );
            segment = [];
        };

        entries.forEach((entry) => {
            const span = Math.max(
                1,
                Number(entry.item.dataset.studySpan || 1)
            );

            if (span <= 1) {
                segment.push(entry);
                return;
            }

            flushSegment(true);

            /* Keep the source image uncropped. On desktop/iPad this gives the
               portrait the visual width of two normal columns; on phones it
               becomes a natural-aspect full-width feature. */
            const naturalColumnWidth = entry.ratio * targetHeight;
            const featureWidth = window.innerWidth <= 768
                ? containerWidth
                : Math.min(
                    containerWidth,
                    naturalColumnWidth * span + gap * (span - 1)
                );
            const featureHeight = featureWidth / Math.max(0.01, entry.ratio);

            applyStudiesRow(
                [entry],
                featureWidth,
                0,
                targetHeight,
                true,
                featureHeight
            );
        });

        flushSegment(false);
        return;
    }

    const hasExtraTallMedia = entries.some(
        (entry) =>
            entry.ratio <= MEDIA_TALL_RATIO_THRESHOLD ||
            entry.item.dataset.tallFeature === 'true'
    );

    if (hasExtraTallMedia) {
        layoutMediaTallSequence({
            grid,
            entries,
            containerWidth,
            gap,
            targetHeight,
            type: 'studies',
            /* Keep the very tall Digital Studies feature compact on phones and
               iPad mini by allowing the same two-row side stack used on desktop.
               Notes retains the simpler full-width phone treatment. */
            isPhone:
                window.innerWidth <= 768 &&
                page.id !== 'page-digital-studies',
            layoutSegment: (segment, closeBoundary) =>
                layoutStudySegment(
                    segment,
                    containerWidth,
                    gap,
                    targetHeight,
                    closeBoundary
                ),
            applyRow: applyStudiesRow,
            clusterOptions: {
                maxCandidates:
                    window.innerWidth <= 768 ? 4 :
                    window.innerWidth <= 1024 ? 6 : 8,
                minimumHeightFraction:
                    window.innerWidth <= 768 ? 0.50 :
                    window.innerWidth <= 1024 ? 0.60 : 0.62,
                maximumHeightFraction:
                    window.innerWidth <= 768 ? 1.34 : 1.52,
                minimumItemFraction:
                    window.innerWidth <= 768 ? 0.20 :
                    window.innerWidth <= 1024 ? 0.19 : 0.15
            }
        });
        return;
    }

    layoutStudySegment(
        entries,
        containerWidth,
        gap,
        targetHeight,
        false
    );
}

function layoutStudiesRows() {
    studiesLayoutFrame = 0;
    document.querySelectorAll('.still-grid-page').forEach(layoutStillImagePage);
}


function scheduleStudiesRowLayout() {
    if (studiesLayoutFrame) cancelAnimationFrame(studiesLayoutFrame);
    studiesLayoutFrame = requestAnimationFrame(() => {
        requestAnimationFrame(layoutStudiesRows);
    });
}

document.querySelectorAll('.still-grid-page .sketch-item img').forEach((image) => {
    if (image.complete && image.naturalWidth) {
        image.closest('.sketch-item').dataset.studyRatio =
            String(image.naturalWidth / image.naturalHeight);
    } else {
        image.addEventListener('load', scheduleStudiesRowLayout, { once: true });
    }
});
window.addEventListener('resize', scheduleStudiesRowLayout);
        const pageExhibitions = document.getElementById('page-exhibitions');
        const pagePress = document.getElementById('page-press');
        const pageContact = document.getElementById('page-contact');
        const pageTime = document.getElementById('page-time');

function hydrateSectionImages(section, eagerCount = 0, options = {}) {
    if (!section) return Promise.resolve([]);

    const { loadAll = false } = options;
    const images = Array.from(section.querySelectorAll('img[data-src]'));

    function waitForImage(image) {
        if (image.complete && image.naturalWidth > 0) {
            section.dispatchEvent(new CustomEvent('section:first-content-ready'));
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const finish = () => {
                section.dispatchEvent(new CustomEvent('section:first-content-ready'));
                resolve();
            };
            const fail = () => resolve();

            image.addEventListener('load', finish, { once: true });
            image.addEventListener('error', fail, { once: true });
        });
    }

    images.forEach((image, index) => {
        image.decoding = 'async';
        image.loading = loadAll || index < eagerCount ? 'eager' : 'lazy';

        if ('fetchPriority' in image) {
            image.fetchPriority = index < Math.min(3, eagerCount)
                ? 'high'
                : 'auto';
        }

        if (!image.getAttribute('src')) {
            image.src = image.dataset.src;
        }
    });

    const imagesToAwait = loadAll ? images : images.slice(0, eagerCount);
    return Promise.allSettled(imagesToAwait.map(waitForImage));
}

function visibleStillImagePreloadCount() {
    if (window.innerWidth <= 768) return 4;
    if (window.innerWidth <= 1024) return 6;
    return 8;
}

function showSectionPageLoader(section, label = 'Loading') {
    if (!section) return null;

    let loader = section.querySelector('.section-page-loader');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'section-page-loader';
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-live', 'polite');
        loader.innerHTML = `
            <span class="visually-hidden"></span>
            <div class="section-page-loader-track" aria-hidden="true">
                <div class="section-page-loader-bar"></div>
            </div>`;
        section.appendChild(loader);
    }

    const hiddenLabel = loader.querySelector('.visually-hidden');
    if (hiddenLabel) hiddenLabel.textContent = label;
    loader.classList.add('visible');
    section.classList.add('section-is-loading');
    return loader;
}

function hideSectionPageLoader(section, minimumVisibleMs = 260) {
    if (!section) return;
    const loader = section.querySelector('.section-page-loader');
    if (!loader) return;

    const shownAt = Number(loader.dataset.shownAt || performance.now());
    const remaining = Math.max(0, minimumVisibleMs - (performance.now() - shownAt));

    window.setTimeout(() => {
        loader.classList.remove('visible');
        section.classList.remove('section-is-loading');
    }, remaining);
}

function sectionAlreadyHasVisibleContent(section) {
    if (!section) return false;
    return Array.from(section.querySelectorAll('img')).some((image) =>
        image.classList.contains('section-image-ready') ||
        (image.complete && image.naturalWidth > 0)
    );
}

function beginSectionPageLoading(section, label) {
    if (sectionAlreadyHasVisibleContent(section)) {
        hideSectionPageLoader(section, 0);
        return null;
    }

    const loader = showSectionPageLoader(section, label);
    if (!loader) return null;

    loader.dataset.shownAt = String(performance.now());

    const hideOnFirstContent = () => hideSectionPageLoader(section, 0);
    section.addEventListener('section:first-content-ready', hideOnFirstContent, { once: true });
    return loader;
}

async function finishSectionPageLoading(section, workPromise, timeoutMs = 9000) {
    const timeout = new Promise((resolve) => window.setTimeout(resolve, timeoutMs));
    await Promise.race([Promise.resolve(workPromise), timeout]);
    hideSectionPageLoader(section);
}

let storeConnectionsReady = false;

function ensureStoreConnections() {
    if (storeConnectionsReady) return;
    storeConnectionsReady = true;

    [
        'https://store.tyronemoreno.com',
        'https://cdn.shopify.com'
    ].forEach((href) => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = href;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });
}

function clearNavigation() {
    /* Stop hidden media and timers before changing sections. */
    if (typeof window.pauseMotionPage === 'function') window.pauseMotionPage();
    if (typeof stopAboutSlideshow === 'function') stopAboutSlideshow();
    pageAbout.classList.remove('visible');
    pageWorks.classList.remove('visible');
    pageNotes.classList.remove('visible');
    pageDigitalStudies.classList.remove('visible');
    pageMotion.classList.remove('visible');
    btnMotion.classList.remove('active');
    btnDigitalStudies.classList.remove('active');
    pageExhibitions.classList.remove('visible');
    pagePress.classList.remove('visible');
    pageContact.classList.remove('visible');
    pageStore.classList.remove('visible'); 
    pageTime.classList.remove('visible');
    timeActive = false;
    removeAllLoadingIndicators();
    isPaintingActive = true;
            
    btnAbout.classList.remove('active');
    btnNotes.classList.remove('active');
    btnGallery.classList.remove('active');
    btnExhibitions.classList.remove('active');
    btnPress.classList.remove('active');
    btnContact.classList.remove('active');
    btnStore.classList.remove('active');
            
    document.getElementById('page-duck').classList.remove('visible');
    document.body.classList.remove('overlay-open');
    document.body.classList.remove('time-mode');
    closeLightbox();
    document.body.style.cursor = 'none';
            
    if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'flex';

    updateFooterIcons('paint');

    // 👇 --- RESET META TAGS TO DEFAULT --- 👇
    updatePageMeta("Tyrone Moreno", "https://tyronemoreno.com/random/logo.webp");
}

function openAbout() {
    saveLastPage('about');

    if (pageAbout.classList.contains('visible')) {
        hydrateAboutImages();
        startAboutSlideshow();
        return;
    }

    clearNavigation();
    isPaintingActive = false;
    pageAbout.classList.add('visible');
    btnAbout.classList.add('active');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';

    hydrateAboutImages();
    startAboutSlideshow();

    if (isTouchUI) {
        document.getElementById('ios-brush-selector').style.display = 'none';
    }
    updateFooterIcons('other');
}
function openStore() {
isPaintingActive = false;
    saveLastPage('store');
    ensureStoreConnections();
    if (pageStore.classList.contains('visible')) {
        setStoreMeta();
        return;
    }
    clearNavigation();
    setStoreMeta();
    pageStore.classList.add('visible');
    btnStore.classList.add('active');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';
    if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
    updateFooterIcons('other');
    
    // FETCH THE STORE DATA HERE
    renderStore(); 
}

        function openWorks() {
isPaintingActive = false;
saveLastPage('gallery');
            if (pageWorks.classList.contains('visible')) {
                if (!document.getElementById('lightbox').classList.contains('active')) {
                    setGalleryMeta();
                }
                return;
            }
            clearNavigation();
            setGalleryMeta();
            hydrateSectionImages(pageWorks, window.innerWidth > 1024 ? 6 : 3);
            pageWorks.classList.add('visible');
            btnGallery.classList.add('active');
            document.body.classList.add('overlay-open');
            document.body.style.cursor = 'default';
            if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
            updateFooterIcons('gallery');
            requestAnimationFrame(updateGalleryQuality);
        }
function openTimePage() {
    isPaintingActive = false;
    saveLastPage('time');
    clearNavigation();
    isPaintingActive = false; // clearNavigation() resets this true, so re-disable painting for /time
    document.body.classList.add('time-mode');
    pageTime.classList.add('visible');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';
    if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
    updateFooterIcons('other');
    document.getElementById('t-ticker').textContent =
        '+' + Math.round(timeRatePerSec).toLocaleString() + ' hours of human screen time / second';
    timeActive = true;
    timeStart = performance.now();
    requestAnimationFrame(timeFrame);
}
function openNotes() {
    isPaintingActive = false;
    saveLastPage('notes');
    updatePageMeta("Tyrone Moreno | Notes");
    if (pageNotes.classList.contains('visible')) {
        scheduleStudiesRowLayout();
        return;
    }
    clearNavigation();
    pageNotes.classList.add('visible');
    beginSectionPageLoading(pageNotes, 'Loading notes');
    const notesLoad = hydrateSectionImages(
        pageNotes,
        visibleStillImagePreloadCount()
    );
    btnNotes.classList.add('active');
    btnGallery.classList.add('active');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';
    if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
    updateFooterIcons('other');
    scheduleStudiesRowLayout();
    finishSectionPageLoading(pageNotes, notesLoad).then(scheduleStudiesRowLayout);
}
function openDigitalStudies() {
    isPaintingActive = false;
    saveLastPage('digital-studies');
    updatePageMeta("Tyrone Moreno | Digital Studies");
    if (pageDigitalStudies.classList.contains('visible')) {
        scheduleStudiesRowLayout();
        return;
    }
    clearNavigation();
    pageDigitalStudies.classList.add('visible');
    beginSectionPageLoading(pageDigitalStudies, 'Loading studies');
    const studiesLoad = hydrateSectionImages(
        pageDigitalStudies,
        visibleStillImagePreloadCount()
    );
    btnDigitalStudies.classList.add('active');
    btnMotion.classList.add('active');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';
    if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
    updateFooterIcons('other');
    scheduleStudiesRowLayout();
    finishSectionPageLoading(pageDigitalStudies, studiesLoad).then(scheduleStudiesRowLayout);
}
function openMotion() {
isPaintingActive = false;
saveLastPage('digital');
updatePageMeta("Tyrone Moreno | Digital");
    /* Digital has its own navigation state. Gallery should remain at the
       normal grey opacity whenever Digital is the selected page. */
    btnGallery.classList.remove('active');
    if (pageMotion.classList.contains('visible')) {
        btnMotion.classList.add('active');
        if (typeof window.ensureMotionPageLoaded === 'function') window.ensureMotionPageLoaded();
        else window.__motionOpenRequested = true;
        return;
    }
    clearNavigation();
    pageMotion.classList.add('visible');

    /* Digital artwork should never be covered by a page-level loading bar.
       Clear any loader left behind by an older visit and let the first decoded
       poster row appear naturally. */
    hideSectionPageLoader(pageMotion, 0);
    pageMotion.querySelector('.section-page-loader')?.remove();
    pageMotion.classList.remove('section-is-loading');

    btnMotion.classList.add('active');
    document.body.classList.add('overlay-open');
    document.body.style.cursor = 'default';
    if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
    updateFooterIcons('other'); // No zoom/layout toggles needed for a fixed video grid

    /* Digital motion media is deliberately initialized only when this page is opened. */
    if (typeof window.ensureMotionPageLoaded === 'function') {
        window.ensureMotionPageLoaded();
    } else {
        window.__motionOpenRequested = true;
    }
}

        // Updated Handlers to change URLs without reloading
        btnGalleryLogo.addEventListener('click', (e) => { 
    e.preventDefault(); 
    window.history.pushState(null, '', '/gallery/'); 
    openWorks(); 
});
        btnPaint.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/play/'); clearNavigation(); updatePageMeta("Tyrone Moreno | Play"); });
        
        btnAbout.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/about/'); openAbout(); });
btnNotes.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/notes/'); openNotes(); });
btnDigitalStudies.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/studies/'); openDigitalStudies(); });
btnMotion.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/digital/'); openMotion(); });
        btnGallery.addEventListener('click', (e) => { e.preventDefault(); window.history.pushState(null, '', '/gallery/'); openWorks(); });
        btnGallery.addEventListener('mouseenter', () => {
            if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                window.history.replaceState(null, '', '/gallery/');
                openWorks();
            }
        });

        /* Reliable iPhone/iPad dropdown behaviour.
           A single tap on Gallery, Digital or Contact opens that page and reveals
           its submenu. Submenu links stay clickable, and tapping elsewhere
           closes the open menu. */
        const navDropdowns = Array.from(document.querySelectorAll('.nav-links .dropdown'));
        const usesTouchDropdowns = () =>
            window.matchMedia('(hover: none), (pointer: coarse)').matches ||
            navigator.maxTouchPoints > 0;

        function setNavDropdownOpen(dropdown, shouldOpen) {
            if (!dropdown) return;
            dropdown.classList.toggle('is-open', shouldOpen);
            const trigger = dropdown.querySelector(':scope > .dropbtn');
            if (trigger) trigger.setAttribute('aria-expanded', String(shouldOpen));
        }

        function closeNavDropdowns(except = null) {
            navDropdowns.forEach((dropdown) => {
                if (dropdown !== except) setNavDropdownOpen(dropdown, false);
            });
        }

        navDropdowns.forEach((dropdown) => {
            const trigger = dropdown.querySelector(':scope > .dropbtn');
            const menuLinks = dropdown.querySelectorAll('.dropdown-content a');
            if (!trigger) return;

            /* On touch devices the trigger keeps its normal page-navigation
               handler. Capture phase only reveals the submenu before that route
               handler runs, so one tap performs both actions. */
            trigger.addEventListener('click', () => {
                if (!usesTouchDropdowns()) return;
                closeNavDropdowns(dropdown);
                setNavDropdownOpen(dropdown, true);
            }, true);

            menuLinks.forEach((link) => {
                link.addEventListener('click', () => {
                    if (!usesTouchDropdowns()) return;
                    setNavDropdownOpen(dropdown, false);
                }, true);
            });
        });

        /* Close touch dropdowns as soon as the visitor begins scrolling.
           Tracking actual finger movement avoids closing them on a simple tap
           or because a newly opened page resets its own scroll position. */
        let navTouchStartX = null;
        let navTouchStartY = null;

        document.addEventListener('touchstart', (event) => {
            if (!usesTouchDropdowns() || !event.touches.length) return;
            navTouchStartX = event.touches[0].clientX;
            navTouchStartY = event.touches[0].clientY;
        }, { passive: true, capture: true });

        document.addEventListener('touchmove', (event) => {
            if (!usesTouchDropdowns() || !event.touches.length) return;
            if (navTouchStartX === null || navTouchStartY === null) return;

            const dx = event.touches[0].clientX - navTouchStartX;
            const dy = event.touches[0].clientY - navTouchStartY;
            if (Math.hypot(dx, dy) > 7) {
                closeNavDropdowns();
                navTouchStartX = event.touches[0].clientX;
                navTouchStartY = event.touches[0].clientY;
            }
        }, { passive: true, capture: true });

        document.addEventListener('touchend', () => {
            navTouchStartX = null;
            navTouchStartY = null;
        }, { passive: true, capture: true });

        /* Also cover iPad trackpads and other wheel-based scrolling while the
           device is using the touch-navigation mode. */
        document.addEventListener('wheel', () => {
            if (usesTouchDropdowns()) closeNavDropdowns();
        }, { passive: true, capture: true });

        document.addEventListener('pointerdown', (event) => {
            if (!usesTouchDropdowns()) return;
            if (event.target.closest('.nav-links .dropdown')) return;
            closeNavDropdowns();
        }, true);

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeNavDropdowns();
        });

        window.addEventListener('orientationchange', () => closeNavDropdowns());

        btnExhibitions.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.pushState(null, '', '/exhibitions/');
            clearNavigation();
            pageExhibitions.classList.add('visible');
            btnExhibitions.classList.add('active');
            btnGallery.classList.add('active');
            document.body.classList.add('overlay-open');
            document.body.style.cursor = 'default';
            if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
            updateFooterIcons('other');
        });

        btnPress.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.pushState(null, '', '/press/');
            clearNavigation();
            pagePress.classList.add('visible');
            btnPress.classList.add('active');
            btnGallery.classList.add('active');
            document.body.classList.add('overlay-open');
            document.body.style.cursor = 'default';
            if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
            updateFooterIcons('other');
        });

        btnContact.addEventListener('click', (e) => {
isPaintingActive = false;
            e.preventDefault();
            window.history.pushState(null, '', '/contact/');
            clearNavigation();
            pageContact.classList.add('visible');
            btnContact.classList.add('active');
            document.body.classList.add('overlay-open');
            document.body.style.cursor = 'default';
            if (isTouchUI) document.getElementById('ios-brush-selector').style.display = 'none';
            updateFooterIcons('other');
        });

        // --- ABOUT PAGE IMAGE SLIDER ---
        const aboutImages = [
            '/me/aboutme_001.webp',
            '/me/aboutme_002.webp',
            '/me/aboutme_003.webp',
            '/me/aboutme_004.webp'
        ];
        let currentAboutIdx = 0;
        let aboutSlideInterval = null;
        let aboutTransitionToken = 0;

        function hydrateAboutImages() {
            pageAbout.querySelectorAll('img[data-src]').forEach((image) => {
                if (image.getAttribute('src')) return;
                image.decoding = 'async';
                image.src = image.dataset.src;
            });
        }

        function updateAboutImage(newIdx) {
            if (!pageAbout.classList.contains('visible')) return;

            const img1 = document.getElementById('about-img-1');
            const img2 = document.getElementById('about-img-2');
            const activeImg = img1.classList.contains('active') ? img1 : img2;
            const nextImg = activeImg === img1 ? img2 : img1;
            const targetSrc = aboutImages[newIdx];
            const transitionToken = ++aboutTransitionToken;

            const activateImage = () => {
                if (transitionToken !== aboutTransitionToken) return;
                if (!pageAbout.classList.contains('visible')) return;
                nextImg.classList.add('active');
                activeImg.classList.remove('active');
                nextImg.onload = null;
                nextImg.onerror = null;
            };

            nextImg.onload = activateImage;
            nextImg.onerror = () => {
                nextImg.onload = null;
                nextImg.onerror = null;
            };

            if (
                nextImg.dataset.aboutIndex === String(newIdx) &&
                nextImg.complete &&
                nextImg.naturalWidth > 0
            ) {
                activateImage();
                return;
            }

            nextImg.dataset.aboutIndex = String(newIdx);
            nextImg.src = targetSrc;
        }

        function changeAboutImage(direction, restartTimer = true) {
            currentAboutIdx =
                (currentAboutIdx + direction + aboutImages.length) %
                aboutImages.length;
            updateAboutImage(currentAboutIdx);

            if (restartTimer) resetAboutSlideshow();
        }

        function nextAboutImage() {
            changeAboutImage(1, true);
        }

        function prevAboutImage() {
            changeAboutImage(-1, true);
        }

        function startAboutSlideshow() {
            stopAboutSlideshow();

            if (
                document.hidden ||
                !pageAbout.classList.contains('visible') ||
                aboutImages.length < 2
            ) {
                return;
            }

            aboutSlideInterval = window.setInterval(() => {
                changeAboutImage(1, false);
            }, 6000);
        }

        function stopAboutSlideshow() {
            if (aboutSlideInterval !== null) {
                clearInterval(aboutSlideInterval);
                aboutSlideInterval = null;
            }
        }

        function resetAboutSlideshow() {
            if (!pageAbout.classList.contains('visible')) return;
            startAboutSlideshow();
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                stopAboutSlideshow();
            } else if (pageAbout.classList.contains('visible')) {
                startAboutSlideshow();
            }
        });

       // --- LIGHTBOX ZOOM AND PAN ENGINE ---
        let zoomState = 0; 
        let currentOriginX = 50;
        let currentOriginY = 50;
        let lightboxImages = [];
        let currentLbIndex = 0;
        let currentContinuousScale = 1; // Tracks exact scale for pinch-to-zoom

        let lightboxMediaRenderToken = 0;
        let lightboxPaintedSrc = '';

        function renderLightboxMedia(src) {
            const renderToken = ++lightboxMediaRenderToken;
            const lbImg = document.getElementById('lb-img');
            const lbImgBuffer = document.getElementById('lb-img-buffer');
            const lbModel = document.getElementById('lb-model');
            const fsBtn = document.getElementById('lb-fullscreen-btn');
            const lbLoader = document.getElementById('lb-model-loader');
            const lbImgLoader = document.getElementById('lb-img-loader');

            if (src && src.toLowerCase().endsWith('.glb')) {
                lbImg.style.display = 'none';
                lbImgBuffer.style.display = 'none';
                lightboxPaintedSrc = '';
                lbImgLoader.style.display = 'none';
                lbModel.style.display = 'block';
                fsBtn.style.display = 'none';

                lbLoader.style.display = 'block';
                lbModel.style.opacity = '0';
                lbModel.removeAttribute('src');

                if (!lbModel.dataset.loadListenerAttached) {
                    lbModel.addEventListener('load', () => {
                        lbLoader.style.display = 'none';
                        lbModel.style.opacity = '1';
                    });
                    lbModel.addEventListener('error', () => {
                        lbLoader.style.display = 'none';
                        lbModel.style.opacity = '1';
                    });
                    lbModel.dataset.loadListenerAttached = 'true';
                }

                ensureModelViewerLoaded()
                    .then(() => {
                        if (renderToken !== lightboxMediaRenderToken) return;
                        requestAnimationFrame(() => {
                            if (renderToken !== lightboxMediaRenderToken) return;
                            lbModel.setAttribute('src', src);
                        });
                    })
                    .catch((error) => {
                        if (renderToken !== lightboxMediaRenderToken) return;
                        lbLoader.style.display = 'none';
                        console.error(error);
                    });
                return;
            }

            lbModel.style.display = 'none';
            lbModel.removeAttribute('src');
            lbLoader.style.display = 'none';
            lbImg.style.display = 'block';
            fsBtn.style.display = 'block';

            const currentSrc = lightboxPaintedSrc || lbImg.currentSrc || lbImg.src || '';
            const hasVisibleArtwork = Boolean(lightboxPaintedSrc) || (
                lbImg.naturalWidth > 1 && !currentSrc.startsWith('data:image/gif')
            );

            lbImgLoader.style.display = hasVisibleArtwork ? 'none' : 'block';
            lbImg.style.opacity = '1';
            lbImg.onload = null;
            lbImg.onerror = null;

            // Decode the target completely before touching the visible image.
            const preloadedImage = new Image();
            preloadedImage.decoding = 'async';

            const commitImage = () => {
                if (renderToken !== lightboxMediaRenderToken) return;

                // The buffer already holds the current decoded artwork. Showing it
                // synchronously covers the main image while its source is replaced.
                // We then remove it without a fade only after the new frame has
                // decoded and survived two paint cycles, avoiding black or blue GPU
                // compositing flashes when rapidly switching front/back images.
                if (hasVisibleArtwork) {
                    lbImgBuffer.src = currentSrc;
                    lbImgBuffer.style.display = 'block';
                } else {
                    lbImgBuffer.style.display = 'none';
                }

                lbImg.src = src;
                lbImg.style.opacity = '1';
                lbImgLoader.style.display = 'none';

                const revealReplacement = () => {
                    if (renderToken !== lightboxMediaRenderToken) return;
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (renderToken !== lightboxMediaRenderToken) return;
                            lbImgBuffer.style.display = 'none';
                            lightboxPaintedSrc = src;
                            // Keep the newly decoded frame warm for the next swap.
                            lbImgBuffer.src = src;
                        });
                    });
                };

                if (typeof lbImg.decode === 'function') {
                    lbImg.decode().catch(() => {}).finally(revealReplacement);
                } else if (lbImg.complete && lbImg.naturalWidth > 1) {
                    revealReplacement();
                } else {
                    lbImg.onload = revealReplacement;
                    lbImg.onerror = () => {
                        if (renderToken !== lightboxMediaRenderToken) return;
                        // Keep the previous frame visible if the replacement fails.
                        lbImgBuffer.style.display = hasVisibleArtwork ? 'block' : 'none';
                    };
                }
            };

            preloadedImage.onload = () => {
                if (typeof preloadedImage.decode === 'function') {
                    preloadedImage.decode().catch(() => {}).finally(commitImage);
                } else {
                    commitImage();
                }
            };

            preloadedImage.onerror = () => {
                if (renderToken !== lightboxMediaRenderToken) return;
                lbImgLoader.style.display = 'none';
            };

            preloadedImage.src = src;
        }

        function toggleFullscreen(e) {
            if (e) e.stopPropagation();
            const lb = document.getElementById('lightbox');
            const lbImg = document.getElementById('lb-img');
            
            lb.classList.toggle('is-fullscreen');
            
            // Reset zoom styles when entering/exiting fullscreen
            if (lb.classList.contains('is-fullscreen')) {
                lbImg.style.transform = 'scale(1)';
                lbImg.style.cursor = 'zoom-out';
            } else {
                lbImg.style.cursor = 'zoom-in';
            }
        }

        function openLightbox(src, title, year, specs, desc, altSrc = null, sold = false) {
            if (window.isDraggingGalleryItem) return;
            const worksPage = document.getElementById('page-works');
            if (!worksPage.classList.contains('visible')) {
                return; // Exit the function if we aren't on the Gallery/Works page
            }
            const lbImg = document.getElementById('lb-img');
            const prevArrow = document.getElementById('lb-prev');
            const nextArrow = document.getElementById('lb-next');

             if (Array.isArray(altSrc) && altSrc.length) {
                lightboxImages = [src, ...altSrc].filter(Boolean);
                prevArrow.style.display = lightboxImages.length > 1 ? 'block' : 'none';
                nextArrow.style.display = lightboxImages.length > 1 ? 'block' : 'none';
            } else if (altSrc) {
                lightboxImages = [src, altSrc];
                prevArrow.style.display = 'block';
                nextArrow.style.display = 'block';
            } else {
                lightboxImages = [src];
                prevArrow.style.display = 'none';
                nextArrow.style.display = 'none';
            }
                    
            currentLbIndex = 0;
            renderLightboxMedia(lightboxImages[currentLbIndex]);
            
            zoomState = 0;
            currentContinuousScale = 1;
            currentOriginX = 50;
            currentOriginY = 50;
            lbImg.style.cursor = 'zoom-in';
            lbImg.style.transform = 'scale(1)';
            lbImg.style.transformOrigin = 'center center';
            document.getElementById('lb-title').innerText = title;
            document.getElementById('lb-year').innerText = year;
            document.getElementById('lb-specs').innerText = specs;
            lbImg.alt = `${title}${year ? `, ${year}` : ''}, artwork by Tyrone Moreno`;

            const galleryItem = pendingGallerySeoItem ||
                Array.from(
                    document.querySelectorAll(
                        '#page-works .work-item[data-slug]'
                    )
                ).find((item) => {
                    const routeSlug = window.location.pathname
                        .match(/\/gallery\/([^/]+)/)?.[1];
                    return routeSlug && item.dataset.slug === routeSlug;
                });

            const gallerySlug = galleryItem?.dataset.slug || '';
            const galleryPoster = galleryItem?.querySelector(
                '.work-image img'
            );
            const isModelSource = /\.(?:glb|gltf)(?:$|\?)/i.test(src);
            const galleryImage = isModelSource
                ? (
                    galleryPoster?.currentSrc ||
                    galleryPoster?.src ||
                    DEFAULT_SITE_IMAGE
                )
                : src;

            setGalleryArtworkMeta({
                slug: gallerySlug,
                title,
                year,
                specs,
                description: desc,
                imageUrl: galleryImage,
                sold
            });

            let displayDesc = desc;
            if (sold) {
                // Piece is sold - drop the acquisition sentence and note it as sold instead
                displayDesc = displayDesc.replace(/<br><br>For acquisition enquiries, please contact tyronemoreno\.studio@gmail\.com/i, '');
                displayDesc += (displayDesc ? '<br><br>' : '') + '<span class="lb-sold-tag">Sold</span>';
            }
            document.getElementById('lb-desc').innerHTML = linkifyEmails(displayDesc, `${title} (${year})`);
            document.getElementById('lightbox').classList.add('active');
        }

        // Turns any email address inside a lightbox description into a clickable mailto: link
        // that pre-fills the subject line with the artwork title and year.
        function linkifyEmails(text, subject = '') {
            const encodedSubject = encodeURIComponent(subject);
            return text.replace(
                /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
                `<a href="mailto:$1?subject=${encodedSubject}" class="lb-email-link">$1</a>`
            );
        }

        function nextLbImage(e) {
            if(e) e.stopPropagation(); // Prevents the click from accidentally triggering a zoom
            currentLbIndex = (currentLbIndex + 1) % lightboxImages.length;
            renderLightboxMedia(lightboxImages[currentLbIndex]);
            resetZoom();
        }

        function prevLbImage(e) {
            if(e) e.stopPropagation();
            currentLbIndex = (currentLbIndex - 1 + lightboxImages.length) % lightboxImages.length;
           renderLightboxMedia(lightboxImages[currentLbIndex]);
            resetZoom();
        }

    function resetZoom() {
            zoomState = 0;
            currentContinuousScale = 1;
            const imgEl = document.getElementById('lb-img');
            imgEl.style.cursor = 'zoom-in';
            // Added translateZ(0) for better GPU handling
            imgEl.style.transform = 'scale(1)'; 
            setTimeout(() => {
                if (zoomState === 0) {
                    imgEl.style.transformOrigin = 'center center';
                    currentOriginX = 50;
                    currentOriginY = 50;
                }
            }, 250);
        }

        function closeLightbox() {
            const lb = document.getElementById('lightbox');
            const lbModel = document.getElementById('lb-model'); 
            
            lb.classList.remove('active', 'is-fullscreen'); 
            
            if (lbModel) {
                lbModel.style.display = 'none';
                lbModel.removeAttribute('src');
            }
            
            // If we're still sitting on a specific artwork URL (e.g. /gallery/splinter/),
            // revert to the plain gallery URL now that the lightbox is closing.
            if (window.location.pathname.startsWith('/gallery/') && window.location.pathname !== '/gallery/') {
                window.history.pushState(null, '', '/gallery/');
            }

            pendingGallerySeoItem = null;
            if (pageWorks.classList.contains('visible')) {
                setGalleryMeta();
            }
            
            resetZoom();
            
            setTimeout(() => {
                if (!document.getElementById('lightbox').classList.contains('active')) {
                    document.getElementById('lb-img').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
                }
            }, 300);
        }

const lbImg = document.getElementById('lb-img');
        lbImg.addEventListener('click', function(e) {
            const lb = document.getElementById('lightbox');
            if (lb.classList.contains('is-fullscreen')) {
                toggleFullscreen(e); // Exit fullscreen if active
                return;
            }
            const previousZoomState = zoomState;
            zoomState = (zoomState + 1) % 3;
            if (zoomState > 0) {
                // FIXED: Lowered maximum scale values to prevent iOS RAM crashes.
                // 3x is still plenty large for mobile screens.
                const scale1 = window.innerWidth <= 768 ? 2 : 2; 
                const scale2 = window.innerWidth <= 768 ? 3 : 3.2; 
                
                const activeScale = zoomState === 1 ? scale1 : scale2;
                currentContinuousScale = activeScale; // Sync pinch scale
                
                this.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'; // Restore smooth transitions
                this.style.cursor = zoomState === 1 ? 'zoom-in' : 'zoom-out'; 
                
                if (previousZoomState === 0) {
                    const parentRect = this.parentElement.getBoundingClientRect();
                    const x = ((e.clientX - parentRect.left) / parentRect.width) * 100;
                    const y = ((e.clientY - parentRect.top) / parentRect.height) * 100;
                    currentOriginX = Math.max(0, Math.min(100, x));
                    currentOriginY = Math.max(0, Math.min(100, y));
                }
                this.style.transformOrigin = `${currentOriginX}% ${currentOriginY}%`;
                this.style.transform = `scale(${activeScale})`; 
            } else {
                resetZoom();
            }
        });

        // Desktop Mouse Tracking
        let isTouching = false;
        document.addEventListener('mousemove', function(e) {
            if (zoomState === 0 || isTouching) return;
            const imgEl = document.getElementById('lb-img');
            const rect = imgEl.getBoundingClientRect();
            const buffer = 30; 
            if (e.clientX < rect.left - buffer || e.clientX > rect.right + buffer || e.clientY < rect.top - buffer || e.clientY > rect.bottom + buffer) {
                resetZoom();
                return;
            }
            const parentRect = imgEl.parentElement.getBoundingClientRect();
            const x = ((e.clientX - parentRect.left) / parentRect.width) * 100;
            const y = ((e.clientY - parentRect.top) / parentRect.height) * 100;
            currentOriginX = Math.max(0, Math.min(100, x));
            currentOriginY = Math.max(0, Math.min(100, y));
            imgEl.style.transformOrigin = `${currentOriginX}% ${currentOriginY}%`;
        });

        // Mobile Touch Tracking (Pan & Pinch)
        let touchStartX = 0;
        let touchStartY = 0;
        let initialPinchDistance = null;
        let basePinchScale = 1;

        document.addEventListener('touchstart', function(e) {
            isTouching = true;
            if (e.target.id === 'lb-img') {
                if (e.touches.length === 2) {
                    // Start Pinch
                    initialPinchDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    basePinchScale = currentContinuousScale;
                    e.target.style.transition = 'none'; // Instant track to fingers
                } else if (e.touches.length === 1 && currentContinuousScale > 1) {
                    // Start Pan
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    e.target.style.transition = 'none'; // Instant track to finger
                }
            }
        }, { passive: false });

        document.addEventListener('touchend', function(e) {
            setTimeout(() => { isTouching = false; }, 100);
            
            const imgEl = document.getElementById('lb-img');
            if (imgEl) imgEl.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
            
            if (e.touches.length < 2) {
                initialPinchDistance = null;
            }
            
            // Snap back to 1x if they pinch out too far
            if (e.touches.length === 0 && currentContinuousScale < 1) {
                resetZoom();
            }
        });

        document.addEventListener('touchmove', function(e) {
            if (e.target.closest('.lightbox-left')) {
                const imgEl = document.getElementById('lb-img');
                
      // --- PINCH-TO-ZOOM ---
if (e.touches.length === 2 && initialPinchDistance) {
    e.preventDefault();
    const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
    );
    
    const scaleMultiplier = currentDistance / initialPinchDistance;
    let newScale = basePinchScale * scaleMultiplier;
    
    const maxPinchScale = isIOS ? 2.2 : 4.5; // Strictly capped for iOS
    newScale = Math.max(0.5, Math.min(newScale, maxPinchScale)); 

    // ONLY update and render if the scale actually changed significantly
    if (Math.abs(newScale - currentContinuousScale) > 0.01) {
        currentContinuousScale = newScale;
        imgEl.style.transform = `scale(${currentContinuousScale})`;
    }
    return;
}

                // --- PANNING ---
                if (e.touches.length === 1 && currentContinuousScale > 1) {
                    e.preventDefault(); // Stop native scrolling
                    const clientX = e.touches[0].clientX;
                    const clientY = e.touches[0].clientY;
                    
                    const dx = clientX - touchStartX;
                    const dy = clientY - touchStartY;
                    const parentRect = imgEl.parentElement.getBoundingClientRect();
                    
                    currentOriginX -= (dx / parentRect.width) * 100 / currentContinuousScale;
                    currentOriginY -= (dy / parentRect.height) * 100 / currentContinuousScale;
                    currentOriginX = Math.max(0, Math.min(100, currentOriginX));
                    currentOriginY = Math.max(0, Math.min(100, currentOriginY));
                    
                    imgEl.style.transformOrigin = `${currentOriginX}% ${currentOriginY}%`;
                    touchStartX = clientX;
                    touchStartY = clientY;
                }
            }
        }, { passive: false });
        // --- BRUSH SCALE ---
        let currentScale = 1.0;
        const brushSliderMin = 0.12, brushSliderMax = 1.9;
        const brushThumbMin = 8, brushThumbMax = 34; // px - the drag handle's smallest/largest visual size
        function setSizeFromSlider(value) {
            currentScale = parseFloat(value);
            const slider = document.getElementById('brush-slider');
            const t = (currentScale - brushSliderMin) / (brushSliderMax - brushSliderMin);
            const thumbSize = brushThumbMin + t * (brushThumbMax - brushThumbMin);
            slider.style.setProperty('--thumb-size', thumbSize + 'px');
        }
        // Set the initial handle size to match the default value on load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setSizeFromSlider(document.getElementById('brush-slider').value));
        } else {
            setSizeFromSlider(document.getElementById('brush-slider').value);
        }

        // --- PAINT ENGINE ---
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        let lastX = 0, lastY = 0, lastTime = Date.now();
        const isMobile = window.innerWidth < 768;
        const brushBaseScale = isMobile ? 18 : 45;

    const palettes = [
            // --- 01. THE ORIGINAL 15 ---
            ['#0a0a0a', '#ff3e00', '#0059ff', '#ffcc00', '#b5179e', '#ffffff', '#8a00d4'],
            ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
            ['#588157', '#a3b18a', '#dad7cd', '#3a5a40', '#344e41'],
            ['#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0'],
            ['#03071e', '#d00000', '#ffba08'],
            ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
            ['#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9'],
            ['#001219', '#005f73', '#94d2bd', '#ee9b00', '#ae2012', '#9b2226'],
            ['#1b1b1b', '#3d3d3d', '#ffffff'],
            ['#606c38', '#283618', '#fefae0', '#bc6c25'],
            ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff'],
            ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff'],
            ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'],
            ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
            ['#355070', '#6d597a', '#b56576', '#e56b6f', '#eaac8b'],

            // --- 02. "BASICALLY THE SAME" (Monochromatic & Very Subtle Shifts) ---
            // Grays & Blacks
            ['#050505', '#0a0a0a', '#0f0f0f', '#141414', '#1a1a1a'],
            ['#111111', '#181818', '#1c1c1c', '#222222', '#2a2a2a'],
            ['#333333', '#383838', '#3d3d3d', '#444444', '#4a4a4a'],
            ['#555555', '#5b5b5b', '#626262', '#686868', '#6e6e6e'],
            ['#888888', '#8e8e8e', '#959595', '#9b9b9b', '#a1a1a1'],
            ['#bbbbbb', '#c1c1c1', '#c8c8c8', '#cecece', '#d5d5d5'],
            ['#e0e0e0', '#e5e5e5', '#ebebeb', '#f0f0f0', '#f5f5f5'],
            ['#fafafa', '#fcfcfc', '#fdfdfd', '#fefefe', '#ffffff'],
            // Warm Grays
            ['#2b2a29', '#302e2d', '#363331', '#3b3835', '#413d39'],
            ['#8c8783', '#948f8b', '#9b9792', '#a39f9a', '#aba6a2'],
            ['#e3e1df', '#e8e6e5', '#ecebea', '#f1f0ef', '#f6f5f4'],
            // Cool Grays
            ['#1c1f22', '#212428', '#25292d', '#2a2f33', '#2f3438'],
            ['#848b91', '#8d949b', '#959da4', '#9ea6ae', '#a7afb7'],
            ['#dbe0e4', '#e1e5e9', '#e6eaed', '#eceef1', '#f2f4f6'],
            // Reds & Pinks
            ['#2a0000', '#330000', '#3d0000', '#460000', '#500000'],
            ['#7a0000', '#8c0000', '#9e0000', '#b00000', '#c20000'],
            ['#e60000', '#f00000', '#fa0000', '#ff0a0a', '#ff1414'],
            ['#ff4d4d', '#ff5a5a', '#ff6666', '#ff7373', '#ff8080'],
            ['#ffb3b3', '#ffbfbf', '#ffcccc', '#ffd9d9', '#ffe6e6'],
            // Oranges & Browns
            ['#331a00', '#3d1f00', '#472400', '#522900', '#5c2e00'],
            ['#a35200', '#b85c00', '#cc6600', '#e07000', '#f57a00'],
            ['#ff850a', '#ff8c1a', '#ff942b', '#ff9c3d', '#ffa34d'],
            ['#ffc285', '#ffc994', '#ffd1a3', '#ffd8b3', '#ffe0c2'],
            // Yellows & Creams
            ['#333300', '#404000', '#4d4d00', '#595900', '#666600'],
            ['#b3b300', '#cccc00', '#e6e600', '#ffff00', '#ffff1a'],
            ['#ffff99', '#ffffb3', '#ffffcc', '#ffffe6', '#ffffff'],
            ['#fcfaf2', '#fdfbf4', '#fdfcf6', '#fefdf8', '#fffefc'],
            // Greens
            ['#001a00', '#002600', '#003300', '#004000', '#004d00'],
            ['#008000', '#009900', '#00b300', '#00cc00', '#00e600'],
            ['#4dff4d', '#66ff66', '#80ff80', '#99ff99', '#b3ffb3'],
            ['#e6ffe6', '#ebffeb', '#f0fff0', '#f5fff5', '#fafffa'],
            ['#1c2e1f', '#1f3322', '#223826', '#263e29', '#29432c'],
            ['#6d9475', '#769c7e', '#80a487', '#89ac91', '#93b49a'],
            // Blues
            ['#000a1a', '#000f26', '#001433', '#001a40', '#001f4d'],
            ['#003380', '#003db3', '#0047e6', '#0052cc', '#005cff'],
            ['#4d94ff', '#66a3ff', '#80b3ff', '#99c2ff', '#b3d1ff'],
            ['#e6f0ff', '#ebf3ff', '#f0f5ff', '#f5f8ff', '#fafaff'],
            ['#1a2a3a', '#1d2f42', '#20354a', '#243a52', '#273f5a'],
            // Purples
            ['#1a001a', '#260026', '#330033', '#400040', '#4d004d'],
            ['#800080', '#990099', '#b300b3', '#cc00cc', '#e600e6'],
            ['#ff4dff', '#ff66ff', '#ff80ff', '#ff99ff', '#ffb3ff'],
            ['#f5e6f5', '#f7ebf7', '#f9f0f9', '#fbf5fb', '#fdfafd'],

            // --- 03. WILD, CRAZY & UNHINGED (Maximalist, High Contrast) ---
            ['#ff00ff', '#00ff00', '#0000ff', '#ffff00', '#ff0000', '#00ffff'],
            ['#000000', '#ffffff', '#ff0055', '#55ff00', '#0055ff'],
            ['#fa00ff', '#00fa00', '#0000fa', '#fafa00', '#00fafa', '#fa0000'],
            ['#ff0000', '#00ff00', '#0000ff', '#ffffff', '#000000'],
            ['#f72585', '#b5179e', '#7209b7', '#480ca8', '#3f37c9', '#4cc9f0'],
            ['#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'],
            ['#00f5d4', '#00bbf9', '#fee440', '#f15bb5', '#9b5de5'],
            ['#ccff00', '#ff00cc', '#00ccff', '#000000', '#ffffff'],
            ['#1be7ff', '#6eeb83', '#e4ff1a', '#ffb800', '#ff5714'],
            ['#ff0054', '#ff5400', '#ffbd00', '#9e0059', '#390099'],
            ['#f20089', '#e500a4', '#db00b6', '#d100d1', '#bc00dd', '#2d00f7'],
            ['#00ffff', '#ff00ff', '#ffff00', '#ff0000', '#00ff00', '#0000ff'],
            ['#ff00a0', '#00ff55', '#5500ff', '#ff5500', '#00a0ff', '#a0ff00'],
            ['#ff3366', '#20b2aa', '#ffcc00', '#4b0082', '#ff4500'],
            ['#ff1493', '#00ffff', '#32cd32', '#ffff00', '#ff4500', '#9400d3'],
            ['#1100ff', '#ff0011', '#00ff11', '#eeff00', '#00ffee', '#ff00ee'],
            ['#0f0f0f', '#f0f0f0', '#ff003c', '#00eaff', '#ccff00'],
            ['#ea00d9', '#0abdc6', '#133e7c', '#091833', '#ea00d9', '#f0f0f0'],
            ['#ff0000', '#ffffff', '#000000'], // The White Stripes
            ['#ffff00', '#ff00ff', '#00ffff', '#000000'], // Pure CMYK
            ['#ff3300', '#00ff33', '#3300ff', '#ffff33', '#ff33ff', '#33ffff'],
            ['#f50057', '#00e5ff', '#ffff00', '#000000', '#111111'],
            ['#ff0044', '#00ffcc', '#cc00ff', '#44ff00', '#ffcc00'],
            ['#1a1a1a', '#e6e6e6', '#ff0055', '#0055ff', '#55ff00'],
            ['#ff0033', '#00ff33', '#3300ff', '#ffcc00', '#00ccff', '#cc00ff'],
            ['#ff5555', '#55ff55', '#5555ff', '#ffff55', '#ff55ff', '#55ffff'],
            ['#ff00aa', '#00aaff', '#aaff00', '#ffaa00', '#00ffaa', '#aa00ff'],
            ['#ff1111', '#11ff11', '#1111ff', '#ffff11', '#ff11ff', '#11ffff'],
            ['#d90429', '#ef233c', '#edf2f4', '#8d99ae', '#2b2d42', '#00ffcc'],
            ['#ff0000', '#0000ff', '#ffff00', '#00ff00', '#ff00ff', '#00ffff', '#ffffff', '#000000'],
            ['#ff007f', '#7fff00', '#007fff', '#ff7f00', '#00ff7f', '#7f00ff'],
            ['#f000ff', '#00f0ff', '#fff000', '#000000', '#ffffff'],
            ['#ff2a2a', '#2aff2a', '#2a2aff', '#ffff2a', '#ff2aff', '#2affff'],
            ['#ff0055', '#00ffaa', '#5500ff', '#aaff00', '#0055ff', '#ffaa00'],
            ['#ff0033', '#00ffcc', '#cc00ff', '#33ff00', '#ffcc00', '#0033ff'],
            ['#ff0000', '#000000', '#ffff00'], // Warning tape
            ['#00ff00', '#000000', '#ff00ff'], // Hacker matrix pop
            ['#00ffff', '#000000', '#ff0000'], // 3D glasses
            ['#ffff00', '#000000', '#0000ff'],
            ['#ff00ff', '#ffffff', '#00ff00'],

            // --- 04. EARTH, NATURE, & ORGANIC (Mud, Grass, Dirt, Leaves) ---
            ['#3b2f2f', '#5e483b', '#82654e', '#a68a64', '#c9af82'],
            ['#2c3e2d', '#4a6b4b', '#6b8e66', '#90b084', '#b6cfab'],
            ['#4a3b2c', '#6e5c47', '#928066', '#b5a588', '#d6caad'],
            ['#2e4045', '#4d6970', '#709099', '#96b6c0', '#bcdde6'],
            ['#52362a', '#7a5546', '#a17865', '#c79c88', '#e8c1ad'],
            ['#364531', '#576b50', '#7d9273', '#a4ba99', '#cce1c1'],
            ['#452e2e', '#694a4a', '#8e6969', '#b38b8b', '#d6b0b0'],
            ['#2b3a40', '#4a6068', '#6d8892', '#93b2bd', '#bbdce6'],
            ['#423425', '#66533f', '#8c765c', '#b19a7b', '#d4bf9d'],
            ['#2f3e2b', '#4e6449', '#718c6a', '#97b48e', '#bedeb4'],
            ['#bc6c25', '#dda15e', '#fefae0', '#283618', '#606c38'],
            ['#cb997e', '#ddbea9', '#ffe8d6', '#b7b7a4', '#a5a58d', '#6b705c'],
            ['#582f0e', '#7f4f24', '#936639', '#a68a64', '#b6ad90', '#c2c5aa'],
            ['#344e41', '#3a5a40', '#588157', '#a3b18a', '#dad7cd'],
            ['#003049', '#d62828', '#f77f00', '#fcbf49', '#eae2b7'], // Sun/desert
            ['#606c38', '#283618', '#fefae0', '#dda15e', '#bc6c25'],
            ['#2d6a4f', '#40916c', '#52b788', '#74c69d', '#95d5b2', '#b7e4c7'],
            ['#2f3e46', '#354f52', '#52796f', '#84a98c', '#cad2c5'],
            ['#805b10', '#a37c27', '#c49f42', '#e3c260', '#ffe680'],
            ['#5e4c3a', '#85715a', '#ad977d', '#d4bfa3', '#fbe8cc'],
            ['#1c3b2b', '#315c45', '#4a8062', '#65a481', '#84c9a2'],
            ['#4a3320', '#6e5138', '#947253', '#ba9572', '#e0b993'],
            ['#243640', '#3e5866', '#5c7b8c', '#7da2b3', '#a1cadd'],
            ['#45211b', '#6b3830', '#945347', '#be7163', '#e89282'],
            ['#2e3d23', '#4d613e', '#6f875b', '#93b07b', '#b9da9e'],
            ['#283618', '#606c38', '#fefae0', '#dda15e', '#bc6c25'],
            ['#3d405b', '#81b29a', '#f2cc8f', '#e07a5f', '#f4f1de'],
            ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
            ['#6b9080', '#a4c3b2', '#cce3de', '#eaf4f4', '#f6fff8'],
            ['#d9ae94', '#f1dca7', '#ffcb69', '#d08c60', '#997b66'],

            // --- 05. PASTELS, DREAMY, & SOFT (Liminal, Clouds, Sweets) ---
            ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff'],
            ['#fbf8cc', '#fde4cf', '#ffcfd2', '#f1c0e8', '#cfbaf0', '#a3c4f3', '#90dbf4', '#8eecf5', '#98f5e1', '#b9fbc0'],
            ['#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff', '#fffffc'],
            ['#ffb5a7', '#fcd5ce', '#f8edeb', '#f9dcc4', '#fec89a'],
            ['#d8e2dc', '#ffe5d9', '#ffcad4', '#f4acb7', '#9d8189'],
            ['#e0b1cb', '#be95c4', '#9f86c0', '#5e548e', '#231942'],
            ['#f08080', '#f4978e', '#f8ad9d', '#fbc4ab', '#ffdab9'],
            ['#a8dadc', '#f1faee', '#e63946', '#457b9d', '#1d3557'], // Faded Americana
            ['#edafb8', '#f7e1d7', '#b5e2fa', '#0fa3b1', '#0b4f6c'],
            ['#f4f1de', '#e07a5f', '#3d405b', '#81b29a', '#f2cc8f'],
            ['#fff1e6', '#fde2e4', '#fad2e1', '#e2ece9', '#bee1e6', '#f0efeb'],
            ['#cddafd', '#dfe7fd', '#f0e6ef', '#f8ad9d', '#fbc4ab'],
            ['#ffc09f', '#ffee93', '#fcf5c7', '#a0ced9', '#adf7b6'],
            ['#ffb4a2', '#e5989b', '#b5838d', '#6d6875', '#ffcdb2'],
            ['#e9edc9', '#fefae0', '#faedcb', '#c9e4de', '#c6def1', '#dbcdf0', '#f2c6de', '#f9c6c9'],
            ['#e2e2df', '#d2d2cf', '#e2cfc4', '#f7d9c4', '#faedcb', '#c9e4de', '#c6def1'],
            ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'],
            ['#fec5bb', '#fcd5ce', '#fae1dd', '#f8edeb', '#e8e8e4', '#d8e2dc', '#ece4db', '#ffe5d9'],
            ['#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff', '#cdb4db'],
            ['#d0f4de', '#a9def9', '#e4c1f9', '#fcf6bd', '#ff99c8'],

            // --- 06. MOODY, DARK & CYBERPUNK (Neon Noir, Shadows) ---
            ['#0b090a', '#161a1d', '#e5383b', '#ba1826', '#a4161a', '#660708'],
            ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff'],
            ['#10002b', '#240046', '#3c096c', '#5a189a', '#7b2cbf'],
            ['#03045e', '#023e8a', '#0077b6', '#0096c7', '#00b4d8'],
            ['#011627', '#fdfffc', '#2ec4b6', '#e71d36', '#ff9f1c'],
            ['#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4'],
            ['#0d1b2a', '#1b263b', '#415a77', '#778da9', '#e0e1dd'],
            ['#143601', '#245501', '#538d22', '#73a942', '#aad576'],
            ['#2b2d42', '#8d99ae', '#edf2f4', '#ef233c', '#d90429'],
            ['#001219', '#005f73', '#0a9396', '#94d2bd', '#e9d8a6'],
            ['#111111', '#222222', '#ed1c24', '#fcfcfc', '#999999'],
            ['#0f1108', '#2d3319', '#4b552a', '#69773b', '#87994c'],
            ['#170c1a', '#2d1832', '#44244b', '#5a3064', '#713c7d'],
            ['#0d1317', '#1a262e', '#263945', '#334c5c', '#405f73'],
            ['#1a0f0d', '#331e1a', '#4c2d26', '#663c33', '#804b40'],
            ['#13170d', '#262e1a', '#394526', '#4c5c33', '#5f7340'],
            ['#0a0f14', '#141e28', '#1e2d3c', '#283c50', '#324b64'],
            ['#180812', '#301024', '#481836', '#602048', '#78285a'],
            ['#111111', '#1f1f1f', '#2d2d2d', '#bb86fc', '#3700b3'], // Dark UI
            ['#121212', '#212121', '#323232', '#03dac6', '#cf6679'], // Material Dark

            // --- 07. MISCELLANEOUS (Vaporwave, Arcade, Pop) ---
            ['#ff007f', '#00e5ff', '#ffff00', '#000000', '#ffffff'],
            ['#ff71ce', '#01cdfe', '#05ffa1', '#b967ff', '#fffb96'], // Vaporwave classic
            ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'],
            ['#00b4d8', '#0077b6', '#03045e', '#ffb703', '#fb8500'],
            ['#e63946', '#f1faee', '#a8dadc', '#457b9d', '#1d3557'],
            ['#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51'],
            ['#8ecae6', '#219ebc', '#023047', '#ffb703', '#fb8500'],
            ['#000000', '#14213d', '#fca311', '#e5e5e5', '#ffffff'],
            ['#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9'],
            ['#f72585', '#7209b7', '#3a0ca3', '#4361ee', '#4cc9f0'],
            ['#3d5a80', '#98c1d9', '#e0fbfc', '#ee6c4d', '#293241'],
            ['#118ab2', '#06d6a0', '#ffd166', '#ef476f', '#073b4c'],
            ['#0081a7', '#00afb9', '#fdfcdc', '#fed9b7', '#f07167'],
            ['#ef476f', '#ffd166', '#06d6a0', '#118ab2', '#073b4c'],
            ['#cdb4db', '#ffc8dd', '#ffafcc', '#bde0fe', '#a2d2ff'],
            ['#ffcdb2', '#ffb4a2', '#e5989b', '#b5838d', '#6d6875'],
            ['#588157', '#a3b18a', '#dad7cd', '#3a5a40', '#344e41'],
            ['#cb997e', '#ddbea9', '#ffe8d6', '#b7b7a4', '#a5a58d', '#6b705c'],
            ['#f94144', '#f3722c', '#f8961e', '#f9844a', '#f9c74f', '#90be6d', '#43aa8b', '#4d908e', '#577590', '#277da1'],
            ['#d9ed92', '#b5e48c', '#99d98c', '#76c893', '#52b69a', '#34a0a4', '#168aad', '#1a759f', '#1e6091', '#184e77'],

            // --- 08. DUOTONES & TRIADIC (Strong Minimal Statements) ---
            ['#ff0000', '#0000ff'],
            ['#ffcc00', '#6600ff'],
            ['#00ffcc', '#ff0033'],
            ['#ffffff', '#000000'], // Pure B&W
            ['#111111', '#eeeeee'], // Off B&W
            ['#ff00ff', '#00ff00'],
            ['#00ffff', '#ff0000'],
            ['#ffff00', '#0000ff'],
            ['#1a1a1a', '#ff4d4d', '#ffffff'],
            ['#050505', '#00ffff', '#ff00ff'],
            ['#222222', '#ffcc00', '#ffffff'],
            ['#000000', '#00ff00', '#111111'],
            ['#111111', '#ff0000', '#000000'],
            ['#002244', '#ff8800', '#ffffff'],
            ['#440022', '#00ff88', '#ffffff'],
            ['#004422', '#ff0088', '#ffffff'],
            ['#220044', '#88ff00', '#ffffff'],
            ['#1a1a1a', '#e6e6e6', '#ff0000'],
            ['#000000', '#ffffff', '#0000ff'],
            ['#000000', '#ffffff', '#ffff00']
        ];

        function hexToRgb(hex) {
            let r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
            return [r, g, b];
        }

        let activePalette = palettes[Math.floor(Math.random() * palettes.length)].map(hexToRgb);
        let bristles = [];

        function shufflePalette() {
            activePalette = palettes[Math.floor(Math.random() * palettes.length)].map(hexToRgb);
            dipBrush();
            
            const btn = document.getElementById('btn-palette');
            if (btn) {
                btn.style.transform = 'scale(0.8)';
                setTimeout(() => btn.style.transform = 'scale(1)', 150);
            }
        }

        function dipBrush() {
            bristles = [];
            const count = isMobile ? 45 : 95;
            for(let i=0; i<count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.pow(Math.random(), 1.7);
                const color = activePalette[Math.floor(Math.random() * activePalette.length)];
                bristles.push({
                    ox: Math.cos(angle) * dist, oy: Math.sin(angle) * dist,
                    x: 0, y: 0, vx: 0, vy: 0,
                    color: [...color], res: [...color],
                    thickness: Math.random() * 2.5 + 0.5,
                    phase: Math.random() * 1000,
                    drift: 0.05 + Math.random() * 0.12,
                    mass: 0.1 + Math.random() * 0.4,
                    friction: 0.5 + Math.random() * 0.4,
                    lastBX: null, lastBY: null
                });
            }
        }

        function resize() {
            canvas.width = window.innerWidth; canvas.height = window.innerHeight;
            ctx.fillStyle = currentCanvasBg; 
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        window.addEventListener('resize', resize);
        resize(); dipBrush();

    function draw(x, y, forceDip = false) {
    if(
        pageAbout.classList.contains('visible') || 
        pageWorks.classList.contains('visible') || 
        pageNotes.classList.contains('visible') ||
        pageDigitalStudies.classList.contains('visible') ||
        pageMotion.classList.contains('visible') || // Added Motion
        pageExhibitions.classList.contains('visible') ||
        pagePress.classList.contains('visible') ||
        pageContact.classList.contains('visible') || 
        pageStore.classList.contains('visible') ||     // Added Store
        document.getElementById('lightbox').classList.contains('active')
    ) return;

            const now = Date.now(), delta = now - lastTime;
            if (delta > 200 || forceDip) { dipBrush(); lastX = x; lastY = y; }

            const dx = x - lastX, dy = y - lastY;
            const dist = Math.hypot(dx, dy);
            const velocity = Math.min(dist / (delta || 1), 25);
            
            if (dist > 1.5) {
                ctx.save();
                ctx.globalAlpha = isIOS ? 0.12 : 0.25;
                const baseSize = brushBaseScale * (1.2 + velocity * 0.1);
                const rw = baseSize * (0.6 + Math.random() * 1.2);
                const rh = baseSize * (0.6 + Math.random() * 1.2);
                const jx = (Math.random() - 0.5) * 15;
                const jy = (Math.random() - 0.5) * 15;
                ctx.beginPath();
                ctx.arc(x, y, baseSize, 0, Math.PI * 2);
                ctx.clip();
                ctx.translate(x, y);
                ctx.rotate(velocity * 0.02 * (Math.random() - 0.5));
                ctx.drawImage(canvas, -rw/2 + jx, -rh/2 + jy, rw, rh, -rw/2 + (dx * 0.25), -rh/2 + (dy * 0.25), rw, rh);
                ctx.restore();
            }

            const steps = Math.max(1, Math.floor(dist / 1.1));
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const cx = lastX + dx * t;
                const cy = lastY + dy * t;
                bristles.forEach(b => {
                    b.phase += b.drift;
                    const pulse = Math.abs(Math.sin(b.phase * 0.5));
                    
                    const currentThick = Math.min(120, (b.thickness * currentScale) * (0.4 + pulse * 2.2 + Math.pow(Math.random(), 2) * 1.8) * (1 + velocity * 0.2));
                    
                    if (s % 4 === 0 && Math.random() > 0.55) {
                        const sx = Math.floor(cx + b.x), sy = Math.floor(cy + b.y);
                        if (sx > 0 && sx < canvas.width && sy > 0 && sy < canvas.height) {
                            const p = ctx.getImageData(sx, sy, 1, 1).data;
                            if (p[3] > 50 && (p[0] < 252 || p[1] < 252 || p[2] < 252)) {
                                const pickRate = 0.18;
                                for(let j=0; j<3; j++) b.res[j] = b.res[j] * (1 - pickRate) + p[j] * pickRate;
                            }
                        }
                    }
                    
                    const targetX = b.ox * (brushBaseScale * currentScale) * (1 + velocity * 0.1);
                    const targetY = b.oy * (brushBaseScale * currentScale) * (1 + velocity * 0.1);
                    
                    b.vx = (b.vx + (targetX - b.x) * b.mass) * b.friction;
                    b.vy = (b.vy + (targetY - b.y) * b.mass) * b.friction;
                    b.x += b.vx; b.y += b.vy;
                    const fx = cx + b.x, fy = cy + b.y;
                    
                    if (b.lastBX !== null) {
                        const iosAlphaMultiplier = isIOS ? 0.75 : 1.0;
                        ctx.globalAlpha = Math.max(0.1, (0.9 - (velocity * 0.03)) * iosAlphaMultiplier);
                        ctx.strokeStyle = `rgb(${Math.round(b.res[0])}, ${Math.round(b.res[1])}, ${Math.round(b.res[2])})`;
                        ctx.lineWidth = currentThick;
                        
                        ctx.beginPath(); ctx.moveTo(b.lastBX, b.lastBY); ctx.lineTo(fx, fy); ctx.stroke();
                        if (Math.random() > 0.998) b.res = [...activePalette[Math.floor(Math.random() * activePalette.length)]];
                    }
                    b.lastBX = fx; b.lastBY = fy;
                });
            }
            lastX = x; lastY = y; lastTime = now;
        }

        // --- SMOOTH DRAWING ENGINE ---
        let pointerX = null, pointerY = null;
        let brushX = null, brushY = null;

let animationFrameId = null;

function renderLoop() {
    if (!isPaintingActive || pointerX === null || brushX === null) {
        // Just let the loop die, don't request another frame
        animationFrameId = null;
        return; 
    }

    const distToTarget = Math.hypot(pointerX - brushX, pointerY - brushY);
    if (distToTarget > 0.5) {
        brushX += (pointerX - brushX) * 0.75;
        brushY += (pointerY - brushY) * 0.75;
        draw(brushX, brushY);
    }
    
    animationFrameId = requestAnimationFrame(renderLoop);
}

// Then, inside your mousemove/touchmove handlers, wake it back up:
window.addEventListener('mousemove', e => {
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (brushX === null) {
        brushX = pointerX;
        brushY = pointerY;
        draw(brushX, brushY, true);
    }
    // Wake up the loop if it's dead
    if (!animationFrameId && isPaintingActive) {
        renderLoop();
    }
});

        document.addEventListener('mouseleave', () => {
            brushX = null;
            pointerX = null;
        });
        
 canvas.addEventListener('click', (e) => {
    if(
        !pageAbout.classList.contains('visible') && 
        !pageWorks.classList.contains('visible') && 
        !pageNotes.classList.contains('visible') &&
        !pageDigitalStudies.classList.contains('visible') &&
        !pageMotion.classList.contains('visible') && // Added Motion
        !pageExhibitions.classList.contains('visible') &&
        !pagePress.classList.contains('visible') &&
        !pageContact.classList.contains('visible') && 
        !pageStore.classList.contains('visible') &&     // Added Store
        !document.getElementById('lightbox').classList.contains('active')
    ) {
        shufflePalette();
    }
});
        
        function getTouchPos(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
                y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        canvas.addEventListener('touchstart', e => {
            if(!e.target.closest('.nav-links') && !e.target.closest('.footer') && !e.target.closest('#ios-brush-selector') && !e.target.closest('.work-item') && !document.getElementById('lightbox').classList.contains('active')) {
                e.preventDefault(); 
                const p = getTouchPos(e);
                pointerX = p.x; 
                pointerY = p.y;
                brushX = pointerX; 
                brushY = pointerY;
                draw(brushX, brushY, true);
                // Make sure the render loop is actually running for this stroke
                if (!animationFrameId && isPaintingActive) {
                    renderLoop();
                }
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', e => {
            if(!document.getElementById('lightbox').classList.contains('active')) {
                const p = getTouchPos(e);
                pointerX = p.x; 
                pointerY = p.y;
                if (brushX === null) {
                    brushX = pointerX;
                    brushY = pointerY;
                }
                // The loop can die between touches (e.g. after using the brush-size slider) - wake it back up
                if (!animationFrameId && isPaintingActive) {
                    renderLoop();
                }
            }
        }, { passive: false });

        canvas.addEventListener('touchend', e => {
            brushX = null;
            pointerX = null;
        });

   // --- GALLERY DRAGGING ENGINE (DESKTOP ONLY) ---
// --- UPDATED INTERACTIVE DRAG SYSTEM ENGINE ---
function initDragSystem() {
    let draggedItem = null;
    let startPointerX, startPointerY;
    let itemStartX, itemStartY;
    let originalRotation = 0;

    document.querySelectorAll('.work-item').forEach(item => {
        if (item.closest('.still-grid-page')) return;
        if (!item.dataset.dragX) item.dataset.dragX = 0;
        if (!item.dataset.dragY) item.dataset.dragY = 0;

        item.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.sliced-container')) return;
            if (!isCollageMode || e.pointerType !== 'mouse') return;

            draggedItem = item;
            startPointerX = e.clientX;
            startPointerY = e.clientY;
            itemStartX = parseFloat(item.dataset.dragX) || 0;
            itemStartY = parseFloat(item.dataset.dragY) || 0;
            
            originalRotation = parseFloat(item.dataset.rotate) || 0;
            item.dataset.currentRotation = originalRotation; // Track live rotation
            
            // KILL the transition on pickup to ensure instant, zero-lag dragging
            item.style.transition = 'none'; 
            
            item.style.zIndex = 200; 
            window.isDraggingGalleryItem = false;
            item.setPointerCapture(e.pointerId);
        });

    item.addEventListener('pointermove', (e) => {
    if (draggedItem !== item) return;
    
    const dx = e.clientX - startPointerX;
    const dy = e.clientY - startPointerY;
    const DRAG_THRESHOLD = 15; 

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
        window.isDraggingGalleryItem = true;
        
        item.dataset.dragX = itemStartX + dx;
        item.dataset.dragY = itemStartY + dy;

        let percentX = parseFloat(item.dataset.translateX) || 0;
        let dxpx = item.dataset.dragX;
        let dypx = item.dataset.dragY;
        let dampener = currentGridDampener;
        percentX *= dampener;

        // Keep the original rotation while dragging so it doesn't snap
        let dragRotation = originalRotation;
        
        if (!item.classList.contains('sketch-item')) {
            dragRotation = originalRotation * dampener;
        }

        item.style.setProperty('--base-transform', `rotate(${dragRotation}deg) translate(calc(${percentX}% + ${dxpx}px), ${dypx}px) scale(1)`);
    }
});

    item.addEventListener('pointerup', (e) => {
    if (draggedItem !== item) return;
    draggedItem = null;
    item.releasePointerCapture(e.pointerId);
    
    if (item.classList.contains('sketch-item')) {
        // 1. Add a nice springy easing curve for the rotation settling
        item.style.transition = 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), margin-top 1.2s cubic-bezier(0.22, 1, 0.36, 1)';
        
        // 2. Calculate the relaxed angle NOW, upon dropping
        let finalRotation = originalRotation;
        if (originalRotation > 15) {
            finalRotation = originalRotation - 12;
        } else if (originalRotation < -15) {
            finalRotation = originalRotation + 12;
        } else {
            finalRotation = originalRotation * 0.5; 
        }

        let percentX = parseFloat(item.dataset.translateX) || 0;
        let dxpx = item.dataset.dragX;
        let dypx = item.dataset.dragY;
        
        // 3. Save the new relaxed rotation for the next interaction
        item.dataset.rotate = finalRotation; 

        // 4. Apply it. Because transition is active, it will smoothly animate to this angle.
        item.style.setProperty('--base-transform', `rotate(${finalRotation}deg) translate(calc(${percentX}% + ${dxpx}px), ${dypx}px) scale(1)`);
    } else {
        item.style.transition = ''; 
    }
    
    item.style.zIndex = item.dataset.zIndex;
    setTimeout(() => window.isDraggingGalleryItem = false, 100);
});
        item.addEventListener('pointercancel', (e) => {
            if (draggedItem === item) {
                draggedItem = null;
                item.style.transition = '';
                item.style.zIndex = item.dataset.zIndex;
                setTimeout(() => window.isDraggingGalleryItem = false, 100);
            }
        });
    });
}

function updateDragCapabilities() {
    document.querySelectorAll('.work-item').forEach(item => {
        // Set to 'auto' to ensure mobile devices handle scrolling natively
        item.style.touchAction = 'auto';
    });
}
// --- INDIVIDUAL SLICE DRAGGING FOR SEVEN OF HEARTS ---
function initSliceDragSystem() {
    document.querySelectorAll('#art-sevenofhearts .sliced-container img, #art-praiseyou .sliced-container img').forEach(slice => {
        if (!slice.dataset.dragX) slice.dataset.dragX = 0;
        if (!slice.dataset.dragY) slice.dataset.dragY = 0;

        let sliceDragging = false;
        let sliceStartX, sliceStartY, sliceItemStartX, sliceItemStartY;

        slice.addEventListener('pointerdown', (e) => {
            if (!isCollageMode || e.pointerType !== 'mouse') return;
            e.stopPropagation();
            sliceDragging = true;
            sliceStartX = e.clientX;
            sliceStartY = e.clientY;
            sliceItemStartX = parseFloat(slice.dataset.dragX) || 0;
            sliceItemStartY = parseFloat(slice.dataset.dragY) || 0;
            slice.style.zIndex = 200;
            slice.style.transition = 'none';
            window.isDraggingGalleryItem = false;
            slice.setPointerCapture(e.pointerId);
        });

        slice.addEventListener('pointermove', (e) => {
            if (!sliceDragging) return;
            const dx = e.clientX - sliceStartX;
            const dy = e.clientY - sliceStartY;
            const DRAG_THRESHOLD = 8;
            if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
                window.isDraggingGalleryItem = true;
                slice.dataset.dragX = sliceItemStartX + dx;
                slice.dataset.dragY = sliceItemStartY + dy;
                slice.style.setProperty('--slice-transform', `translate(${slice.dataset.dragX}px, ${slice.dataset.dragY}px)`);
            }
        });

        slice.addEventListener('pointerup', (e) => {
            if (!sliceDragging) return;
            sliceDragging = false;
            slice.releasePointerCapture(e.pointerId);
            slice.style.transition = '';
            slice.style.zIndex = '';
            setTimeout(() => window.isDraggingGalleryItem = false, 100);
        });

        slice.addEventListener('pointercancel', (e) => {
            if (sliceDragging) {
                sliceDragging = false;
                slice.style.transition = '';
                slice.style.zIndex = '';
                setTimeout(() => window.isDraggingGalleryItem = false, 100);
            }
        });
    });
}
        // --- NEW: COLLAGE ZOOM LOGIC ---
function cycleCollageZoom() {
    let maxZoom = 4; // desktop: 0, 1, 2, 3
    if (window.innerWidth <= 1024) {
        maxZoom = 2; // ipad: modes 0 (1 col) and 1 (2 cols)
    }
    collageZoomLevel = (collageZoomLevel + 1) % maxZoom;
    
    // Add this line to save the level to the browser
    localStorage.setItem('collageZoomLevel', collageZoomLevel);
    
    updateGalleryLayout();
}

        // --- GALLERY LAYOUT ENGINE (COLLAGE VS GRID) ---
        function toggleLayoutMode() {
            isCollageMode = !isCollageMode;
            localStorage.setItem('layoutMode', isCollageMode ? 'collage' : 'rows');

            const iconGrid = document.querySelector('.icon-grid');
            const iconCollage = document.querySelector('.icon-collage');
            const zoomToggle = document.getElementById('zoom-toggle');
            
            if(isCollageMode) {
                iconGrid.style.display = 'block';
                iconCollage.style.display = 'none';
                zoomToggle.style.display = 'flex'; // Show zoom control
            } else {
                iconGrid.style.display = 'none';
                iconCollage.style.display = 'block';
                zoomToggle.style.display = 'none'; // Hide zoom control
            }
            
            updateGalleryLayout();
            updateDragCapabilities();
        }

function initCollageData() {
    const items = document.querySelectorAll('.work-item');
    
    // Set up track configurations to yield roughly 4 to 6 items across dynamically per row
    const sketchSpans = [2, 3, 2, 3, 2]; 
    let sketchCount = 0; // Track sketches specifically to protect the top row

    items.forEach((item, index) => {
        const isExtremeOverlap = Math.random() > 0.85; 
        
        let pullUpDesk = isExtremeOverlap ? Math.floor(Math.random() * 6) + 4 : Math.floor(Math.random() * 3) + 1;
        if (index < 4 && !item.classList.contains('sketch-item')) pullUpDesk = 0; 
        
        let rotateDesk = (Math.random() * 4) - 2; 
        let translateXDesk = (Math.random() * 3) - 1.5; 

// 💥 CHAOTIC SCATTER & ASYMMETRIC COLS FOR SKETCHES ONLY 💥
        if (item.classList.contains('sketch-item')) {
            rotateDesk = (Math.random() * 40) - 20; // Calmer rotations
            translateXDesk = (Math.random() * 50) - 25; // Tighter horizontal spread for less background gaps

            if (sketchCount < 4) {
                // Strict boundary: ZERO pull up so they never overlap the header
                pullUpDesk = 0; 
            } else {
                // Toned down vertical flyaway so it's denser
                pullUpDesk = (Math.random() * 70) + 15; 
            }
            sketchCount++;

            // Pick a random track footprint assignment
            const randomSpan = sketchSpans[Math.floor(Math.random() * sketchSpans.length)];
            item.dataset.colSpan = randomSpan;

            // Extremely tight sizing variance (basically the exact same size)
            const jitterScale = 1.04 + (Math.random() * 0.06); 
            item.style.setProperty('--sketch-jitter-size', jitterScale);
        }

        item.dataset.pullUp = pullUpDesk;
        item.dataset.rotate = rotateDesk;
        item.dataset.translateX = translateXDesk;
        item.dataset.zIndex = Math.floor(Math.random() * 25) + 1;
    });
    collageDataInitialized = true;
}

function updateGalleryLayout() {
    if (!collageDataInitialized) initCollageData();
    
    // The Digital page grid is always forced into collage mode via its own
    // CSS (#page-motion .works-grid.mode-collage) and must never be flipped
    // to rows mode by the Sketches page's rows/collage toggle — excluding
    // it here is what keeps the two pages' layouts independent.
    const grids = Array.from(document.querySelectorAll('.works-grid')).filter(
        (grid) => !grid.closest('#page-motion') && !grid.closest('.still-grid-page')
    );
    const items = Array.from(document.querySelectorAll('.work-item')).filter(
        (item) => !item.closest('#page-motion') && !item.closest('.still-grid-page')
    );

    let columnsCss = '1fr';
    let dampener = 1;

    if (isCollageMode) {
        if (window.innerWidth <= 768) {
            collageZoomLevel = 0; 
            columnsCss = '1fr';
            dampener = 1;
        } else if (window.innerWidth <= 1024) {
            if (collageZoomLevel > 1) collageZoomLevel = 0; 
            if (collageZoomLevel === 0) { columnsCss = '1fr'; dampener = 1; }
            else { columnsCss = 'repeat(2, 1fr)'; dampener = 0.5; }
        } else {
            if (collageZoomLevel === 0) { columnsCss = '1fr'; dampener = 1; }
            if (collageZoomLevel === 1) { columnsCss = 'repeat(2, 1fr)'; dampener = 0.5; }
            if (collageZoomLevel === 2) { columnsCss = 'repeat(3, 1fr)'; dampener = 0.2; }
            if (collageZoomLevel === 3) { columnsCss = 'repeat(4, 1fr)'; dampener = 0.05; }
        }
        currentGridDampener = dampener; 
    }

    grids.forEach(grid => {
        if (isCollageMode) {
            grid.classList.remove('mode-rows');
            grid.classList.add('mode-collage');
            grid.style.gridTemplateColumns = columnsCss;
        } else {
            grid.classList.remove('mode-collage');
            grid.classList.add('mode-rows');
            grid.style.gridTemplateColumns = ''; 
        }
    });

   // --- PASS 1: assign grid-column spans and zero out transforms so the browser
// can settle into its real layout before we measure anything ---
items.forEach((item) => {
    item.dataset.dragX = 0;
    item.dataset.dragY = 0;

    // 👇 ADD THIS FIX FOR THE SEVEN OF HEARTS SLICES 👇
    if (!isCollageMode && (item.id === 'art-sevenofhearts' || item.id === 'art-praiseyou')) {
        const slices = item.querySelectorAll('.sliced-container img');
        slices.forEach(slice => {
            slice.dataset.dragX = 0;
            slice.dataset.dragY = 0;
            slice.style.removeProperty('--slice-transform');
            slice.style.zIndex = '';
        });
    }

    if (isCollageMode && item.classList.contains('sketch-item')) {
        let spanPool;
        if (window.innerWidth <= 768) spanPool = [2, 3];
        else if (window.innerWidth <= 1024) spanPool = [3, 4];
        else spanPool = [2, 3];
        const span = spanPool[Math.floor(Math.random() * spanPool.length)];
        item.style.gridColumn = `span ${span}`;
    } else {
        item.style.gridColumn = '';
    }

    item.style.marginTop = '0px';
    item.style.zIndex = item.dataset.zIndex;
    item.style.setProperty('--base-transform', 'rotate(0deg) translate(0px, 0px) scale(1)');
});
    // --- PASS 2: after layout has settled, measure which items are actually
    // in the first visual row and only apply pull-up / rotation to the rest ---
    requestAnimationFrame(() => {
        const sketchGrid = document.querySelector('.still-grid-page .works-grid');
        let topRowY = null;

        if (sketchGrid) {
            const sketchItems = sketchGrid.querySelectorAll('.sketch-item');
            sketchItems.forEach(item => {
                const top = Math.round(item.getBoundingClientRect().top);
                if (topRowY === null || top < topRowY) topRowY = top;
            });
        }

        items.forEach((item, index) => {
            if (!isCollageMode) return;

            let rotate = parseFloat(item.dataset.rotate);
            let translateX = parseFloat(item.dataset.translateX);
            let pullUp = parseFloat(item.dataset.pullUp) * 0.20 * dampener;

            if (item.classList.contains('sketch-item')) {
                const isTopRow = Math.round(item.getBoundingClientRect().top) <= topRowY + 2;

                if (isTopRow) {
                    pullUp = 0;
                    rotate *= 0.5;
                } 

                if (window.innerWidth <= 1024) {
                    translateX *= 0.25;
                    rotate *= 0.35;
                    pullUp *= 0.4;
                }

                // Hard safety cap: never let pull-up exceed a fixed pixel amount,
                // regardless of item width — this is what actually prevents
                // any possibility of reaching the nav.
                const MAX_PULLUP_PX = 60;
                const marginTopPx = -Math.min(pullUp * 4, MAX_PULLUP_PX); // px, not %
                item.style.marginTop = `${marginTopPx}px`;

            } else {
                if ((index < 2) || (collageZoomLevel > 0) || (window.innerWidth <= 1024)) {
                    pullUp = 0;
                }
                rotate *= (0.5 * dampener);
                translateX *= dampener;
                item.style.marginTop = `${-pullUp}%`;
            }

            item.style.setProperty('--base-transform', `rotate(${rotate}deg) translate(${translateX}%, 0px) scale(1)`);
        });
    });
}

        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if(isCollageMode) updateGalleryLayout(); 
            }, 250);
        });
// Global variable to hold current product variants
let currentProductVariants = [];

async function openProduct(handle, shouldPushHistory = true) {
window.closeCart();
    const productPath = `/store/${encodeURIComponent(handle)}/`;
    if (shouldPushHistory && window.location.pathname !== productPath) {
        window.history.pushState(null, '', productPath);
    }
    const response = await shopifyGraphQL(PRODUCT_QUERY, { handle: handle });
    const product = response.data.productByHandle;

    if (!product) return;

    currentProductVariants = product.variants.edges;
    
    // Store handle for reference
    document.getElementById('prod-img').dataset.handle = handle;
    
    // 1. Restore Quantity from state
    const savedState = productSelectionState[handle];
    currentQty = savedState ? (savedState.qty || 1) : 1;
    document.getElementById('qty-display').innerText = currentQty;

    // 2. Restore Variant
    let initialVariant;
    if (savedState && savedState.variantId) {
        const found = currentProductVariants.find(v => v.node.id === savedState.variantId);
        initialVariant = found ? found.node : currentProductVariants[0].node;
    } else {
        initialVariant = currentProductVariants[0].node;
    }
    
   document.getElementById('prod-title').innerText = product.title;
document.getElementById('prod-desc').innerHTML = product.descriptionHtml;

const productImages = product.images.edges.map((edge) => ({
    thumb: edge.node.thumb,
    highres: edge.node.highres,
    alt: edge.node.altText || product.title
}));

const primaryProductImage =
    productImages[0]?.thumb ||
    productImages[0]?.highres ||
    DEFAULT_SITE_IMAGE;

// Keep the cart image independent from whichever carousel image is currently open.
document.getElementById('prod-img').dataset.cartImage = primaryProductImage;

const highResImageUrl = productImages[0]?.highres || DEFAULT_SITE_IMAGE;
const productDescription = trimMetaDescription(
    product.seo?.description ||
    plainTextFromHtml(product.descriptionHtml) ||
    STORE_DESCRIPTION
);
const productTitle = product.seo?.title?.trim() || `${product.title} | Tyrone Moreno`;
const productCanonical = `${SITE_ORIGIN}${productPath}`;

updatePageMeta(
    productTitle,
    highResImageUrl,
    productDescription,
    productCanonical,
    'product'
);
setProductStructuredData(product, productCanonical, productDescription);

// --- DYNAMIC VARIANT BUTTON GENERATOR ---
const optionGroupsRoot = document.getElementById('product-option-groups');
const legacyOptionGroup = document.getElementById('legacy-option-group');
const selectorGroup = document.getElementById('variant-selector-group');
const optionsLabel = document.getElementById('options-label');

selectorGroup.innerHTML = '';
optionGroupsRoot.querySelectorAll('.dynamic-product-option-group').forEach((group) => group.remove());

const collectionHandles = (product.collections?.nodes || []).map((collection) => collection.handle);
const isApparelProduct =
    collectionHandles.includes('apparel') ||
    /apparel|clothing|t-?shirt|tee|sweatshirt|hoodie/i.test(product.productType || '');

const saveAndRenderVariant = (variant) => {
    if (!productSelectionState[handle]) productSelectionState[handle] = {};
    productSelectionState[handle].variantId = variant.id;
    updateProductUI(variant);
    window.updateQty(0);
};

if (currentProductVariants.length === 1 && currentProductVariants[0].node.title === 'Default Title') {
    legacyOptionGroup.style.display = 'none';
    productSelectionState[handle] = productSelectionState[handle] || {};
    productSelectionState[handle].variantId = currentProductVariants[0].node.id;
} else if (isApparelProduct && Array.isArray(product.options) && product.options.length) {
    legacyOptionGroup.style.display = 'none';

    const selectedValues = Object.fromEntries(
        (initialVariant.selectedOptions || []).map((option) => [option.name, option.value])
    );

    const findMatchingVariant = () => currentProductVariants.find(({ node: variant }) =>
        (variant.selectedOptions || []).every((option) =>
            !selectedValues[option.name] || selectedValues[option.name] === option.value
        )
    )?.node;

    product.options.forEach((option) => {
        const values = [...new Set(option.values || [])];
        const normalizedName = option.name.trim().toLowerCase();
        const isColour = normalizedName === 'color' || normalizedName === 'colour';
        const isSize = normalizedName === 'size';

        // A single fixed colour adds no useful choice. It will automatically
        // appear here as soon as another colour is added in Shopify.
        if (isColour && values.length < 2) return;
        if (values.length < 2 && !isSize) return;

        const group = document.createElement('div');
        group.className = 'product-option-group dynamic-product-option-group';

        const label = document.createElement('label');
        label.innerText = isColour ? 'Colour' : (isSize ? 'Size' : option.name);

        const buttons = document.createElement('div');
        buttons.className = `selector-group${isSize ? ' compact-sizes' : ''}${isColour ? ' compact-colours' : ''}`;

        values.forEach((value) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'prod-option-btn';
            button.innerText = value;
            button.dataset.optionName = option.name;
            button.dataset.optionValue = value;
            button.classList.toggle('active', selectedValues[option.name] === value);

            button.addEventListener('click', () => {
                selectedValues[option.name] = value;

                const matchingVariant = findMatchingVariant();
                if (!matchingVariant) return;

                // Sync every option group to the actual matched Shopify variant.
                (matchingVariant.selectedOptions || []).forEach((selected) => {
                    selectedValues[selected.name] = selected.value;
                });
                optionGroupsRoot.querySelectorAll('.dynamic-product-option-group .prod-option-btn').forEach((candidate) => {
                    candidate.classList.toggle(
                        'active',
                        selectedValues[candidate.dataset.optionName] === candidate.dataset.optionValue
                    );
                });

                saveAndRenderVariant(matchingVariant);
            });
            buttons.appendChild(button);
        });

        group.append(label, buttons);
        optionGroupsRoot.appendChild(group);
    });

    // Fallback for apparel products whose Shopify options are not named Size/Colour.
    if (!optionGroupsRoot.querySelector('.dynamic-product-option-group')) {
        legacyOptionGroup.style.display = 'flex';
    }
} else {
    // Preserve the existing combined "Options" buttons for prints and editions.
    legacyOptionGroup.style.display = 'flex';
    optionsLabel.style.display = 'block';

    currentProductVariants.forEach((variantEdge) => {
        const variant = variantEdge.node;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'prod-option-btn';
        btn.classList.toggle('active', variant.id === initialVariant.id);
        btn.innerText = variant.title
            .replace(/\s*\([^)]*\)\s*/g, ' ')
            .replace(/,\s*\d+(?:\.\d+)?\s*[×x]\s*\d+(?:\.\d+)?\s*"\s*/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        btn.addEventListener('click', function() {
            selectorGroup.querySelectorAll('.prod-option-btn').forEach((button) => button.classList.remove('active'));
            this.classList.add('active');
            saveAndRenderVariant(variant);
        });
        selectorGroup.appendChild(btn);
    });
}
// --- END GENERATOR ---

updateProductUI(initialVariant);
    // 3. Trigger a price update calculation based on the restored quantity
    window.updateQty(0); 

  // Pass thumbnail, high-resolution URL and Shopify alt text to the carousel.
    renderCarousel(productImages, product.title);

    document.getElementById('page-product').classList.add('visible');
    document.body.classList.add('overlay-open');

    // --- FIX: Attach Event Listener Dynamically ---
    const buyNowBtn = document.getElementById('btn-buy-now');
    
    // Remove old listeners to prevent duplication
    buyNowBtn.replaceWith(buyNowBtn.cloneNode(true));
    const newBtn = document.getElementById('btn-buy-now');
    
    newBtn.addEventListener('click', async (event) => {
        console.log("Buy it now clicked!"); // Debug log
        await window.buyItNow(event);
    });
}

function updateProductUI(variant) {
   const priceEl = document.getElementById('prod-price');
    const variantPrice = parseFloat(variant.price.amount);
    const addBtn = document.querySelector('.buy-btn.black:not(#btn-buy-now)');
    const buyNowBtn = document.getElementById('btn-buy-now');
    const qtyContainer = document.querySelector('.quantity-container');
    
    const isSoldOut = !variant.availableForSale;

    if (isSoldOut) {
        addBtn.style.display = 'none';
        buyNowBtn.style.display = 'none';
        qtyContainer.style.display = 'none'; 
        
        if (!document.getElementById('sold-out-msg')) {
             const msg = document.createElement('div');
             msg.id = 'sold-out-msg';
             msg.innerText = 'SOLD OUT';
             msg.style.fontWeight = '800';
             msg.style.marginTop = '20px';
             msg.style.color = 'var(--text-color)';
             priceEl.parentNode.insertBefore(msg, priceEl.nextSibling);
        }
    } else {
        addBtn.style.display = 'block';
        buyNowBtn.style.display = 'block';
        qtyContainer.style.display = 'flex'; 
        
        const msg = document.getElementById('sold-out-msg');
        if (msg) msg.remove();
    }

priceEl.dataset.basePrice = variantPrice;
    priceEl.dataset.variantId = variant.id;
    priceEl.innerText = `£${variantPrice.toFixed(2)} GBP`;

    // Shopify can associate a different product image with each colour variant.
    // When present, selecting that colour updates the main product image.
    if (variant.image?.highres) {
        const matchingImageIndex = productCarouselImages.findIndex((image) =>
            image.highres === variant.image.highres
        );
        if (matchingImageIndex >= 0) {
            productCarouselIndex = matchingImageIndex;
            updateProductCarouselSelection({ scrollIntoView: true });
        }
        setProductMainImage(variant.image.highres, variant.title);
        document.getElementById('prod-img').dataset.cartImage = variant.image.highres;
    }

}
async function updateMainImage(url) {
    const mainImg = document.getElementById('prod-img');
    
    // Create an off-screen image object
    const offscreenImg = new Image();
    offscreenImg.src = url;
    
    // Force background decoding
    await offscreenImg.decode();
    
    // Now swap the visible source
    mainImg.src = url;
    mainImg.dataset.path = url;
}
function setProductMainImage(url, altText = '') {
    // Same small loading bar treatment as the art lightbox / .glb model,
    // shown while the store's main product image (loaded at 600px) streams in.
    const mainImg = document.getElementById('prod-img');
    const loader = document.getElementById('prod-img-loader');

    loader.style.display = 'block';
    mainImg.style.opacity = '0';
    mainImg.onload = () => {
        loader.style.display = 'none';
        mainImg.style.opacity = '1';
    };
    mainImg.onerror = () => {
        loader.style.display = 'none';
        mainImg.style.opacity = '1';
    };
    mainImg.src = url;
    mainImg.alt = altText || mainImg.alt || 'Tyrone Moreno product artwork';
    mainImg.dataset.path = url;
}

let productCarouselImages = [];
let productCarouselIndex = 0;
let productCarouselTitle = '';

function updateProductCarouselSelection({ scrollIntoView = true } = {}) {
    const carousel = document.getElementById('prod-carousel');
    const thumbnails = Array.from(carousel.querySelectorAll('img'));

    thumbnails.forEach((thumbnail, index) => {
        const isActive = index === productCarouselIndex;
        thumbnail.classList.toggle('is-active', isActive);
        thumbnail.setAttribute('aria-current', isActive ? 'true' : 'false');
    });

    const selected = thumbnails[productCarouselIndex];
    if (selected && scrollIntoView) {
        const carouselLeft = carousel.scrollLeft;
        const carouselRight = carouselLeft + carousel.clientWidth;
        const selectedLeft = selected.offsetLeft;
        const selectedRight = selectedLeft + selected.offsetWidth;

        if (selectedLeft < carouselLeft || selectedRight > carouselRight) {
            carousel.scrollTo({
                left: selectedLeft - (carousel.clientWidth - selected.offsetWidth) / 2,
                behavior: 'smooth'
            });
        }
    }

    const hasMultipleImages = productCarouselImages.length > 1;
    document.getElementById('prod-carousel-prev').hidden = !hasMultipleImages;
    document.getElementById('prod-carousel-next').hidden = !hasMultipleImages;

    requestAnimationFrame(() => {
        carousel.classList.toggle(
            'is-overflowing',
            carousel.scrollWidth > carousel.clientWidth + 1
        );
    });
}

function selectProductCarouselImage(index, { scrollIntoView = true } = {}) {
    if (!productCarouselImages.length) return;
    productCarouselIndex = (index + productCarouselImages.length) % productCarouselImages.length;
    const selected = productCarouselImages[productCarouselIndex];
    setProductMainImage(
        selected.highres,
        selected.alt || `${productCarouselTitle} product view ${productCarouselIndex + 1}`
    );
    updateProductCarouselSelection({ scrollIntoView });
}

function changeProductCarouselImage(direction) {
    selectProductCarouselImage(productCarouselIndex + direction);
}

function renderCarousel(imageArray, title) {
    const carousel = document.getElementById('prod-carousel');
    carousel.innerHTML = '';
    productCarouselImages = Array.isArray(imageArray) ? imageArray : [];
    productCarouselIndex = 0;
    productCarouselTitle = title || 'Product';

    productCarouselImages.forEach((imgData, index) => {
        const img = document.createElement('img');
        img.src = imgData.thumb;
        img.loading = 'lazy';
        img.alt = imgData.alt || `${productCarouselTitle} product view ${index + 1}`;
        img.setAttribute('role', 'button');
        img.setAttribute('tabindex', '0');
        img.setAttribute('aria-label', `Show ${img.alt}`);

        const selectThumbnail = () => {
            selectProductCarouselImage(index, { scrollIntoView: false });
        };

        img.onclick = selectThumbnail;
        img.onkeydown = (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                selectThumbnail();
            }
        };
        carousel.appendChild(img);
    });

    if (productCarouselImages.length > 0) {
        selectProductCarouselImage(0, { scrollIntoView: false });
    } else {
        document.getElementById('prod-carousel-prev').hidden = true;
        document.getElementById('prod-carousel-next').hidden = true;
    }
}

document.addEventListener('keydown', (event) => {
    const productPage = document.getElementById('page-product');
    if (!productPage || !productPage.classList.contains('visible')) return;
    if (event.key === 'ArrowLeft') changeProductCarouselImage(-1);
    if (event.key === 'ArrowRight') changeProductCarouselImage(1);
});

// Add this fetch logic
const storeCollectionCache = {}; // Caches fetched products per collection handle so tabs don't re-fetch
let currentStoreCollection = 'prints';

const COLLECTION_PRODUCT_QUERY = `
query getCollectionProducts($handle: String!) {
  collectionByHandle(handle: $handle) {
    products(first: 20) {
      edges {
        node {
          handle
          title
          images(first: 1) {
            edges {
              node {
                altText
                thumbnail: url(transform: {maxWidth: 300, preferredContentType: WEBP})
                highres: url(transform: {maxWidth: 600, preferredContentType: WEBP})
              }
            }
          }
          variants(first: 1) {
            edges { node { price { amount } } }
          }
        }
      }
    }
  }
}`;

function renderStoreGrid(products, handle) {
    const grid = document.getElementById('store-grid');
    grid.innerHTML = ''; // Clear loading state if any

    if (products.length === 0) {
        const message = handle === 'apparel' ? 'Coming Soon...' : 'No products found.';
        grid.innerHTML = `<div class="store-coming-soon">${message}</div>`;
        return;
    }

    products.forEach(edge => {
        const prod = edge.node;
        const thumbImg = prod.images.edges[0]?.node.thumbnail || '';
        const highresImg = prod.images.edges[0]?.node.highres || '';
        const imageAlt = prod.images.edges[0]?.node.altText || prod.title;
        const price = prod.variants.edges[0]?.node.price.amount || '0.00';
        const numericPrice = parseFloat(price);
        const formattedPrice = Number.isFinite(numericPrice)
            ? numericPrice.toLocaleString('en-GB', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
              })
            : '0';
        const item = document.createElement('a');
        item.className = 'store-item';
        item.href = `/store/${encodeURIComponent(prod.handle)}/`;

        // Browser automatically loads thumbnail on mobile, high-res on desktop
        item.innerHTML = `
        <img 
            src="${thumbImg}" 
            srcset="${thumbImg} 300w, ${highresImg} 600w"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            alt="${imageAlt.replace(/"/g, '&quot;')}"
            loading="lazy"
        >
        <h3>${prod.title}</h3>
        <p>From £${formattedPrice}</p> 
        `;

        // Keep a real crawlable URL while preserving the current in-page
        // product overlay for normal left-clicks and taps.
        item.addEventListener('click', (e) => {
            if (
                e.button !== 0 ||
                e.metaKey ||
                e.ctrlKey ||
                e.shiftKey ||
                e.altKey
            ) return;

            e.preventDefault();
            openProduct(prod.handle);
        });

        grid.appendChild(item);
    });
}

async function loadStoreCollection(handle) {
    // Serve from cache if we've already fetched this collection (Editions <-> Apparel switch)
    if (storeCollectionCache[handle]) {
        renderStoreGrid(storeCollectionCache[handle], handle);
        return;
    }

    const grid = document.getElementById('store-grid');
    grid.innerHTML = ''; // Clear previous tab's items while the new collection loads

    try {
        const response = await shopifyGraphQL(COLLECTION_PRODUCT_QUERY, { handle: handle });
        const collection = response.data.collectionByHandle;
        const products = collection ? collection.products.edges : [];

        storeCollectionCache[handle] = products;
        renderStoreGrid(products, handle);
    } catch (error) {
        console.error(`Failed to load store collection "${handle}":`, error);
    }
}

function switchStoreTab(handle, btnEl) {
    if (handle === currentStoreCollection) return;
    currentStoreCollection = handle;

    document.querySelectorAll('.store-tab').forEach(tab => tab.classList.remove('active'));
    btnEl.classList.add('active');

    loadStoreCollection(handle);
}

let isStoreLoaded = false;
async function renderStore() {
    if (isStoreLoaded) return; // Stop if we already loaded the products
    isStoreLoaded = true;
    await loadStoreCollection(currentStoreCollection); // Editions is the default tab
}
// Add this below your openProduct function
function closeProduct() {
    const prodPage = document.getElementById('page-product');
    prodPage.classList.remove('visible');
    document.body.classList.remove('overlay-open');
}

// --- SHOPPING CART STATE ENGINE ---
let cart = JSON.parse(localStorage.getItem('tm_cart')) || [];
let currentQty = 1;
function saveCart() {
    localStorage.setItem('tm_cart', JSON.stringify(cart));
}

window.updateQty = function(change) {
    currentQty += change;
    if (currentQty < 1) currentQty = 1;
    document.getElementById('qty-display').innerText = currentQty;

    // Save the quantity to our state object
    const handle = document.getElementById('prod-img').dataset.handle;
    if (handle) {
        if (!productSelectionState[handle]) productSelectionState[handle] = {};
        productSelectionState[handle].qty = currentQty;
    }

    const priceEl = document.getElementById('prod-price');
    const basePrice = parseFloat(priceEl.dataset.basePrice || 0);
    const totalPrice = basePrice * currentQty;
    priceEl.innerText = `£${totalPrice.toFixed(2)} GBP`;
};


window.closeProduct = function() {
    const prodPage = document.getElementById('page-product');
    const mainImg = document.getElementById('prod-img');
    const carousel = document.getElementById('prod-carousel');
    
    // 1. Hide the overlay
    prodPage.classList.remove('visible');
    document.body.classList.remove('overlay-open');
    
    // 2. CLEAR THE DATA to prevent flash of old content next time
    mainImg.src = ''; 
    mainImg.dataset.path = '';
    mainImg.dataset.cartImage = '';
    carousel.innerHTML = ''; 
    
    // 3. Reset buttons
    window.resetButtons();

    // 4. If we're still sitting on a specific product URL (e.g. /store/splinter-print/),
    // step back to the plain store URL so it doesn't linger in the address bar.
    if (window.location.pathname.startsWith('/store/') && window.location.pathname !== '/store/') {
        window.history.pushState(null, '', '/store/');
    }
    setStoreMeta();
};

window.openCart = function() {
    document.getElementById('cart-drawer').classList.add('active');
};

window.closeCart = function() {
    document.getElementById('cart-drawer').classList.remove('active');
    window.resetButtons(); // This ensures everything resets to "Check out"
};

function renderCart() {
    updateCartNav(); 

    const cartContainer = document.getElementById('cart-items');
    const cartFooter = document.getElementById('cart-footer');
    const cartTotalPrice = document.getElementById('cart-total-price');
    
    cartContainer.innerHTML = '';
    
    if(cart.length === 0) {
        cartContainer.innerHTML = '<p style="opacity:0.5; text-align:center; padding: 20px 0;">Your cart is empty.</p>';
        cartFooter.style.display = 'none'; // Hide checkout area if empty
        return;
    }
    
    cartFooter.style.display = 'block'; // Show checkout area
    let masterTotal = 0;

    cart.forEach((item, index) => {
        masterTotal += (item.price * item.qty);
        
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.img}" alt="${item.title}">
            <div class="cart-item-details">
                <h4>${item.title}</h4>
                <p>Option: ${item.option}</p>
                <p>${item.qty} × £${item.price.toFixed(2)}</p>
                <button class="remove-cart-item" onclick="removeFromCart(${index})">Remove</button>
            </div>
        `;
        cartContainer.appendChild(itemEl);
    });
    
    // Update the new Estimated Total display
    cartTotalPrice.innerText = `£${masterTotal.toFixed(2)} GBP`;
}

function updateCartNav() {
    const cartNavBtn = document.getElementById('btn-cart-nav');
    const badge = document.getElementById('cart-badge');
    
    // Count total individual items (e.g., 2 prints + 1 framed = 3)
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);

    if (totalItems > 0) {
        cartNavBtn.classList.remove('hidden');
        badge.innerText = totalItems;
    } else {
        cartNavBtn.classList.add('hidden');
    }
}

async function addToCart(event) {
    const btn = event.currentTarget;
    btn.dataset.originalText = btn.innerText;
    
    // Trigger the Ping
    showLoadingOverlay(btn);
    btn.disabled = true;

    const title = document.getElementById('prod-title').innerText;
    const productImageEl = document.getElementById('prod-img');
    const img =
        productImageEl.dataset.cartImage ||
        productImageEl.dataset.path ||
        DEFAULT_SITE_IMAGE;
    const priceEl = document.getElementById('prod-price');
    const selectedVariant = currentProductVariants.find(({ node }) =>
        node.id === priceEl.dataset.variantId
    )?.node;
    const option = selectedVariant?.title || 'Print Only';
    const itemPrice = parseFloat(priceEl.dataset.basePrice); // Better than parsing innerText
    const variantId = priceEl.dataset.variantId; // Grab exact ID directly from the UI

    // Find by variantId instead of title/option string matching
    const existingIndex = cart.findIndex(item => item.variantId === variantId);
    
    if(existingIndex > -1) {
        cart[existingIndex].qty += currentQty;
        cart[existingIndex].img = img;
        cart[existingIndex].title = title;
        cart[existingIndex].option = option;
        cart[existingIndex].price = itemPrice;
    } else {
        cart.push({
            variantId: variantId,
            title: title,
            img: img,
            option: option,
            price: itemPrice,
            qty: currentQty
        });
    }
    saveCart();
    
    // Add a slight delay to let the user "ping" the graphic before closing
  setTimeout(() => {
    closeProduct();
    renderCart();
    removeLoadingOverlay(btn);
    
    // NEW: Open the drawer automatically so they see their item
    window.openCart(); 
}, 600);
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
saveCart();
    renderCart();
};


// ----------------------------------------------------
// --- SHOPIFY CART API INTEGRATION LOGIC (NO SDK) ---
// ----------------------------------------------------

// Use the modern 2024 Cart API endpoint
const SHOPIFY_DOMAIN = 'https://store.tyronemoreno.com/api/2026-07/graphql.json';
const SHOPIFY_TOKEN = '2f651b3977eb3dee70624770ed102048';

// Generic GraphQL Fetcher
async function shopifyGraphQL(query, variables = {}) {
    const response = await fetch(SHOPIFY_DOMAIN, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN
        },
        body: JSON.stringify({ query, variables })
    });
    return response.json();
}
function removeLoadingOverlay(btn) {
    // Clear the failsafe timer so it doesn't trigger unexpectedly
    if (btn.dataset.loadingTimer) {
        clearTimeout(btn.dataset.loadingTimer);
        delete btn.dataset.loadingTimer;
    }

    const existingImg = btn.querySelector('.btn-loading-img');
    if (existingImg) {
        existingImg.remove();
    }
    
    // Restore styling
    btn.style.position = '';
    btn.style.color = ''; 
    btn.disabled = false;
    
    // Restore text if stored
    if (btn.dataset.originalText) {
        btn.innerText = btn.dataset.originalText;
    }
}

// Replaces the deprecated checkoutCreate() and addLineItems()
async function createShopifyCartAndCheckout(lineItems) {
    const query = `
      mutation cartCreate($input: CartInput) {
        cartCreate(input: $input) {
          cart { checkoutUrl }
          userErrors { field message }
        }
      }
    `;
    const variables = {
        input: { lines: lineItems }
    };
    
    const { data } = await shopifyGraphQL(query, variables);
    
    // Catch inventory or validation errors from Shopify
    if (data.cartCreate.userErrors && data.cartCreate.userErrors.length > 0) {
        console.error("Cart creation failed:", data.cartCreate.userErrors);
        throw new Error(data.cartCreate.userErrors[0].message);
    }
    
    return data.cartCreate.cart.checkoutUrl;
}

window.buyItNow = async function(event) {
    const btn = event.currentTarget;
    btn.dataset.originalText = btn.innerText;
    showLoadingOverlay(btn);
    btn.disabled = true;

    try {
        const qty = currentQty;
        const priceEl = document.getElementById('prod-price');
        const variantId = priceEl.dataset.variantId; // Fetch directly from UI

        const checkoutUrl = await createShopifyCartAndCheckout([
            { merchandiseId: variantId, quantity: qty }
        ]);
        
        window.location.href = checkoutUrl;
    } catch (error) {
        console.error("Checkout Error:", error);
        btn.innerText = "ERROR";
        setTimeout(() => window.resetButtons(), 2000); 
    }
};

window.checkoutCart = async function(event) {
    if (cart.length === 0) return;

    const btn = document.getElementById('checkout-btn');
    btn.dataset.originalText = btn.innerText; 
    showLoadingOverlay(btn);
    btn.disabled = true;

    try {
        // Filter out old test cart items that don't have a variantId yet
        const validCart = cart.filter(item => item.variantId);

        // Safety check: clear the cart if it's full of old data format
        if (validCart.length === 0 && cart.length > 0) {
            alert("Cart system updated! Clearing old test items.");
            cart = [];
            saveCart();
            renderCart();
            removeLoadingOverlay(btn);
            return;
        }

        const lineItems = validCart.map((item) => {
            return { merchandiseId: item.variantId, quantity: item.qty };
        });

        const checkoutUrl = await createShopifyCartAndCheckout(lineItems);
        window.location.href = checkoutUrl;
    } catch (error) {
        console.error("Cart Checkout Error:", error);
        btn.innerText = "ERROR";
        setTimeout(() => removeLoadingOverlay(btn), 2000);
    }
};

const PRODUCT_QUERY = `
  query getProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      title
      productType
      collections(first: 10) { nodes { handle } }
      options { name values }
      descriptionHtml
      seo {
        title
        description
      }
      images(first: 10) {
        edges { 
          node {
            altText
            thumb: url(transform: {maxWidth: 150, preferredContentType: WEBP}) 
            highres: url(transform: {maxWidth: 1200, preferredContentType: WEBP}) 
          } 
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            selectedOptions { name value }
            price { amount currencyCode }
            image {
              highres: url(transform: {maxWidth: 1200, preferredContentType: WEBP})
            }
            availableForSale
          }
        }
      }
    }
  }
`;
function showLoadingOverlay(btn) {
    btn.style.position = 'relative';
    btn.style.color = 'transparent'; 
    
    const img = document.createElement('img');
    img.className = 'btn-loading-img';
    img.src = '/random/frace.webp'; // Update this line
    btn.appendChild(img);

    // Failsafe only — generous margin so it never races a real in-flight request
    btn.dataset.loadingTimer = setTimeout(() => {
        removeLoadingOverlay(btn);
    }, 4000);
}
// Add this helper function
window.resetButtons = function() {
    const buyNowBtn = document.getElementById('btn-buy-now');
    const addToCartBtn = document.querySelector('.buy-btn.black:not(#btn-buy-now)');

    [buyNowBtn, addToCartBtn].forEach(btn => {
        if (btn) {
            removeLoadingOverlay(btn);
            btn.disabled = false;
            // Restore text if you stored it in data-original-text
            if (btn.dataset.originalText) {
                btn.innerText = btn.dataset.originalText;
            } else {
                // Fallback to defaults if dataset wasn't set
                btn.innerText = btn.id === 'btn-buy-now' ? "Buy it now" : "Add to cart";
            }
        }
    });
};
function saveLastPage(pageId) {
    localStorage.setItem('lastVisitedPage', pageId);
}
// Add this helper to your script section
function removeAllLoadingIndicators() {
    const loaders = document.querySelectorAll('.btn-loading-img');
    loaders.forEach(img => img.remove());
}
// --- STORE COUNTDOWN LOGIC ---
function initStoreCountdown() {
    // Target: July 12, 2026 at 16:00 GMT 
    // Note: JS months are 0-indexed, so 6 = July
 const targetDate = 0;
   //const targetDate = Date.UTC(2026, 6, 12, 15, 0, 0);

    const countdownContainer = document.getElementById('store-countdown-container');
    const storeContent = document.getElementById('store-content');
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        // If the countdown is over, hide the timer and reveal the store
        if (distance <= 0) {
            if (countdownContainer) countdownContainer.style.display = 'none';
            if (storeContent) storeContent.style.display = 'block';
            return true; 
        }

        // Calculate time left
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Update the DOM
        document.getElementById('cd-days').innerText = String(days).padStart(2, '0');
        document.getElementById('cd-hours').innerText = String(hours).padStart(2, '0');
        document.getElementById('cd-minutes').innerText = String(minutes).padStart(2, '0');
        document.getElementById('cd-seconds').innerText = String(seconds).padStart(2, '0');
        
        return false;
    }

    // Run once immediately, then start the interval if not finished
    if (!updateCountdown()) {
        const interval = setInterval(() => {
            if (updateCountdown()) clearInterval(interval);
        }, 1000);
    }
}
// --- BROWSER BACK/FORWARD BUTTON HANDLER ---
window.addEventListener('popstate', (event) => {
    // 1. Get the new URL path after the back button is clicked
    const path = window.location.pathname;
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash if present

    // 2. Route to the correct view based on the URL
    if (normalizedPath.endsWith('/about')) {
        openAbout();
    } 
    else if (normalizedPath.endsWith('/studies')) {
        openDigitalStudies();
    }
    else if (normalizedPath.endsWith('/notes') || normalizedPath.endsWith('/sketches')) {
        if (normalizedPath.endsWith('/sketches')) {
            window.history.replaceState(null, '', '/notes/');
        }
        openNotes();
    }
    else if (normalizedPath.endsWith('/digital') || normalizedPath.endsWith('/motion')) {
        if (normalizedPath.endsWith('/motion')) {
            window.history.replaceState(null, '', '/digital/');
        }
        openMotion();
    }
    else if (normalizedPath.endsWith('/play') || normalizedPath.endsWith('/paint')) {
        if (normalizedPath.endsWith('/paint')) {
            window.history.replaceState(null, '', '/play/');
        }
        clearNavigation();
        updatePageMeta("Tyrone Moreno | Play");
    }
    else if (normalizedPath.includes('/gallery')) {
        openWorks();
        const gallerySlugMatch = normalizedPath.match(/\/gallery\/([^\/]+)/);
        if (gallerySlugMatch) {
            // If going back to a specific artwork
            const target = document.querySelector(`[data-slug="${gallerySlugMatch[1]}"]`);
            if (target) target.click();
        } else {
            // If going back to the main gallery from an artwork
            closeLightbox(); 
        }
    } 
    else if (normalizedPath.includes('/store')) {
        openStore();
        const storeSlugMatch = normalizedPath.match(/\/store\/([^\/]+)/);
        if (storeSlugMatch) {
            // If going back to a specific product
            openProduct(storeSlugMatch[1], false);
        } else {
            // If going back to the main store from a product
            closeProduct(); 
        }
    }  
    else if (normalizedPath.endsWith('/time')) {
        openTimePage();
    } 
    else if (normalizedPath.endsWith('/contact')) {
        clearNavigation();
        document.getElementById('page-contact').classList.add('visible');
        document.body.classList.add('overlay-open');
        document.getElementById('btn-contact').classList.add('active');
    } 
    else if (normalizedPath.endsWith('/exhibitions')) {
        clearNavigation();
        document.getElementById('page-exhibitions').classList.add('visible');
        document.getElementById('page-exhibitions').classList.add('active');
    } 
    else if (normalizedPath.endsWith('/press')) {
        clearNavigation();
        document.getElementById('page-press').classList.add('visible');
        document.getElementById('page-press').classList.add('active');
    } 
    else {
        // Default to the home/paint canvas if no specific path matches (e.g. going back to '/')
        clearNavigation(); 
    }
});
document.addEventListener('DOMContentLoaded', () => {
    window.resetButtons();
    initStoreCountdown();
handleRouting();
    const addBtn = document.querySelector('.buy-btn.black:not([onclick])');
    if (addBtn) {
        addBtn.addEventListener('click', addToCart);
    }
});
function clearCustomStyles() {
    const root = document.documentElement;
    const variables = [
        '--bg-color', '--text-color', '--text-muted', 
        '--overlay-bg', '--lightbox-bg', '--logo-filter', 
        '--dot-color', '--frace-blend', '--loader-invert'
    ];
    
    variables.forEach(v => root.style.removeProperty(v));
    isCustomBg = false;
    currentCanvasBg = '#ffffff'; // Reset internal state
}
// --- DYNAMIC HIGH-RES SWAP FOR FIRST 4 IMAGES ---
function updateGalleryQuality() {
    const isDesktop = window.innerWidth > 1024;
    // Select all work-items that are NOT the Rubik's cube
    const workItems = document.querySelectorAll('#page-works .work-item:not(#art-camera)');
    
    // Only target the first 4 eligible items
    const firstFour = Array.from(workItems).slice(0, 4);

    firstFour.forEach(item => {
        const img = item.querySelector('.work-image img');
        if (!img) return;

        // Store the original thumbnail path
        if (!img.dataset.thumbnail) {
            img.dataset.thumbnail = img.src;
        }

        if (isDesktop) {
            const fileName = img.dataset.thumbnail.split('/').pop();
            const cleanName = fileName.replace('_thumbnail', '');
            
            // Thumbnails live in /artwork/gallery/work/thumbnails/ and full-size files live in /artwork/gallery/work/.
            // Build the high-resolution path from the thumbnail filename.
            const highResPath = `/artwork/gallery/work/${cleanName}`;
            if (!img.src.endsWith(highResPath)) {
                img.src = highResPath;
            }
        } else {
            // Swap back to thumbnail
            if (img.src !== img.dataset.thumbnail) {
                img.src = img.dataset.thumbnail;
            }
        }
    });
}

// Update Gallery quality only while Gallery is visible.
window.addEventListener('resize', () => {
    if (!pageWorks.classList.contains('visible')) return;

    clearTimeout(window.resizeTimer);
    window.resizeTimer = setTimeout(updateGalleryQuality, 250);
});

// --- MOTION PAGE: adaptive aspect-ratio cards and canvas-rendered seamless loops. ---
(function () {
    const MOTION_FOLDER = '/artwork/digital/motion/';
    const MOTION_PHONE_FOLDER = MOTION_FOLDER + 'phone/';
    const MOTION_POSTER_FOLDER = MOTION_FOLDER + 'posters/';

    /* Static GitHub Pages file list. Add any future MP4 filename here after
       uploading it to artwork/digital/motion. The list is only used when the Digital
       page is opened, so these files do not load on the home/gallery pages. */
    const MOTION_FILES = Object.freeze([
  'facecollage_01.mp4',
'moneyman.mp4',
 'facecollage_03.mp4',
'puzzleface_01.mp4',
'squishedontrain_01.mp4',
'tattoogirl.mp4',
'threesome_01.mp4',
'chipface.mp4',
'jeff_01.mp4',
        '3dglasses.mp4',
'microphoneman_01.mp4',
'graffitiwoman.mp4',
'partypeople05.mp4',
        'beanieman_01.mp4',
'partypeople04.mp4',
 'motionboy_03.mp4',
'partywood.mp4',
        'funnymedieval_01.mp4',
        'partytest06.mp4',
        'smokingburn_02.mp4',
        'zebra.mp4'
    ]);

    const grid = document.getElementById('motion-grid');
    const viewer = document.getElementById('motion-viewer');
    const viewerStage = document.getElementById('motion-video-stage');
    const viewerVideos = [
        document.getElementById('motion-viewer-video-a'),
        document.getElementById('motion-viewer-video-b')
    ];
    if (!grid || !viewer || !viewerStage || viewerVideos.some((video) => !video)) return;

    const SOURCE_CACHE = new Map();
    const RESOLVED_SOURCES = new Map();

    /* Keep a tiny browser-native media prewarm rack for explicit
       fullscreen/touch intent. Desktop grid hover uses its visible player
       directly, so it does not duplicate the same MP4 request here. */
    const MOTION_PREWARM_SLOTS = 2;
    const MOTION_PREWARM_DELAY_MS = 120;
    const motionPrewarmVideos = [];
    let motionPrewarmTimer = 0;
    let motionPrewarmGeneration = 0;

    const POSTER_CACHE = new Map();
    const MOTION_POSTER_WARM_CACHE = new Map();
    const MOTION_POSTER_META = new Map();
    const POSTER_REQUESTS = new Map();
    const POSTER_QUEUE = [];
    let posterWorkerRunning = false;
    const touchCapable = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const isIOS = /iP(?:hone|ad|od)/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    /* Desktop keeps the existing dual-decoder/canvas behaviour. iPhone and
       iPad use one active decoder plus exact stopped-frame snapshots. */
    const useIOSLeanThumbnails = isIOS;
    const VIEWER_FADE_CLEANUP_MS = 360;

    /* Originals are always used by fullscreen. iPhone and iPad use the
       matching /phone/ encodes only for Motion-grid playback. */
    let motionVideoList = [];
    let motionThumbnailVideoList = [];
    let motionViewerIndex = 0;
    let motionLoadPromise = null;
    let motionLoopers = [];
    let motionObserver = null;
    let motionBatchObserver = null;
    let renderedMotionCount = 0;
    let motionBatchAppendLocked = false;
    let motionBatchUnlockTimer = 0;
    let motionBatchRequestInFlight = null;
    let motionPosterWarmTimer = 0;
    let viewerSource = '';
    const motionPage = document.getElementById('page-motion');
    if (motionPage) {
        motionPage.classList.toggle('desktop-click-fullscreen', !touchCapable);
    }
    /* Mobile Safari has a much smaller practical decoder budget than desktop.
       Keep only the viewport and a narrow pre-roll area hydrated on touch
       devices, and unload them quickly after they leave that area. */
    const MOTION_NEARBY_MARGIN = touchCapable ? 260 : 900;
    const MOTION_UNLOAD_DELAY_MS = touchCapable ? 320 : 900;
    const MAX_TOUCH_HYDRATED_ITEMS = useIOSLeanThumbnails ? 1 : 4;
    let activeThumbnailItem = null;
    let activeThumbnailLooper = null;
    let viewerSession = 0;
    let viewerCloseTimer = 0;
    const viewerFreeze = document.getElementById('motion-viewer-freeze');
    const viewerSafety = document.getElementById('motion-viewer-safety');
    const viewerSafetyImages = [
        document.getElementById('motion-viewer-safety-a'),
        document.getElementById('motion-viewer-safety-b')
    ];
    const viewerHold = document.getElementById('motion-viewer-hold');
    let viewerSafetyIndex = 0;
    let viewerSafetyToken = 0;
    let viewerDisplayedIndex = -1;
    let motionRowLayoutFrame = 0;

    function motionRowGap() {
        if (window.innerWidth >= 1400) return 25;
        if (window.innerWidth <= 1024) return 16;
        return 22;
    }

    function motionTargetRowHeight(containerWidth) {
        /* Match the visual scale of the previous portrait-card grid while
           allowing wide clips to spend horizontal space instead of losing
           height. The slight width scaling keeps rows stable across laptops
           and iPads without producing oversized final rows. */
        if (window.innerWidth >= 1400) return Math.min(540, Math.max(470, containerWidth * 0.325));
        if (window.innerWidth >= 1025) return Math.min(520, Math.max(430, containerWidth * 0.41));
        return Math.min(500, Math.max(340, containerWidth * 0.47));
    }

    function readMotionRatio(item) {
        const stored = Number(item && item.dataset.motionRatio);
        if (Number.isFinite(stored) && stored > 0) return stored;
        const cssRatio = Number.parseFloat(item && item.style.getPropertyValue('--motion-ratio'));
        return Number.isFinite(cssRatio) && cssRatio > 0 ? cssRatio : 0.5625;
    }

    function applyMotionRow(row, containerWidth, gap, targetHeight, justify, forcedHeight = null) {
        if (!row.length) return;
        const ratioTotal = row.reduce((sum, entry) => sum + entry.ratio, 0);
        const gapTotal = gap * Math.max(0, row.length - 1);

        /* Flex wrapping is pixel-sensitive. A mathematically exact row can
           still exceed the browser's usable width by a fraction of a pixel
           after each card width is rounded, causing the final card (notably
           the 16:9 clip) to jump onto the next line and leave a huge hole.
           Keep a tiny invisible fitting allowance so the row selected by the
           layout algorithm always remains on that physical flex line. */
        const rowFitAllowance = justify ? 4 : 0;
        const available = Math.max(1, containerWidth - gapTotal - rowFitAllowance);
        let height = Number.isFinite(forcedHeight) && forcedHeight > 0
            ? forcedHeight
            : justify
                ? available / ratioTotal
                : targetHeight;

        /* Never inflate a sparse/final row beyond the established card scale.
           Completed rows can move slightly either side of the target. */
        if (!justify && !(Number.isFinite(forcedHeight) && forcedHeight > 0)) {
            height = Math.min(height, targetHeight);
        }
        height = Math.max(1, height);

        row.forEach((entry) => {
            const width = Math.max(1, entry.ratio * height);
            entry.item.style.setProperty('--motion-item-width', width.toFixed(3) + 'px');
            entry.item.style.setProperty('--motion-row-height', height.toFixed(3) + 'px');
        });
    }

    function layoutMotionTallSegment(
        entries,
        containerWidth,
        gap,
        targetHeight,
        closeBoundary = false
    ) {
        if (!entries.length) return;

        if (window.innerWidth <= 1024) {
            if (entries.length === 1) {
                applyMotionRow(
                    entries,
                    containerWidth,
                    gap,
                    targetHeight,
                    false
                );
                return;
            }

            const rows = planLargeTouchRows(
                entries,
                containerWidth,
                gap,
                {
                    targetHeight,
                    maxItems: window.innerWidth <= 768 ? 2 : 3,
                    minimumRowHeightFraction:
                        window.innerWidth <= 768 ? 0.68 : 0.62,
                    minimumItemFraction:
                        window.innerWidth <= 768 ? 0.27 : 0.22
                }
            );
            rows.forEach((row) => {
                applyMotionRow(
                    row,
                    containerWidth,
                    gap,
                    targetHeight,
                    true
                );
            });
            return;
        }

        const minAcceptedHeight = targetHeight * 0.88;
        const maxAcceptedHeight = targetHeight * 1.14;
        let row = [];

        entries.forEach((entry) => {
            if (!row.length) {
                row.push(entry);
                return;
            }

            const currentRatios = row.reduce(
                (sum, member) => sum + member.ratio,
                0
            );
            const currentHeight =
                (containerWidth - gap * (row.length - 1)) /
                currentRatios;
            const withRatios = currentRatios + entry.ratio;
            const withHeight =
                (containerWidth - gap * row.length) / withRatios;
            const currentIsGood =
                currentHeight >= minAcceptedHeight &&
                currentHeight <= maxAcceptedHeight;
            const addingIsTooShort = withHeight < minAcceptedHeight;
            const currentCloser =
                Math.abs(currentHeight - targetHeight) <=
                Math.abs(withHeight - targetHeight);

            if (currentIsGood && addingIsTooShort && currentCloser) {
                applyMotionRow(
                    row,
                    containerWidth,
                    gap,
                    targetHeight,
                    true
                );
                row = [entry];
            } else {
                row.push(entry);
                if (withHeight <= targetHeight && row.length > 1) {
                    applyMotionRow(
                        row,
                        containerWidth,
                        gap,
                        targetHeight,
                        true
                    );
                    row = [];
                }
            }
        });

        if (row.length) {
            const ratioTotal = row.reduce(
                (sum, entry) => sum + entry.ratio,
                0
            );
            const naturalWidth =
                ratioTotal * targetHeight +
                gap * Math.max(0, row.length - 1);
            applyMotionRow(
                row,
                containerWidth,
                gap,
                targetHeight,
                closeBoundary || naturalWidth >= containerWidth * 0.9
            );
        }
    }

    function layoutMotionRows() {
        motionRowLayoutFrame = 0;
        unwrapMediaTallClusters(grid, '.motion-item');
        const items = Array.from(grid.querySelectorAll('.motion-item'));
        if (!items.length) return;

        const tallEntries = items.map((item) => ({
            item,
            ratio: readMotionRatio(item)
        }));
        const hasExtraTallMedia = tallEntries.some(
            (entry) => entry.ratio <= MEDIA_TALL_RATIO_THRESHOLD
        );

        if (hasExtraTallMedia) {
            const containerWidth = grid.clientWidth;
            if (!containerWidth) return;
            const gap = window.innerWidth <= 768
                ? 14
                : motionRowGap();

            const portraitRatios = tallEntries
                .map((entry) => entry.ratio)
                .filter((ratio) => ratio > 0 && ratio < 0.82)
                .sort((a, b) => a - b);
            const referencePortraitRatio = portraitRatios.length
                ? portraitRatios[Math.floor(portraitRatios.length / 2)]
                : 0.5625;
            const phoneColumnWidth = Math.max(
                1,
                (containerWidth - gap) / 2
            );
            const targetHeight = window.innerWidth <= 768
                ? Math.max(1, phoneColumnWidth / referencePortraitRatio)
                : motionTargetRowHeight(containerWidth);

            tallEntries.forEach((entry) => {
                entry.item.style.removeProperty('order');
                entry.item.style.removeProperty('--motion-mobile-square-height');
            });

            layoutMediaTallSequence({
                grid,
                entries: tallEntries,
                containerWidth,
                gap,
                targetHeight,
                type: 'motion',
                isPhone: window.innerWidth <= 768,
                layoutSegment: (segment, closeBoundary) =>
                    layoutMotionTallSegment(
                        segment,
                        containerWidth,
                        gap,
                        targetHeight,
                        closeBoundary
                    ),
                applyRow: applyMotionRow,
                clusterOptions: {
                    maxCandidates: window.innerWidth <= 1024 ? 6 : 8,
                    minimumHeightFraction:
                        window.innerWidth <= 1024 ? 0.60 : 0.62,
                    maximumHeightFraction: 1.52,
                    minimumItemFraction:
                        window.innerWidth <= 1024 ? 0.19 : 0.15
                }
            });
            return;
        }

        /* iPhone and iPad keep the exact curated source order. Dynamic
           programming selects only consecutive row breaks, preventing both
           miniature mixed rows and aspect-ratio grouping at the bottom. */
        if (window.innerWidth <= 1024) {
            const containerWidth = grid.clientWidth;
            if (!containerWidth) return;

            const gap = window.innerWidth <= 768 ? 14 : 16;
            const portraitRatios = items
                .map(readMotionRatio)
                .filter((ratio) => Number.isFinite(ratio) && ratio > 0 && ratio < 0.82)
                .sort((a, b) => a - b);
            const referencePortraitRatio = portraitRatios.length
                ? portraitRatios[Math.floor(portraitRatios.length / 2)]
                : 0.5625;
            const phoneColumnWidth = Math.max(1, (containerWidth - gap) / 2);
            const targetHeight = window.innerWidth <= 768
                ? Math.max(1, phoneColumnWidth / referencePortraitRatio)
                : motionTargetRowHeight(containerWidth);

            const entries = items.map((item) => {
                item.style.removeProperty('--motion-mobile-square-height');
                return {
                    item,
                    ratio: readMotionRatio(item)
                };
            });

            if (entries.length === 1) {
                applyMotionRow(entries, containerWidth, gap, targetHeight, false);
                return;
            }

            entries.forEach((entry) => {
                entry.item.style.removeProperty('order');
            });

            const rows = planLargeTouchRows(
                entries,
                containerWidth,
                gap,
                {
                    targetHeight,
                    maxItems: window.innerWidth <= 768 ? 2 : 3,
                    minimumRowHeightFraction:
                        window.innerWidth <= 768 ? 0.68 : 0.62,
                    minimumItemFraction:
                        window.innerWidth <= 768 ? 0.27 : 0.22
                }
            );

            rows.forEach((row) => {
                applyMotionRow(
                    row,
                    containerWidth,
                    gap,
                    targetHeight,
                    true
                );
            });
            return;
        }

        /* Desktop retains its curated source order. */
        items.forEach((item) => item.style.removeProperty('order'));

        const containerWidth = grid.clientWidth;
        if (!containerWidth) return;
        const gap = motionRowGap();
        const targetHeight = motionTargetRowHeight(containerWidth);
        const minAcceptedHeight = targetHeight * 0.88;
        const maxAcceptedHeight = targetHeight * 1.14;
        let row = [];

        items.forEach((item) => {
            const entry = { item, ratio: readMotionRatio(item) };
            if (!row.length) {
                row.push(entry);
                return;
            }

            const currentRatios = row.reduce((sum, member) => sum + member.ratio, 0);
            const currentHeight = (containerWidth - gap * (row.length - 1)) / currentRatios;
            const withRatios = currentRatios + entry.ratio;
            const withHeight = (containerWidth - gap * row.length) / withRatios;

            /* Close the row before this card when the existing set is already
               near the target height and adding the next card would compress
               everything too far. This is what turns portrait + portrait +
               16:9 into one even-height row and pushes the next portrait down. */
            const currentIsGood = currentHeight >= minAcceptedHeight && currentHeight <= maxAcceptedHeight;
            const addingIsTooShort = withHeight < minAcceptedHeight;
            const currentCloser = Math.abs(currentHeight - targetHeight) <= Math.abs(withHeight - targetHeight);

            if (currentIsGood && addingIsTooShort && currentCloser) {
                applyMotionRow(row, containerWidth, gap, targetHeight, true);
                row = [entry];
            } else {
                row.push(entry);
                if (withHeight <= targetHeight && row.length > 1) {
                    applyMotionRow(row, containerWidth, gap, targetHeight, true);
                    row = [];
                }
            }
        });

        if (row.length) {
            const ratioTotal = row.reduce((sum, entry) => sum + entry.ratio, 0);
            const naturalWidth = ratioTotal * targetHeight + gap * Math.max(0, row.length - 1);
            applyMotionRow(row, containerWidth, gap, targetHeight, naturalWidth >= containerWidth * 0.9);
        }
    }

    function scheduleMotionRowLayout() {
        if (motionRowLayoutFrame) cancelAnimationFrame(motionRowLayoutFrame);
        motionRowLayoutFrame = requestAnimationFrame(layoutMotionRows);
    }

    function cardHTML(index) {
        const filename = MOTION_FILES[index] || '';
        const posterURL = filename ? motionPosterURL(filename) : '';
        const posterMeta = posterURL
            ? MOTION_POSTER_META.get(posterURL)
            : null;
        const posterReady = !!(
            posterMeta &&
            posterMeta.ready &&
            posterMeta.width > 0 &&
            posterMeta.height > 0
        );

        /* Each row reaches the DOM only after its posters have completed and
           decoded. Mark successful cards ready immediately so there is no
           shimmer or half-painted image between insertion and the load event. */
        const cardClass =
            'work-item motion-item ' +
            (posterReady ? 'poster-ready' : 'poster-loading') +
            (useIOSLeanThumbnails ? ' ios-lean-motion' : '');

        const posterPriority = index < motionEagerPosterCount()
            ? ' fetchpriority="high"'
            : ' fetchpriority="auto"';
        const posterAttributes = filename
            ? ' src="' + posterURL +
              '" loading="eager"' + posterPriority
            : '';

        const itemRatioAttributes = posterReady
            ? ' data-motion-ratio="' + posterMeta.ratio +
              '" data-motion-native-width="' + posterMeta.width +
              '" data-motion-native-height="' + posterMeta.height +
              '" data-motion-aspect-locked="true"' +
              ' style="--motion-ratio:' + posterMeta.ratio + ';"'
            : '';

        const imageAspectStyle = posterReady
            ? ' style="aspect-ratio:' + posterMeta.width +
              ' / ' + posterMeta.height + ';"'
            : '';

        const cardActionLabel = touchCapable
            ? 'Play or pause motion video'
            : 'Open motion video fullscreen';

        return (
            '<div class="' + cardClass + '" data-motion-index="' + index + '"' +
                itemRatioAttributes + '>' +
                '<div class="work-image" role="button" tabindex="0"' +
                    imageAspectStyle +
                    ' aria-label="' + cardActionLabel + '">' +
                    '<img class="motion-poster" alt="" aria-hidden="true" decoding="async" draggable="false"' + posterAttributes + '>' +
                    /* Desktop injects its seamless dual-decoder player only
                       when hovered. iOS keeps its lean single active decoder. */
                    '<div class="motion-video-stack"></div>' +
                    '<button class="motion-fullscreen-btn" type="button" aria-label="View fullscreen" onclick="openMotionViewer(event, ' + index + ')">' +
                        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
                            '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
            '</div>'
        );
    }

    function motionFileURL(filename) {
        /* Encode each filename safely while keeping the same-origin Pages URL,
           which preserves Safari byte-range loading and the current lazy-load
           behaviour. */
        return MOTION_FOLDER + String(filename)
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');
    }

    function motionPhoneFileURL(filename) {
        return MOTION_PHONE_FOLDER + String(filename)
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');
    }

    function motionPosterURL(filename) {
        const posterName = String(filename).replace(/\.[^/.]+$/, '.webp');
        return MOTION_POSTER_FOLDER + posterName
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');
    }

    function preloadMotionPoster(filename, priority = 'auto') {
        if (!filename) {
            return Promise.resolve({
                ready: false,
                width: 0,
                height: 0,
                ratio: 0,
                url: ''
            });
        }

        const url = motionPosterURL(filename);
        if (MOTION_POSTER_WARM_CACHE.has(url)) {
            return MOTION_POSTER_WARM_CACHE.get(url);
        }

        const request = new Promise((resolve) => {
            const image = new Image();
            image.decoding = 'async';
            image.loading = 'eager';

            if ('fetchPriority' in image) {
                image.fetchPriority = priority;
            }

            let settled = false;
            const timeout = window.setTimeout(() => {
                finish(false);
            }, 10000);

            function finish(ready) {
                if (settled) return;
                settled = true;
                clearTimeout(timeout);

                const width = ready ? image.naturalWidth : 0;
                const height = ready ? image.naturalHeight : 0;
                const meta = {
                    ready: !!(ready && width > 0 && height > 0),
                    width,
                    height,
                    ratio: width > 0 && height > 0
                        ? width / height
                        : 0,
                    url
                };

                if (meta.ready) {
                    MOTION_POSTER_META.set(url, meta);
                }

                resolve(meta);
            }

            const complete = async () => {
                if (
                    image.complete &&
                    image.naturalWidth > 0 &&
                    typeof image.decode === 'function'
                ) {
                    try {
                        await image.decode();
                    } catch (_) {}
                }
                finish(image.naturalWidth > 0 && image.naturalHeight > 0);
            };

            image.addEventListener('load', complete, { once: true });
            image.addEventListener('error', () => finish(false), { once: true });
            image.src = url;

            if (image.complete) complete();
        });

        MOTION_POSTER_WARM_CACHE.set(url, request);
        return request;
    }

    function motionPosterRatio(index) {
        const filename = MOTION_FILES[index];
        if (!filename) return 0.5625;

        const meta = MOTION_POSTER_META.get(
            motionPosterURL(filename)
        );

        return meta && Number.isFinite(meta.ratio) && meta.ratio > 0
            ? meta.ratio
            : 0.5625;
    }

    function motionRowMaximumItems() {
        if (window.innerWidth <= 768) return 2;
        if (window.innerWidth <= 1024) return 3;
        return 6;
    }

    async function preloadNextMotionPosterRow(
        start,
        priority = 'auto'
    ) {
        const total = motionVideoList.length;
        if (start >= total) return { start, end: start };

        const containerWidth = Math.max(
            1,
            grid.clientWidth ||
            motionPage.clientWidth ||
            window.innerWidth
        );
        const gap = window.innerWidth <= 768
            ? 14
            : motionRowGap();
        const targetHeight = motionTargetRowHeight(containerWidth);
        const minAcceptedHeight = targetHeight * 0.88;
        const maxAcceptedHeight = targetHeight * 1.14;
        const maxItems = motionRowMaximumItems();

        const rowRatios = [];
        let end = start;

        while (end < total && rowRatios.length < maxItems) {
            await preloadMotionPoster(MOTION_FILES[end], priority);
            const candidateRatio = motionPosterRatio(end);

            if (rowRatios.length) {
                const currentRatioTotal = rowRatios.reduce(
                    (sum, ratio) => sum + ratio,
                    0
                );
                const currentHeight =
                    (containerWidth - gap * (rowRatios.length - 1)) /
                    currentRatioTotal;
                const withRatioTotal =
                    currentRatioTotal + candidateRatio;
                const withHeight =
                    (containerWidth - gap * rowRatios.length) /
                    withRatioTotal;

                if (window.innerWidth > 1024) {
                    const currentIsGood =
                        currentHeight >= minAcceptedHeight &&
                        currentHeight <= maxAcceptedHeight;
                    const addingIsTooShort =
                        withHeight < minAcceptedHeight;
                    const currentCloser =
                        Math.abs(currentHeight - targetHeight) <=
                        Math.abs(withHeight - targetHeight);

                    /* The candidate is already warmed for the following row,
                       but it is not inserted into this one. */
                    if (
                        currentIsGood &&
                        addingIsTooShort &&
                        currentCloser
                    ) {
                        break;
                    }
                }
            }

            rowRatios.push(candidateRatio);
            end++;

            const ratioTotal = rowRatios.reduce(
                (sum, ratio) => sum + ratio,
                0
            );
            const fittedHeight =
                (containerWidth - gap * (rowRatios.length - 1)) /
                ratioTotal;

            if (window.innerWidth <= 768) {
                /* Phone rows are at most two items. A wide work can occupy a
                   complete row by itself, matching the visual layout. */
                if (
                    rowRatios.length === 1 &&
                    candidateRatio >= 1.2
                ) {
                    break;
                }
                if (
                    rowRatios.length >= 2 ||
                    fittedHeight <= targetHeight
                ) {
                    break;
                }
            } else if (window.innerWidth <= 1024) {
                if (
                    rowRatios.length >= 3 ||
                    (rowRatios.length >= 2 &&
                     fittedHeight <= targetHeight)
                ) {
                    break;
                }
            } else if (
                rowRatios.length > 1 &&
                fittedHeight <= targetHeight
            ) {
                break;
            }
        }

        /* Always make forward progress, even if a missing poster returned no
           dimensions. That card retains the existing generated-poster fallback. */
        if (end === start) {
            await preloadMotionPoster(MOTION_FILES[start], priority);
            end = start + 1;
        }

        return { start, end };
    }

    function scheduleNextMotionPosterWarmup() {
        clearTimeout(motionPosterWarmTimer);

        if (
            renderedMotionCount >= motionVideoList.length ||
            !isMotionPageActive()
        ) {
            return;
        }

        const start = renderedMotionCount;

        const warm = () => {
            if (!isMotionPageActive()) return;
            preloadNextMotionPosterRow(start, 'low');
        };

        if ('requestIdleCallback' in window) {
            motionPosterWarmTimer = window.setTimeout(() => {
                window.requestIdleCallback(warm, { timeout: 900 });
            }, 120);
        } else {
            motionPosterWarmTimer = window.setTimeout(warm, 350);
        }
    }

    function canPrewarmMotion() {
        const connection = navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;

        if (connection && connection.saveData) return false;
        return true;
    }

    function createMotionPrewarmVideo() {
        const video = document.createElement('video');
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;
        video.preload = 'auto';
        video.controls = false;
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('disablepictureinpicture', '');
        video.setAttribute('disableremoteplayback', '');
        video.setAttribute('aria-hidden', 'true');
        video.tabIndex = -1;

        /* Do not use display:none: WebKit may decline to fetch media for a
           non-rendered element. Keep it rendered as a transparent 1px surface
           completely outside the viewport. */
        Object.assign(video.style, {
            position: 'fixed',
            left: '-10000px',
            top: '0',
            width: '1px',
            height: '1px',
            opacity: '0.001',
            pointerEvents: 'none',
            zIndex: '-1'
        });

        document.body.appendChild(video);
        return video;
    }

    function ensureMotionPrewarmSlots() {
        while (motionPrewarmVideos.length < MOTION_PREWARM_SLOTS) {
            motionPrewarmVideos.push(createMotionPrewarmVideo());
        }
        return motionPrewarmVideos;
    }

    function clearMotionPrewarmers() {
        clearTimeout(motionPrewarmTimer);
        motionPrewarmGeneration++;

        motionPrewarmVideos.forEach((video) => {
            video.__motionWarmSource = '';
            video.__motionWarmGeneration = 0;
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch (_) {}
        });
    }

    function normalizedMotionIndex(index, sourceList = motionVideoList) {
        if (!sourceList.length) return -1;
        return (index % sourceList.length + sourceList.length) %
            sourceList.length;
    }

    function prewarmMotionIndices(indices, sourceList = motionVideoList) {
        if (!canPrewarmMotion() || !sourceList.length) return;

        const connection = navigator.connection ||
            navigator.mozConnection ||
            navigator.webkitConnection;
        const effectiveType = connection && connection.effectiveType;
        const slotLimit = /(^|-)2g$|slow-2g/.test(effectiveType || '')
            ? 1
            : MOTION_PREWARM_SLOTS;

        const sources = [];
        const seen = new Set();

        Array.from(indices || []).forEach((rawIndex) => {
            const index = normalizedMotionIndex(Number(rawIndex), sourceList);
            if (index < 0) return;
            const src = sourceList[index];
            if (!src || src === viewerSource || seen.has(src)) return;
            seen.add(src);
            sources.push(src);
        });

        const slots = ensureMotionPrewarmSlots();
        const generation = ++motionPrewarmGeneration;

        slots.forEach((video, slotIndex) => {
            const src = slotIndex < slotLimit ? (sources[slotIndex] || '') : '';

            if (!src) {
                if (video.__motionWarmSource) {
                    video.__motionWarmSource = '';
                    try {
                        video.pause();
                        video.removeAttribute('src');
                        video.load();
                    } catch (_) {}
                }
                return;
            }

            if (video.__motionWarmSource === src && video.getAttribute('src') === src) {
                return;
            }

            video.__motionWarmSource = src;
            video.__motionWarmGeneration = generation;
            video.preload = 'auto';

            const seekOpeningFrame = () => {
                if (video.__motionWarmGeneration !== generation ||
                    video.__motionWarmSource !== src) return;
                try {
                    const start = safeStart(video);
                    if (Number.isFinite(start) &&
                        Math.abs((video.currentTime || 0) - start) > 0.0005) {
                        video.currentTime = start;
                    }
                } catch (_) {}
            };

            video.addEventListener(
                'loadedmetadata',
                seekOpeningFrame,
                { once: true }
            );

            try {
                video.setAttribute('src', src);
                video.load();
            } catch (_) {}
        });
    }

    function scheduleMotionPrewarm(
        indices,
        delay = MOTION_PREWARM_DELAY_MS,
        sourceList = motionVideoList
    ) {
        clearTimeout(motionPrewarmTimer);
        motionPrewarmTimer = setTimeout(() => {
            if (!isMotionPageActive() && !viewer.classList.contains('active')) {
                return;
            }
            prewarmMotionIndices(indices, sourceList);
        }, Math.max(0, delay));
    }

    function prewarmAroundMotionIndex(index, includeCurrent = false) {
        if (!motionVideoList.length) return;
        const current = normalizedMotionIndex(index, motionVideoList);
        const likely = includeCurrent
            ? [current]
            : [current + 1, current - 1];

        /* A deliberate open/navigation action warms only the selected clip.
           Once it is actually playing, the two available slots prepare the
           immediately adjacent clips and nothing else. */
        scheduleMotionPrewarm(
            likely,
            includeCurrent ? 0 : MOTION_PREWARM_DELAY_MS,
            motionVideoList
        );
    }

    async function loadInitialMotionRows() {
        /* First row gets the highest priority and becomes visible immediately
           after every poster in that row has decoded. Rows two and three then
           follow one at a time instead of blocking the first screen. */
        await appendNextMotionBatch(true, {
            observeTail: false,
            scheduleWarm: false
        });

        for (let row = 1; row < 3; row++) {
            if (renderedMotionCount >= motionVideoList.length) break;
            await new Promise((resolve) =>
                requestAnimationFrame(resolve)
            );
            await appendNextMotionBatch(false, {
                observeTail: false,
                scheduleWarm: false
            });
        }

        scheduleNextMotionPosterWarmup();
        observeMotionBatchTail();
    }

    function buildGrid(filenames) {
        motionVideoList = filenames.map(motionFileURL);
        motionThumbnailVideoList = filenames.map((filename) =>
            isIOS
                ? motionPhoneFileURL(filename)
                : motionFileURL(filename)
        );
        grid.innerHTML = '';
        grid.classList.add('is-loading-initial');
        renderedMotionCount = 0;
        setupMotionObservers();
        return loadInitialMotionRows();
    }

    function primeSource(src) {
        /* iOS Safari is substantially more reliable when media remains on its
           original HTTP URL. Large Blob URLs can consume extra memory, bypass
           byte-range behaviour and leave video/canvas surfaces black. */
        if (isIOS) return Promise.resolve(src);
        if (RESOLVED_SOURCES.has(src)) return Promise.resolve(RESOLVED_SOURCES.get(src));
        if (SOURCE_CACHE.has(src)) return SOURCE_CACHE.get(src);

        const request = fetch(src, { cache: 'force-cache' })
            .then((response) => {
                if (!response.ok) throw new Error('Video preload failed');
                return response.blob();
            })
            .then((blob) => {
                const objectURL = URL.createObjectURL(blob);
                RESOLVED_SOURCES.set(src, objectURL);
                return objectURL;
            })
            .catch(() => src);

        SOURCE_CACHE.set(src, request);
        return request;
    }

    function bestSource(src) {
        return RESOLVED_SOURCES.get(src) || src;
    }

    function releaseResolvedSource(src) {
        if (!src) return;
        const resolved = RESOLVED_SOURCES.get(src);
        if (resolved && resolved.startsWith('blob:')) URL.revokeObjectURL(resolved);
        RESOLVED_SOURCES.delete(src);
        SOURCE_CACHE.delete(src);
    }

    function safeStart(video) {
        try {
            if (video.seekable && video.seekable.length) {
                return Math.max(0, video.seekable.start(0) + 0.001);
            }
        } catch (_) {}
        return 0.001;
    }

    function waitForMetadata(video, timeoutMs = 1800) {
        if (video.readyState >= 1 && video.videoWidth && video.videoHeight) {
            return Promise.resolve(video);
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                video.removeEventListener('loadedmetadata', finish);
                resolve(video);
            };
            const timer = setTimeout(finish, timeoutMs);
            video.addEventListener('loadedmetadata', finish, { once: true });
        });
    }

    function waitForSeek(video, target, timeoutMs = 900) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                video.removeEventListener('seeked', finish);
                resolve(video.readyState >= 2);
            };
            const timer = setTimeout(finish, timeoutMs);
            video.addEventListener('seeked', finish, { once: true });
            try {
                if (Math.abs(video.currentTime - target) < 0.002) {
                    finish();
                } else {
                    video.currentTime = target;
                }
            } catch (_) {
                finish();
            }
        });
    }

    function waitForPaintedFrame(video, timeoutMs = 900) {
        return new Promise((resolve) => {
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                video.removeEventListener('playing', onPlaying);
                video.removeEventListener('timeupdate', onTimeUpdate);
                resolve(ok);
            };
            const onPlaying = () => requestAnimationFrame(() => finish(video.readyState >= 2));
            const onTimeUpdate = () => finish(video.readyState >= 2);
            const timer = setTimeout(() => finish(video.readyState >= 2), timeoutMs);
            video.addEventListener('playing', onPlaying, { once: true });
            video.addEventListener('timeupdate', onTimeUpdate, { once: true });
            if (typeof video.requestVideoFrameCallback === 'function') {
                video.requestVideoFrameCallback(() => finish(true));
            }
        });
    }

    /* Safari can resolve play() before a newly-started hidden decoder has
       actually submitted its next frame to the compositor. Waiting for a
       genuinely newer media frame lets the outgoing clip remain visible until
       the standby is already moving, rather than revealing a parked first
       frame and creating a visible pause at every loop boundary. */
    function waitForFreshVideoFrame(video, startTime, timeoutMs = 260) {
        return new Promise((resolve) => {
            if (!video) {
                resolve(false);
                return;
            }

            let settled = false;
            let frameCallbackId = 0;
            const threshold = Number.isFinite(startTime) ? startTime + 0.001 : -1;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                video.removeEventListener('timeupdate', onTimeUpdate);
                if (frameCallbackId && typeof video.cancelVideoFrameCallback === 'function') {
                    try { video.cancelVideoFrameCallback(frameCallbackId); } catch (_) {}
                }
                resolve(!!ok);
            };
            const onTimeUpdate = () => {
                if (video.readyState >= 2 && video.currentTime > threshold) finish(true);
            };
            const timer = setTimeout(() => {
                finish(video.readyState >= 2 && video.currentTime > threshold);
            }, timeoutMs);

            video.addEventListener('timeupdate', onTimeUpdate);
            if (typeof video.requestVideoFrameCallback === 'function') {
                const checkFrame = (_now, metadata) => {
                    if (settled) return;
                    const mediaTime = metadata && Number.isFinite(metadata.mediaTime)
                        ? metadata.mediaTime
                        : video.currentTime;
                    if (video.readyState >= 2 && mediaTime > threshold) {
                        finish(true);
                    } else {
                        frameCallbackId = video.requestVideoFrameCallback(checkFrame);
                    }
                };
                frameCallbackId = video.requestVideoFrameCallback(checkFrame);
            } else {
                requestAnimationFrame(() => requestAnimationFrame(onTimeUpdate));
            }
        });
    }

    function setCardAspectDimensions(item, width, height, options = {}) {
        if (!item || !width || !height) return;
        const numericWidth = Number(width);
        const numericHeight = Number(height);
        if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight) || numericWidth <= 0 || numericHeight <= 0) return;

        const lockNativeAspect = options.lockNativeAspect === true;
        if (item.dataset.motionAspectLocked === 'true' && !lockNativeAspect) {
            /* The checked-in first-frame WebP comes directly from this MP4 and
               is the authoritative card geometry. Later canvas snapshots use
               the card's CSS pixel dimensions, so allowing their image load
               event to redefine the card ratio can turn portrait clips into
               landscape cards. Keep the original native ratio locked. */
            const lockedWidth = Number(item.dataset.motionNativeWidth);
            const lockedHeight = Number(item.dataset.motionNativeHeight);
            if (lockedWidth > 0 && lockedHeight > 0) {
                width = lockedWidth;
                height = lockedHeight;
            } else {
                return;
            }
        } else {
            width = numericWidth;
            height = numericHeight;
        }

        const ratio = width / height;
        const workImage = item.querySelector('.work-image');
        if (workImage) workImage.style.aspectRatio = width + ' / ' + height;
        item.style.setProperty('--motion-ratio', String(ratio));
        item.dataset.motionRatio = String(ratio);
        item.classList.toggle('motion-landscape', ratio >= 1.2);
        item.classList.toggle('motion-square', ratio >= 0.82 && ratio < 1.2);
        item.classList.toggle('motion-portrait', ratio < 0.82);

        if (lockNativeAspect) {
            item.dataset.motionNativeWidth = String(width);
            item.dataset.motionNativeHeight = String(height);
            item.dataset.motionAspectLocked = 'true';
        }
        scheduleMotionRowLayout();
    }

    function applyMotionPoster(item, poster) {
        if (!item || !poster || !poster.url) return;
        const image = item.querySelector('.motion-poster');
        if (!image) return;
        image.src = poster.url;
        item.dataset.posterReady = 'true';
        item.classList.remove('poster-loading');
        item.classList.add('poster-ready');
        setCardAspectDimensions(item, poster.width, poster.height, {
            lockNativeAspect: item.dataset.motionAspectLocked !== 'true'
        });
    }

    function waitForPosterEvent(video, names, timeoutMs) {
        if (video.readyState >= 1 && video.videoWidth && video.videoHeight && names.includes('loadedmetadata')) {
            return Promise.resolve(true);
        }
        return new Promise((resolve) => {
            let settled = false;
            const finish = (ok) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                names.forEach((name) => video.removeEventListener(name, onSuccess));
                video.removeEventListener('error', onError);
                resolve(ok);
            };
            const onSuccess = () => finish(true);
            const onError = () => finish(false);
            const timer = setTimeout(() => finish(false), timeoutMs);
            names.forEach((name) => video.addEventListener(name, onSuccess, { once: true }));
            video.addEventListener('error', onError, { once: true });
        });
    }

    async function seekPosterVideo(video, time) {
        const target = Math.max(0.001, time || 0.001);
        if (Math.abs(video.currentTime - target) > 0.003) {
            const pending = waitForPosterEvent(video, ['seeked', 'loadeddata'], 1800);
            try { video.currentTime = target; } catch (_) {}
            await pending;
        }

        /* Muted inline autoplay is used only by this single serial probe. It
           forces iOS Safari to produce an actual drawable frame without
           increasing the gallery's decoder count. */
        try {
            const promise = video.play();
            if (promise && typeof promise.then === 'function') await promise;
        } catch (_) {}

        await new Promise((resolve) => {
            let settled = false;
            const finish = () => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                resolve();
            };
            const timer = setTimeout(finish, 700);
            if (typeof video.requestVideoFrameCallback === 'function') {
                video.requestVideoFrameCallback(finish);
            } else {
                video.addEventListener('timeupdate', finish, { once: true });
                video.addEventListener('loadeddata', finish, { once: true });
                requestAnimationFrame(() => requestAnimationFrame(finish));
            }
        });
        video.pause();
    }

    function canvasContainsVisibleFrame(canvas) {
        const sample = document.createElement('canvas');
        sample.width = 24;
        sample.height = 24;
        const ctx = sample.getContext('2d', { willReadFrequently: true });
        if (!ctx) return true;
        try {
            ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
            const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
            let total = 0;
            let maximum = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                const value = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
                total += value;
                if (value > maximum) maximum = value;
            }
            const average = total / (pixels.length / 4);
            /* Reject only a genuinely blank decoder surface. Very dark art is
               retained as long as it contains even modest visible detail. */
            return maximum > 18 || average > 4;
        } catch (_) {
            return true;
        }
    }

    async function generateMotionPoster(src) {
        const video = document.createElement('video');
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;
        video.preload = 'auto';
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('aria-hidden', 'true');
        video.tabIndex = -1;
        video.style.cssText = 'position:fixed;left:-8px;top:-8px;width:4px;height:4px;opacity:0.001;pointer-events:none;z-index:-1;';

        try {
            const absolute = new URL(src, location.href);
            if (absolute.origin !== location.origin) video.crossOrigin = 'anonymous';
        } catch (_) {}

        document.body.appendChild(video);
        try {
            video.src = src;
            video.load();
            const metadataReady = await waitForPosterEvent(video, ['loadedmetadata'], 6500);
            if (!metadataReady || !video.videoWidth || !video.videoHeight) throw new Error('Poster metadata unavailable');

            const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 2;
            const targets = [0.035, 0.10, 0.22, 0.45, Math.min(0.85, duration * 0.18)]
                .map((time) => Math.min(Math.max(0.001, time), Math.max(0.001, duration - 0.035)))
                .filter((time, index, values) => index === 0 || Math.abs(time - values[index - 1]) > 0.025);

            const maxDimension = touchCapable ? 480 : 640;
            const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) throw new Error('Poster canvas unavailable');

            let captured = false;
            for (const target of targets) {
                await seekPosterVideo(video, target);
                if (video.readyState < 2 || !video.videoWidth) continue;
                try {
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    if (canvasContainsVisibleFrame(canvas)) {
                        captured = true;
                        break;
                    }
                } catch (_) {}
            }
            if (!captured) {
                /* One final attempt after a longer muted decode window. */
                try {
                    const play = video.play();
                    if (play && typeof play.then === 'function') await play;
                    await new Promise((resolve) => setTimeout(resolve, 240));
                    video.pause();
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    captured = true;
                } catch (_) {}
            }
            if (!captured) throw new Error('No poster frame decoded');

            let url = canvas.toDataURL('image/webp', 0.76);
            if (!url || url === 'data:,') url = canvas.toDataURL('image/jpeg', 0.78);
            return { url, width: video.videoWidth, height: video.videoHeight };
        } finally {
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch (_) {}
            video.remove();
        }
    }

    async function runPosterWorker() {
        if (posterWorkerRunning) return;
        posterWorkerRunning = true;
        while (POSTER_QUEUE.length) {
            const src = POSTER_QUEUE.shift();
            const request = POSTER_REQUESTS.get(src);
            if (!request) continue;
            let poster = null;
            try {
                poster = await generateMotionPoster(src);
                POSTER_CACHE.set(src, poster);
            } catch (_) {
                /* A single delayed retry covers Safari's occasional failure to
                   allocate the temporary decoder immediately after navigation. */
                if (!request.retried && isMotionPageActive()) {
                    request.retried = true;
                    POSTER_QUEUE.push(src);
                    await new Promise((resolve) => setTimeout(resolve, 350));
                    continue;
                }
            }

            POSTER_REQUESTS.delete(src);
            if (poster) request.items.forEach((item) => applyMotionPoster(item, poster));
            await new Promise((resolve) => setTimeout(resolve, touchCapable ? 45 : 20));
        }
        posterWorkerRunning = false;
    }

    function requestMotionPoster(item, index) {
        const src = motionThumbnailVideoList[index] || motionVideoList[index];
        if (!item || !src || item.dataset.posterReady === 'true') return;
        const cached = POSTER_CACHE.get(src);
        if (cached) {
            applyMotionPoster(item, cached);
            return;
        }
        let request = POSTER_REQUESTS.get(src);
        if (!request) {
            request = { items: new Set(), retried: false };
            POSTER_REQUESTS.set(src, request);
            POSTER_QUEUE.push(src);
        }
        request.items.add(item);
        runPosterWorker();
    }

    function prepareStaticMotionPoster(item, index) {
        if (!item) return;
        const image = item.querySelector('.motion-poster');
        const filename = MOTION_FILES[index];
        if (!image || !filename) return;

        const posterPath = motionPosterURL(filename);
        const expectedPosterURL = new URL(posterPath, location.href).href;
        const applyDimensions = () => {
            /* This handler must only measure the original checked-in WebP.
               Desktop later replaces the same <img> with a canvas snapshot;
               that snapshot is sized in CSS pixels and is not valid metadata
               for the MP4's native aspect ratio. */
            const loadedURL = image.currentSrc || image.src || '';
            if (loadedURL && loadedURL !== expectedPosterURL) return;
            if (!image.naturalWidth || !image.naturalHeight) return;
            item.dataset.posterReady = 'true';
            item.classList.remove('poster-loading');
            item.classList.add('poster-ready');
            setCardAspectDimensions(item, image.naturalWidth, image.naturalHeight, { lockNativeAspect: true });
        };

        image.addEventListener('load', applyDimensions, { once: true });
        image.addEventListener('error', () => {
            /* Missing poster files fall back to the old serial decoder rather
               than ever leaving a permanent black card. */
            item.classList.add('poster-loading');
            requestMotionPoster(item, index);
        }, { once: true });
        if (!image.getAttribute('src')) image.src = posterPath;
        if (image.complete && image.naturalWidth) applyDimensions();
    }

    function setCardAspect(item, video) {
        if (!item || !video.videoWidth || !video.videoHeight) return;
        setCardAspectDimensions(item, video.videoWidth, video.videoHeight, {
            lockNativeAspect: item.dataset.motionAspectLocked !== 'true'
        });
    }

    class CanvasLoopPlayer {
        constructor(videos, options = {}) {
            this.videos = videos;
            this.muted = options.muted !== false;
            this.onMetadata = options.onMetadata || null;
            this.source = '';
            this.activeIndex = 0;
            this.playing = false;
            this.generation = 0;
            this.rafId = 0;
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.primed = [false, false];
            this.priming = [null, null];
            this.parent = videos[0].parentElement;
            this.canvas = this.parent.querySelector('.motion-transition-canvas');
            if (!this.canvas) {
                this.canvas = document.createElement('canvas');
                this.canvas.className = 'motion-transition-canvas';
                this.canvas.setAttribute('aria-hidden', 'true');
                this.parent.appendChild(this.canvas);
            }
            this.canvasOnly = options.canvasOnly === true;
            this.canvasAlpha = options.canvasAlpha === true;
            this.deferStandbyLoad = options.deferStandbyLoad === true;
            this.nativePlaybackSurface =
                options.nativePlaybackSurface === true &&
                !this.canvasOnly;
            this.fitMode = options.fitMode === 'contain' ? 'contain' : 'cover';
            this.ctx = this.canvas.getContext('2d', {
                alpha: this.canvasAlpha,
                desynchronized: true
            });
            /* Thumbnail players retain their established cover crop. The
               fullscreen player explicitly requests contain + canvas-only. */
            const requestedScale = Number(options.scale);
            this.scale = Number.isFinite(requestedScale)
                ? requestedScale
                : (this.parent.classList.contains('motion-video-stage') ? 1.075 : 1.08);
            this.lastGoodFrame = false;
            this.isTouchThumbnail = touchCapable && !this.parent.classList.contains('motion-video-stage');

            videos.forEach((video, index) => {
                video.controls = false;
                video.removeAttribute('controls');
                video.loop = false;
                video.playsInline = true;
                video.disablePictureInPicture = true;
                video.disableRemotePlayback = true;
                video.setAttribute('playsinline', '');
                video.setAttribute('webkit-playsinline', '');
                video.setAttribute('disablepictureinpicture', '');
                video.setAttribute('disableremoteplayback', '');
                video.defaultPlaybackRate = 1;
                video.playbackRate = 1;
                video.preservesPitch = true;
                video.muted = true;
                video.defaultMuted = true;
                video.volume = 0;
                /* Critical iOS fallback: the active native video stays visible
                   until drawImage() has successfully produced a canvas frame. */
                video.style.opacity = index === 0 ? '1' : '0';
                video.style.pointerEvents = 'none';
                video.classList.toggle('is-active', index === 0);

                video.addEventListener('ratechange', () => {
                    if (video.playbackRate !== 1) video.playbackRate = 1;
                    if (video.defaultPlaybackRate !== 1) video.defaultPlaybackRate = 1;
                });
                video.addEventListener('loadedmetadata', () => {
                    if (this.onMetadata) this.onMetadata(video);
                });
                video.addEventListener('loadeddata', () => {
                    if (!this.canvasOnly &&
                        !this.playing &&
                        index === this.activeIndex &&
                        !this.lastGoodFrame) {
                        video.style.opacity = '1';
                        video.classList.add('is-active');
                    }
                });
            });
        }

        get activeVideo() { return this.videos[this.activeIndex]; }
        get standbyVideo() { return this.videos[1 - this.activeIndex]; }

        resizeCanvas() {
            const cssWidth = Math.max(1, Math.round(this.parent.clientWidth));
            const cssHeight = Math.max(1, Math.round(this.parent.clientHeight));
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.round(cssWidth * dpr));
            const height = Math.max(1, Math.round(cssHeight * dpr));
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }
            this.canvas.style.width = cssWidth + 'px';
            this.canvas.style.height = cssHeight + 'px';
            this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            return { width: cssWidth, height: cssHeight };
        }

        drawVideo(video, alpha = 1, replace = false) {
            if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return false;
            const size = this.resizeCanvas();
            const baseScale = this.fitMode === 'contain'
                ? Math.min(size.width / video.videoWidth, size.height / video.videoHeight)
                : Math.max(size.width / video.videoWidth, size.height / video.videoHeight);
            const scale = baseScale * this.scale;
            const drawWidth = video.videoWidth * scale;
            const drawHeight = video.videoHeight * scale;
            const x = (size.width - drawWidth) / 2;
            const y = (size.height - drawHeight) / 2;
            try {
                this.ctx.save();

                /* Clear transparent fullscreen pixels before drawing a new
                   aspect ratio. Never replace the unused canvas area with
                   opaque black. */
                if (replace && this.canvasAlpha) {
                    const dpr = Math.min(window.devicePixelRatio || 1, 2);
                    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                }

                this.ctx.globalAlpha = alpha;
                this.ctx.globalCompositeOperation =
                    replace && !this.canvasAlpha ? 'copy' : 'source-over';
                this.ctx.drawImage(video, x, y, drawWidth, drawHeight);
                this.ctx.restore();
                this.lastGoodFrame = true;
                return true;
            } catch (_) {
                try { this.ctx.restore(); } catch (_) {}
                return false;
            }
        }

        showCanvas() {
            if (this.lastGoodFrame) this.canvas.style.display = 'block';
        }

        hideCanvas() {
            this.canvas.style.display = 'none';
        }

        showDirectVideo(index = this.activeIndex) {
            if (this.canvasOnly) {
                this.videos.forEach((video) => {
                    video.style.opacity = '0';
                    video.style.visibility = 'hidden';
                    video.classList.remove('is-active');
                });
                return;
            }

            this.hideCanvas();
            this.videos.forEach((video, videoIndex) => {
                const active = videoIndex === index;
                video.style.opacity = active ? '1' : '0';
                video.classList.toggle('is-active', active);
            });
        }

        ensureVideoSource(video) {
            if (!video.getAttribute('src') && this.source) {
                video.setAttribute('src', this.source);
                video.load();
            }
        }

        setSource(src) {
            this.stop(false);
            this.source = src;
            this.activeIndex = 0;
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.primed = [false, false];
            this.priming = [null, null];
            this.lastGoodFrame = false;
            this.hideCanvas();
            this.videos.forEach((video, index) => {
                const isActiveDecoder = index === 0;
                const shouldLoadNow =
                    isActiveDecoder ||
                    (!this.deferStandbyLoad && !this.isTouchThumbnail);

                if (shouldLoadNow) {
                    if (video.getAttribute('src') !== src) {
                        video.setAttribute('src', src);
                    }
                    video.preload = isActiveDecoder ? 'auto' : 'metadata';
                    video.load();
                } else {
                    /* Fullscreen keeps decoder B completely dormant until the
                       active clip is close to its loop boundary. */
                    video.pause();
                    video.removeAttribute('src');
                    video.preload = 'none';
                    video.load();
                }

                video.defaultPlaybackRate = 1;
                video.playbackRate = 1;
                video.muted = true;
                video.defaultMuted = true;
                video.volume = 0;
                video.style.opacity = this.canvasOnly ? '0' : (index === 0 ? '1' : '0');
                video.style.visibility = this.canvasOnly ? 'hidden' : 'visible';
                video.classList.toggle('is-active', !this.canvasOnly && index === 0);
            });
        }

        upgradeSource(src) {
            if (!src || this.playing || this.source === src) return;
            this.setSource(src);
        }

        async seekToStart(video) {
            this.ensureVideoSource(video);
            await waitForMetadata(video);
            video.pause();
            video.defaultPlaybackRate = 1;
            video.playbackRate = 1;
            return waitForSeek(video, safeStart(video));
        }

        async prime(index, generation = this.generation) {
            if (this.primed[index]) return true;
            if (this.priming[index]) return this.priming[index];
            const video = this.videos[index];
            this.priming[index] = (async () => {
                await this.seekToStart(video);
                if (generation !== this.generation) return false;
                video.muted = true;
                video.defaultMuted = true;
                video.volume = 0;
                video.defaultPlaybackRate = 1;
                video.playbackRate = 1;
                try {
                    await video.play();
                    await waitForPaintedFrame(video, 750);
                } catch (_) {}
                video.pause();
                await waitForSeek(video, safeStart(video), 650);
                if (generation !== this.generation) return false;
                this.primed[index] = video.readyState >= 2;
                return this.primed[index];
            })().finally(() => {
                this.priming[index] = null;
            });
            return this.priming[index];
        }

        async preparePreview() {
            if (this.playing || !this.source) return;
            const generation = this.generation;
            const active = this.activeVideo;
            this.ensureVideoSource(active);
            active.style.opacity = '1';
            active.classList.add('is-active');
            try {
                await waitForMetadata(active, 1600);
                if (generation !== this.generation || this.playing) return;
                if (Math.abs(active.currentTime - safeStart(active)) > 0.004) {
                    await waitForSeek(active, safeStart(active), 900);
                }
                /* A muted one-frame warm-up makes Safari produce a thumbnail
                   surface. It is best-effort; Low Power Mode may reject it. */
                const previewPlay = active.play();
                if (previewPlay && typeof previewPlay.then === 'function') await previewPlay;
                await waitForPaintedFrame(active, 750);
                active.pause();
                if (generation !== this.generation || this.playing) return;
                active.style.opacity = '1';
                active.classList.add('is-active');
            } catch (_) {
                active.pause();
                this.showDirectVideo(this.activeIndex);
            }
        }

        overlapSeconds(video) {
            const duration = Number.isFinite(video.duration) ? video.duration : 5;
            return Math.max(0.045, Math.min(0.075, duration * 0.012));
        }

        async play() {
            if (!this.source || this.playing) return false;
            this.playing = true;
            const generation = ++this.generation;
            const active = this.activeVideo;

            this.ensureVideoSource(active);
            active.muted = this.muted;
            active.defaultMuted = this.muted;
            active.volume = 1;
            active.defaultPlaybackRate = 1;
            active.playbackRate = 1;
            active.style.opacity = this.canvasOnly ? '0' : '1';
            active.style.visibility = this.canvasOnly ? 'hidden' : 'visible';
            active.classList.toggle('is-active', !this.canvasOnly);

            /* Call play synchronously from the tap/hover activation path.
               Awaiting a seek first can lose iOS's transient user activation. */
            let playPromise;
            try {
                if (active.ended || (Number.isFinite(active.duration) &&
                    active.currentTime >= active.duration - 0.02)) {
                    active.currentTime = safeStart(active);
                }
                playPromise = active.play();
                if (playPromise && typeof playPromise.then === 'function') await playPromise;
                await waitForPaintedFrame(active, 1200);
            } catch (_) {
                if (generation === this.generation) {
                    this.playing = false;
                    this.showDirectVideo(this.activeIndex);
                }
                return false;
            }
            if (!this.playing || generation !== this.generation) return false;

            if (this.nativePlaybackSurface) {
                /* While moving, let the browser present the decoded video
                   directly. Canvas is reserved for the tiny loop overlap and
                   the exact hover-out freeze. */
                this.showDirectVideo(this.activeIndex);
            } else if (this.drawVideo(active, 1, true)) {
                this.showCanvas();
            } else {
                this.showDirectVideo(this.activeIndex);
            }
            this.startRenderLoop(generation);

            if (!this.deferStandbyLoad) {
                this.prime(1 - this.activeIndex, generation);
            }

            return true;
        }
        pause() {
            this.playing = false;
            this.generation++;
            cancelAnimationFrame(this.rafId);
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.videos.forEach((video) => video.pause());
        }

        stop(reset = true) {
            this.pause();
            if (!reset) return;
            const stoppedGeneration = this.generation;
            const active = this.activeVideo;
            this.seekToStart(active).then(() => {
                if (this.playing || stoppedGeneration !== this.generation) return;
                if (this.drawVideo(active, 1, true)) this.showCanvas();
                else this.showDirectVideo(this.activeIndex);
            });
            this.primed = [false, false];
            this.priming = [null, null];
        }

        toggle() {
            if (this.playing) {
                this.pause();
                return Promise.resolve(false);
            }
            return this.play();
        }

        beginCrossfade(generation) {
            if (this.crossfade || this.crossfadeStarting || !this.playing || generation !== this.generation) return;
            this.crossfadeStarting = true;
            const fromIndex = this.activeIndex;
            const from = this.videos[fromIndex];
            const nextIndex = 1 - fromIndex;
            const to = this.videos[nextIndex];
            const durationMs = this.overlapSeconds(from) * 1000;

            const launch = async () => {
                if (!this.primed[nextIndex]) await this.prime(nextIndex, generation);
                if (!this.playing || generation !== this.generation || this.crossfade || fromIndex !== this.activeIndex) {
                    this.crossfadeStarting = false;
                    return;
                }
                to.muted = true;
                to.defaultMuted = true;
                to.volume = 0;
                to.defaultPlaybackRate = 1;
                to.playbackRate = 1;

                /* Start the standby decoder and explicitly consume the play
                   promise. An uncaught rejected promise was the red console
                   error seen when Safari interrupted a play with pause/reset. */
                try {
                    const standbyPlay = to.play();
                    if (standbyPlay && typeof standbyPlay.then === 'function') await standbyPlay;
                } catch (_) {
                    this.crossfadeStarting = false;
                    return;
                }
                if (!this.playing || generation !== this.generation || fromIndex !== this.activeIndex) {
                    to.pause();
                    this.crossfadeStarting = false;
                    return;
                }
                this.crossfade = {
                    fromIndex,
                    toIndex: nextIndex,
                    startedAt: performance.now(),
                    durationMs
                };
                this.crossfadeStarting = false;
            };
            launch();
        }

        finishCrossfade(generation) {
            if (!this.crossfade || generation !== this.generation) return;
            const oldIndex = this.crossfade.fromIndex;
            const newIndex = this.crossfade.toIndex;
            const oldVideo = this.videos[oldIndex];
            const newVideo = this.videos[newIndex];

            this.activeIndex = newIndex;
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.primed[newIndex] = false;
            oldVideo.pause();
            oldVideo.muted = true;
            oldVideo.defaultMuted = true;
            oldVideo.volume = 0;
            newVideo.defaultPlaybackRate = 1;
            newVideo.playbackRate = 1;
            newVideo.muted = this.muted;
            newVideo.defaultMuted = this.muted;
            newVideo.volume = 1;
            oldVideo.style.opacity = '0';
            oldVideo.classList.remove('is-active');
            newVideo.style.opacity = '1';
            newVideo.classList.add('is-active');
            this.primed[oldIndex] = false;
            this.priming[oldIndex] = null;

            if (this.nativePlaybackSurface) {
                /* The overlap canvas has completed its job. Return immediately
                   to the newly active native video surface. */
                this.showDirectVideo(newIndex);
            }

            if (this.deferStandbyLoad) {
                try {
                    oldVideo.removeAttribute('src');
                    oldVideo.preload = 'none';
                    oldVideo.load();
                } catch (_) {}
            } else {
                this.prime(oldIndex, generation);
            }
        }

        startRenderLoop(generation) {
            cancelAnimationFrame(this.rafId);
            const render = (now) => {
                if (!this.playing || generation !== this.generation) return;
                const active = this.activeVideo;

                if (this.crossfade) {
                    const from = this.videos[this.crossfade.fromIndex];
                    const to = this.videos[this.crossfade.toIndex];
                    const progress = Math.min(1, Math.max(0, (now - this.crossfade.startedAt) / this.crossfade.durationMs));
                    const drewBase = this.drawVideo(from, 1, true);
                    if (drewBase) {
                        this.drawVideo(to, progress, false);
                        this.showCanvas();
                    } else {
                        this.showDirectVideo(this.crossfade.fromIndex);
                    }
                    if (progress >= 1) this.finishCrossfade(generation);
                } else {
                    /* Native thumbnail playback avoids copying every decoded
                       frame into canvas. The render loop now only watches the
                       timeline so it can prepare the seamless overlap. */
                    if (!this.nativePlaybackSurface) {
                        if (this.drawVideo(active, 1, true)) {
                            this.showCanvas();
                        } else {
                            this.showDirectVideo(this.activeIndex);
                        }
                    }

                    const duration = active.duration;
                    if (Number.isFinite(duration) && duration > 0) {
                        const remaining = duration - active.currentTime;
                        const overlap = this.overlapSeconds(active);
                        if (remaining <= Math.max(0.30, overlap * 4)) {
                            this.prime(1 - this.activeIndex, generation);
                        }
                        if (remaining <= overlap + 0.035) {
                            this.beginCrossfade(generation);
                        }
                        if (active.ended || remaining <= -0.01) {
                            this.beginCrossfade(generation);
                        }
                    }
                }

                this.rafId = requestAnimationFrame(render);
            };
            this.rafId = requestAnimationFrame(render);
        }
    }

    class IOSThumbnailPlayer {
        constructor(video, item, onMetadata) {
            this.videos = [video];
            this.activeIndex = 0;
            this.video = video;
            this.item = item;
            this.parent = video.parentElement;
            this.onMetadata = onMetadata || null;
            this.source = '';
            this.fallbackSource = '';
            this.onSourceFallback = null;
            this.fallbackAttempted = false;
            this.sourceLoadFailed = false;
            this.playing = false;
            this.generation = 0;
            this.rafId = 0;
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.isIOSLeanThumbnail = true;
            this.canvas = this.parent.querySelector('.motion-transition-canvas') || null;
            this.configureVideo(video, true);
        }

        get activeVideo() {
            return this.videos[this.activeIndex] || this.video || null;
        }

        get standbyVideo() {
            if (this.videos.length < 2) return null;
            return this.videos[1 - this.activeIndex] || null;
        }

        configureVideo(video, active = false) {
            video.controls = false;
            video.removeAttribute('controls');
            video.loop = false;
            video.removeAttribute('loop');
            video.muted = true;
            video.defaultMuted = true;
            video.volume = 0;
            video.defaultPlaybackRate = 1;
            video.playbackRate = 1;
            video.playsInline = true;
            video.preload = 'none';
            video.disablePictureInPicture = true;
            video.disableRemotePlayback = true;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.setAttribute('disablepictureinpicture', '');
            video.setAttribute('disableremoteplayback', '');

            /* Keep both WebKit hardware surfaces permanently locked to the
               complete thumbnail box, including the custom-height square row. */
            video.style.position = 'absolute';
            video.style.inset = '0';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.minWidth = '100%';
            video.style.minHeight = '100%';
            video.style.maxWidth = 'none';
            video.style.maxHeight = 'none';
            video.style.objectFit = 'cover';
            video.style.objectPosition = '50% 50%';
            video.style.transform = 'scale(1.08)';
            video.style.transformOrigin = '50% 50%';
            video.style.zIndex = active ? '2' : '0';
            video.style.opacity = active ? '1' : '0';
            video.style.pointerEvents = 'none';
            video.style.willChange = active ? 'opacity, transform' : 'auto';
            video.classList.toggle('is-active', active);
            video.__motionPrimed = false;
            video.__motionPrimePromise = null;

            video.addEventListener('ratechange', () => {
                if (video.playbackRate !== 1) video.playbackRate = 1;
                if (video.defaultPlaybackRate !== 1) video.defaultPlaybackRate = 1;
            });
            video.addEventListener('loadedmetadata', () => {
                if (this.onMetadata) this.onMetadata(video);
            });
            video.addEventListener('error', () => {
                /* A missing /phone/ encode must not leave the iOS card dead.
                   Record the failed source here; play() performs one safe retry
                   with the original MP4 without racing the outer tap handler. */
                if (video.getAttribute('src') === this.source) {
                    this.sourceLoadFailed = true;
                }
            });
        }

        setLayerState(video, active, opacity = active ? 1 : 0, zIndex = active ? 2 : 0) {
            if (!video) return;
            video.style.position = 'absolute';
            video.style.inset = '0';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.minWidth = '100%';
            video.style.minHeight = '100%';
            video.style.maxWidth = 'none';
            video.style.maxHeight = 'none';
            video.style.objectFit = 'cover';
            video.style.objectPosition = '50% 50%';
            video.style.transform = 'scale(1.08)';
            video.style.transformOrigin = '50% 50%';
            video.style.opacity = String(opacity);
            video.style.zIndex = String(zIndex);
            video.style.willChange = this.playing ? 'opacity, transform' : 'auto';
            video.classList.toggle('is-active', active);
        }

        setSource(src) {
            if (!src) return;
            if (this.source && this.source !== src) this.releaseSource();
            this.source = src;
            this.sourceLoadFailed = false;
        }

        setFallbackSource(src, onFallback = null) {
            this.fallbackSource = src && src !== this.source ? src : '';
            this.onSourceFallback = typeof onFallback === 'function'
                ? onFallback
                : null;
            this.fallbackAttempted = false;
        }

        ensureVideoSource(video, preload = 'auto') {
            if (!video || !this.source) return;
            video.preload = preload;
            if (video.getAttribute('src') !== this.source) {
                video.setAttribute('src', this.source);
                video.load();
                video.__motionPrimed = false;
            }
        }

        ensureStandby() {
            const current = this.standbyVideo;
            if (current && current.isConnected && current.parentElement === this.parent) {
                return current;
            }

            const active = this.activeVideo;
            this.videos = active ? [active] : [];
            this.activeIndex = 0;
            this.video = active || null;

            const standby = createMotionVideoLayer(false);
            this.configureVideo(standby, false);
            if (this.canvas && this.canvas.parentElement === this.parent) {
                this.parent.insertBefore(standby, this.canvas);
            } else {
                this.parent.appendChild(standby);
            }
            this.videos.push(standby);
            return standby;
        }

        ensureSource(preload = 'auto') {
            this.ensureVideoSource(this.activeVideo, preload);
        }

        prepare() {
            if (this.playing || !this.source) return;
            this.ensureSource('auto');
        }

        clearCanvas() {
            if (!this.canvas) return;
            try {
                const context = this.canvas.getContext('2d');
                if (context) context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            } catch (_) {}
            this.canvas.style.display = 'none';
        }

        resetPrime(video) {
            if (!video) return;
            video.__motionPrimed = false;
            video.__motionPrimePromise = null;
        }

        async prime(video, generation = this.generation) {
            if (!video || !this.source) return false;
            if (video.__motionPrimed && video.readyState >= 2) return true;
            if (video.__motionPrimePromise) return video.__motionPrimePromise;

            video.__motionPrimePromise = (async () => {
                this.ensureVideoSource(video, 'auto');
                await waitForMetadata(video, 1800);
                if (generation !== this.generation || !this.playing) return false;

                try {
                    video.pause();
                    video.loop = false;
                    video.removeAttribute('loop');
                } catch (_) {}

                const start = safeStart(video);
                await waitForSeek(video, start, 950);
                if (generation !== this.generation || !this.playing) return false;

                /* Decode a genuine opening frame well before the loop boundary,
                   then park the standby back at the opening frame. */
                try {
                    const promise = video.play();
                    if (promise && typeof promise.then === 'function') await promise;
                    await waitForFreshVideoFrame(video, start, 450);
                } catch (_) {}

                try { video.pause(); } catch (_) {}
                await waitForSeek(video, start, 850);
                if (generation !== this.generation || !this.playing) return false;

                video.__motionPrimed = video.readyState >= 2;
                this.setLayerState(video, false, 0, 0);
                return video.__motionPrimed;
            })().finally(() => {
                video.__motionPrimePromise = null;
            });

            return video.__motionPrimePromise;
        }

        overlapSeconds(video) {
            /* Match fullscreen exactly: a very small 45–75 ms handoff.
               This keeps Safari's two-decoder safety without making short
               mobile thumbnail loops feel accelerated. */
            const duration = Number.isFinite(video && video.duration) ? video.duration : 5;
            return Math.max(0.045, Math.min(0.075, duration * 0.012));
        }

        async play() {
            if (!this.source) return false;
            if (this.playing) return true;

            const active = this.activeVideo;
            if (!active) return false;

            this.item.classList.remove('mobile-video-frozen');
            this.playing = true;
            const generation = ++this.generation;
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.clearCanvas();

            this.ensureVideoSource(active, 'auto');
            active.muted = true;
            active.defaultMuted = true;
            active.volume = 0;
            active.defaultPlaybackRate = 1;
            active.playbackRate = 1;
            active.loop = false;
            active.removeAttribute('loop');
            this.setLayerState(active, true, 1, 2);

            try {
                if (active.ended ||
                    (Number.isFinite(active.duration) &&
                     active.currentTime >= active.duration - 0.02)) {
                    active.currentTime = safeStart(active);
                }

                const promise = active.play();
                if (promise && typeof promise.then === 'function') await promise;
                const painted = await waitForPaintedFrame(active, 1200);
                if (!painted || generation !== this.generation || !this.playing) {
                    throw new Error('No painted frame');
                }

                this.parent.classList.add('has-frame');
                this.item.classList.add('is-playing');

                const standby = this.ensureStandby();
                this.ensureVideoSource(standby, 'auto');
                this.prime(standby, generation);
                this.startRenderLoop(generation);
                return true;
            } catch (_) {
                const sourceDefinitelyFailed = this.sourceLoadFailed ||
                    !!active.error ||
                    active.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;

                if (generation === this.generation) {
                    this.playing = false;
                    try { active.pause(); } catch (_) {}
                    this.item.classList.remove('is-playing');
                    if (!this.item.classList.contains('mobile-video-frozen')) {
                        this.parent.classList.remove('has-frame');
                    }
                }

                /* On iPhone/iPad, first try the small /phone/ encode. When that
                   file genuinely does not exist or cannot be decoded, switch
                   this card to the normal /digital/motion/ MP4 and retry once. */
                if (sourceDefinitelyFailed &&
                    this.fallbackSource &&
                    !this.fallbackAttempted &&
                    this.source !== this.fallbackSource) {
                    const fallback = this.fallbackSource;
                    this.fallbackAttempted = true;
                    this.setSource(fallback);
                    if (this.onSourceFallback) {
                        try { this.onSourceFallback(fallback); } catch (_) {}
                    }
                    return this.play();
                }

                return false;
            }
        }

        async beginCrossfade(generation) {
            if (this.crossfade || this.crossfadeStarting ||
                !this.playing || generation !== this.generation) return;

            const fromIndex = this.activeIndex;
            const from = this.videos[fromIndex];
            const to = this.ensureStandby();
            const toIndex = this.videos.indexOf(to);
            if (!from || !to || toIndex < 0 || toIndex === fromIndex) return;

            this.crossfadeStarting = true;
            const start = safeStart(to);

            try {
                const ready = await this.prime(to, generation);
                if (!ready || !this.playing || generation !== this.generation ||
                    fromIndex !== this.activeIndex) {
                    this.crossfadeStarting = false;
                    return;
                }

                if (Math.abs(to.currentTime - start) > 0.004) {
                    await waitForSeek(to, start, 850);
                }
                if (!this.playing || generation !== this.generation ||
                    fromIndex !== this.activeIndex) {
                    this.crossfadeStarting = false;
                    return;
                }

                to.muted = true;
                to.defaultMuted = true;
                to.volume = 0;
                to.defaultPlaybackRate = 1;
                to.playbackRate = 1;
                to.loop = false;
                to.removeAttribute('loop');
                this.setLayerState(to, false, 0, 3);

                /* Emergency continuity only while Safari submits the standby's
                   first moving frame. */
                from.loop = true;
                from.setAttribute('loop', '');

                const promise = to.play();
                if (promise && typeof promise.then === 'function') await promise;
                const fresh = await waitForFreshVideoFrame(to, start, 360);

                from.loop = false;
                from.removeAttribute('loop');

                if (!fresh || !this.playing || generation !== this.generation ||
                    fromIndex !== this.activeIndex) {
                    try { to.pause(); } catch (_) {}
                    this.crossfadeStarting = false;
                    return;
                }

                this.crossfade = {
                    fromIndex,
                    toIndex,
                    startedAt: performance.now(),
                    durationMs: this.overlapSeconds(from) * 1000
                };
                this.crossfadeStarting = false;
            } catch (_) {
                try {
                    from.loop = false;
                    from.removeAttribute('loop');
                    to.pause();
                } catch (_) {}
                this.crossfadeStarting = false;
            }
        }

        finishCrossfade(generation) {
            if (!this.crossfade || generation !== this.generation) return;

            const oldIndex = this.crossfade.fromIndex;
            const newIndex = this.crossfade.toIndex;
            const oldVideo = this.videos[oldIndex];
            const newVideo = this.videos[newIndex];

            this.crossfade = null;
            this.crossfadeStarting = false;
            this.activeIndex = newIndex;
            this.video = newVideo;

            try {
                oldVideo.pause();
                oldVideo.loop = false;
                oldVideo.removeAttribute('loop');
            } catch (_) {}
            this.setLayerState(oldVideo, false, 0, 0);
            this.setLayerState(newVideo, true, 1, 2);

            this.resetPrime(oldVideo);
            this.prime(oldVideo, generation);
        }

        startRenderLoop(generation) {
            cancelAnimationFrame(this.rafId);

            const render = (now) => {
                if (!this.playing || generation !== this.generation) return;

                if (this.crossfade) {
                    const from = this.videos[this.crossfade.fromIndex];
                    const to = this.videos[this.crossfade.toIndex];
                    const progress = Math.min(
                        1,
                        Math.max(0, (now - this.crossfade.startedAt) / this.crossfade.durationMs)
                    );

                    /* Keep both layers marked active during the overlap so the
                       iOS z-index safety rule cannot suppress either half. */
                    this.setLayerState(from, true, 1 - progress, 2);
                    this.setLayerState(to, true, progress, 3);

                    if (progress >= 1) this.finishCrossfade(generation);
                } else {
                    const active = this.activeVideo;
                    if (active && Number.isFinite(active.duration) && active.duration > 0) {
                        const remaining = active.duration - active.currentTime;
                        const overlap = this.overlapSeconds(active);

                        if (remaining <= Math.max(0.42, overlap + 0.24)) {
                            const standby = this.ensureStandby();
                            this.prime(standby, generation);
                        }

                        /* Use the same final handoff allowance as fullscreen.
                           Standby preparation still happens earlier above, but
                           the visible crossfade no longer begins prematurely. */
                        if (remaining <= overlap + 0.035 || active.ended) {
                            this.beginCrossfade(generation);
                        }
                    }
                }

                this.rafId = requestAnimationFrame(render);
            };

            this.rafId = requestAnimationFrame(render);
        }

        freezeAndUnload() {
            ++this.generation;
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
            this.playing = false;

            let held = this.activeVideo;
            if (this.crossfade) {
                const progress = Math.min(
                    1,
                    Math.max(
                        0,
                        (performance.now() - this.crossfade.startedAt) /
                        this.crossfade.durationMs
                    )
                );
                held = this.videos[
                    progress >= 0.5 ? this.crossfade.toIndex : this.crossfade.fromIndex
                ] || held;
            }

            this.crossfade = null;
            this.crossfadeStarting = false;
            let heldFrame = false;

            this.videos.forEach((video) => {
                try {
                    video.pause();
                    video.loop = false;
                    video.removeAttribute('loop');
                } catch (_) {}
            });

            if (held && held.readyState >= 2 && held.videoWidth > 0 && held.videoHeight > 0) {
                this.setLayerState(held, true, 1, 3);
                held.style.willChange = 'auto';
                heldFrame = true;
            }

            this.videos.forEach((video) => {
                if (video === held) return;
                this.setLayerState(video, false, 0, 0);
                try { video.remove(); } catch (_) {}
                try {
                    video.removeAttribute('src');
                    video.load();
                } catch (_) {}
            });

            this.videos = held ? [held] : [];
            this.activeIndex = 0;
            this.video = held || null;
            this.item.classList.remove('is-playing', 'has-frozen-poster');
            this.clearCanvas();

            if (heldFrame) {
                this.item.classList.add('mobile-video-frozen');
                this.parent.classList.add('has-frame');
            } else {
                this.item.classList.remove('mobile-video-frozen');
                this.parent.classList.remove('has-frame');
            }
            return heldFrame;
        }

        pause() {
            return this.freezeAndUnload();
        }

        stop() {
            return this.freezeAndUnload();
        }

        toggle() {
            if (this.playing) {
                this.freezeAndUnload();
                return Promise.resolve(false);
            }
            return this.play();
        }

        releaseSource() {
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
            this.crossfade = null;
            this.crossfadeStarting = false;

            this.videos.forEach((video) => {
                try {
                    video.pause();
                    video.loop = false;
                    video.removeAttribute('loop');
                    video.removeAttribute('src');
                    video.load();
                } catch (_) {}
                this.setLayerState(video, false, 0, 0);
            });
        }

        destroy() {
            ++this.generation;
            this.playing = false;
            cancelAnimationFrame(this.rafId);
            this.rafId = 0;
            this.item.classList.remove('is-playing', 'mobile-video-frozen');

            this.videos.forEach((video) => {
                try {
                    video.pause();
                    video.loop = false;
                    video.removeAttribute('loop');
                    video.removeAttribute('src');
                    video.load();
                } catch (_) {}
                try { video.remove(); } catch (_) {}
            });

            this.videos = [];
            this.video = null;
            this.crossfade = null;
            this.crossfadeStarting = false;
            this.clearCanvas();
            this.parent.classList.remove('has-frame');
        }
    }

    function motionEagerPosterCount() {
        // Only the first visible row should compete for bandwidth immediately.
        if (window.innerWidth <= 768) return 2;
        if (window.innerWidth <= 1024) return 3;
        return 4;
    }

    function motionBatchRootMargin() {
        // Posters for the next group are already warmed in browser cache.
        // Insert that group before it can become visible during fast scrolling.
        if (window.innerWidth <= 768) return 520;
        if (window.innerWidth <= 1024) return 700;
        return 950;
    }

    function isMotionPageActive() {
        return !!motionPage && motionPage.classList.contains('visible') && !document.hidden;
    }

    function isNearMotionViewport(item, margin = MOTION_NEARBY_MARGIN) {
        if (!item || !motionPage || !isMotionPageActive()) return false;
        const rect = item.getBoundingClientRect();
        const rootRect = motionPage.getBoundingClientRect();
        return rect.bottom >= rootRect.top - margin && rect.top <= rootRect.bottom + margin;
    }

    function setActiveThumbnail(item, looper) {
        if (activeThumbnailItem && activeThumbnailItem !== item) {
            activeThumbnailItem.classList.remove('is-playing');
        }
        activeThumbnailItem = item || null;
        activeThumbnailLooper = looper || null;
        if (item) item.classList.toggle('is-playing', !!(looper && looper.playing));
    }

    function stopActiveThumbnail(exceptItem = null) {
        if (!activeThumbnailItem || activeThumbnailItem === exceptItem) return;
        const previousItem = activeThumbnailItem;
        const previousLooper = activeThumbnailLooper || previousItem.motionLooper;
        activeThumbnailItem = null;
        activeThumbnailLooper = null;
        previousItem.classList.remove('is-playing');
        const previousStack = previousItem.querySelector('.motion-video-stack');

        if (previousLooper && previousLooper.isIOSLeanThumbnail) {
            /* Pause the real visible video surface. Do not dehydrate it here:
               removing its source forces Safari to replace the frame with a
               canvas/poster whose colour does not match the MP4. It will still
               be released normally once the card leaves the Motion viewport. */
            const heldFrame = previousLooper.pause();
            if (!heldFrame && previousStack) previousStack.classList.remove('has-frame');
            return;
        }

        /* Desktop can receive the next card's mouseenter before the previous
           card's mouseleave. Freeze the previous card here as well and never
           clear its visible stack first, otherwise that event ordering exposes
           the card background for one compositor frame. */
        if (previousLooper) {
            previousItem.classList.add('is-freezing');
            const captured = captureDesktopFrame(previousItem, previousLooper, previousStack);
            previousLooper.pause();
            if (captured) commitDesktopFreezeToPoster(previousItem, previousLooper, previousStack);
            else revealMotionPosterImmediately(previousItem, previousStack);
        }
    }

    function enforceTouchHydrationLimit(preferredItem = null) {
        if (!touchCapable || !motionPage) return;
        const rootRect = motionPage.getBoundingClientRect();
        const viewportCenter = (rootRect.top + rootRect.bottom) / 2;
        const hydrated = Array.from(grid.querySelectorAll('.motion-item'))
            .filter((item) => !!item.motionLooper);
        if (hydrated.length <= MAX_TOUCH_HYDRATED_ITEMS) return;

        hydrated.sort((a, b) => {
            const priority = (item) => {
                if (item === preferredItem) return -3;
                if (item === activeThumbnailItem) return -2;
                if (item.classList.contains('mobile-video-frozen') &&
                    isNearMotionViewport(item, 0)) return -1;
                const rect = item.getBoundingClientRect();
                return Math.abs(((rect.top + rect.bottom) / 2) - viewportCenter);
            };
            return priority(a) - priority(b);
        });

        hydrated.slice(MAX_TOUCH_HYDRATED_ITEMS).forEach((item) => {
            if (item === preferredItem || item === activeThumbnailItem) return;
            /* A visible paused video is the exact freeze surface. Keep it
               until it leaves the viewport; off-screen held frames may be
               safely released to stay within Safari's media budget. */
            if (item.classList.contains('mobile-video-frozen') &&
                isNearMotionViewport(item, 0)) return;
            dehydrateMotionItem(item);
        });
    }

    function ensureCardSource(looper, src) {
        /* Keep thumbnails on their normal same-origin HTTP URL. This preserves
           byte-range loading and lets the browser discard media buffers when
           the card is dehydrated instead of retaining whole-file Blob URLs. */
        if (looper && !looper.source) looper.setSource(src);
    }

    function createMotionVideoLayer(active) {
        const video = document.createElement('video');
        video.className = 'motion-video-layer' + (active ? ' is-active' : '');
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.preload = 'none';
        video.disablePictureInPicture = true;
        video.disableRemotePlayback = true;
        video.crossOrigin = 'anonymous';
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('disablepictureinpicture', '');
        video.setAttribute('disableremoteplayback', '');
        return video;
    }

    function hydrateMotionItem(item, index) {
        if (!item || !isMotionPageActive()) return item ? item.motionLooper : null;
        if (item.motionLooper) return item.motionLooper;

        const stack = item.querySelector('.motion-video-stack');
        const src = motionThumbnailVideoList[index] || motionVideoList[index];
        if (!stack || !src) return null;

        clearTimeout(item.motionUnloadTimer);
        let looper;
        if (useIOSLeanThumbnails) {
            const video = createMotionVideoLayer(true);
            const frozenCanvas = stack.querySelector('.motion-transition-canvas');

            /* Preserve an existing exact frozen canvas while the next MP4 is
               loading. Removing it here exposed the older poster underneath
               and could create a colour/crop jump before Safari painted the
               new video frame. */
            Array.from(stack.querySelectorAll('.motion-video-layer')).forEach((oldVideo) => {
                try {
                    oldVideo.pause();
                    oldVideo.removeAttribute('src');
                    oldVideo.load();
                } catch (_) {}
                oldVideo.remove();
            });

            if (frozenCanvas) stack.insertBefore(video, frozenCanvas);
            else stack.appendChild(video);

            looper = new IOSThumbnailPlayer(video, item, (metadataVideo) => setCardAspect(item, metadataVideo));
        } else {
            const videoA = createMotionVideoLayer(true);
            const videoB = createMotionVideoLayer(false);
            stack.classList.remove('has-frame');
            stack.replaceChildren(videoA, videoB);
            looper = new CanvasLoopPlayer([videoA, videoB], {
                muted: true,
                nativePlaybackSurface: true,
                onMetadata: (video) => setCardAspect(item, video)
            });
        }
        item.motionLooper = looper;
        item.dataset.motionSrc = src;
        motionLoopers.push(looper);

        /* iPhone/iPad prefer the compressed /phone/ file, but a missing phone
           encode now falls back automatically to the original Motion MP4. */
        const originalSrc = motionVideoList[index];
        if (looper.isIOSLeanThumbnail && originalSrc && src !== originalSrc) {
            looper.setFallbackSource(originalSrc, (fallbackSrc) => {
                motionThumbnailVideoList[index] = fallbackSrc;
                item.dataset.motionSrc = fallbackSrc;
            });
        }

        ensureCardSource(looper, src);

        /* iOS creates no nearby decoders automatically; this limit is only a
           final safety net for rapid taps. Desktop behaviour remains intact. */
        enforceTouchHydrationLimit(item);
        return looper;
    }

    function dehydrateMotionItem(item) {
        if (!item) return;
        clearTimeout(item.motionUnloadTimer);
        const looper = item.motionLooper;
        if (!looper) return;

        if (looper.isIOSLeanThumbnail) {
            looper.destroy();
            motionLoopers = motionLoopers.filter((entry) => entry !== looper);
            if (activeThumbnailItem === item || activeThumbnailLooper === looper) {
                activeThumbnailItem = null;
                activeThumbnailLooper = null;
            }
            item.classList.remove('is-playing', 'mobile-video-frozen');
            item.motionLooper = null;
            /* Keep the tiny no-source video/canvas DOM momentarily if a frame
               snapshot is being converted. Its decoder is already released. */
            return;
        }

        looper.pause();
        looper.videos.forEach((video) => {
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch (_) {}
        });
        if (looper.canvas) {
            try {
                const ctx = looper.canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, looper.canvas.width, looper.canvas.height);
            } catch (_) {}
        }

        motionLoopers = motionLoopers.filter((entry) => entry !== looper);
        if (activeThumbnailItem === item || activeThumbnailLooper === looper) {
            activeThumbnailItem = null;
            activeThumbnailLooper = null;
        }
        item.classList.remove('is-playing');
        item.motionLooper = null;
        const stack = item.querySelector('.motion-video-stack');
        if (stack) {
            stack.classList.remove('has-frame');
            stack.replaceChildren();
        }
    }

    function scheduleMotionUnload(item) {
        if (!item || !item.motionLooper) return;
        clearTimeout(item.motionUnloadTimer);
        item.motionUnloadTimer = setTimeout(() => {
            if (!isNearMotionViewport(item)) dehydrateMotionItem(item);
        }, MOTION_UNLOAD_DELAY_MS);
    }

    function bindReliableTap(element, action, excludedSelector) {
        let lastActivation = -1000;
        const activate = (event) => {
            if (excludedSelector && event.target.closest && event.target.closest(excludedSelector)) return;
            const now = performance.now();
            if (now - lastActivation < 450) {
                if (event.cancelable) event.preventDefault();
                event.stopPropagation();
                return;
            }
            lastActivation = now;
            if (event.cancelable) event.preventDefault();
            event.stopPropagation();
            action();
        };
        element.addEventListener('pointerup', (event) => {
            if (event.pointerType === 'touch' || event.pointerType === 'pen') activate(event);
        }, { passive: false });
        if (!window.PointerEvent) element.addEventListener('touchend', activate, { passive: false });
        element.addEventListener('click', (event) => {
            if (touchCapable) activate(event);
            else action();
        });
        element.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
                event.preventDefault();
                action();
            }
        });
    }

    function revealMotionPosterImmediately(item, stack) {
        if (!item) return;
        const poster = item.querySelector('.motion-poster');
        if (poster) {
            poster.style.transition = 'none';
            poster.style.opacity = '1';
        }
        item.classList.remove('is-freezing');
        item.classList.remove('is-playing');
        if (stack) stack.classList.remove('has-frame');
    }

    function captureDesktopFrame(item, looper, stack) {
        if (!item || !looper || looper.isIOSLeanThumbnail || !looper.canvas) return false;
        try {
            const active = looper.activeVideo;
            if (active && active.readyState >= 2 && active.videoWidth && active.videoHeight) {
                looper.drawVideo(active, 1, true);
            }
            if (!looper.lastGoodFrame) return false;
            looper.showCanvas();
            if (stack) stack.classList.add('has-frame');
            return true;
        } catch (_) {
            return false;
        }
    }

    function commitDesktopFreezeToPoster(item, looper, stack) {
        if (!item || !looper || looper.isIOSLeanThumbnail || !looper.canvas) return false;
        const poster = item.querySelector('.motion-poster');
        const canvas = looper.canvas;
        if (!poster || typeof canvas.toBlob !== 'function') return false;

        /* The canvas is the visible frozen surface on desktop. Capture it
           synchronously and KEEP it displayed; the poster conversion below is
           only a background backup for later dehydration/off-screen cleanup.
           There is therefore no canvas -> image layer swap on pointerleave. */
        if (!captureDesktopFrame(item, looper, stack)) return false;
        if (!canvas.width || !canvas.height) return false;

        const generation = (item.motionFreezeGeneration || 0) + 1;
        item.motionFreezeGeneration = generation;
        item.classList.add('is-freezing');
        item.classList.remove('is-playing');

        const finish = (blob) => {
            if (!blob || item.motionFreezeGeneration !== generation || looper.playing) return;

            const url = URL.createObjectURL(blob);
            const previous = item.dataset.freezeObjectUrl || '';
            const probe = new Image();
            probe.onload = () => {
                if (item.motionFreezeGeneration !== generation || looper.playing) {
                    try { URL.revokeObjectURL(url); } catch (_) {}
                    return;
                }

                /* Decode away from the visible poster first. Only after the
                   backup is ready do we replace its source, eliminating the
                   last race where a rapid re-hover could leave a revoked or
                   half-decoded image underneath the canvas. */
                item.classList.add('has-frozen-poster');
                poster.style.transition = 'none';
                poster.style.opacity = '1';
                poster.src = url;
                item.classList.remove('is-freezing');
                item.dataset.freezeObjectUrl = url;
                item.dataset.posterReady = 'true';
                item.classList.remove('poster-loading');
                item.classList.add('poster-ready');

                if (previous.startsWith('blob:') && previous !== url) {
                    try { URL.revokeObjectURL(previous); } catch (_) {}
                }
            };
            probe.onerror = () => {
                /* The exact canvas freeze is still visible; keep the previous
                   poster as the backup and discard only this failed blob. */
                try { URL.revokeObjectURL(url); } catch (_) {}
                if (item.motionFreezeGeneration === generation && !looper.playing) {
                    item.classList.remove('is-freezing');
                }
            };
            probe.src = url;
        };

        try {
            canvas.toBlob((blob) => {
                if (blob) finish(blob);
                else {
                    try { canvas.toBlob(finish, 'image/jpeg', 0.86); } catch (_) {}
                }
            }, 'image/webp', 0.84);
            return true;
        } catch (_) {
            item.classList.remove('is-freezing');
            return true; // the already-painted canvas is still a valid freeze
        }
    }

    function initMotionItem(item) {
        if (!item || item.dataset.motionBound === 'true') return;
        const index = Number(item.dataset.motionIndex);
        const workImage = item.querySelector('.work-image');
        const src = motionThumbnailVideoList[index] || motionVideoList[index];
        if (!workImage || !Number.isInteger(index) || !src) return;

        item.dataset.motionBound = 'true';
        item.dataset.motionSrc = src;
        /* Static first-frame posters are now used on desktop as well as iOS.
           The serial MP4 decoder remains only as a missing-file fallback. */
        prepareStaticMotionPoster(item, index);

        const play = async () => {
            item.motionFreezeGeneration = (item.motionFreezeGeneration || 0) + 1;
            item.classList.remove('is-freezing');
            const poster = item.querySelector('.motion-poster');
            if (poster) {
                poster.style.removeProperty('opacity');
                poster.style.removeProperty('transition');
            }
            const looper = hydrateMotionItem(item, index);
            if (!looper) return;
            stopActiveThumbnail(item);
            ensureCardSource(looper, src);
            /* Reserve the single mobile playback slot immediately. A second
               fast tap can then cancel this pending play before Safari starts
               another decoder. */
            activeThumbnailItem = item;
            activeThumbnailLooper = looper;
            item.classList.remove('is-playing');
            const started = await looper.play();
            const stack = item.querySelector('.motion-video-stack');
            if (started && looper.playing && activeThumbnailItem === item) {
                if (stack) stack.classList.add('has-frame');
                setActiveThumbnail(item, looper);
            } else if (activeThumbnailItem === item) {
                if (stack) stack.classList.remove('has-frame');
                setActiveThumbnail(null, null);
            }
        };
        const stop = () => {
            const looper = item.motionLooper;
            if (!looper) return;
            const stack = item.querySelector('.motion-video-stack');

            /* Atomic desktop hover-out: paint the current MP4 frame into the
               canvas BEFORE pausing the decoder, then leave that same canvas
               on screen. No opacity swap, source change or poster replacement
               occurs in the visible path. */
            if (!useIOSLeanThumbnails) {
                item.classList.add('is-freezing');
                const captured = captureDesktopFrame(item, looper, stack);
                looper.pause();
                if (activeThumbnailItem === item) setActiveThumbnail(null, null);
                item.classList.remove('is-playing');
                if (captured) commitDesktopFreezeToPoster(item, looper, stack);
                else revealMotionPosterImmediately(item, stack);
                return;
            }

            looper.pause();
            if (activeThumbnailItem === item) setActiveThumbnail(null, null);
            item.classList.remove('is-playing');
        };
        const toggle = async () => {
            const looper = hydrateMotionItem(item, index);
            if (!looper) return;
            if (looper.playing) {
                const captured = looper.pause();
                if (activeThumbnailItem === item) setActiveThumbnail(null, null);
                item.classList.remove('is-playing');
                const stack = item.querySelector('.motion-video-stack');
                const desktopFreeze = !looper.isIOSLeanThumbnail &&
                    commitDesktopFreezeToPoster(item, looper, stack);
                if ((!looper.isIOSLeanThumbnail && !desktopFreeze) ||
                    (looper.isIOSLeanThumbnail && !captured)) {
                    if (stack) stack.classList.remove('has-frame');
                }
                /* Keep the paused iOS video element on its current frame.
                   Off-screen cleanup still releases it through the normal
                   Motion viewport observer. */
                return;
            }
            stopActiveThumbnail(item);
            ensureCardSource(looper, src);
            /* Reserve the single mobile playback slot immediately. A second
               fast tap can then cancel this pending play before Safari starts
               another decoder. */
            activeThumbnailItem = item;
            activeThumbnailLooper = looper;
            item.classList.remove('is-playing');
            const started = await looper.play();
            const stack = item.querySelector('.motion-video-stack');
            if (started && looper.playing && activeThumbnailItem === item) {
                if (stack) stack.classList.add('has-frame');
                setActiveThumbnail(item, looper);
            } else if (activeThumbnailItem === item) {
                if (stack) stack.classList.remove('has-frame');
                setActiveThumbnail(null, null);
            }
        };

        if (useIOSLeanThumbnails) {
            let warmTimer = 0;
            let warmPlayer = null;
            let startX = 0;
            let startY = 0;
            workImage.addEventListener('pointerdown', (event) => {
                if (event.target.closest && event.target.closest('.motion-fullscreen-btn')) return;
                startX = event.clientX;
                startY = event.clientY;

                /* The press itself is useful intent. Start the lightweight
                   browser prewarm now; the real decoder is still protected by
                   the movement-sensitive 85ms guard below. */
                prewarmMotionIndices([index], motionThumbnailVideoList);

                clearTimeout(warmTimer);
                warmTimer = setTimeout(() => {
                    /* An intentional press releases the previously playing
                       decoder before preloading the newly selected MP4. Normal
                       scrolling moves beyond the threshold before this fires. */
                    if (activeThumbnailItem && activeThumbnailItem !== item) stopActiveThumbnail(item);
                    warmPlayer = hydrateMotionItem(item, index);
                    if (warmPlayer) {
                        ensureCardSource(warmPlayer, src);
                        warmPlayer.prepare();
                    }
                }, 85);
            }, { passive: true });
            workImage.addEventListener('pointermove', (event) => {
                if (Math.hypot(event.clientX - startX, event.clientY - startY) < 12) return;
                clearTimeout(warmTimer);
                if (warmPlayer && warmPlayer !== activeThumbnailLooper) {
                    const player = warmPlayer;
                    warmPlayer = null;
                    setTimeout(() => {
                        if (item !== activeThumbnailItem && item.motionLooper === player) dehydrateMotionItem(item);
                    }, 180);
                }
            }, { passive: true });
            workImage.addEventListener('pointercancel', () => {
                clearTimeout(warmTimer);
            }, { passive: true });
        }

        const fullscreenButton = item.querySelector('.motion-fullscreen-btn');
        if (fullscreenButton) {
            fullscreenButton.addEventListener('pointerdown', () => {
                prewarmAroundMotionIndex(index, true);
            }, { passive: true });
        }

        if (touchCapable) {
            bindReliableTap(workImage, toggle, '.motion-fullscreen-btn');
        } else {
            item.addEventListener('mouseenter', () => {
                /* Desktop interaction is deliberately immediate. The visible
                   dual-decoder player is itself the loader, avoiding a second
                   invisible request for the same MP4. */
                play();
            });

            item.addEventListener('mouseleave', () => {
                stop();
            });

            /* Pointerdown is stronger intent than hover: prepare the original
               fullscreen source before the completed click opens the viewer. */
            workImage.addEventListener('pointerdown', () => {
                prewarmAroundMotionIndex(index, true);
            }, { passive: true });

            /* The desktop thumbnail itself remains the fullscreen target. */
            workImage.addEventListener('click', (event) => {
                window.openMotionViewer(event, index);
            });
            workImage.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                window.openMotionViewer(event, index);
            });
        }
        if (motionObserver) motionObserver.observe(item);
    }

    function initMotionItems(items) {
        Array.from(items || []).forEach(initMotionItem);
    }

    function observeMotionBatchTail() {
        if (!motionBatchObserver) return;
        motionBatchObserver.disconnect();
        if (renderedMotionCount >= motionVideoList.length) return;
        const lastItem = grid.querySelector('.motion-item:last-child');
        if (lastItem) motionBatchObserver.observe(lastItem);
    }

    function appendNextMotionBatch(
        isInitial = false,
        options = {}
    ) {
        if (renderedMotionCount >= motionVideoList.length) {
            return Promise.resolve();
        }

        if (motionBatchRequestInFlight) {
            return motionBatchRequestInFlight;
        }

        const start = renderedMotionCount;
        const priority = isInitial ? 'high' : 'auto';

        motionBatchRequestInFlight = preloadNextMotionPosterRow(
            start,
            priority
        ).then(({ end }) => {
            let cards = '';
            for (let index = start; index < end; index++) {
                cards += cardHTML(index);
            }

            grid.insertAdjacentHTML('beforeend', cards);
            renderedMotionCount = end;

            /* The first completed physical row replaces the page loader.
               Later rows arrive only after their own posters are decoded. */
            if (isInitial) {
                grid.classList.remove('is-loading-initial');

                /* The first decoded poster row is now visibly in the DOM.
                   Remove the page-level loader immediately so it can never
                   sit over already-rendered Motion artwork. */
                if (motionPage) {
                    motionPage.dispatchEvent(
                        new CustomEvent('section:first-content-ready')
                    );
                    hideSectionPageLoader(motionPage, 0);
                }
            }

            const newItems = Array.from(
                grid.querySelectorAll('.motion-item')
            ).slice(start, end);

            initMotionItems(newItems);
            scheduleMotionRowLayout();
            requestAnimationFrame(refreshMotionViewport);

            if (options.scheduleWarm !== false) {
                scheduleNextMotionPosterWarmup();
            }

            if (
                options.observeTail !== false &&
                !motionBatchAppendLocked
            ) {
                observeMotionBatchTail();
            }
        }).finally(() => {
            motionBatchRequestInFlight = null;
        });

        return motionBatchRequestInFlight;
    }

    function unlockMotionBatchLoading() {
        clearTimeout(motionBatchUnlockTimer);
        motionBatchUnlockTimer = window.setTimeout(() => {
            motionBatchAppendLocked = false;
            observeMotionBatchTail();
        }, 220);
    }

    function setupMotionObservers() {
        if (motionObserver) motionObserver.disconnect();
        if (motionBatchObserver) motionBatchObserver.disconnect();

        motionObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const item = entry.target;
                if (entry.isIntersecting && isMotionPageActive()) {
                    /* Posters are static images. Entering the viewport does not
                       create or download an MP4 decoder. */
                    clearTimeout(item.motionUnloadTimer);
                } else {
                    scheduleMotionUnload(item);
                }
            });
        }, {
            root: motionPage,
            rootMargin: MOTION_NEARBY_MARGIN + 'px 0px',
            threshold: 0
        });

        motionBatchObserver = new IntersectionObserver((entries) => {
            if (!isMotionPageActive() || motionBatchAppendLocked) return;
            if (!entries.some((entry) => entry.isIntersecting)) return;

            motionBatchAppendLocked = true;
            motionBatchObserver.disconnect();

            requestAnimationFrame(() => {
                appendNextMotionBatch(false).finally(
                    unlockMotionBatchLoading
                );
            });
        }, {
            root: motionPage,
            rootMargin: '0px 0px ' + motionBatchRootMargin() + 'px 0px',
            threshold: 0
        });
    }

    function refreshMotionViewport() {
        if (!isMotionPageActive()) return;
        const items = Array.from(grid.querySelectorAll('.motion-item'));
        items.forEach((item) => {
            /* Static posters handle every idle card. MP4 players are created
               only by a hover, tap or fullscreen action, then unloaded later. */
            if (!isNearMotionViewport(item)) scheduleMotionUnload(item);
        });
        observeMotionBatchTail();
    }

    function ensureMotionPageLoaded() {
        if (!motionVideoList.length || !grid.children.length) {
            if (!motionLoadPromise) {
                motionLoadPromise = Promise.resolve(
                    buildGrid(MOTION_FILES)
                ).then(() => motionVideoList);
            }
        }
        scheduleMotionRowLayout();
        requestAnimationFrame(() => requestAnimationFrame(refreshMotionViewport));
        return motionLoadPromise || Promise.resolve(motionVideoList);
    }

    window.ensureMotionPageLoaded = ensureMotionPageLoaded;

    function fitViewerStage(video) {
        if (!video || !video.videoWidth || !video.videoHeight) return;

        /* Deliberately do not resize the fullscreen stage. Aspect-ratio
           changes are handled by object-fit/contain inside one permanent
           viewport-sized shell. */
        if (viewerStage.dataset.viewerSession !== String(viewerSession) ||
            viewerStage.dataset.viewerSource !== viewerSource) return;
    }

    const viewerLooper = new CanvasLoopPlayer(viewerVideos, {
        muted: false,
        onMetadata: fitViewerStage,
        canvasOnly: true,
        canvasAlpha: true,
        deferStandbyLoad: true,
        fitMode: 'contain',
        scale: 1.075
    });

    function hideViewerFreeze() {
        if (!viewerFreeze) return;
        viewerFreeze.style.display = 'none';
        const ctx = viewerFreeze.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, viewerFreeze.width, viewerFreeze.height);
    }

    function waitViewerPaints(count = 2) {
        return new Promise((resolve) => {
            const step = () => {
                count--;
                if (count <= 0) resolve();
                else requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }

    function hideViewerHold() {
        if (!viewerHold) return;
        viewerHold.style.display = 'none';
        const context = viewerHold.getContext('2d');
        if (context) {
            context.clearRect(
                0,
                0,
                viewerHold.width || 1,
                viewerHold.height || 1
            );
        }
    }

    function hideViewerSafety(clearSources = false) {
        if (!viewerSafety) return;
        viewerSafety.classList.remove('is-visible');

        if (clearSources) {
            viewerSafetyToken++;
            viewerSafetyImages.forEach((image) => {
                image.classList.remove('is-active');
                image.removeAttribute('src');
            });
            viewerSafetyIndex = 0;
            if (viewerSafetyImages[0]) {
                viewerSafetyImages[0].classList.add('is-active');
            }
        }
    }

    function drawContainedSource(context, source, width, height, scaleBoost = 1.075) {
        if (!context || !source) return false;
        const sourceWidth =
            source.videoWidth || source.naturalWidth || source.width;
        const sourceHeight =
            source.videoHeight || source.naturalHeight || source.height;
        if (!sourceWidth || !sourceHeight) return false;

        const scale = Math.min(
            width / sourceWidth,
            height / sourceHeight
        ) * scaleBoost;
        const drawWidth = sourceWidth * scale;
        const drawHeight = sourceHeight * scale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;
        context.drawImage(source, x, y, drawWidth, drawHeight);
        return true;
    }

    function showViewerHold(fallbackIndex = viewerDisplayedIndex) {
        if (!viewerHold) return false;

        /* During rapid navigation retain the existing visible snapshot. */
        if (viewerHold.style.display === 'block' &&
            viewerHold.width &&
            viewerHold.height) {
            return true;
        }

        const width = Math.max(1, Math.round(viewerStage.clientWidth));
        const height = Math.max(1, Math.round(viewerStage.clientHeight));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const context = viewerHold.getContext('2d', { alpha: true });
        if (!context) return false;

        viewerHold.width = Math.max(1, Math.round(width * dpr));
        viewerHold.height = Math.max(1, Math.round(height * dpr));

        try {
            context.setTransform(dpr, 0, 0, dpr, 0, 0);
            context.clearRect(0, 0, width, height);
            let captured = false;

            const transitionCanvas =
                viewerStage.querySelector('.motion-transition-canvas');
            if (transitionCanvas &&
                transitionCanvas.style.display !== 'none' &&
                transitionCanvas.width &&
                transitionCanvas.height &&
                viewerLooper.lastGoodFrame) {
                context.drawImage(
                    transitionCanvas,
                    0,
                    0,
                    width,
                    height
                );
                captured = true;
            }

            if (!captured) {
                const safetyImage =
                    viewerSafetyImages[viewerSafetyIndex];
                if (safetyImage &&
                    safetyImage.complete &&
                    safetyImage.naturalWidth) {
                    captured = drawContainedSource(
                        context,
                        safetyImage,
                        width,
                        height
                    );
                }
            }

            if (!captured && fallbackIndex >= 0) {
                const fallbackItem = grid.querySelector(
                    '.motion-item[data-motion-index="' +
                    fallbackIndex +
                    '"]'
                );
                const fallbackPoster = fallbackItem &&
                    fallbackItem.querySelector('.motion-poster');

                if (fallbackPoster &&
                    fallbackPoster.complete &&
                    fallbackPoster.naturalWidth) {
                    captured = drawContainedSource(
                        context,
                        fallbackPoster,
                        width,
                        height
                    );
                }
            }

            /* Never display an empty or black-filled hold surface. */
            if (!captured) {
                hideViewerHold();
                return false;
            }

            viewerHold.style.display = 'block';
            return true;
        } catch (_) {
            hideViewerHold();
            return false;
        }
    }

    async function prepareViewerSafety(index, session, src) {
        if (!viewerSafety || viewerSafetyImages.some((image) => !image)) {
            return false;
        }

        const filename = MOTION_FILES[index];
        if (!filename) return false;

        const token = ++viewerSafetyToken;
        const incomingIndex = 1 - viewerSafetyIndex;
        const incoming = viewerSafetyImages[incomingIndex];
        const outgoing = viewerSafetyImages[viewerSafetyIndex];
        const posterURL = motionPosterURL(filename);

        incoming.classList.remove('is-active');
        incoming.src = posterURL;

        try {
            if (!incoming.complete || !incoming.naturalWidth) {
                await new Promise((resolve, reject) => {
                    const onLoad = () => {
                        cleanup();
                        resolve();
                    };
                    const onError = () => {
                        cleanup();
                        reject(new Error('Motion poster failed'));
                    };
                    const cleanup = () => {
                        incoming.removeEventListener('load', onLoad);
                        incoming.removeEventListener('error', onError);
                    };
                    incoming.addEventListener('load', onLoad);
                    incoming.addEventListener('error', onError);
                });
            }

            if (typeof incoming.decode === 'function') {
                try { await incoming.decode(); } catch (_) {}
            }
        } catch (_) {
            return false;
        }

        if (token !== viewerSafetyToken ||
            session !== viewerSession ||
            viewerSource !== src) return false;

        viewerSafety.classList.add('is-visible');
        incoming.classList.add('is-active');
        await waitViewerPaints(2);

        if (token !== viewerSafetyToken ||
            session !== viewerSession ||
            viewerSource !== src) return false;

        outgoing.classList.remove('is-active');
        viewerSafetyIndex = incomingIndex;
        return true;
    }

    async function waitForFullscreenCanvasFrame(session, src, timeoutMs = 3600) {
        const startedAt = performance.now();

        while (performance.now() - startedAt < timeoutMs) {
            if (session !== viewerSession || viewerSource !== src) {
                return false;
            }

            const video = viewerLooper.activeVideo;
            if (video &&
                video.readyState >= 2 &&
                video.videoWidth &&
                video.videoHeight &&
                viewerLooper.drawVideo(video, 1, true)) {
                viewerLooper.showCanvas();
                await waitViewerPaints(3);

                if (session === viewerSession &&
                    viewerSource === src &&
                    viewerLooper.lastGoodFrame) {
                    return true;
                }
            }

            await new Promise((resolve) => {
                const video = viewerLooper.activeVideo;
                let settled = false;
                const finish = () => {
                    if (settled) return;
                    settled = true;
                    clearTimeout(timer);
                    resolve();
                };
                const timer = setTimeout(finish, 90);

                if (video &&
                    typeof video.requestVideoFrameCallback === 'function') {
                    try {
                        video.requestVideoFrameCallback(finish);
                    } catch (_) {}
                } else {
                    requestAnimationFrame(finish);
                }
            });
        }

        return false;
    }

    function beginViewerSourceChange(src, session, fallbackIndex) {
        /* Snapshot the current canvas before changing either decoder. The
           snapshot is transparent and fixed-size; it never contains a black
           fill and never changes geometry for a new aspect ratio. */
        showViewerHold(fallbackIndex);

        viewerStage.dataset.viewerSession = String(session);
        viewerStage.dataset.viewerSource = src;
        viewerStage.classList.add('is-switching');

        hideViewerFreeze();
        viewerLooper.pause();

        viewerVideos.forEach((video) => {
            video.style.opacity = '0';
            video.style.visibility = 'hidden';
            video.classList.remove('is-active');
            video.dataset.viewerSession = String(session);
            video.dataset.viewerSource = src;
        });
    }

    function captureViewerFrame() {
        if (!viewerFreeze) return false;
        const transitionCanvas = viewerStage.querySelector('.motion-transition-canvas');
        if (!transitionCanvas || transitionCanvas.style.display === 'none' || !transitionCanvas.width) return false;
        const stageWidth = Math.max(1, Math.round(viewerStage.clientWidth));
        const stageHeight = Math.max(1, Math.round(viewerStage.clientHeight));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        viewerFreeze.width = Math.round(stageWidth * dpr);
        viewerFreeze.height = Math.round(stageHeight * dpr);
        const ctx = viewerFreeze.getContext('2d');
        if (!ctx) return false;
        try {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, stageWidth, stageHeight);
            ctx.drawImage(transitionCanvas, 0, 0, stageWidth, stageHeight);
            viewerFreeze.style.display = 'block';
            return true;
        } catch (_) {
            hideViewerFreeze();
            return false;
        }
    }

    function suspendThumbnailsForViewer(selectedIndex) {
        const selectedItem = grid.querySelector('.motion-item[data-motion-index="' + selectedIndex + '"]');
        stopActiveThumbnail(null);
        Array.from(grid.querySelectorAll('.motion-item')).forEach((item) => {
            if (!item.motionLooper) return;
            if (item === selectedItem) {
                item.motionLooper.pause();
                item.classList.remove('is-playing');
                /* Keep one paused layer underneath the opening transition, but
                   release the standby decoder before the fullscreen pair starts. */
                const standby = item.motionLooper.standbyVideo;
                if (standby) {
                    try {
                        standby.pause();
                        standby.removeAttribute('src');
                        standby.load();
                    } catch (_) {}
                }
                return;
            }
            dehydrateMotionItem(item);
        });
    }

    async function renderViewer(
        revealWhenReady = false,
        session = viewerSession,
        fallbackIndex = viewerDisplayedIndex
    ) {
        const index = motionViewerIndex;
        const src = motionVideoList[index];
        if (!src) return;

        const previousSource = viewerSource;
        viewerSource = src;
        beginViewerSourceChange(
            src,
            session,
            fallbackIndex
        );

        if (previousSource && previousSource !== src) {
            releaseResolvedSource(previousSource);
        }

        /* Decode the still poster and the MP4 concurrently. The outgoing
           snapshot remains visible until the new poster is physically painted. */
        const safetyPromise =
            prepareViewerSafety(index, session, src);

        viewerLooper.setSource(bestSource(src));
        const playPromise = viewerLooper.play();

        const safetyReady = await safetyPromise;
        if (session !== viewerSession || viewerSource !== src) return;

        if (safetyReady) {
            viewerDisplayedIndex = index;
            if (revealWhenReady) viewer.classList.add('active');

            /* At this point the new poster has completed two paints underneath
               the snapshot, so removing the snapshot cannot expose black. */
            hideViewerHold();
        }

        const played = await playPromise;
        if (session !== viewerSession || viewerSource !== src) return;

        if (played) {
            prewarmAroundMotionIndex(index, false);
        }

        let canvasReady = false;
        if (played) {
            canvasReady = await waitForFullscreenCanvasFrame(
                session,
                src,
                3600
            );
        }

        if (session !== viewerSession || viewerSource !== src) return;

        if (canvasReady) {
            viewerStage.classList.remove('is-switching');

            /* The moving canvas stays under the poster for three additional
               paints. Only then is the poster removed. Native video remains
               permanently hidden, so Safari has no black hardware surface to
               expose during an aspect-ratio change. */
            await waitViewerPaints(3);
            if (session !== viewerSession || viewerSource !== src) return;

            viewerDisplayedIndex = index;
            if (revealWhenReady) viewer.classList.add('active');
            hideViewerHold();
            hideViewerSafety(false);
        } else if (safetyReady) {
            /* Keep the decoded poster visible rather than exposing a failed
               or delayed decoder. */
            viewerStage.classList.add('is-switching');
        } else {
            /* If both incoming paths fail, retain the outgoing snapshot. */
            viewerStage.classList.add('is-switching');
        }

        /* Keep fullscreen playback on the original HTTP URL. The browser
           can reuse byte ranges naturally; forcing a second whole-file Blob
           fetch here made large works compete with their own playback. */
    }

    window.openMotionViewer = function (event, index) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        clearTimeout(viewerCloseTimer);
        suspendThumbnailsForViewer(index);
        const session = ++viewerSession;
        hideViewerFreeze();
        hideViewerHold();
        hideViewerSafety(true);
        viewerDisplayedIndex = -1;
        motionViewerIndex = index;
        document.body.style.overflow = 'hidden';
        prewarmAroundMotionIndex(index, true);
        renderViewer(true, session, -1);
    };

    function closeViewer() {
        const session = ++viewerSession;
        const closingSource = viewerSource;
        clearTimeout(viewerCloseTimer);
        captureViewerFrame();
        viewerLooper.pause();
        viewer.classList.remove('active');
        document.body.style.overflow = '';
        viewerSource = '';
        viewerCloseTimer = setTimeout(() => {
            if (session !== viewerSession || viewer.classList.contains('active')) return;
            viewerLooper.stop(false);
            viewerVideos.forEach((video) => {
                video.pause();
                video.removeAttribute('src');
                video.preload = 'none';
                video.load();
            });
            releaseResolvedSource(closingSource);
            hideViewerFreeze();
            hideViewerHold();
            hideViewerSafety(true);
            viewerDisplayedIndex = -1;
            viewerStage.classList.remove('is-switching');
            viewerStage.removeAttribute('data-viewer-session');
            viewerStage.removeAttribute('data-viewer-source');
            if (isMotionPageActive()) requestAnimationFrame(refreshMotionViewport);
        }, VIEWER_FADE_CLEANUP_MS);
    }

    function showNext() {
        if (!motionVideoList.length) return;
        const outgoingIndex = viewerDisplayedIndex >= 0
            ? viewerDisplayedIndex
            : motionViewerIndex;
        const session = ++viewerSession;
        motionViewerIndex =
            (motionViewerIndex + 1) % motionVideoList.length;
        prewarmAroundMotionIndex(motionViewerIndex, true);
        renderViewer(false, session, outgoingIndex);
    }

    function showPrev() {
        if (!motionVideoList.length) return;
        const outgoingIndex = viewerDisplayedIndex >= 0
            ? viewerDisplayedIndex
            : motionViewerIndex;
        const session = ++viewerSession;
        motionViewerIndex =
            (motionViewerIndex - 1 + motionVideoList.length) %
            motionVideoList.length;
        prewarmAroundMotionIndex(motionViewerIndex, true);
        renderViewer(false, session, outgoingIndex);
    }

    const viewerNextButton = document.getElementById('motion-viewer-next');
    const viewerPrevButton = document.getElementById('motion-viewer-prev');

    document.getElementById('motion-viewer-close').addEventListener('click', closeViewer);

    viewerNextButton.addEventListener('pointerdown', () => {
        prewarmAroundMotionIndex(motionViewerIndex + 1, true);
    }, { passive: true });

    viewerPrevButton.addEventListener('pointerdown', () => {
        prewarmAroundMotionIndex(motionViewerIndex - 1, true);
    }, { passive: true });

    viewerNextButton.addEventListener('click', showNext);
    viewerPrevButton.addEventListener('click', showPrev);
    bindReliableTap(viewerStage, () => viewerLooper.toggle());
    viewer.addEventListener('click', (event) => {
        if (event.target === viewer) closeViewer();
    });

    const refitViewer = () => {
        /* The fullscreen shell is fixed by CSS. No MP4 metadata is allowed to
           resize it during navigation or orientation changes. */
    };
    window.addEventListener('resize', () => {
        refitViewer();
        scheduleMotionRowLayout();
    });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', refitViewer);

    document.addEventListener('keydown', (event) => {
        if (!viewer.classList.contains('active')) return;
        if (event.key === 'Escape') closeViewer();
        else if (event.key === 'ArrowRight') showNext();
        else if (event.key === 'ArrowLeft') showPrev();
        else if (event.key === ' ' || event.key === 'Spacebar') {
            event.preventDefault();
            viewerLooper.toggle();
        }
    });

    window.pauseMotionPage = function () {
        activeThumbnailItem = null;
        activeThumbnailLooper = null;
        clearMotionPrewarmers();
        clearTimeout(motionPosterWarmTimer);
        clearTimeout(motionBatchUnlockTimer);
        motionBatchAppendLocked = false;
        if (motionBatchObserver) motionBatchObserver.disconnect();
        Array.from(grid.querySelectorAll('.motion-item')).forEach(dehydrateMotionItem);
        if (viewer.classList.contains('active')) closeViewer();
    };

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) window.pauseMotionPage();
        else if (motionPage && motionPage.classList.contains('visible')) {
            runPosterWorker();
            scheduleMotionRowLayout();
            requestAnimationFrame(refreshMotionViewport);
            observeMotionBatchTail();
        }
    });

    /* handleRouting() runs earlier in this document, so direct visits to
       /digital/ leave this flag for the deferred module to consume. */
    if (window.__motionOpenRequested || document.getElementById('page-motion').classList.contains('visible')) {
        window.__motionOpenRequested = false;
        ensureMotionPageLoaded();
    }

    window.addEventListener('beforeunload', () => {
        clearMotionPrewarmers();
        RESOLVED_SOURCES.forEach((url) => {
            if (url.startsWith('blob:')) URL.revokeObjectURL(url);
        });
    });
})();


// --- CONTACT FORM, SITE PRELOADER & TIME PAGE ---
const form = document.getElementById('contactForm');
    const responseMessage = document.getElementById('responseMessage');
    const submitButton = document.getElementById('submitButton');

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        submitButton.innerText = "SENDING...";
        const formData = new FormData(form);
        
        fetch('https://api.web3forms.com/submit', {
            method: 'POST',
            body: formData
        })
        .then(async (response) => {
            if (response.status == 200) {
                responseMessage.innerText = "Enquiry sent successfully!";
                form.reset();
            } else {
                responseMessage.innerText = "Something went wrong, please try again.";
            }
        })
        .catch(error => {
            responseMessage.innerText = "Something went wrong!";
        })
        .finally(() => {
            submitButton.innerText = "SEND ENQUIRY";
        });
    });
// --- BALANCED SITE PRELOADER ---
// Keep the logo visible long enough to register, then wait for the browser's
// initial eager resources to finish. A hard cap prevents hidden or third-party
// assets from trapping visitors behind the loader.
const PRELOADER_MIN_VISIBLE_MS = 900;
const PRELOADER_MAX_VISIBLE_MS = 2500;
const PRELOADER_FADE_MS = 450;
const preloaderStartedAt = performance.now();

let preloaderMinTimer = null;
let preloaderMaxTimer = null;
let initialPageLoadFinished = document.readyState === 'complete';

function hidePreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader || preloader.classList.contains('loaded')) return;

    clearTimeout(preloaderMinTimer);
    clearTimeout(preloaderMaxTimer);
    preloaderMinTimer = null;
    preloaderMaxTimer = null;

    preloader.classList.add('loaded');
    preloader.setAttribute('aria-hidden', 'true');
    document.body.classList.add('site-loaded');

    window.setTimeout(() => {
        if (preloader.parentNode) preloader.remove();
    }, PRELOADER_FADE_MS + 60);
}

function hidePreloaderAfterMinimum() {
    initialPageLoadFinished = true;

    const elapsed = performance.now() - preloaderStartedAt;
    const remainingMinimum = Math.max(
        0,
        PRELOADER_MIN_VISIBLE_MS - elapsed
    );

    clearTimeout(preloaderMinTimer);
    preloaderMinTimer = window.setTimeout(
        hidePreloader,
        remainingMinimum
    );
}

if (initialPageLoadFinished) {
    hidePreloaderAfterMinimum();
} else {
    window.addEventListener(
        'load',
        hidePreloaderAfterMinimum,
        { once: true }
    );
}

// Failsafe: begin fading no later than 2.5 seconds after navigation, even if
// a slow image, API or third-party request has not completed.
const elapsedAtSetup = performance.now() - preloaderStartedAt;
preloaderMaxTimer = window.setTimeout(
    hidePreloader,
    Math.max(0, PRELOADER_MAX_VISIBLE_MS - elapsedAtSetup)
);

// ---------- TIME ENGINE (hidden /time page) ----------
let timeActive = false;
let timeStart = null;
const timeRatePerSec = (8.1e9 * 6.7) / 86400; // ~627,708 hours of global screen time per second

function timeFrame(now) {
    if (!timeActive) return;
    const elapsedSec = (now - timeStart) / 1000;
    const totalHours = elapsedSec * timeRatePerSec;
    const totalDays = totalHours / 24;

    const YEAR_DAYS = 365.25;
    const MONTH_DAYS = YEAR_DAYS / 12; // ~30.4375
    const WEEK_DAYS = 7;

    // Each unit is its own running total (not a decomposed remainder),
    // so every column keeps climbing independently and never resets.
    const decades = Math.floor(totalDays / (YEAR_DAYS * 10));
    const years = Math.floor(totalDays / YEAR_DAYS);
    const months = Math.floor(totalDays / MONTH_DAYS);
    const weeks = Math.floor(totalDays / WEEK_DAYS);

    document.getElementById('t-decades').textContent = decades.toLocaleString();
    document.getElementById('t-years').textContent = years.toLocaleString();
    document.getElementById('t-months').textContent = months.toLocaleString();
    document.getElementById('t-weeks').textContent = weeks.toLocaleString();

    requestAnimationFrame(timeFrame);
}

