import DefaultDatapackBuilder from "../src/datapack.js";
import { BuildResult } from "../src/util.js";
import * as fs from 'fs'
import { BlobWriter, TextReader, ZipWriter } from "@zip.js/zip.js";


async function handleInput(files: [string, Buffer][]) {
    let ddb = new DefaultDatapackBuilder();
    ddb.loadBuffers(files).then(()=>{
        ddb.build().then(async (result: BuildResult) => {
            const c: Blob = await result.zip.close()
            fs.writeFileSync('out/test.zip', Buffer.from(await c.arrayBuffer()))
        });
    })
}



export default async function test() {
    handleInput([['test.zip', fs.readFileSync('C:/Users/Yavanni/Desktop/Test/DP/dnd.zip')]])

    // const zip = new ZipWriter(new BlobWriter("application/zip"))

    // await zip.add("test.txt", new TextReader("hi"));
    // const result = await zip.close()
    // console.log(result)
}