import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
const config: NextConfig = { outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)), poweredByHeader: false, experimental: { useTypeScriptCli: false }, async headers() {
        return [{ source: "/:path*", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "X-Frame-Options", value: "DENY" }, { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }] }];
    } };
export default config;
