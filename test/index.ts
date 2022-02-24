import {Blob} from 'blob-polyfill'
import Worker from 'web-worker'
globalThis.Blob = Blob
globalThis.Worker = Worker

console.log(globalThis.Blob)

import('./test.js').then((test) => {   
    test.default()
})
