# blog.nautical.co.in

The blog is a static site built from this repo and served by the Azure App Service
`nautical-website` (resource group `posnauticals-rg`).

## Publish a post

1. Add the post as `blog/<slug>.html` (a full HTML page; lower-case-dashed slug).
2. Add one entry to `blog/posts.json`:

   ```json
   {
     "slug": "my-new-post",
     "title": "Title shown on the listing page",
     "date": "2026-10-20",
     "dateLabel": "20 October 2026",
     "datetime": "2026-10-20T10:00:00+05:30",
     "tag": "Operator guide",
     "excerpt": "One or two sentences for the listing card."
   }
   ```

   Optional: `"draft": true` hides a post, `"updated": "YYYY-MM-DD"` sets the sitemap date,
   `"aliases": ["/old/path"]` 301-redirects old URLs to the post.
3. Push to `main`. GitHub Actions (`Deploy blog.nautical.co.in`) tests, builds and deploys.

## What gets built (`node scripts/build-blog.js`)

| URL | Content |
|-----|---------|
| `/` | Page 1: the 5 newest posts, newest first |
| `/page/2/`, `/page/3/`, ... | Older posts, 5 per page, with 1 2 3 ... page links |
| `/<slug>/` | The full post (canonical set to this URL) |
| `/sitemap.xml`, `/robots.txt` | Every page and post, for Google |

Old URLs such as `/blog/<slug>.html` and `/<slug>` redirect to `/<slug>/`.
Root-relative links inside a post (`/css/...`, `/images/...`) are pointed at
`https://www.nautical.co.in` so assets from the main site keep loading.

Run `node scripts/test-blog.js` to check pagination with 1, 5, 6 and 11 posts.

## Hosting

- App Service `nautical-website` (Linux, Python 3.11), startup command `python server.py`.
  `server.py` is `scripts/blog-server.py`: a standard-library static server with redirects and a 404 page.
- DNS: Cloudflare `blog` CNAME -> `nautical-website.azurewebsites.net` (proxied).
- `www.nautical.co.in/blog` (Static Web App `nautical-website`) still serves its own copies of some posts.
