import * as dashdash from "dashdash";
import {Option} from "dashdash";
import {sep} from "path";

export type Opts = {
    PORT: number,
    HOST: string | undefined,
    SSH_USER: string, SSH_PASS: string | undefined,
    ID_RSA: string, ID_RSA_PUB: string, RSA_KEYGEN: boolean,
    RANGE: string | undefined, EXCLUDE: string | undefined
}

function handleArgs(): Opts {
    const home = process.env.HOME || process.env.USERPROFILE;
    const id_rsa = `${home}${sep}.ssh${sep}id_rsa`;
    const id_rsa_pub = `${id_rsa}.pub`;
    const processedOpts: Opts = {
        PORT: 22,
        HOST: undefined,
        SSH_USER: "root", SSH_PASS: undefined,
        ID_RSA: id_rsa, ID_RSA_PUB: id_rsa_pub, RSA_KEYGEN: false,
        RANGE: undefined, EXCLUDE: undefined
    };

// https://www.npmjs.com/package/dashdash
    const options: Array<Option> = [
        {
            name: 'version',
            type: 'bool',
            help: 'Print tool version and exit.'
        },
        {
            names: ['help', 'h'],
            type: 'bool',
            help: 'Print this help and exit.'
        },
        {
            names: ['host', 'i'],
            type: 'string',
            help: 'host ip (10.10.0.3) or in conjunction with range (10.20.0.X)'
        },
        {
            names: ['port', 'P'],
            type: 'number',
            help: 'port of ssh host',
            default: processedOpts.PORT.toString()
        },
        {
            names: ['user', 'u'],
            type: 'string',
            help: 'user of ssh host',
            default: processedOpts.SSH_USER
        },
        {
            names: ['password', 'p'],
            type: 'string',
            help: 'ssh password (if you do not specify it you will be asked)'
        },
        {
            names: ['rsaPrivPath', 'a'],
            type: 'string',
            completionType: 'filename',
            help: 'path of id_rsa',
            default: processedOpts.ID_RSA
        },
        {
            names: ['rsaPubPath', 'b'],
            type: 'string',
            completionType: 'filename',
            help: 'path of id_rsa.pub',
            default: processedOpts.ID_RSA_PUB
        },
        {
            names: ['rsaKeyGenerate', 'k'],
            type: 'bool',
            help: 'generate keys, base path is rsaPrivPath',
            default: String(processedOpts.RSA_KEYGEN)
        },
        {
            names: ['range', 'r'],
            type: 'string',
            help: 'range (1-6,8,13-233)'
        },
        {
            names: ['exclude', 'e'],
            type: 'string',
            help: 'comma separated list of excluded ip addresses (only in conjunction with range)'
        },

    ];

    const parser = dashdash.createParser({options: options});

    let opts;

    try {
        opts = parser.parse(process.argv);
    } catch (e) {
        console.error('ssh-key-exchange: error: %s', e.message);
        process.exit(1);
    }

    const showHelp = () => {
        const help = parser.help({includeEnv: true, includeDefault: true}).trimRight();
        console.log('usage: node ssh-key-exchange.js [OPTIONS]\n'
            + 'options:\n'
            + help);
    }
// Use `parser.help()` for formatted options help.
    if (opts.help) {
        showHelp()
        process.exit(0);
    }

    if (opts.version) {
        console.log("ssh-key-exchange.js, version " + PackageInfo.version);
        process.exit(0);
    }

    if (!opts.host) {
        console.warn("Argument: host is missing");
        showHelp()
        process.exit(1);
    }
    processedOpts.HOST = opts.host;
    processedOpts.PORT = opts.port;
    processedOpts.SSH_USER = opts.user;
    processedOpts.SSH_PASS = opts.password;
    processedOpts.ID_RSA = opts.rsaPrivPath;
    processedOpts.ID_RSA_PUB = opts.rsaPubPath;
    processedOpts.RSA_KEYGEN = opts.rsaKeyGenerate;
    processedOpts.RANGE = opts.range;
    processedOpts.EXCLUDE = opts.exclude;

    return processedOpts;
}

export class ParsedArgs {
    private static processedOpts: Opts = handleArgs();

    static getOpts(): Opts {
        return this.processedOpts;
    }
}

/**
 * holds the current version (from package.json)
 */
class PackageInfo {
    private static INFO = require("../../package.json");

    static get version(): string {
        return this.INFO.version;
    }
}