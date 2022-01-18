import * as util from './util'
import * as linq from 'linq-es5'
import JSZip from 'jszip'

export default class DefaultResourcepackBuilder extends util.PackBuilder {
    constructor() {
        super('resourcepack');
    }

    mergeLangs(fileData: util.FileData, resolvedData: string[]) {
        let finalLang: {[key: string]: any} = {}

        for(let data of resolvedData) {
            let json = util.parseData(data);
            if(json == null) continue;

            for(let k in json) {
                finalLang[k] = json[k];
            }
        }

        this.finalZip.file(fileData.path, JSON.stringify(finalLang, null, 2));
        this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    mergeModels(fileData: util.FileData, resolvedData: string[]) {
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
            this.finalZip.file(fileData.path, JSON.stringify(finalModel, null, 2));
        }
        
        this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    override async handleConflict(fileData: util.FileData, occurences: number[]) {
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
            this.mergeLangs(fileData, resolvedData);
        } else if (fileData.category === 'models') {
            this.mergeModels(fileData, resolvedData)
        } else {
            const f = this.packs[occurences[0]].zip.file(fileData.path)
            if(f != null)
                this.finalZip.file(fileData.path, await f.async("arraybuffer"));
        }
    }
}
