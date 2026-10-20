const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = process.env.PORT || 3000;

// Helper to rewrite URLs in HTML so they pass through the proxy
function rewriteUrls(html, baseUrl) {
    const $ = cheerio.load(html);
    
    // Rewrite image sources
    $('img').each((i, img) => {
        const src = $(img).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
            $(img).attr('src', `/proxy?url=${encodeURIComponent(baseUrl + src)}`);
        } else if (src && src.startsWith('//')) {
            $(img).attr('src`, `https:${src}`);
        }
    });

    // Rewrite anchor links
    $('a').each((i, link) => {
        const href = $(link).attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('javascript:')) {
            $(link).attr('href', `/proxy?url=${encodeURIComponent(baseUrl + href)}`);
        }
    });

    // Rewrite form actions
    $('form').each((i, form) => {
        const action = $(form).attr('action');
        if (action && !action.startsWith('http')) {
            $(form).attr('action', `/proxy?url=${encodeURIComponent(baseUrl + action)}`);
        }
    });

    return $.html();
}

app.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Proxy</title></head>
        <body style="margin:0; padding:0;">
            <iframe src="/proxy?url=https://example.com" width="100%" height="100%" frameborder="0"></iframe>
        </body>
        </html>
    `);
});

app.get('/proxy', async (req, res) => {
    let url = req.query.url;
    
    // Handle relative URLs by prepending a base URL if needed
    if (!url.startsWith('http')) {
        url = 'https://' + url;
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const contentType = response.headers['content-type'] || '';
        
        // If it's HTML, rewrite URLs
        if (contentType.includes('text/html')) {
            const modifiedHtml = rewriteUrls(response.data, url);
            res.set('Content-Type', 'text/html; charset=utf-8');
            res.send(modifiedHtml);
        } else {
            // For other content types (images, CSS, JS), just forward them
            res.set('Content-Type', contentType);
            res.send(response.data);
        }

    } catch (error) {
        res.status(500).send(`Error fetching ${url}: ${error.message}`);
    }
});

app.listen(PORT, () => {
    console.log(`Proxy server running on port ${PORT}`);
});
