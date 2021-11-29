"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
const commander_1 = require("commander");
const command = new commander_1.Command();
command.requiredOption('-f,--forward <forward>', 'forward');
command.parse(process.argv);
exports.commands = command.opts();
