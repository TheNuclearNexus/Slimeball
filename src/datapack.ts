import JSZip from 'jszip'
import * as util from './util'


export default class DefaultDatapackBuilder extends util.PackBuilder {
    constructor() {
        super('datapack');
    }

    mergeTags(fileData: util.FileData, resolvedData: string[]) {
        let finalJson = {
            replace: false,
            values: []
        }

        for(let data of resolvedData) {
            let json = JSON.parse(data);

            if(json["values"] == null) continue;

            for(let value of json["values"]) {
                if(!finalJson.values.includes(value)) {
                    finalJson.values.push(value);
                }
            }
        }

        this.finalZip.file(fileData.path, JSON.stringify(finalJson, null, 2));
        this.fileMap[fileData.namespace][fileData.category][fileData.path] = null;
    }

    override async handleConflict(fileData: util.FileData, occurences: number[]) {
        let resolvedData: string[] = []
        for(let packIdx of occurences) {
            let packZip = this.packs[packIdx].zip;
            let data = await packZip.file(fileData.path).async("string");
            resolvedData.push(data)
        }

        let first = resolvedData[0];
        for(let d = 1; d < resolvedData.length; d++) {
            if(resolvedData[d] != first) {
                if(fileData.category === 'tags') {
                    this.mergeTags(fileData, resolvedData);
                } else {
                    this.finalZip.file(fileData.path, first);
                }

                return;
            }
        }
        this.finalZip.file(fileData.path, await this.packs[occurences[0]].zip.file(fileData.path).async("arraybuffer"));
        this.fileMap[fileData.namespace][fileData.category][fileData.path] = null;
    }
}

