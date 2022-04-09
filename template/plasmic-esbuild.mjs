import { build } from "esbuild";
import { esbuildPluginAliasPath } from "esbuild-plugin-alias-path";
import flow from "esbuild-plugin-flow";

(async () => {
    const res = await build({
        entryPoints: ["./index.plasmic.tsx"],
        bundle: true,
        outdir: "./.plasmic/rn",
        loader: { ".js": "jsx", ".svg": "text" },
        resolveExtensions: [".ts", ".tsx", ".js", ".jsx", ".web.js", ".web.ts"],
        platform: "node",
        external: ["react", "react-dom", "react-native-web", "react-native"],
        plugins: [
            esbuildPluginAliasPath({
                alias: {
                    // add you alias config here
                },
            }),
            flow(
                /node_modules\/react-native.*\.jsx?$|node_modules\/@react-native.*\.jsx?$|\.flow\.jsx?$/,
                true
            ),
        ],
    });
})();
