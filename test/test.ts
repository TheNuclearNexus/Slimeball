import DefaultDatapackBuilder from "../src/datapack.js";
import DefaultResourcepackBuilder from "../src/resourcepack.js";
import { BuildResult } from "../src/util.js";
import * as fs from 'fs'
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";
import { Console } from "console";


async function handleInput(testName: string, files: [string, Buffer][]) {
    let ddb = new DefaultDatapackBuilder();
    const onUpdate = (message: string, spam?: boolean) => {
        if (spam) return;
        console.log(`Update: ` + message)
    }
    await ddb.loadBuffers(files)
    let start = Date.now()
    const result = await ddb.build(onUpdate)
    console.log(result.zip.getEntries())
    const c: Blob = await result.zip.export()
    const totalTime = Date.now() - start
    fs.writeFileSync(`out/${testName}.zip`, Buffer.from(await c.arrayBuffer()))
    return [totalTime, Math.ceil(c.size / 1000)]
}



export default async function test() {
    const files: [string, Buffer][] = [
        ['dnd.zip', fs.readFileSync('C:/Users/Yavanni/Desktop/Test/DP/dnd.zip')],
        ['manic.zip', fs.readFileSync('C:/Users/Yavanni/Desktop/Test/DP/manic.zip')],
        // ['tcc.zip', fs.readFileSync('C:/Users/Yavanni/Desktop/Test/DP/tcc.zip')],
    ]
    // All
    let both = await handleInput('all', files)

    // DnD
    let dnd = await handleInput('dnd', [ files[0] ])

    // Manic
    let manic = await handleInput('manic', [ files[1] ])

    // TCC
    // let tcc = await handleInput('tcc', [ files[2] ])



    const getFileSize = (index: number) => {
        return Math.ceil(files[index][1].byteLength / 1000)
    }

    const totalFileSizes = () => {
        let total = 0
        for(let f =0; f < files.length; f++) 
            total += getFileSize(f)
        return total
    }

    console.log(`
All:
    Time: ${both[0]}ms
    Size: ${both[1]}kb vs ~${totalFileSizes()}kb
DnD:
    Time: ${dnd[0]}ms
    Size: ${dnd[1]}kb vs ${getFileSize(0)}kb
Manic:
    Time: ${manic[0]}ms
    Size: ${manic[1]}kb vs ${getFileSize(1)}kb

    `)
}

