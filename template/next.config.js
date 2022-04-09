const path = require("path");
const { css } = require("./css-next-loader-config");

module.exports = {
    target: "serverless",

    reactStrictMode: true,

    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },

    eslint: {
        ignoreDuringBuilds: true,
    },
    trailingSlash: true,

    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        config = css(
            {
                rootDirectory: path.resolve(__dirname),
                customAppFile: path.resolve(__dirname, "pages", "_app"),
                isDevelopment: true,
                isProduction: false,
                isServer: false,
                isClient: true,
                assetPrefix: "",
                sassOptions: {},
                productionBrowserSourceMaps: false,
                future: { strictPostcssConfiguration: false },
                isCraCompat: false,
            },
            config
        );

        config.module.rules = config.module.rules.slice().map((r) => {
            if (
                typeof r.oneOf?.[0]?.options === "object" &&
                r.oneOf[0].options.__next_css_remove === true
            ) {
                r.oneOf[0].options.__next_css_remove == false;
            }
            return r;
        });
        config.plugins = config.plugins.slice().map((p) => {
            if (p.__next_css_remove === true) {
                p.__next_css_remove == false;
            }
            return p;
        });

        config.module.rules.push({
            test: /\.(j|t)sx?$/,
            use: [
                {
                    loader: "esbuild-loader",
                    options: {
                        loader: "tsx",
                        target: "esnext",
                    },
                },
            ],
        });
        config.resolve.alias["react-native$"] =
            require.resolve("react-native-web");

        config.resolve.extensions = [".web.js", ...config.resolve.extensions];

        config.resolve.alias["rn$"] = require.resolve("./rn/index.plasmic.js");

        return config;
    },
};
