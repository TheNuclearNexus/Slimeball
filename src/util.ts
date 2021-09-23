import JSZip, { file } from 'jszip'

export async function validatePack(file: ArrayBuffer) : Promise<JSZip> {

    try {
        const zip = await JSZip.loadAsync(file)

        if(zip.file("pack.mcmeta") !==null) {
            return zip;
        }
    } catch {
        alert(`There was an error loading a file, double check it is a valid zip archive`)
    }
    
    return null;
}


export interface NamespaceGroup {
    [key:string]: string[]
}

export interface NamespaceKey {
    [key:string]: Namespace
}

export class Namespace {
    data: NamespaceGroup = {}

    public toString() : string {
        let str:string = ""        

        for(let d in this.data) {

            let words : string[] = d.split('_')
            for(let j = 0; j < words.length; j++) {
                words[j] = words[j][0].toUpperCase() + words[j].substring(1)
            }
            if(!words[words.length - 1].endsWith('s'))
                words[words.length - 1] += 's'

            if(this.data[d].length !==0) str += `\t\t- ${words.join(' ')}: ${this.data[d].length}\n`
        }

        return str;
    }
}

export class Pack {
    name: string
    zip: JSZip
    namespaces: NamespaceKey = {}
    constructor(name:string, zip: JSZip) {
        this.name = name
        this.zip = zip
    }

    public toString() : string {
        let str : string = this.name + ":\n"

        for(let n in this.namespaces) {
            str += `\t${n}:\n${this.namespaces[n].toString()}`
        }


        return str
    }
}

export function getParts(path: string) {
    return path.split('/')
}

export function readDir(file: JSZip, path : string, loop : (path: string, entry: JSZip.JSZipObject) => void) {
    file.folder(path)?.forEach((path, obj) => {
        loop(path, obj)
    })
}

export function getExtension(name: string) : string {
    let parts = name.split('.')
    return parts[parts.length - 1]
} 

export interface FileMap {
    [key: string]: {
        [key: string]: {
            [key: string]: number[]
        }
    }
}

export interface FileData {
    namespace: string,
    category: string,
    path: string,
}

export class PackBuilder {
    protected finalZip: JSZip = new JSZip();
    protected fileMap: FileMap = {}
    protected type: 'resourcepack'|'datapack'
    protected packs: Pack[];

    constructor(type: 'resourcepack'|'datapack') {
        this.type = type;
    }
    
    async handleConflict(fileData: FileData, occurences: number[]) {throw Error("Not Implemented, please extend this class")};

    private createFileMap() {
        for(let idx = 0; idx < this.packs.length; idx++) {
            let d = this.packs[idx];
            for(let namespace in d.namespaces) {
                for(let category in d.namespaces[namespace].data) {

                    for(let filePath of d.namespaces[namespace].data[category]) {

                        if(this.fileMap[namespace][category][filePath] == null) {
                            this.fileMap[namespace][category][filePath] = []
                        }

                        this.fileMap[namespace][category][filePath].push(idx);
                    }
                }
            }
        }
    }

    async build(save: (blob)=>void) {
        if(this.packs.length == 0) throw Error("No packs available to merge!")

        this.createFileMap();

        let content : string = ''
        let numberOfConflicts = 0

        for(let namespace in this.fileMap) {
            for(let category in this.fileMap[namespace]) {
                for(let filePath in this.fileMap[namespace][category]) {
                    let fileOccurences = this.fileMap[namespace][category][filePath];

                    if(fileOccurences.length == 1) {
                        let packZip = this.packs[fileOccurences[0]].zip;
                        this.finalZip.file(filePath, packZip.file(filePath).async('arraybuffer'))
                        this.fileMap[namespace][category][filePath] = null;
                    } else {
                        await this.handleConflict({namespace: namespace, category: category, path: filePath}, fileOccurences)
                        if(this.fileMap[namespace][category][filePath] != null) {
                            numberOfConflicts++;
                        }
                    }
                }
            }
        }
        if(numberOfConflicts > 0) {
            this.finalZip.file("conflicts.yaml", content)
            alert(`Found ${numberOfConflicts} conflict(s), check 'conflicts.yaml' for a complete list`)
        }

        this.finalZip.file("pack.mcmeta", JSON.stringify({
            pack: {
                pack_format:7,
                description: `${this.type[0] + this.type.substring(1)} merged with §bmito.thenuclearnexus.live`
            }
        }))

        let blob = await this.finalZip.generateAsync({type:'blob'})

        save(blob)
    }

    private createPack(name:string, file: JSZip) : Pack {

        let pack: Pack = new Pack(name.replaceAll('.zip', ''), file)
        
        let rootPath = this.type === 'datapack' ? "data" : "assets"

        readDir(file, rootPath, (path, entry) => {
            let parts = getParts(path)
            if(parts.length > 2) {
                let n = parts[0]
                let f = parts[1]
    
                if(parts[parts.length - 1].includes(".")) {
                    if(pack.namespaces[n] == null) {
                        pack.namespaces[n] = new Namespace()
                    }
                    if(pack.namespaces[n].data[f] == null) {
                        pack.namespaces[n].data[f] = []
                    }
                    pack.namespaces[n].data[f].push(rootPath + "/" + path)
                }
            }
        })
    
        return pack
    }    
    
    async loadFileList(files: FileList) {
        let packs: Pack[] = []
        
        for(let i = 0; i < files.length; i++) {
            const zip = await validatePack(await files.item(i).arrayBuffer());
            if(zip != null) {
                packs.push(this.createPack(files.item(i).name, zip));
            }
        }

        this.packs = packs;
    }

    async loadFile(name: string, data: ArrayBuffer) {
        const zip = await validatePack(data);
        if(zip != null) {
            this.packs.push(this.createPack(name, zip));
        }
    }
}