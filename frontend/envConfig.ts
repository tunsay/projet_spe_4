import { loadEnvConfig } from '@next/env'
 
const projectDir = process.cwd()
console.log("Loading env config for project dir:", projectDir)
loadEnvConfig(projectDir)