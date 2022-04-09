const path = require("path");
const {
    getCssModuleLoader,
    getGlobalCssLoader,
} = require("next/dist/build/webpack/config/blocks/css/loaders");
const {
    getCustomDocumentError,
    getGlobalImportError,
    getGlobalModuleImportError,
    getLocalModuleImportError,
} = require("next/dist/build/webpack/config/blocks/css/messages");

// RegExps for all Style Sheet variants
const regexLikeCss = /\.(css|scss|sass)(\.webpack\[javascript\/auto\])?$/;

// RegExps for Style Sheets
const regexCssGlobal = /(?<!\.module)\.css$/;
const regexCssModules = /\.module\.css$/;

// RegExps for Syntactically Awesome Style Sheets
const regexSassGlobal = /(?<!\.module)\.(scss|sass)$/;
const regexSassModules = /\.module\.(scss|sass)$/;

const loader = (rule) => (config) => {
    if (!config.module) {
        config.module = {
            rules: [],
        };
    }
    if (rule.oneOf) {
        const existing = config.module.rules.find(
            (arrayRule) => arrayRule.oneOf
        );
        if (existing) {
            existing.oneOf.push(...rule.oneOf);
            return config;
        }
    }
    config.module.rules.push(rule);
    return config;
};
const pipe =
    (...fns) =>
    (param) =>
        fns.reduce((result, next) => next(result), param);

module.exports.css = (ctx, config) => {
    const {
        prependData: sassPrependData,
        additionalData: sassAdditionalData,
        ...sassOptions
    } = ctx.sassOptions;

    const sassPreprocessors = [
        // First, process files with `sass-loader`: this inlines content, and
        // compiles away the proprietary syntax.
        {
            loader: require.resolve("next/dist/compiled/sass-loader"),
            options: {
                // Source maps are required so that `resolve-url-loader` can locate
                // files original to their source directory.
                sourceMap: true,
                sassOptions,
                additionalData: sassPrependData || sassAdditionalData,
            },
        },
        // Then, `sass-loader` will have passed-through CSS consts as-is instead
        // of inlining them. Because they were inlined, the paths are no longer
        // correct.
        // To fix this, we use `resolve-url-loader` to rewrite the CSS
        // consts to real file paths.
        {
            loader: require.resolve("next/dist/compiled/resolve-url-loader"),
            options: {
                // Source maps are not required here, but we may as well emit
                // them.
                sourceMap: true,
            },
        },
    ];

    const fns = [
        loader({
            oneOf: [
                {
                    // Impossible regex expression
                    test: /a^/,
                    loader: "noop-loader",
                    options: { __next_css_remove: true },
                },
            ],
        }),
    ];

    const postCssPlugins = {
        plugins: [
            require.resolve("next/dist/compiled/postcss-flexbugs-fixes"),
            [
                require.resolve("next/dist/compiled/postcss-preset-env"),
                {
                    browsers: ["defaults"],
                    autoprefixer: {
                        // Disable legacy flexbox support
                        flexbox: "no-2009",
                    },
                    // Enable CSS features that have shipped to the
                    // web platform, i.e. in 2+ browsers unflagged.
                    stage: 3,
                    features: {
                        "custom-properties": false,
                    },
                },
            ],
        ],
    };

    // CSS cannot be consted in _document. This comes before everything because
    // global CSS nor CSS modules work in said file.
    fns.push(
        loader({
            oneOf: [
                {
                    test: regexLikeCss,
                    // Use a loose regex so we don't have to crawl the file system to
                    // find the real file name (if present).
                    issuer: /pages[\\/]_document\./,
                    use: {
                        loader: "error-loader",
                        options: {
                            reason: getCustomDocumentError(),
                        },
                    },
                },
            ],
        })
    );

    // CSS Modules support must be enabled on the server and client so the class
    // names are available for SSR or Prerendering.
    fns.push(
        loader({
            oneOf: [
                {
                    // CSS Modules should never have side effects. This setting will
                    // allow unused CSS to be removed = the production build.
                    // We ensure this by disallowing `:global()` CSS at the top-level
                    // via the `pure` mode in `css-loader`.
                    sideEffects: false,
                    // CSS Modules are activated via this specific extension.
                    test: regexCssModules,
                    // CSS Modules are only supported in the user's application. We're
                    // not yet allowing CSS consts _within_ `node_modules`.
                    issuer: {
                        and: [ctx.rootDirectory],
                        not: [/node_modules/],
                    },
                    use: [
                        ...getCssModuleLoader(ctx, postCssPlugins),
                        {
                            loader: path.resolve(
                                "./css-to-react-native-loader.js"
                            ),
                        },
                    ],
                },
            ],
        })
    );
    fns.push(
        loader({
            oneOf: [
                // Opt-in support for Sass (using .scss or .sass extensions).
                {
                    // Sass Modules should never have side effects. This setting will
                    // allow unused Sass to be removed = the production build.
                    // We ensure this by disallowing `:global()` Sass at the top-level
                    // via the `pure` mode in `css-loader`.
                    sideEffects: false,
                    // Sass Modules are activated via this specific extension.
                    test: regexSassModules,
                    // Sass Modules are only supported in the user's application. We're
                    // not yet allowing Sass consts _within_ `node_modules`.
                    issuer: {
                        and: [ctx.rootDirectory],
                        not: [/node_modules/],
                    },
                    use: getCssModuleLoader(
                        ctx,
                        postCssPlugins,
                        sassPreprocessors
                    ),
                },
            ],
        })
    );

    // Throw an error for CSS Modules used outside their supported scope
    fns.push(
        loader({
            oneOf: [
                {
                    test: [regexCssModules, regexSassModules],
                    use: {
                        loader: "error-loader",
                        options: {
                            reason: getLocalModuleImportError(),
                        },
                    },
                },
            ],
        })
    );

    if (ctx.isServer) {
        fns.push(
            loader({
                oneOf: [
                    {
                        test: [regexCssGlobal, regexSassGlobal],
                        use: require.resolve(
                            "next/dist/compiled/ignore-loader"
                        ),
                    },
                ],
            })
        );
    } else {
        fns.push(
            loader({
                oneOf: [
                    {
                        // A global CSS const always has side effects. Webpack will tree
                        // shake the CSS without this option if the issuer claims to have
                        // no side-effects.
                        // See https://github.com/webpack/webpack/issues/6571
                        sideEffects: true,
                        test: regexCssGlobal,
                        // We only allow Global CSS to be consted anywhere in the
                        // application if it comes = node_modules. This is a best-effort
                        // heuristic that makes a safety trade-off for better
                        // interoperability with npm packages that require CSS. Without
                        // this ability, the component's CSS would have to be included for
                        // the entire app instead of specific page where it's required.
                        include: { and: [/node_modules/] },
                        // Global CSS is only supported in the user's application, not in
                        // node_modules.
                        issuer: ctx.isCraCompat
                            ? undefined
                            : {
                                  and: [ctx.rootDirectory],
                                  not: [/node_modules/],
                              },
                        use: getGlobalCssLoader(ctx, postCssPlugins),
                    },
                ],
            })
        );

        if (ctx.customAppFile) {
            fns.push(
                loader({
                    oneOf: [
                        {
                            // A global CSS const always has side effects. Webpack will tree
                            // shake the CSS without this option if the issuer claims to have
                            // no side-effects.
                            // See https://github.com/webpack/webpack/issues/6571
                            sideEffects: true,
                            test: regexCssGlobal,
                            issuer: { and: [ctx.customAppFile] },
                            use: getGlobalCssLoader(ctx, postCssPlugins),
                        },
                    ],
                })
            );
            fns.push(
                loader({
                    oneOf: [
                        {
                            // A global Sass const always has side effects. Webpack will tree
                            // shake the Sass without this option if the issuer claims to have
                            // no side-effects.
                            // See https://github.com/webpack/webpack/issues/6571
                            sideEffects: true,
                            test: regexSassGlobal,
                            issuer: { and: [ctx.customAppFile] },
                            use: getGlobalCssLoader(
                                ctx,
                                postCssPlugins,
                                sassPreprocessors
                            ),
                        },
                    ],
                })
            );
        }
    }

    // Throw an error for Global CSS used inside of `node_modules`
    if (!ctx.isCraCompat) {
        fns.push(
            loader({
                oneOf: [
                    {
                        test: [regexCssGlobal, regexSassGlobal],
                        issuer: { and: [/node_modules/] },
                        use: {
                            loader: "error-loader",
                            options: {
                                reason: getGlobalModuleImportError(),
                            },
                        },
                    },
                ],
            })
        );
    }

    // Throw an error for Global CSS used outside of our custom <App> file
    fns.push(
        loader({
            oneOf: [
                {
                    test: [regexCssGlobal, regexSassGlobal],
                    use: {
                        loader: "error-loader",
                        options: {
                            reason: getGlobalImportError(),
                        },
                    },
                },
            ],
        })
    );

    if (ctx.isClient) {
        // Automatically transform references to files (i.e. url()) into URLs
        // e.g. url(./logo.svg)
        fns.push(
            loader({
                oneOf: [
                    {
                        // This should only be applied to CSS files
                        issuer: regexLikeCss,
                        // Exclude extensions that webpack handles by default
                        exclude: [
                            /\.(js|mjs|jsx|ts|tsx)$/,
                            /\.html$/,
                            /\.json$/,
                            /\.webpack\[[^\]]+\]$/,
                        ],
                        use: {
                            // `file-loader` always emits a URL reference, where `url-loader`
                            // might inline the asset as a data URI
                            loader: require.resolve(
                                "next/dist/compiled/file-loader"
                            ),
                            options: {
                                // Hash the file for immutable cacheability
                                name: "static/media/[name].[hash].[ext]",
                            },
                        },
                    },
                ],
            })
        );
    }

    const fn = pipe(...fns);
    return fn(config);
};
