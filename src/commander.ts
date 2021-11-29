import {Command} from 'commander'
interface ICliArgs {
  forward:string
}
const command = new Command()

command.requiredOption('-f,--forward <forward>','forward')
command.parse(process.argv)

export const commands:ICliArgs = command.opts()
