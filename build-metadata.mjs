import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, 'index.html');
const MAIN_JS_PATH = path.join(ROOT, 'main.js');
const SITE_ORIGIN = 'https://tyronemoreno.com';
const DEFAULT_SITE_IMAGE = `${SITE_ORIGIN}/random/logo.webp`;
const DEFAULT_SITE_DESCRIPTION = 'Tyrone Moreno is a multidisciplinary artist and creator.';
const STORE_DESCRIPTION = 'Shop signed limited-edition art prints, original artworks, apparel and objects by Tyrone Moreno, with certificates of authenticity and worldwide delivery.';

function storeEnabledFromHtml(documentHtml) {
    const value = documentHtml.match(/<html\b[^>]*\bdata-display-store=["']([^"']+)["']/i)?.[1];
    return String(value || 'yes').trim().toLowerCase() === 'yes';
}

const html = await readFile(INDEX_PATH, 'utf8');
const mainJs = await readFile(MAIN_JS_PATH, 'utf8');
const STORE_ENABLED = storeEnabledFromHtml(html);

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function decodeHtml(value) {
    return String(value ?? '')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&amp;/gi, '&');
}

function decodeJsSingleQuoted(value) {
    return decodeHtml(String(value ?? ''))
        .replace(/\\'/g, "'")
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
}

function plainText(value) {
    return decodeHtml(String(value ?? ''))
        .replace(/<br\s*\/?\s*>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function trimMetaDescription(value, maxLength = 160) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    const clipped = text.slice(0, maxLength - 1).replace(/\s+\S*$/, '').trim();
    return `${clipped || text.slice(0, maxLength - 1)}…`;
}

function absoluteUrl(value) {
    try {
        return new URL(value || DEFAULT_SITE_IMAGE, SITE_ORIGIN).href;
    } catch {
        return DEFAULT_SITE_IMAGE;
    }
}

function setMetaTag(documentHtml, attributeName, key, content) {
    const pattern = new RegExp(
        `<meta\\b(?=[^>]*\\b${attributeName}=["']${escapeRegExp(key)}["'])[^>]*>`,
        'i'
    );
    const replacement = `<meta ${attributeName}="${escapeHtml(key)}" content="${escapeHtml(content)}">`;
    return pattern.test(documentHtml)
        ? documentHtml.replace(pattern, replacement)
        : documentHtml.replace('</head>', `${replacement}\n</head>`);
}

function injectRouteMetadata(documentHtml, { title, description, canonical, image, ogType, structuredData }) {
    let output = documentHtml;
    output = output.replace(/<title>[\s\S]*?<\/title>/i, '<title>Tyrone Moreno</title>');

    const canonicalTag = `<link rel="canonical" href="${escapeHtml(canonical)}">`;
    const canonicalPattern = /<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>/i;
    output = canonicalPattern.test(output)
        ? output.replace(canonicalPattern, canonicalTag)
        : output.replace('</head>', `${canonicalTag}\n</head>`);

    output = setMetaTag(output, 'name', 'description', description);
    output = setMetaTag(output, 'property', 'og:type', ogType);
    output = setMetaTag(output, 'property', 'og:url', canonical);
    output = setMetaTag(output, 'property', 'og:title', title);
    output = setMetaTag(output, 'property', 'og:description', description);
    output = setMetaTag(output, 'property', 'og:image', image);
    output = setMetaTag(output, 'name', 'twitter:title', title);
    output = setMetaTag(output, 'name', 'twitter:description', description);
    output = setMetaTag(output, 'name', 'twitter:image', image);

    const safeJson = JSON.stringify(structuredData).replace(/</g, '\\u003c');
    const script = `<script id="server-route-structured-data" type="application/ld+json">${safeJson}</script>`;
    output = output.replace('</head>', `${script}\n</head>`);
    return output;
}

function parseGalleryItems(documentHtml) {
    const slugs = [...documentHtml.matchAll(/\bdata-slug="([^"]+)"/gi)].map((match) => match[1]);
    const items = [];

    for (const slug of [...new Set(slugs)]) {
        const blockPattern = new RegExp(
            `<a\\b[^>]*\\bdata-slug="${escapeRegExp(slug)}"[^>]*>[\\s\\S]*?<\\/a>`,
            'i'
        );
        const block = documentHtml.match(blockPattern)?.[0];
        if (!block) continue;

        const onclick = block.match(/\bonclick="([^"]*)"/i)?.[1] || '';
        const args = onclick.match(
            /openLightbox\(\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'\s*,\s*'((?:\\.|[^'])*)'/i
        );
        if (!args) {
            console.warn(`Skipping gallery metadata for ${slug}: could not parse openLightbox arguments.`);
            continue;
        }

        const source = decodeJsSingleQuoted(args[1]);
        const title = decodeJsSingleQuoted(args[2]);
        const year = decodeJsSingleQuoted(args[3]);
        const specs = decodeJsSingleQuoted(args[4]);
        const rawDescription = decodeJsSingleQuoted(args[5]);
        const sold = /,\s*true\s*\)\s*;?/i.test(onclick);

        const fallbackImage = block.match(/<img\b[^>]*(?:data-src|src)="([^"]+)"/i)?.[1] || DEFAULT_SITE_IMAGE;
        const image = /\.(?:glb|gltf)(?:$|\?)/i.test(source) ? fallbackImage : source;

        const cleanDescription = plainText(rawDescription)
            .replace(/For acquisition enquiries, please contact\s+[^\s]+/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

        const datedTitle = year ? `${title} (${year})` : title;
        const description = trimMetaDescription(
            [
                `${datedTitle} is an original artwork by mixed-media artist Tyrone Moreno.`,
                specs,
                cleanDescription,
                sold ? 'This artwork is sold.' : ''
            ].filter(Boolean).join(' ')
        );
        const canonical = `${SITE_ORIGIN}/gallery/${encodeURIComponent(slug)}/`;
        const absoluteImage = absoluteUrl(image);
        const pageTitle = `${title}${year ? ` (${year})` : ''} | Original Artwork by Tyrone Moreno`;

        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'VisualArtwork',
            name: title,
            description,
            url: canonical,
            image: absoluteImage,
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
        if (year) structuredData.dateCreated = String(year);
        if (specs) structuredData.artMedium = specs;

        items.push({ slug, pageTitle, description, canonical, image: absoluteImage, structuredData });
    }

    return items;
}

async function writeRoute(relativeParts, documentHtml) {
    const directory = path.join(ROOT, ...relativeParts);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), documentHtml, 'utf8');
}

async function generateGalleryPages() {
    const galleryItems = parseGalleryItems(html);
    for (const item of galleryItems) {
        const page = injectRouteMetadata(html, {
            title: item.pageTitle,
            description: item.description,
            canonical: item.canonical,
            image: item.image,
            ogType: 'article',
            structuredData: item.structuredData
        });
        await writeRoute(['gallery', item.slug], page);
    }
    return galleryItems.length;
}

function parseShopifyConfig(source) {
    const domain = source.match(/const\s+SHOPIFY_DOMAIN\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    const token = source.match(/const\s+SHOPIFY_TOKEN\s*=\s*['"]([^'"]+)['"]/i)?.[1];
    if (!domain || !token) {
        throw new Error('Could not read SHOPIFY_DOMAIN / SHOPIFY_TOKEN from main.js.');
    }
    return { domain, token };
}

const PRODUCT_METADATA_QUERY = `
query getCollectionMetadata($handle: String!) {
  collectionByHandle(handle: $handle) {
    products(first: 100) {
      edges {
        node {
          handle
          title
          productType
          description
          seo { title description }
          images(first: 1) {
            edges {
              node {
                highres: url(transform: {maxWidth: 1200, preferredContentType: WEBP})
              }
            }
          }
          variants(first: 100) {
            edges {
              node {
                price { amount currencyCode }
                availableForSale
              }
            }
          }
        }
      }
    }
  }
}`;

async function shopifyGraphQL(domain, token, query, variables) {
    const retryDelays = [350, 900];

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
        try {
            const response = await fetch(domain, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Storefront-Access-Token': token
                },
                body: JSON.stringify({ query, variables })
            });

            const payload = await response.json();
            const errors = Array.isArray(payload?.errors) ? payload.errors : [];
            if (!response.ok || errors.length) {
                throw new Error(
                    errors.map((error) => error.message).filter(Boolean).join('; ') ||
                    `Shopify metadata request failed (${response.status})`
                );
            }
            return payload;
        } catch (error) {
            if (attempt >= retryDelays.length) throw error;
            await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt]));
        }
    }
    throw new Error('Shopify metadata request failed.');
}

async function fetchStoreProducts() {
    const { domain, token } = parseShopifyConfig(mainJs);
    const byHandle = new Map();

    for (const collectionHandle of ['editions', 'apparel']) {
        const payload = await shopifyGraphQL(domain, token, PRODUCT_METADATA_QUERY, { handle: collectionHandle });
        const products = payload?.data?.collectionByHandle?.products?.edges || [];
        for (const edge of products) {
            const product = edge?.node;
            if (product?.handle) byHandle.set(product.handle, product);
        }
    }

    return [...byHandle.values()];
}

async function generateStorePages() {
    const products = await fetchStoreProducts();

    for (const product of products) {
        const canonical = `${SITE_ORIGIN}/store/${encodeURIComponent(product.handle)}/`;
        const image = absoluteUrl(product.images?.edges?.[0]?.node?.highres || DEFAULT_SITE_IMAGE);
        const description = trimMetaDescription(
            product.seo?.description || product.description || STORE_DESCRIPTION
        );
        const title = product.seo?.title?.trim() || `${product.title} | Tyrone Moreno`;
        const offers = (product.variants?.edges || []).map(({ node: variant }) => ({
            '@type': 'Offer',
            url: canonical,
            price: variant.price.amount,
            priceCurrency: variant.price.currencyCode || 'GBP',
            availability: variant.availableForSale
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition'
        }));

        const structuredData = {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: product.title,
            description,
            image: [image],
            url: canonical,
            brand: {
                '@type': 'Brand',
                name: 'Tyrone Moreno'
            },
            offers
        };

        const page = injectRouteMetadata(html, {
            title,
            description,
            canonical,
            image,
            ogType: 'product',
            structuredData
        });
        await writeRoute(['store', product.handle], page);
    }

    return products.length;
}

const galleryCount = await generateGalleryPages();
let storeCount = 0;

if (process.argv.includes('--gallery-only')) {
    console.log(`Generated ${galleryCount} gallery metadata pages (gallery-only test mode).`);
} else if (!STORE_ENABLED) {
    // Remove any product metadata pages left behind by an earlier store-enabled build.
    await rm(path.join(ROOT, 'store'), { recursive: true, force: true });
    console.log(`Generated ${galleryCount} gallery pages. Store routes removed/skipped because data-display-store="no".`);
} else {
    storeCount = await generateStorePages();
    console.log(`Generated ${galleryCount} gallery pages and ${storeCount} store product pages with route-specific metadata.`);
}
