import * as fs from "fs";
import {existsSync, writeFileSync} from "fs";
import {SshHelper} from "./SshHelper";
import {generateKeyPairSync} from "crypto";
import * as path from "path";
import * as sshpk from 'sshpk';
import {Opts} from "./ParsedArgs";
import {Tcp} from "./Tcp";
import {getPass} from 'getpass';

export type Summary = { host: string, success: boolean, message?: string };

export class LocalHelper {

    /**
     * check the existance of the private and public keys.
     * @param {string} rsaPrivPath - location of the private key (e.g. id_rsa)
     * @param {string} rsaPubPath - location of the public key (e.g. id_rsa.pub)
     * @param {boolean} createIfNotExisting - (re)create with ssh-keygen private and public key if not existing
     */
    public static handleRSAKeys(rsaPrivPath: string, rsaPubPath: string, createIfNotExisting: boolean = true) {
        if ((!existsSync(rsaPrivPath) || !existsSync(rsaPubPath)) && createIfNotExisting) {
            const privDir = path.dirname(rsaPrivPath);
            fs.existsSync(privDir) || fs.mkdirSync(privDir, {recursive: true, mode: 0o700});

            const pubDir = path.dirname(rsaPubPath);
            fs.existsSync(pubDir) || fs.mkdirSync(pubDir, {recursive: true, mode: 0o700});

            console.time("generate keys");
            const pair = this.generateKeyPair();
            console.timeEnd("generate keys");

            writeFileSync(rsaPrivPath, pair.privateKey, {encoding: "utf8", mode: 0o600});
            console.log("private key saved to: " + rsaPrivPath);

            writeFileSync(rsaPubPath, pair.publicKey, {encoding: "utf8", mode: 0o600});
            console.log("public key saved to: " + rsaPubPath);
        }

        if (!existsSync(rsaPrivPath) || !existsSync(rsaPubPath)) {
            throw new Error(`ssh keys not exists (id_rsa (${rsaPrivPath}): ${existsSync(rsaPrivPath)}, id_rsa.pub (${rsaPubPath}): ${existsSync(rsaPubPath)})`);
        }
    }

    public static resolveRemoteHostIpAddresses(host: string, range: string | undefined, exclude: string | undefined): string[] {
        if (!host.includes("X")) {
            return [host];
        }

        let ipHosts = Array<number>();

        if (range) {
            range.split(",")
                .map(part => part.trim())
                .forEach(part => {
                    // 9-13
                    if (part.includes("-")) {
                        const rangeValues = part.split('-');
                        const makeRange = (start: number, end: number): Array<number> =>
                            Array<number>(end - start + 1).fill(0).map((_, idx) => start + idx);

                        const result = makeRange(parseInt(rangeValues[0]), parseInt(rangeValues[1]));
                        ipHosts = ipHosts.concat(result);
                    } else {
                        ipHosts.push(parseInt(part));
                    }
                });
        }

        // remove excluded elements
        if (exclude && ipHosts.length > 0) {
            exclude.split(",")
                .map(part => parseInt(part.trim()))
                .forEach(element2remove => {
                    ipHosts = ipHosts.filter(e => e !== element2remove);
                });
        }

        // replace 'X'
        const remoteIpAddresses: string[] = [];
        const ipHostsSorted = ipHosts.sort((a, b) => a - b);
        ipHostsSorted.forEach(ipHost => {
            const ipAddress = host.replace(/[X]/, ipHost.toString());
            remoteIpAddresses.push(ipAddress);
        })
        console.log("remoteIpAddresses: " + remoteIpAddresses);
        return remoteIpAddresses;
    }

    public static async distributeKey(host: string, opts: Opts): Promise<Summary> {
        const summary: Summary = {host, success: true};

        console.log("check: " + host);
        if (await Tcp.checkTcpPort(opts.PORT, host, 120)) {
            try {
                const sshConfig = {host: host, user: opts.SSH_USER, port: opts.PORT};
                if (await SshHelper.checkKeyAuthentication(sshConfig, opts.ID_RSA)) {
                    summary.message = "has already been set up";
                    return summary;
                }

                if (!opts.SSH_PASS) {
                    opts.SSH_PASS = await this.askPassword("Password");
                }

                await SshHelper.transferPublicKey(sshConfig, opts.SSH_PASS!, opts.ID_RSA_PUB);
                summary.success = await SshHelper.checkKeyAuthentication(sshConfig, opts.ID_RSA);
            } catch (e) {
                console.warn(e);
                summary.success = false;
                summary.message = e.message;
            }
        } else {
            summary.success = false;
            summary.message = `Port (${opts.PORT}) is not open.`
        }
        return summary;
    }

    private static async askPassword(prompt: string): Promise<string> {
        return await new Promise<string>((resolve, reject) => {
            // https://www.npmjs.com/package/getpass
            getPass({prompt: prompt}, (error, password) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(password);
                }
            })
        });
    }

    private static generateKeyPair(): { publicKey: string, privateKey: string } {
        const keyPairResult = generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            }
        });

        // convert public key in PEM-format into openssh-format (ssh-rsa)
        const pemKey = sshpk.parseKey(keyPairResult.publicKey, 'pem');
        const sshRsa = pemKey.toString('ssh');
        return {publicKey: sshRsa, privateKey: keyPairResult.privateKey};
    }
}

