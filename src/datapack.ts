import { TextReader } from '@zip.js/zip.js';
import * as util from './util.js'
import { FileOccurence } from './util.js';


export default class DefaultDatapackBuilder extends util.PackBuilder {
    constructor() {
        super('datapack');
    }

    async mergeTags(fileData: util.FileData, resolvedData: string[]) {
        let finalJson: {replace: boolean, values: any[]} = {
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

        await this.finalZip.addFile(fileData.path, Buffer.from(JSON.stringify(finalJson, null, 2)));
        // this.fileMap[fileData.namespace][fileData.category][fileData.path] = [];
    }

    async getResolvedData(fileData: util.FileData, occurences: FileOccurence[]) {
        let resolvedData: string[] = []

        for(let occurence of occurences) {
            const file = await occurence.entry.getData()
            if(file !== undefined) { 
                resolvedData.push(file.toString('utf-8'));
            }
        }

        return resolvedData;
    }

    async ifAnyDifferent(fileData: util.FileData, occurences: FileOccurence[], success: (resolvedData: string[])=>void, failure: (resolvedData: string[])=>void): Promise<boolean> {
        let resolvedData: string[] = await this.getResolvedData(fileData, occurences);


        let first = resolvedData[0];
        for(let d = 1; d < resolvedData.length; d++) {
            if(resolvedData[d].localeCompare(first) == 0) {
                await success(resolvedData);
                return true;
            }
        }

        failure(resolvedData);
        return false;
    } 

    override async handleConflict(fileData: util.FileData, occurences: FileOccurence[]): Promise<boolean> {
        const onSuccess = async (resolvedData: string[]) => {
            if(fileData.category === 'tags') {
                await this.mergeTags(fileData, resolvedData);
                return true;
            } else {
                await this.finalZip.addFile(fileData.path, Buffer.from(resolvedData[0]));
                return false;
            }
        }

        const onFailure = async (resolvedData: string[]) => {
            await this.finalZip.addFile(fileData.path, Buffer.from(resolvedData[0]));
        }
        return await this.ifAnyDifferent(fileData, occurences, onSuccess, onFailure)
    }
}

