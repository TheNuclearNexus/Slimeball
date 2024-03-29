# Slimeball
### An expandable library for merging Datapacks and Resourcepacks

Slimeball is a library for merging datapacks and resourcepacks on the fly.

## Datapack Merging Features
- Tag merging

## Resourcepack Merging Features
- Model override merging (Custom Model Data)
- Lang file merging


## How to use the default builders

```ts
import DefaultDatapackBuilder from 'slimeball/out/datapack'

async function handleInput(files: FileList) {
    let ddb = new DefaultDatapackBuilder();
    ddb.loadFileList(files).then(()=>{
        ddb.build().then((result: BuildResult) => {
            result.zip.export().then((blob) => {
                saveAs(blob, 'datapack.zip');
            })
        });
    })
}
```