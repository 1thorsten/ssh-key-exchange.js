// https://www.npmjs.com/package/node-ssh

import {LocalHelper, Summary} from "./helper/LocalHelper";
import {Opts, ParsedArgs} from "./helper/ParsedArgs";

(async () => {
    // @ts-ignore
    process.noDeprecation = true;

    try {
        const opts: Opts = ParsedArgs.getOpts();
        LocalHelper.handleRSAKeys(opts.ID_RSA, opts.ID_RSA_PUB, opts.RSA_KEYGEN);

        const summaryList: Array<Summary> = [];
        for (const host of LocalHelper.resolveRemoteHostIpAddresses(opts.HOST!, opts.RANGE, opts.EXCLUDE)) {
            const summary = await LocalHelper.distributeKey(host, opts);
            summaryList.push(summary);
        }
        console.log("Summary");
        console.log(Array.from({length: "Summary".length}, _ => "-").join(""));
        summaryList.forEach(s => console.log(`${s.host}\t-> ${s.success ? "OK" : "FAILED"} ${s.message ? "- " + s.message : ""}`));

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
    process.exit(0);
})();
