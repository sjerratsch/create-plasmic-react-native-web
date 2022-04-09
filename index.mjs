import chalk from "chalk";
import path from "path";
import fs from "fs";
import { exec, execSync } from "child_process";
import yargs from "yargs";

yargs(process.argv.slice(2))
    .command(
        "bootstrap [name]",
        "bootstrap a new react-native-web with plasmic project",
        (y) => {
            return y
                .positional("name", {
                    description: "React-Native project name",
                    type: "string",
                })
                .option("platform", {
                    describe: "Target platform",
                    choices: ["nextjs"],
                    default: "nextjs",
                })
                .option("scheme", {
                    describe: "Plasmic integration scheme",
                    choices: ["codegen", "loader"],
                    default: "codegen",
                })
                .option("projectId", {
                    description: "Plasmic project ID",
                    string: true,
                    demandOption: true,
                })
                .option("projectApiToken", {
                    describe:
                        "Plasmic project API token (bypass standard auth)",
                    string: true,
                    demandOption: true,
                });
        },
        async ({ name, platform, scheme, projectId, projectApiToken }) => {
            const cwd = process.cwd();
            console.log(
                chalk.green(
                    "Bootstrapping react-native project using the typescript template..."
                )
            );
            execSync(
                `npx react-native init ${name} --template react-native-template-typescript`,
                {
                    cwd,
                    stdio: "pipe",
                }
            );

            console.log(chalk.green("Success."));
            console.log(chalk.green("Bootstrapping plasmic nextjs project..."));
            execSync(
                `npx create-plasmic-app --platform=${platform} --scheme=${scheme} --projectId=${projectId} --projectApiToken=${projectApiToken} --typescript plasmic`,
                {
                    cwd,
                    stdio: "pipe",
                }
            );
            console.log(chalk.green("Success."));
            console.log(chalk.green("Making some changes..."));

            console.log(
                chalk.green(
                    "1) installing specific nextjs and react-native-web versions and @plasmicapp/loader-nextjs & host"
                )
            );
            execSync(
                "npm install --save @plasmicapp/loader-nextjs @plasmicapp/host next@11.1.3 react-native-web@0.17.5",
                { cwd: path.join(cwd, "plasmic"), stdio: "pipe" }
            );
            console.log(
                chalk.green(
                    "2) installing babel and postcss plugins and esbuild"
                )
            );
            execSync(
                "npm install --save-dev patch-package babel-plugin-react-native-classname-to-style babel-plugin-react-native-platform-specific-extensions css-to-react-native-transform esbuild-loader postcss postcss-css-variables react-native-postcss-transformer",
                { cwd: path.join(cwd, "plasmic"), stdio: "pipe" }
            );
            execSync(
                "yarn add -D esbuild esbuild-plugin-alias-path esbuild-plugin-flow",
                { cwd: path.join(cwd, name), stdio: "pipe" }
            );

            console.log(chalk.green("3) add plasmic-init.ts"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "plasmic-init.ts"),
                fs.readFileSync(
                    path
                        .resolve("template", "plasmic-init.ts")
                        .replace("[projectId]", projectId)
                        .replace("[projectApiToken]", projectApiToken)
                )
            );

            console.log(chalk.green("4) replace pages/_app.js"));
            fs.unlinkSync(path.join(cwd, "plasmic", "pages", "_app.js"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "pages", "_app.js"),
                fs.readFileSync(path.resolve("template/_app.tsx"))
            );
            console.log(chalk.green("5) replace pages/plasmic-host.tsx"));
            fs.unlinkSync(
                path.join(cwd, "plasmic", "pages", "plasmic-host.tsx")
            );
            fs.writeFileSync(
                path.join(cwd, "plasmic", "pages", "plasmic-host.tsx"),
                fs.readFileSync(path.resolve("template/plasmic-host.tsx"))
            );

            console.log(chalk.green("6) add .postcssrc.js"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", ".postcssrc.js"),
                fs.readFileSync(path.resolve("template/.postcssrc.js"))
            );

            console.log(chalk.green("7) add babel.config.js"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "babel.config.js"),
                fs.readFileSync(path.resolve("template/babel.config.js"))
            );

            console.log(chalk.green("8) add css-next-loader-config.js"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "css-next-loader-config.js"),
                fs.readFileSync(
                    path.resolve("template/css-next-loader-config.js")
                )
            );

            console.log(chalk.green("9) add css-to-react-native-loader.js"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "css-to-react-native-loader.js"),
                fs.readFileSync(
                    path.resolve("template/css-to-react-native-loader.js")
                )
            );

            console.log(chalk.green("10) replace next.config.js"));
            fs.unlinkSync(path.join(cwd, "plasmic", "next.config.js"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "next.config.js"),
                fs.readFileSync(path.resolve("template/next.config.js"))
            );

            console.log(
                chalk.green(
                    "11) apply patches to nextjs, react-native-web and @plasmicapp/cli"
                )
            );
            fs.mkdirSync(path.join(cwd, "plasmic", "patches"));
            fs.writeFileSync(
                path.join(cwd, "plasmic", "patches", "next+11.1.3.patch"),
                fs.readFileSync(
                    path.resolve("template/patches/next+11.1.3.patch")
                )
            );
            fs.writeFileSync(
                path.join(
                    cwd,
                    "plasmic",
                    "patches",
                    "react-native-web+0.17.5.patch"
                ),
                fs.readFileSync(
                    path.resolve(
                        "template/patches/react-native-web+0.17.5.patch"
                    )
                )
            );
            fs.writeFileSync(
                path.join(
                    cwd,
                    "plasmic",
                    "patches",
                    "@plasmicapp+cli+0.1.174.patch"
                ),
                fs.readFileSync(
                    path.resolve(
                        "template/patches/@plasmicapp+cli+0.1.174.patch"
                    )
                )
            );
            execSync("npx patch-package", {
                cwd: path.join(cwd, "plasmic"),
                stdio: "pipe",
            });

            console.log(
                chalk.green(
                    "12) add plasmic-esbuild.mjs, index.plasmic.tsx (esbuild entrypoint), and ExampleButton as example plasmic Component."
                )
            );
            fs.writeFileSync(
                path.join(cwd, name, "plasmic-esbuild.mjs"),
                fs.readFileSync(path.resolve("template/plasmic-esbuild.mjs"))
            );
            fs.writeFileSync(
                path.join(cwd, name, "index.plasmic.tsx"),
                fs.readFileSync(path.resolve("template/index.plasmic.tsx"))
            );
            fs.writeFileSync(
                path.join(cwd, name, "ExampleButton.tsx"),
                fs.readFileSync(path.resolve("template/ExampleButton.tsx"))
            );

            console.log(
                chalk.green(
                    "moving the plasmic project inside the react-native project folder"
                )
            );
            execSync(`mv plasmic/ ${name}/.plasmic`, { cwd });
            execSync("node plasmic-esbuild.mjs", { cwd: path.join(cwd, name) });
        }
    )
    .demandCommand().argv;
