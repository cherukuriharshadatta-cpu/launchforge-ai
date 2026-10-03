# Reel generation fix (V4.1)

V4 called `cloudinary.uploader.multi()` with an array of URLs plus options.
Some Cloudinary Node SDK versions reject that form with:

`First argument must be a tag when additional options are passed`

V4.1 fixes this by:
1. Building all transformed 9:16 frame URLs.
2. Uploading those frames as temporary Cloudinary image assets.
3. Applying one unique tag to every frame.
4. Naming frames `frame_00`, `frame_01`, etc.
5. Calling `uploader.multi(tag, { format: "mp4", delay: 850 })`.

Cloudinary sorts tagged frames alphabetically by public ID, so the Reel keeps the intended order.
