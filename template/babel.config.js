module.exports = {
    presets: ["next/babel"],
    plugins: [
        "react-native-classname-to-style",
        [
            "react-native-platform-specific-extensions",
            {
                extensions: ["css"],
            },
        ],
    ],
};
