import * as dgram from 'dgram'
import dnsPacket from 'dns-packet'
import ip6addr from 'ip6addr'
import chalk from 'chalk'
import {commands} from './commander'
import {configData} from './config'


let forwardTid = 0
const queryForward = (packet:dnsPacket.Packet):Promise<dnsPacket.Packet|undefined> => {
  const socket = dgram.createSocket('udp4')
  let timer:NodeJS.Timeout
  return new Promise((resolve)=>{
    socket.on('message',message => {
      const response = dnsPacket.decode(message)
      if(response.type === 'response'){
        if(timer){
          clearTimeout(timer)
        }
        resolve(response)
        socket.close()
      }
    })
    forwardTid = forwardTid < 65535 ? forwardTid + 1 : 1
    socket.send(dnsPacket.encode({
      ...packet,
      id:forwardTid
    }),53,commands.forward)
    timer = setTimeout(() => {
      socket.close()
      resolve(undefined)
    }, 5000);
  })
}

const reply = (
  query:dnsPacket.Packet,
  response:dnsPacket.Packet|undefined = undefined,
  rinfo:dgram.RemoteInfo) => {
    if(response){
      console.log(chalk.bgGreen.white(`[RESPONSE][${(new Date).toLocaleString()}]:${query.id}`),JSON.stringify(response.answers))
      server4.send(
        dnsPacket.encode({
          ...response,
          id:query.id
        }),
        rinfo.port,
        rinfo.address
      )
    } else {
      console.log(chalk.bgRed.white(`[TIMEOUT][${(new Date).toLocaleString()}]:${query.id}`),JSON.stringify(query.questions))
    }
  }


const isPerferIpv6 = (addr:string):boolean => {
  return configData.preferIpv6?.some(cirdStr=>{
    const cird = cirdStr.split('/')
    if(ip6addr.createCIDR(cird[0],Number(cird[1] || '128')).contains(addr)){
      console.log(chalk.bgYellow.white(`[PERFER][${(new Date).toLocaleString()}]`),addr)
      return true
    }
    else {
      return false
    }
  }) ?? false
}


const server4 = dgram.createSocket('udp4')


server4.on('message', async (message,rinfo) => {
  const query = dnsPacket.decode(message)
  if(query.type === 'query' && query.questions){
    console.log(chalk.bgGray(`[QUERY][${(new Date).toLocaleString()}]:${query.id}`),JSON.stringify(query.questions))
    query.questions.forEach(async question => {
      if(question.type === 'A'){
        const queryAAAAResult = await queryForward({
          ...query,
          questions:[
            {
              ...question,
              type:'AAAA'
            }
          ]
        })
        if(queryAAAAResult) {
          if(
            queryAAAAResult.answers?.some(answer => answer.type === 'AAAA' && answer.data && isPerferIpv6(answer.data))
          ){
            // 存在AAAA记录,应答无记录
            reply(query,{
              ...query,
              type:'response',
              rcode: 'NOERROR',
              flags: 384,
              answers:[]
            } as dnsPacket.Packet,rinfo)
          } else {
            // 不存在AAAA记录,转发A记录
            const queryAResult = await queryForward({
              ...query,
              questions:[question]
            })
            reply(query,queryAResult,rinfo)
          }
        } else {
          console.log(chalk.bgRed.white(`[TIMEOUT][${(new Date).toLocaleString()}]:${query.id}`),JSON.stringify(query.questions))
        }
      } else {
        // 其他请求直接转发
        const queryOtherResult = await queryForward({
          ...query,
          questions:[question]
        })
        reply(query,queryOtherResult,rinfo)
      }
    })
  }
})


server4.bind(53,'0.0.0.0')
