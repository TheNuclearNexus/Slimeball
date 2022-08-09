import * as zipJS from "@zip.js/zip.js";
import AdmZip, * as admZip from "adm-zip";

export interface Entry {
    path: string;
    getData: () => Promise<Buffer|undefined>;
}

export default class Zip {
    _zip: zipJS.ZipWriter | zipJS.ZipReader | AdmZip
    _type: 'adm' | 'read' | 'write'
    constructor() {
        if (typeof process === 'object') {
            this._zip = new AdmZip()
            this._type = 'adm'
            console.log('Node')
        } else {
            this._zip = new zipJS.ZipWriter(new zipJS.BlobWriter());
            this._type = 'write'
            console.log('Browser')
        }
    }


    public async load(data: Buffer) {
        if (this._type === 'adm') {
            this._zip = new AdmZip(data);
        }
        else if (this._type === 'write') {
            this._zip = new zipJS.ZipReader(new zipJS.BlobReader(new Blob([data])));
            this._type = 'read'
        }
    }

    public async addFile(path: string, data: Buffer) {
        switch(this._type) {
            case 'adm':
                (this._zip as AdmZip).addFile(path, data); return;
            case 'write':
                (this._zip as zipJS.ZipWriter).add(path, new zipJS.BlobReader(new Blob([data]))); return;
            default:
                throw new Error("Zip is in read only mode")
        }
    }

    public async getEntries(): Promise<Entry[]> {
        if (this._type === 'adm') {
            return (this._zip as AdmZip).getEntries().map(e => {
                return {
                    path: e.entryName,
                    getData: async () => e.getData()
                }
            })
        } else if (this._type === 'read') {
            return (await (this._zip as zipJS.ZipReader).getEntries()).map(e => {
                const getData = e.getData
                if(getData === undefined) return {
                    path: e.filename,
                    getData: async () => undefined
                }
                return {
                    path: e.filename,
                    getData: async () => Buffer.from(await getData(new zipJS.BlobWriter()))
                }
            })
        } else {
            throw new Error("Zip is in write only mode")
        }

    }

    public async getFile(path: string): Promise<Entry|undefined> {
        if (this._type === 'adm') {
            const e = (this._zip as AdmZip).getEntry(path)
            if(e == null) return undefined

            return {
                path: e.entryName,
                getData: async () => e.getData()
            }
        } else if(this._type === 'read') {
            const e = (await (this._zip as zipJS.ZipReader).getEntries()).find(e => e.filename === path)
            if(e === undefined) return undefined
            const getData = e.getData
            if(getData === undefined) return {
                path: e.filename,
                getData: async () => undefined
            }

            return {
                path: e.filename,
                getData: async () => Buffer.from(await getData(new zipJS.BlobWriter()))
            }
        } else {
            throw new Error("Zip is in write only mode")
        }
    } 

    public async export(): Promise<Blob> {
        if (this._type === 'adm') {
            return new Blob([(this._zip as AdmZip).toBuffer()]) 
        } else if(this._type === 'write') {
            return await (this._zip as zipJS.ZipWriter).close() 
        } else {
            return await (this._zip as zipJS.ZipReader).close()
        }
    }
}