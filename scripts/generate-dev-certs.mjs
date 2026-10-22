/**
 * Self-signed certs for local LAN HTTPS (mic / getUserMedia).
 * Covers localhost + current LAN IPv4 addresses.
 *
 * Usage: node scripts/generate-dev-certs.mjs
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const selfsigned = require("../backend/node_modules/selfsigned");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "certs");
fs.mkdirSync(outDir, { recursive: true });

function lanIps() {
  const ips = new Set(["127.0.0.1"]);
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === "IPv4" && !net.internal) ips.add(net.address);
    }
  }
  return [...ips];
}

const ips = lanIps();
const altNames = [
  { type: 2, value: "localhost" },
  ...ips.map((ip) => ({ type: 7, ip })),
];

const pems = await selfsigned.generate([{ name: "commonName", value: "Ressichem Dev" }], {
  keySize: 2048,
  days: 825,
  algorithm: "sha256",
  extensions: [{ name: "subjectAltName", altNames }],
});

fs.writeFileSync(path.join(outDir, "dev-key.pem"), pems.private);
fs.writeFileSync(path.join(outDir, "dev-cert.pem"), pems.cert);
console.log("Wrote certs/dev-key.pem and certs/dev-cert.pem");
console.log("SANs:", ["localhost", ...ips].join(", "));
