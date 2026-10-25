// Rigenera api/server.mjs: il backend (Hono + tRPC + Drizzle) bundlato in un unico
// file autosufficiente per la funzione serverless di Vercel.
// Uso: node scripts/build-server.mjs   (richiede npm install fatto)
import { build } from "esbuild";

await build({
  entryPoints: ["server/boot.ts"],
  outfile: "api/server.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  banner: {
    js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
  },
  alias: { "@db": "./db", "@contracts": "./contracts" },
  external: [
    "node:*", "fs", "path", "crypto", "module", "url", "util", "stream",
    "http", "https", "net", "tls", "zlib", "os", "events", "buffer",
    "querystring", "async_hooks",
  ],
});

console.log("Bundle server aggiornato → api/server.mjs");
