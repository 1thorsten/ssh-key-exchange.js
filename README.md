# ssh-key-exchange.js
ssh-key-exchange (ske) changes the way you set up key-based ssh communication between two or more computers.
ske performs all the necessary steps that you must perform before key-based authentication can begin.

1. ske generates the necessary private and public key for the computer on which ske is started (it also takes an existing key pair).
2. ske connects to the remote computer via a password and adds the public key to the authorized keys
3. then ske checks whether the key-based authentication works or not
4. you can define a range of remote computers for which key-based authentication should be set up
5. at the end a short report is generated

# Build
ske uses webpack to put all the components into a dependency-free javascript file that is simply executed using node.

Thus, only the resulting javascript file is needed on the server running ske. The modules needed for development (node_modules) are no longer needed here.

Compilation of ske to a file:
```bash
npm run build:dist
```

# Example usage
You can try out the different options of ske with:
```bash
node ssh-key-exchange.js -h
```
For testing ske you can use a tiny ssh-server from docker-hub
```bash
# first terminal
docker run --rm --publish=2222:22 --name ssh-server-local sickp/alpine-sshd:latest

# second terminal
## generating (you have to specify the password)
node ssh-key-exchange.js --host 127.0.0.1 --port 2222 --user root --rsaKeyGenerate

## ssh shell key-based
ssh -o StrictHostKeyChecking=no root@127.0.0.1 -p 2222
```
Stopping the ssh-server as follows:
````bash
docker stop ssh-server-local
````

# Download
You can also just download the latest release from [here](https://github.com/1thorsten/ssh-key-exchange.js/releases).
