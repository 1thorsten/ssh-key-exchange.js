const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
let nextArgument = false;

process.argv.slice(2).forEach((val) => {
    if (val.startsWith('--env')) {
        nextArgument = true;
    } else if (nextArgument) {
        nextArgument = false;
        const keyVal = val.split('=');
        if (keyVal.length === 2) {
            arguments[keyVal[0]] = keyVal[1];
        } else if (keyVal.length === 1) {
            arguments[keyVal[0]] = true
        } else {
            throw new Error("no env variable found after --env. Should be key=value, but found: " + val);
        }
    }
});

const mainModule = "ssh-key-exchange";

// externals -> https://github.com/websockets/ws/issues/1126
module.exports = {
    externals: {
        bufferutil: "bufferutil",
        "utf-8-validate": "utf-8-validate",
    },
    entry: `./src/${mainModule}.ts`,
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.http$/i,
                use: [
                    {
                        loader: 'raw-loader',
                        options: {
                            esModule: true,
                        },
                    },
                ],
            },
            {
                test: /\.node$/,
                use: [
                    {
                        loader: 'raw-loader',
                        options: {
                            esModule: false,
                        },
                    },
                ],
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.css', '.js']
    },
    plugins: [
        new CleanWebpackPlugin(),
        new CopyPlugin({
            patterns: [
                {from: `src/resources`, to: 'resources', noErrorOnMissing: true},
                {from: `src/package.json`, to: 'package.json', noErrorOnMissing: true},
            ]
        }),
    ],
    output: {
        filename: `${mainModule}.js`,
        path: path.resolve(`dist/${mainModule}`)
    },
    target: "node",
    profile: false,
    cache: {type: "memory"},
    // https://webpack.js.org/configuration/node/#node
    node: {
        __dirname: true,
        __filename: true
    }
};
