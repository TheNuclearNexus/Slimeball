import { configure } from '@zip.js/zip.js'
import {Blob} from 'blob-polyfill'
import Worker from 'web-worker'
// import Parallel from 'paralleljs'
// globalThis.Blob = Blob
// globalThis.Worker = Worker

console.log(globalThis.Blob)

import('./test.js').then((test) => {
    configure({useWebWorkers: false})   
    test.default()
})

