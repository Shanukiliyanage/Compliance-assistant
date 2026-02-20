import createApp from "../app.js";

// Dev helper: prints interesting Express routes for quick inspection.

const app = createApp();

console.log("has _router:", Boolean(app?._router));
console.log("has router:", Boolean(app?.router));

function listRoutes() {
  const routes = [];
  const stack = app?._router?.stack || app?.router?.stack || [];

  for (const layer of stack) {
    if (layer?.route) {
      const methods = Object.keys(layer.route.methods || {}).map((m) => m.toUpperCase());
      routes.push(`${methods.join(",")} ${layer.route.path}`);
      continue;
    }

    if (layer?.name === "router" && layer?.handle?.stack) {
      const base = layer?.regexp?.source || "";
      for (const r of layer.handle.stack) {
        if (!r?.route) continue;
        const methods = Object.keys(r.route.methods || {}).map((m) => m.toUpperCase());
        routes.push(`${methods.join(",")} ${base} ${r.route.path}`);
      }
    }
  }

  return routes;
}

const routes = listRoutes();
console.log("total route layers:", routes.length);
const interesting = routes.filter((r) => r.toLowerCase().includes("report") || r.toLowerCase().includes("result"));
console.log(interesting.join("\n"));
