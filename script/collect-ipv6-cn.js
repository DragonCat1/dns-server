const https = require('https')
const os = require('os')
const fs = require('fs')
const path = require('path')



const handleData = data => {
  const results = []
  data.split(os.EOL).forEach(line => {
    if(line.startsWith('apnic|CN|ipv6')){
      const params = line.split('|')
      if(params[6] === 'allocated'){
        results.push(params[3]+'/'+params[4])
      }
    }
  })
  const fileData = results.join(os.EOL)
  console.log(fileData)
  fs.writeFileSync(path.resolve(__dirname,'../config/ignore_ipv6.list'),fileData)
}

https.get('https://ftp.apnic.net/apnic/stats/apnic/delegated-apnic-latest', res => {
  if(res.statusCode === 200){
    let data = ''
    res.on('data', (d) => {
      data = data + d
    }).on('end',()=>{
      handleData(data)
    })
  }
})
