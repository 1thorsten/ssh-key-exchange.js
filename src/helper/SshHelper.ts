import {NodeSSH} from "node-ssh";
import {tmpdir} from "os";
import {sep} from "path";
import {readFileSync, unlinkSync, writeFileSync} from "fs";

export interface ConnectionConfig {
    host: string,
    user: string,
    port: number
}

type ScriptResult = { localPath: string, remotePath: string, content: string };

export class SshHelper {
    public static async checkKeyAuthentication(config: ConnectionConfig, rsaPrivPath: string): Promise<boolean> {
        let ssh: NodeSSH;
        try {
            ssh = await new NodeSSH().connect({
                host: config.host,
                username: config.user,
                port: config.port,
                privateKey: rsaPrivPath,
                tryKeyboard: false,
            });
            if (ssh.isConnected()) {
                let result = await ssh.execCommand("uname -a");
                result['stdout'] && console.log(result['stdout']);
                result['stderr'] && console.warn(result['stderr']);
                return true;
            }
        } catch (e) {
            if (e.level === "client-authentication" && e.message === "All configured authentication methods failed") {
                console.warn(`Key-Authentication failed (user: ${config.user}, host: ${config.host})`);
                return false;
            }
            throw e;
        } finally {
            ssh?.dispose();
        }
        return false;
    }

    public static async transferPublicKey(config: ConnectionConfig, password: string, rsaPubPath: string): Promise<void> {
        let ssh: NodeSSH;
        try {
            ssh = await new NodeSSH().connect({
                host: config.host,
                username: config.user,
                port: config.port,
                password,
                tryKeyboard: true,
                onKeyboardInteractive: (name: any, instructions: any, instructionsLang: any, prompts: string | any[], finish: (arg0: (string | undefined)[]) => void) => {
                    if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                        finish([password]);
                    }
                }
            });

            const script: ScriptResult = SshHelper.createRemoteScript(rsaPubPath, config.user);
            await SshHelper.copyRemoteScript(ssh, script);

            const result = await ssh.execCommand("env sh " + script.remotePath, {cwd: '/root'});
            result['stdout'] && console.log(result['stdout']);
            result['stderr'] && console.warn(result['stderr']);
        } catch (e) {
            if (e.level === "client-authentication" && e.message === "All configured authentication methods failed") {
                throw new Error(`client-authentication failed (user: ${config.user}, host: ${config.host}): check password`)
            }
            throw e;
        } finally {
            ssh?.dispose();
        }
    }

    private static createRemoteScript(rsaPubPath: string, user: string): ScriptResult {
        const random = Math.random().toString(36).substring(7);
        const baseName = `ssh-script.${random}`;
        const localPath = tmpdir() + sep + baseName;
        const remotePath = `/tmp/${baseName}`;
        const rsaPubKey: string = readFileSync(rsaPubPath, {encoding: "utf-8"});
        const content = `\
        mkdir -p ~${user}/.ssh
        
        # ensure availabilty of authorized_keys
        touch ~${user}/.ssh/authorized_keys
        
        # avoid adding the same key multiple times
        COUNT=\`cat ~${user}/.ssh/authorized_keys | grep -i '${rsaPubKey.trim()}' | wc -l\`
        if [ "\$COUNT" -eq 0 ]; then
          printf '\\n${rsaPubKey.trim()}\\n' >> ~${user}/.ssh/authorized_keys
        fi
        
        # remove this script
        rm ${remotePath}`;

        return {localPath, remotePath, content};
    }

    private static async copyRemoteScript(ssh: NodeSSH, script: ScriptResult, quiet: boolean = false): Promise<void> {
        quiet || console.log("script-path: " + script.localPath);
        writeFileSync(script.localPath, script.content, {encoding: "utf-8"});
        await ssh.putFile(script.localPath, script.remotePath);
        unlinkSync(script.localPath);
    }
}
