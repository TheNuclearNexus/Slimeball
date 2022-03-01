import * as util from './util.js'
import * as linq from 'linq-es5'
import { BlobReader, TextReader } from '@zip.js/zip.js';

export default class DefaultResourcepackBuilder extends util.PackBuilder {
    constructor() {
        super('resourcepack');
    }

    async mergeLangs(fileData: util.FileData, resolvedData: string[]) {
        let finalLang: {[key: string]: any} = {}

        for(let data of resolvedData) {
            let json = util.parseData(data);
            if(json == null) continue;

            for(let k in json) {
                finalLang[k] = json[k];
            }
        }
        await this.finalZip.add(fileData.path, new TextReader(JSON.stringify(finalLang, null, 2)));
        // this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    async mergeModels(fileData: util.FileData, resolvedData: string[]) {
        let finalModel = null;

        for(let data of resolvedData) {
            let json = util.parseData(data);
            if(json == null) continue;

            if(finalModel == null) {
                finalModel = json;
                if(finalModel["overrides"] == null) finalModel["overrides"] = [];
            }

            if(json["overrides"] != null)
                finalModel["overrides"] = finalModel["overrides"].concat(json["overrides"])
        }

        if(finalModel != null) { 
            if(finalModel["overrides"] != null) {
                let o = linq.AsEnumerable(finalModel["overrides"])
                            
                o = o
                    .OrderBy((model: any) => model["predicate"]["custom_model_data"])
                    .ThenBy((model: any) => model["predicate"]["damage"])
                    .ThenBy((model: any) => model["predicate"]["damaged"])
                    .ThenBy((model: any) => model["predicate"]["pull"])
                    .ThenBy((model: any) => model["predicate"]["pulling"])
                    .ThenBy((model: any) => model["predicate"]["time"])
                    .ThenBy((model: any) => model["predicate"]["cooldown"])
                    .ThenBy((model: any) => model["predicate"]["angle"])
                    .ThenBy((model: any) => model["predicate"]["firework"])
                    .ThenBy((model: any) => model["predicate"]["blocking"])
                    .ThenBy((model: any) => model["predicate"]["broken"])
                    .ThenBy((model: any) => model["predicate"]["cast"])
                    .ThenBy((model: any) => model["predicate"]["lefthanded"])
                    .ThenBy((model: any) => model["predicate"]["throwing"])
                    .ThenBy((model: any) => model["predicate"]["charged"])

                finalModel["overrides"] = o.ToArray();
            }
            await this.finalZip.add(fileData.path, new TextReader(JSON.stringify(finalModel, null, 2)));
        }
        
        // this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    override async handleConflict(fileData: util.FileData, occurences: number[]): Promise<boolean> {
        let resolvedData: string[] = []
        for(let packIdx of occurences) {
            let packZip = this.packs[packIdx].zip;

            const f = packZip.file(fileData.path)

            if(f != null) {
                let data = await f.async("string");
                resolvedData.push(data)
            }
        }

        if(fileData.category === 'lang') {
            await this.mergeLangs(fileData, resolvedData);
            return true;
        } else if (fileData.category === 'models') {
            await this.mergeModels(fileData, resolvedData)
            return true;
        } else {
            const f = this.packs[occurences[0]].zip.file(fileData.path)
            if(f != null)
            await this.finalZip.add(fileData.path, new BlobReader(await f.async("blob")));
            return false;
        }
    }
}
