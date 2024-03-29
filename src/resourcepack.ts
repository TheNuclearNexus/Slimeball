import * as util from './util.js'
import * as linq from 'linq-es5'
import { BlobReader, TextReader } from '@zip.js/zip.js';

export default class DefaultResourcepackBuilder extends util.PackBuilder {
    constructor() {
        super('resourcepack');
    }

    async mergeLangs(fileData: util.FileData, resolvedData: string[]) {
        let finalLang: { [key: string]: any } = {}

        for (let data of resolvedData) {
            let json = util.parseData(data);
            if (json == null) continue;

            for (let k in json) {
                finalLang[k] = json[k];
            }
        }
        await this.finalZip.addFile(fileData.path, Buffer.from(JSON.stringify(finalLang, null, 2)));
        // this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    async mergeModels(fileData: util.FileData, resolvedData: string[]) {
        let finalModel = null;

        for (let data of resolvedData) {
            let json = util.parseData(data);
            if (json == null) continue;

            if (finalModel == null) {
                finalModel = json;
                if (finalModel["overrides"] == null) finalModel["overrides"] = [];
            }

            if (json["overrides"] != null)
                finalModel["overrides"] = finalModel["overrides"].concat(json["overrides"])
        }

        if (finalModel != null) {
            if (finalModel["overrides"] != null) {
                let o = linq.AsEnumerable(finalModel["overrides"])

                o = o
                    .OrderBy((model: any) => model["predicate"]["custom_model_data"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["damage"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["damaged"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["pull"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["pulling"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["time"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["cooldown"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["angle"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["firework"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["blocking"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["broken"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["cast"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["lefthanded"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["throwing"] ?? 0)
                    .ThenBy((model: any) => model["predicate"]["charged"] ?? 0)

                finalModel["overrides"] = o.ToArray();
            }
            await this.finalZip.addFile(fileData.path, Buffer.from(JSON.stringify(finalModel, (key, value) => {
                if(typeof value === "number")
                    if(value < 1e-6) return 1e-6
                return value
            }, 2)));
        }

        // this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    override async handleConflict(fileData: util.FileData, occurences: util.FileOccurence[]): Promise<boolean> {
        let resolvedData: string[] = []
        for (let occurence of occurences) {

            const f = await occurence.entry.getData()

            if (f !== undefined) {
                resolvedData.push(f.toString('utf-8'))
            }
        }

        if (fileData.category === 'lang') {
            await this.mergeLangs(fileData, resolvedData);
            return true;
        } else if (fileData.category === 'models') {
            await this.mergeModels(fileData, resolvedData)
            return true;
        } else {
            const f = await occurences[0].entry.getData()
            if (f !== undefined)
                await this.finalZip.addFile(fileData.path, f);
            return false;
        }
    }
}
