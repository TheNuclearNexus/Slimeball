import { fileExists } from "../util"
import * as fs from 'fs'

export function merge(currentPath : string, newPath : string) {
    let vanillaPath = currentPath.replace('output/datapack/','input/version/')

    try {
        let currentTable = JSON.parse(fs.readFileSync(currentPath).toString())
        let newTable = JSON.parse(fs.readFileSync(newPath).toString())
    
        if(fileExists(vanillaPath)) {
            let vanillaTable = JSON.parse(fs.readFileSync(vanillaPath).toString())
            return mergeVanilla(vanillaTable, currentTable, newTable)
        } else {
            return mergeCustom(currentTable, newTable)
        }
    } catch (e) {
        console.log(`[Merger] Failed at merging '${newPath}', check the json`)
        throw e
    }
}

function entriesSimilar(entryA, entryB) : boolean {

    if(entryA["type"] != entryB["type"])
        return false
    if(entryA["name"] != entryB["name"])
        return false
    return true
}

function poolsSimilar(poolA, poolB) : boolean {
    if(poolA["entries"].length == poolB["entries"].length) {
        return false
    }
    let total = 0

    for(let eA in poolA["entries"]) {
        for(let eB in poolB["entries"]) {
            if(entriesSimilar(poolA["entries"][eA], poolB["entries"][eB])) {
                total++
                break;
            }
        }
    }

    return total == poolA["entries"].length
}

function mergeTables(baseTable, newTable) {

    if(baseTable["pools"] == null && newTable["pools"] != null)
        baseTable["pools"] = []

    for(let p in newTable["pools"]) {
        let matched = false
        for(let p2 in baseTable["pools"]) {
            if(poolsSimilar(baseTable["pools"][p2], newTable["pools"][p])) {
                matched = true
                break    
            }
        }
        if(!matched) {
            baseTable["pools"].push(newTable["pools"][p])
        }

    }

    return baseTable
}

function mergeVanilla(vanillaTable, currentTable, newTable) {
    let merged = mergeTables(vanillaTable, currentTable)
    merged = mergeTables(merged, newTable)
    return merged
}

function mergeCustom(currentTable, newTable) {
    return mergeTables(currentTable, newTable)
}