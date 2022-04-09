var css2rn = require("css-to-react-native-transform").default;
var postcss = require("postcss");
var postcssrc = require("postcss-load-config");

var postcss = require("postcss");

function isUnitless(value) {
    return value.toString().indexOf("px") === -1 && !isNaN(+value);
}
function toPx(value) {
    return `${value}px`;
}
function isPx(value) {
    return value.toString().indexOf("px") > -1;
}
function toUnitless(value) {
    return value.split("px")[0] * 1;
}
function convertUnitlessLineHeight(value, fontSize) {
    var result = value;

    if (isPx(fontSize)) {
        result = toUnitless(fontSize);
        result = value * result;
        result = Math.round(result * 100) / 100;
    }

    return toPx(result);
}
const lineheightToPx = postcss.plugin(
    "postcss-line-height-unitless-to-px",
    function (opts) {
        var options = opts || {};

        var lineHeightProp = "line-height",
            fontSizeProp = "font-size";

        return function (css) {
            css.walkRules(function (rule) {
                var fontSize;

                rule.walkDecls(fontSizeProp, function (decl) {
                    fontSize = decl.value;
                });

                if (fontSize) {
                    rule.walkDecls(lineHeightProp, function (decl) {
                        if (decl.value && isUnitless(decl.value)) {
                            decl.value = convertUnitlessLineHeight(
                                decl.value,
                                fontSize
                            );
                        }
                    });
                }
            });
        };
    }
);

module.exports = function (source) {
    var ctx = { parser: false, map: "inline" };
    return postcssrc(ctx).then((config) => {
        return postcss([...config.plugins, lineheightToPx({})])
            .process(
                source.replace(/\.plasmic_default_styles \{/g, ":root {"),
                config.options
            )
            .then((result) => {
                result.css = result.css.replace(
                    /\:global\(\.__wab_instance\)/g,
                    ""
                );
                var cssObject = css2rn(result.css, { parseMediaQueries: true });
                return `
const cssObj = ${JSON.stringify(cssObject)};
let _StyleSheet = null;

let moduleOut = null;
try {
    const { StyleSheet } = require("react-native-web/dist/cjs/index.js");
    const StyleResolver = require("react-native-web/dist/cjs/exports/StyleSheet/styleResolver");
    moduleOut = {};
    Object.entries(StyleSheet.create(cssObj)).forEach((e) => {
        Object.defineProperty(moduleOut, e[0], ({ get: () => StyleResolver.resolve([+e[1]], []).className }))
    });
}
catch(e) {
    console.error(e);
    const { StyleSheet } = require("react-native");
    moduleOut = StyleSheet.create(cssObj);
}
module.exports = moduleOut;
`;
            });
    });
};
