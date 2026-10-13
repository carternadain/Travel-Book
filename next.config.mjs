/** Static export so the app can be hosted for free (GitHub Pages, Vercel, Netlify). */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};
