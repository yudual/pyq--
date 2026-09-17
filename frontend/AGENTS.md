<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Build and Deployment Rules
- **NEVER build on the 1GB RAM production VPS!** Builds must only be executed locally or via GitHub Actions.
- **Client-Side Image Compression:** All image uploads to R2 must be compressed before upload using `frontend/src/lib/image-compress.ts`.
<!-- END:nextjs-agent-rules -->
