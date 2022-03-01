/* global globalThis */

import JSZip from 'jszip'
import { EventEmitter } from 'events';

import { BlobReader, BlobWriter, TextReader, ZipWriter } from '@zip.js/zip.js'

export async function validatePack(file: ArrayBuffer): Promise<JSZip | null> {

    try {
        const zip = await JSZip.loadAsync(file)

        if (zip.file("pack.mcmeta") !== null) {
            return zip;
        }
    } catch {
        alert(`There was an error loading a file, double check it is a valid zip archive`)
    }

    return null;
}


export interface NamespaceGroup {
    [key: string]: string[]
}

export interface NamespaceKey {
    [key: string]: Namespace
}

export class Namespace {
    data: NamespaceGroup = {}

    public toString(): string {
        let str: string = ""

        for (let d in this.data) {

            let words: string[] = d.split('_')
            for (let j = 0; j < words.length; j++) {
                words[j] = words[j][0].toUpperCase() + words[j].substring(1)
            }
            if (!words[words.length - 1].endsWith('s'))
                words[words.length - 1] += 's'

            if (this.data[d].length !== 0) str += `\t\t- ${words.join(' ')}: ${this.data[d].length}\n`
        }

        return str;
    }
}

export class Pack {
    name: string
    zip: JSZip
    files: string[] = []
    constructor(name: string, zip: JSZip) {
        this.name = name
        this.zip = zip
    }

    public toString(): string {
        let str: string = this.name + ":\n"

        for (let n in this.files) {
            str += `\t${n}:\n${this.files.toString()}`
        }


        return str
    }
}


export function getParts(path: string) {
    return path.split('/')
}

export function readDir(file: JSZip, path: string, loop: (path: string, entry: JSZip.JSZipObject) => void) {
    file.folder(path)?.forEach((path, obj) => {
        loop(path, obj)
    })
}

export function getExtension(name: string): string {
    let parts = name.split('.')
    return parts[parts.length - 1]
}

export interface FileMap {
    [key: string]: number[]
}

export function parseData(data: string): any {
    try {
        return JSON.parse(data);
    } catch (e: any) {
        PackBuilderEvents.emit('caught-error', e);
    }
}

export interface FileData {
    namespace: string,
    category: string,
    path: string,
}

export interface BuildResult {
    conflicts: number,
    zip: ZipWriter
}

export const PackBuilderEvents = new EventEmitter();

export class PackBuilder {
    protected finalZip: ZipWriter
    protected fileMap: FileMap = {}
    protected type: 'resourcepack' | 'datapack'
    protected packs: Pack[] = [];
    protected onUpdate: (message: string) => void = (m) => console.log(m)
    constructor(type: 'resourcepack' | 'datapack') {
        this.type = type;

        const blobWriter = new BlobWriter("application/zip");
        this.finalZip = new ZipWriter(blobWriter)

    }

    async handleConflict(fileData: FileData, occurences: number[]): Promise<boolean> {
        const e = Error("Not Implemented, please extend this class")
        PackBuilderEvents.emit('caught-error', e)
        throw e
    };

    private createFileMap() {
        this.onUpdate('Creating file map!')
        for (let idx = 0; idx < this.packs.length; idx++) {
            let d = this.packs[idx];

            let rootPath = this.type === 'datapack' ? "data" : "assets"

            readDir(d.zip, rootPath, (path, entry) => {
                let parts = getParts(path)
                if (parts.length >= 2) {
                    const finalPath = rootPath + "/" + path;
                    if (parts[parts.length - 1].includes(".")) {
                        if (this.fileMap[finalPath] === undefined)
                            this.fileMap[finalPath] = [idx]
                        else
                            this.fileMap[finalPath].push(idx)
                    }
                }
            })
        }
    }

    async build(onUpdate?: (message: string) => void): Promise<BuildResult> {
        if (this.packs == null || this.packs.length == 0) {
            const e = Error("No packs available to merge! Ensure that they are in the correct format!")
            PackBuilderEvents.emit('caught-error', e)
            throw e
        }
        this.onUpdate = onUpdate ? onUpdate : (message: string) => console.log(message);
        this.createFileMap();

        let conflicts: { path: string, packs: number[] }[] = []
        for (let filePath in this.fileMap) {
            this.onUpdate(`Checking for conflicts\n${filePath}`)
            let fileOccurences = this.fileMap[filePath]

            if (fileOccurences.length == 1) {
                let packZip = this.packs[fileOccurences[0]].zip;
                if (packZip != null) {
                    const file = packZip.file(filePath)
                    if (file != null)
                        await this.finalZip.add(filePath, new BlobReader(await file.async('blob')))
                    this.fileMap[filePath] = [];
                }
            } else {
                this.onUpdate(`Handling conflict\n${filePath}`)
                const parts = getParts(filePath)
                console.log(parts)
                const resolved: boolean = await this.handleConflict({ namespace: parts[1], category: parts[2], path: filePath }, fileOccurences)
                if (!resolved) {
                    conflicts.push({
                        path: filePath,
                        packs: fileOccurences
                    })
                }
            }

        }

        if (conflicts.length > 0) {
            this.onUpdate(`Writing conflicts.yaml`)
            let content = ''
            for (let c of conflicts) {
                content += c.path + ':\n'
                for (let p of c.packs) {
                    content += ' - ' + this.packs[p].name + '\n';
                }
            }

            await this.finalZip.add("conflicts.yaml", new TextReader(content))
        }

        this.onUpdate(`Adding pack.mcmeta`)
        await this.finalZip.add("pack.mcmeta", new TextReader(JSON.stringify({
            pack: {
                pack_format: 8,
                description: `${this.type[0] + this.type.substring(1)} merged with §bmito.thenuclearnexus.live`
            }
        })))

        if (this.packs.length === 1) {
            this.onUpdate(`Adding pack.png`)
            const png = this.packs[0].zip.file("pack.png")
            if (png) {
                await this.finalZip.add("pack.png", new BlobReader(await png.async("blob")))
            }
        }

        return { zip: this.finalZip, conflicts: conflicts.length }
    }

    private createPack(name: string, file: JSZip): Pack {

        let pack: Pack = new Pack(name.replaceAll('.zip', ''), file)

        return pack
    }

    async loadFileList(files: FileList) {
        let packs: Pack[] = []

        for (let i = 0; i < files.length; i++) {
            const f = files.item(1)
            if (f != null) {

                const zip = await validatePack(await f.arrayBuffer());
                if (zip != null) {
                    packs.push(this.createPack(f.name, zip));
                }
            }
        }

        this.packs = packs;
    }

    async loadFileArray(files: File[]) {
        let packs: Pack[] = []

        for (let i = 0; i < files.length; i++) {
            const zip = await validatePack(await files[i].arrayBuffer());
            if (zip != null) {
                packs.push(this.createPack(files[i].name, zip));
            }
        }

        this.packs = packs;
    }

    async loadBuffers(buffers: [string, ArrayBuffer][]) {
        let packs: Pack[] = []

        for (let i = 0; i < buffers.length; i++) {
            const zip = await validatePack(buffers[i][1]);
            if (zip != null) {
                packs.push(this.createPack(buffers[i][0], zip));
            }
        }

        this.packs = packs;
    }
}