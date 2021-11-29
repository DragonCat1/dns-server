import fs from 'fs'
import os from 'os'

interface IConfigData {
  preferIpv6?:string[]
}

const defaultConfigFiles = {
  preferIpv6:'./config/prefer_ipv6.list'
}

const configData:IConfigData = {}

if(fs.existsSync(defaultConfigFiles.preferIpv6)){
  const preferIpv6Data = fs.readFileSync(defaultConfigFiles.preferIpv6).toString()
  configData.preferIpv6 = preferIpv6Data.split(os.EOL).filter(el=>el !== '')
}

export {
  configData
}
