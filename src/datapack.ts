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
            let json = util.parseData(data);
            if(json == null) continue;

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

    async getResolvedData(fileData: util.FileData, occurences: number[]) {
        let resolvedData: string[] = []

        for(let packIdx of occurences) {
            let packZip = this.packs[packIdx].zip;
            let data = await packZip.file(fileData.path).async("string");
            resolvedData.push(data)
        }

        return resolvedData;
    }

    async ifAnyDifferent(fileData: util.FileData, occurences: number[], success: (resolvedData: string[])=>void, failure: (resolvedData: string[])=>void) {
        let resolvedData: string[] = await this.getResolvedData(fileData, occurences);


        let first = resolvedData[0];
        for(let d = 1; d < resolvedData.length; d++) {
            if(resolvedData[d] != first) {
                success(resolvedData);
                return;
            }
        }

        failure(resolvedData);
    } 

    override async handleConflict(fileData: util.FileData, occurences: number[]) {
        function onSuccess(resolvedData: string[]) {
            if(fileData.category === 'tags') {
                this.mergeTags(fileData, resolvedData);
            } else {
                this.finalZip.file(fileData.path, resolvedData[0]);
            }
        }

        function onFailure(resolvedData: string[]) {
            this.finalZip.file(fileData.path, resolvedData[0]);
            this.fileMap[fileData.namespace][fileData.category][fileData.path] = null;
        }
        await this.ifAnyDifferent(fileData, occurences, onSuccess, onFailure)
    }
}

