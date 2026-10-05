# Deploy & indexing for Nautical /blog

## Why www.nautical.co.in/blog is still the old single page

GitHub Actions run **Deploy Nautical website to Azure Web App** fails with:

```text
No credentials found. Add an Azure login action before this action.
```

Until Azure credentials are in the repo, pushes update **GitHub only**, not the live domain.

## Fix deploy (one-time, ~5 minutes)

1. Azure Portal → App Service **nautical-website** → **Get publish profile** → download the `.PublishSettings` file.
2. GitHub → **pos-nautical** → Settings → Secrets and variables → Actions → New repository secret:
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: paste the **entire** contents of the publish profile file.
3. Actions → **Deploy Nautical website to Azure Web App** → **Run workflow** (or push any change under `blog/`).
4. Confirm:
   - https://www.nautical.co.in/blog/
   - https://www.nautical.co.in/blog/nhy-react-native-app.html

## What already runs on push to main

| Step | Automatic? |
|------|------------|
| Write post HTML + entry in `blog/posts.json` | Manual / this agent |
| Rebuild `blog/index.html` + `sitemap.xml` | Yes — Blog pipeline workflow |
| Deploy to Azure `nautical-website` | Yes — **only after** `AZURE_WEBAPP_PUBLISH_PROFILE` is set |
| Ping Google/Bing with sitemap URL | Yes — Blog pipeline (notification only) |
| Google Search Console “Request indexing” | **No** — Google requires your account; use steps 1–4 on `/blog/` |

## Google Search Console

There is **no API** we can call from GitHub Actions to click “Request indexing” for arbitrary URLs without your Google OAuth. After the site is live:

1. Open Search Console for `www.nautical.co.in`
2. Submit `https://www.nautical.co.in/sitemap.xml`
3. Open each post’s public URL (buttons on `/blog/`)
4. URL Inspection → Request indexing

## Add a future post

1. Add `blog/<slug>.html`
2. Add one object to `blog/posts.json`
3. Push to `main`
4. Pipeline regenerates the index; Azure deploys if the secret is set.
