# Static images

Files dropped here are published by Vercel next to the app, so
`client/public/images/hero.jpg` is served at:

    https://<your-domain>/images/hero.jpg

Paste that URL into any image field in the admin panel ("or paste a link").

Use this for images that rarely change — the hero background, the social
share image, default cover images. It needs no upload backend.

It is **not** a substitute for Cloudinary. Every image here has to be
committed and redeployed, and fan club admins cannot add their own logos or
event covers this way. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and
`CLOUDINARY_API_SECRET` for that.
